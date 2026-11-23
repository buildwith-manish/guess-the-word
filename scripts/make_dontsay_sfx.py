#!/usr/bin/env python3
"""Synthesize the Don't Say The Same As Me sound effects (original, numpy only, royalty-free).

Writes 48 kHz 16-bit wavs to public/dontsay/sfx/, public/dontsay/sfx/manifest.json and the typed
src/dontsay/sfx.ts (ids, lengths, helpers).  Run: python3 scripts/make_dontsay_sfx.py
Needs: numpy, pedalboard (pip install pedalboard).

Every sound goes through the same chain: high-pass, gentle compressor, limiter (pedalboard).
After the chain each file is peak-normalised to -3 dBFS.  Mono sounds are written mono, the
ink-dissolve (left-to-right pan) and a few wide sounds are written stereo.
No samples, no recordings, no Apple system sounds: everything is generated from sines and noise.
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 48000
PEAK_DB = -3.0
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "dontsay" / "sfx"
TS_OUT = ROOT / "src" / "dontsay" / "sfx.ts"
rng = np.random.default_rng(45)

# One level-card swell per level colour.  Keep in step with the number of levels in src/dontsay/data.ts.
LEVEL_COUNT = 5
TICK_COUNT = 5
CALLBACK_COUNT = 4


# ---------------------------------------------------------------- helpers
def t_axis(sec):
    return np.arange(int(round(sec * SR))) / SR


def fade(sig, a=0.004, r=0.01):
    s = sig.copy()
    na, nr = int(a * SR), int(r * SR)
    if na:
        s[:na] *= np.linspace(0, 1, na)
    if nr:
        s[-nr:] *= np.linspace(1, 0, nr)
    return s


def place(buf, sig, at, gain=1.0):
    """Add sig into buf at `at` seconds; works for mono (n,) and stereo (2, n)."""
    i = int(round(at * SR))
    n = min(sig.shape[-1], buf.shape[-1] - i)
    if n > 0:
        buf[..., i:i + n] += sig[..., :n] * gain


def lowpass(sig, cutoff):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(sig))


def highpass_noise(n, cutoff=3500, gen=None):
    x = (gen or rng).standard_normal(n)
    return x - lowpass(x, cutoff)


def noise_filtered(sec, centers, q=1.2):
    """Noise through a band-pass whose centre follows centers(progress 0..1) (STFT overlap-add)."""
    n = int(sec * SR)
    x = rng.standard_normal(n)
    win, hop = 2048, 512
    w = np.hanning(win)
    out = np.zeros(n + win)
    norm = np.zeros(n + win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for s in range(0, n, hop):
        seg = x[s:s + win]
        if len(seg) < win:
            seg = np.pad(seg, (0, win - len(seg)))
        c = centers(s / n)
        mask = np.exp(-0.5 * ((freqs - c) / (c / q)) ** 2)
        y = np.fft.irfft(np.fft.rfft(seg * w) * mask) * w
        out[s:s + win] += y
        norm[s:s + win] += w ** 2
    return out[:n] / np.maximum(norm[:n], 1e-6)


def glide_phase(f_curve):
    return 2 * np.pi * np.cumsum(f_curve) / SR


def tone(freq, sec, decay=6.0, h2=0.25, attack=0.004, release=0.02):
    """Soft sine with a gentle second harmonic and an exponential decay."""
    t = t_axis(sec)
    sig = np.sin(2 * np.pi * freq * t) + h2 * np.sin(2 * np.pi * 2 * freq * t)
    return fade(sig * np.exp(-decay * t) * np.minimum(1, t / attack), 0, release)


GLASS = ((1.0, 1.0, 1.0), (2.32, 0.30, 1.3), (4.25, 0.14, 1.6), (6.63, 0.06, 2.0))


def glass(freq, sec, decay=5.0, amp=1.0):
    """Glass-like bell: inharmonic partials, each decaying a little faster than the one before."""
    t = t_axis(sec)
    sig = np.zeros_like(t)
    for r, a, dm in GLASS:
        sig += a * np.sin(2 * np.pi * freq * r * t) * np.exp(-decay * dm * t)
    return fade(sig * np.minimum(1, t / 0.002) * amp, 0, 0.02)


def click(amp=1.0, dur=0.006, cutoff=3000, decay=800, gen=None):
    t = t_axis(dur)
    return highpass_noise(len(t), cutoff, gen) * np.exp(-decay * t) * amp


def swell(chord, sec, peak_at=0.35, detune=0.6, h2=0.2, stereo=True):
    """Pad swell: rises to peak_at, then a slow fall.  Detuned left and right for width."""
    t = t_axis(sec)
    env = np.minimum(1, t / peak_at) ** 1.5 * np.exp(-1.6 * np.maximum(t - peak_at, 0))
    chans = []
    for det in (-detune, detune):
        ch = np.zeros_like(t)
        for f in chord:
            ch += np.sin(2 * np.pi * (f + det) * t) + h2 * np.sin(2 * np.pi * 2 * (f + det) * t)
        chans.append(fade(ch * env * 0.25, 0.01, 0.15))
    return np.stack(chans) if stereo else chans[0]


def pan_equal_power(sig, p):
    """Mono -> stereo.  p is a pan position per sample: 0 = left, 1 = right."""
    th = np.clip(p, 0, 1) * np.pi / 2
    return np.stack([sig * np.cos(th), sig * np.sin(th)])


# ---------------------------------------------------------------- studio chain
def studio(sig, hp=120, tail=0.0, thr=-18.0, ratio=2.0):
    """High-pass, gentle compressor, limiter.  Accepts mono (n,) or stereo (2, n); returns the same shape."""
    from pedalboard import Compressor, HighpassFilter, Limiter, Pedalboard
    mono = sig.ndim == 1
    x = sig[None, :] if mono else sig
    x = np.pad(x, ((0, 0), (0, int(tail * SR)))).astype(np.float32)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
    board = Pedalboard([
        HighpassFilter(hp),
        Compressor(threshold_db=thr, ratio=ratio, attack_ms=3, release_ms=90),
        Limiter(threshold_db=-1.0),
    ])
    y = board(x, SR).astype(np.float64)
    return y[0] if mono else y


# ---------------------------------------------------------------- the sounds
def build():
    s = {}

    # card-in: soft glass whoosh (airy rise, then a faint glass touch as the card settles)
    d = 0.55
    t = t_axis(d)
    air = noise_filtered(d, lambda p: 900 + 3600 * p ** 1.4, q=0.9)
    air = fade(air * np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.8) ** 1.5, 0.02, 0.06)
    b = np.zeros(int(0.9 * SR))
    place(b, air, 0, 1.0)
    place(b, glass(1568.0, 0.5, 8.0, 0.35), 0.36)
    s["card-in"] = studio(b, hp=200)

    # listening-start: gentle rising two-tone
    b = np.zeros(int(0.7 * SR))
    place(b, tone(587.3, 0.4, 7.0, 0.15), 0.0, 0.8)
    place(b, tone(880.0, 0.5, 6.0, 0.15), 0.11, 0.9)
    s["listening-start"] = studio(b, hp=150)

    # tick-1 .. tick-5: dry soft clock tick, pitch rising slightly each second of the countdown
    for i in range(TICK_COUNT):
        f = 1500 * (1.06 ** i)
        t = t_axis(0.1)
        c = lowpass(rng.standard_normal(len(t)), 5500) * np.exp(-95 * t) * 0.7
        s[f"tick-{i + 1}"] = studio(fade(c + np.sin(2 * np.pi * f * t) * np.exp(-65 * t), 0, 0.01), hp=300)

    # lock-click: small padlock click (frame 0 and the reveal): sharp top click plus a short low knock
    b = np.zeros(int(0.18 * SR))
    place(b, click(1.0, 0.006, 2500, 700, np.random.default_rng(1)), 0.0)
    place(b, tone(210.0, 0.1, 40.0, 0.0, 0.001, 0.01), 0.004, 0.6)
    place(b, click(0.45, 0.005, 5000, 900, np.random.default_rng(2)), 0.045)
    s["lock-click"] = studio(b, hp=120)

    # ink-dissolve: airy shimmer, pans left to right across 1.6 s
    d = 1.6
    t = t_axis(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.75) ** 1.4
    air = noise_filtered(d, lambda p: 2200 + 3000 * p, q=0.7) * env * 0.8
    pos = t / d
    out = pan_equal_power(air, pos)
    g = np.random.default_rng(9)
    for _ in range(46):
        at = g.uniform(0.0, d - 0.25)
        f = g.uniform(2600, 7200)
        grain = tone(f, 0.22, g.uniform(14, 24), 0.0, 0.003, 0.02) * g.uniform(0.15, 0.4) * np.sin(np.pi * min(at / d, 1)) ** 0.5
        st = pan_equal_power(grain, np.full(len(grain), at / d))
        place(out, st, at)
    s["ink-dissolve"] = studio(out, hp=500, tail=0.25)

    # collision: muted low thud, then a short red-tone blip (a dissonant minor-second pair)
    b = np.zeros(int(0.7 * SR))
    t = t_axis(0.4)
    thud = np.sin(glide_phase(48 + 70 * np.exp(-22 * t))) * np.exp(-11 * t)
    thud += lowpass(rng.standard_normal(len(t)), 500) * np.exp(-38 * t) * 0.5
    place(b, fade(thud, 0.002, 0.03), 0.0)
    t = t_axis(0.16)
    blip = (np.sin(2 * np.pi * 370 * t) + np.sin(2 * np.pi * 392 * t)) * 0.5 * np.exp(-17 * t)
    place(b, fade(lowpass(blip, 2500), 0.004, 0.03), 0.06, 0.55)
    s["collision"] = studio(b, hp=40)

    # safe-pulse: single bright tone
    s["safe-pulse"] = studio(glass(1760.0, 0.7, 5.5), hp=250)

    # exclusion-flip: toggle switched off: tick, then a short falling tone
    b = np.zeros(int(0.35 * SR))
    place(b, click(0.8, 0.005, 3000, 900, np.random.default_rng(3)), 0.0)
    t = t_axis(0.16)
    fall = np.sin(glide_phase(760 - 320 * np.clip(t / 0.16, 0, 1))) * np.exp(-16 * t)
    place(b, fade(fall, 0.003, 0.02), 0.012, 0.7)
    s["exclusion-flip"] = studio(b, hp=200)

    # swatch-cross: crossed-out swatch: two quick pen strokes (band noise falling) and a low tap
    b = np.zeros(int(0.5 * SR))
    for at in (0.0, 0.13):
        stroke = noise_filtered(0.11, lambda p: 5200 - 2800 * p, q=1.4)
        stroke = fade(stroke * np.sin(np.pi * np.clip(np.arange(len(stroke)) / len(stroke), 0, 1)) ** 0.7, 0.006, 0.02)
        place(b, stroke, at, 0.9)
    place(b, tone(160.0, 0.12, 30.0, 0.0, 0.002, 0.02), 0.26, 0.5)
    s["swatch-cross"] = studio(b, hp=150)

    # chip-land: soft bubble tap, a chip appearing
    t = t_axis(0.22)
    f = 520 + 380 * np.exp(-40 * t)
    pop = np.sin(glide_phase(f)) * np.exp(-24 * t) + 0.25 * np.sin(2 * np.pi * 1040 * t) * np.exp(-35 * t)
    s["chip-land"] = studio(fade(pop, 0.002, 0.03), hp=150)

    # level-card-1 .. N: short swell, one per level colour (root rises with the level, so each colour sounds different)
    roots = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3]
    for i in range(LEVEL_COUNT):
        r = roots[i % len(roots)]
        b = swell((r, r * 1.25, r * 1.5), 1.1, 0.3)
        place(b, glass(r * 4, 0.7, 4.5, 0.5), 0.3)
        s[f"level-card-{i + 1}"] = studio(b, hp=110, tail=0.25)

    # bonus-pill: warm swell (lower, rounder chord, a soft glass note on top)
    b = swell((220.0, 277.2, 329.6, 440.0), 1.3, 0.4, 0.5)
    place(b, glass(1318.5, 0.8, 4.0, 0.4), 0.38)
    s["bonus-pill"] = studio(b, hp=100, tail=0.3)

    # triple-lock-click: three lock clicks in a row, each a touch brighter
    b = np.zeros(int(0.5 * SR))
    for i, at in enumerate((0.0, 0.12, 0.24)):
        place(b, click(1.0, 0.006, 2500 + 500 * i, 700, np.random.default_rng(10 + i)), at)
        place(b, tone(210.0 * (1.05 ** i), 0.09, 40.0, 0.0, 0.001, 0.01), at + 0.004, 0.55)
    s["triple-lock-click"] = studio(b, hp=120)

    # chain-link: one small link tick per word (short, metallic, quiet-ish)
    t = t_axis(0.11)
    link = (np.sin(2 * np.pi * 1240 * t) + 0.4 * np.sin(2 * np.pi * 1240 * 2.51 * t)) * np.exp(-48 * t)
    link += click(0.5, 0.11, 4000, 400, np.random.default_rng(4))
    s["chain-link"] = studio(fade(link, 0.001, 0.015), hp=300)

    # invert-whoosh: opposite day: a sweep up that flips into a sweep down
    d = 0.8
    up = noise_filtered(d / 2, lambda p: 500 + 4500 * p ** 1.3, q=0.9)
    dn = noise_filtered(d / 2, lambda p: 5000 - 4500 * p ** 0.8, q=0.9)
    ramp = np.sin(np.pi * np.clip(np.arange(len(up)) / len(up), 0, 1)) ** 0.9
    b = np.zeros(int(d * SR) + 8)
    place(b, fade(up * ramp, 0.01, 0.01), 0.0)
    place(b, fade(dn * ramp, 0.01, 0.04), d / 2)
    place(b, click(0.6, 0.006, 3500, 800, np.random.default_rng(5)), d / 2)
    s["invert-whoosh"] = studio(b, hp=250)

    # mic-pulse: voice-only, soft: a low round tone with a slow swell
    d = 0.5
    t = t_axis(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    sig = (np.sin(2 * np.pi * 392 * t) + 0.12 * np.sin(2 * np.pi * 784 * t)) * env
    s["mic-pulse"] = studio(fade(sig, 0.03, 0.08), hp=150)

    # callback-chime-1 .. 4: one per card floating into the banned box (four rising pitches)
    for i, f in enumerate((784.0, 880.0, 1046.5, 1318.5)[:CALLBACK_COUNT]):
        s[f"callback-chime-{i + 1}"] = studio(glass(f, 0.8, 5.0), hp=250)

    # check-in-tone: short rising two-step
    t = t_axis(0.32)
    f = 523.3 + 262.0 * np.clip(t / 0.16, 0, 1)
    sig = (np.sin(glide_phase(f)) + 0.15 * np.sin(2 * glide_phase(f))) * np.exp(-6 * t)
    s["check-in-tone"] = studio(fade(sig, 0.006, 0.05), hp=180)

    # rank-reveal: rising glass arpeggio under a soft swell
    b = swell((261.6, 329.6, 392.0), 1.9, 0.5, 0.6)
    for i, f in enumerate((784.0, 988.0, 1175.0, 1568.0)):
        place(b, glass(f, 1.0, 4.2, 0.55 + 0.1 * i), 0.3 + 0.12 * i)
    s["rank-reveal"] = studio(b, hp=110, tail=0.4)

    # end-sting: one full chord, glass top, long tail
    b = swell((261.6, 329.6, 392.0, 523.3), 2.6, 0.12, 0.7)
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        place(b, glass(f, 1.8, 3.2, 0.7), 0.04 + 0.03 * i)
    s["end-sting"] = studio(b, hp=100, tail=0.6)
    return s


# ---------------------------------------------------------------- output
def normalise(sig):
    sig = sig - np.mean(sig, axis=-1, keepdims=True)
    return sig * 10 ** (PEAK_DB / 20) / (np.max(np.abs(sig)) + 1e-12)


def write_wav(path, sig):
    pcm = np.clip(sig, -1, 1)
    chans = 1 if pcm.ndim == 1 else pcm.shape[0]
    if pcm.ndim == 2:
        pcm = pcm.T  # (samples, channels)
    pcm = (pcm * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(chans)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sid, sig in build().items():
        sig = normalise(sig)
        write_wav(OUT / f"{sid}.wav", sig)
        n = sig.shape[-1]
        sec = n / SR
        manifest.append({
            "id": sid,
            "file": f"{sid}.wav",
            "channels": 1 if sig.ndim == 1 else sig.shape[0],
            "length": round(sec, 3),
            "frames": int(np.ceil(sec * 60)),
            "peakDb": round(20 * np.log10(np.max(np.abs(sig))), 1),
            "rmsDb": round(20 * np.log10(np.sqrt(np.mean(sig ** 2))), 1),
        })
    (OUT / "manifest.json").write_text(json.dumps(
        {"sampleRate": SR, "lengthUnit": "seconds", "framesUnit": "render frames at 60 fps (ceil)", "sfx": manifest}, indent=2) + "\n")

    ids = ",\n".join(f"  '{m['id']}'" for m in manifest)
    rows = ",\n".join(
        f"  '{m['id']}': {{ file: '{m['file']}', channels: {m['channels']}, length: {m['length']}, frames: {m['frames']} }}"
        for m in manifest)
    TS_OUT.write_text(
        "// Generated by scripts/make_dontsay_sfx.py from public/dontsay/sfx/manifest.json. Do not edit by hand.\n"
        "import { staticFile } from 'remotion';\n\n"
        f"export const SFX_IDS = [\n{ids},\n] as const;\n\n"
        "export type SfxId = (typeof SFX_IDS)[number];\n\n"
        "export type SfxEntry = {\n"
        "  file: string;\n"
        "  channels: 1 | 2;\n"
        "  /** seconds */\n"
        "  length: number;\n"
        "  /** render frames at 60 fps (ceil) */\n"
        "  frames: number;\n"
        "};\n\n"
        f"export const sfxManifest: Record<SfxId, SfxEntry> = {{\n{rows},\n}};\n\n"
        "export const sfxEntry = (id: SfxId): SfxEntry => sfxManifest[id];\n"
        "export const sfxLength = (id: SfxId): number => sfxManifest[id].length;\n"
        "export const sfxFrames = (id: SfxId): number => sfxManifest[id].frames;\n"
        "export const sfxSrc = (id: SfxId): string => staticFile(`dontsay/sfx/${sfxManifest[id].file}`);\n"
        "\n"
        "/** Ids that come in numbered sets: tick-1..N (pitch rises per second), level-card-1..N (one per level colour), callback-chime-1..N. */\n"
        "export const tickId = (second: number): SfxId =>\n"
        "  `tick-${Math.min(Math.max(Math.round(second), 1), " + str(TICK_COUNT) + ")}` as SfxId;\n"
        "export const levelCardId = (level: number): SfxId =>\n"
        "  `level-card-${Math.min(Math.max(Math.round(level), 1), " + str(LEVEL_COUNT) + ")}` as SfxId;\n"
        "export const callbackChimeId = (index: number): SfxId =>\n"
        "  `callback-chime-${Math.min(Math.max(Math.round(index), 1), " + str(CALLBACK_COUNT) + ")}` as SfxId;\n")
    for m in manifest:
        print(f"{m['id']:20s} {m['length']:5.2f}s  {m['channels']}ch  peak {m['peakDb']:5.1f}  rms {m['rmsDb']:6.1f}")


if __name__ == "__main__":
    main()
