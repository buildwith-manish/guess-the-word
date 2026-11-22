#!/usr/bin/env python3
"""Synthesize the GTA 6 quiz sound effects (original, numpy only, royalty-free).

Writes 48 kHz 16-bit mono wavs to public/gta6/sfx/, public/gta6/sfx/manifest.json
and src/gta6/sfx-ids.ts (typed id list).  Run: python3 scripts/make_gta6_sfx.py

Level: each sound is scaled so its RMS reaches TARGET_RMS_DB (a loudness proxy,
close to -16 LUFS for sustained sounds), but never so far that the peak goes
above PEAK_DB (-3 dBFS).  Short impulsive sounds end up peak-limited.
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 48000
PEAK_DB = -3.0
TARGET_RMS_DB = -19.0
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "gta6" / "sfx"
IDS_TS = ROOT / "src" / "gta6" / "sfx-ids.ts"
rng = np.random.default_rng(6)


def t_axis(sec):
    return np.arange(int(round(sec * SR))) / SR


def place(buf, sig, at):
    i = int(round(at * SR))
    n = min(len(sig), len(buf) - i)
    if n > 0:
        buf[i:i + n] += sig[:n]


def fade(sig, a=0.004, r=0.01):
    s = sig.copy()
    na, nr = int(a * SR), int(r * SR)
    if na:
        s[:na] *= np.linspace(0, 1, na)
    if nr:
        s[-nr:] *= np.linspace(1, 0, nr)
    return s


def bell(freq, sec, decay=6.0, partials=((1, 1.0), (2.76, 0.25), (5.4, 0.08)), attack=0.003):
    t = t_axis(sec)
    sig = np.zeros_like(t)
    for ratio, amp in partials:
        sig += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-decay * ratio ** 0.5 * t)
    env = np.minimum(1, t / attack)
    return fade(sig * env, 0, 0.02)


def soft_tone(freq, sec, decay=5.0):
    t = t_axis(sec)
    sig = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return fade(sig * np.exp(-decay * t) * np.minimum(1, t / 0.006), 0, 0.02)


def noise_filtered(sec, centers, q=1.2):
    """Noise through a band-pass whose centre follows `centers(progress)` (STFT overlap-add)."""
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
        bw = c / q
        mask = np.exp(-0.5 * ((freqs - c) / bw) ** 2)
        y = np.fft.irfft(np.fft.rfft(seg * w) * mask) * w
        out[s:s + win] += y
        norm[s:s + win] += w ** 2
    return out[:n] / np.maximum(norm[:n], 1e-6)


def lowpass(sig, cutoff):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(sig))


def highpass_noise(n, cutoff=3500, gen=None):
    x = (gen or rng).standard_normal(n)
    return x - lowpass(x, cutoff)


def studio(sig, tail, hp, room, wet, comp, width=1.0):
    """Studio chain on a (channels, samples) array: high-pass, optional gentle compression, soft saturation, room reverb, limiter."""
    from pedalboard import Compressor, Distortion, Gain, HighpassFilter, Limiter, Pedalboard, Reverb
    x = np.pad(sig, ((0, 0), (0, int(tail * SR)))).astype(np.float32)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
    chain = [HighpassFilter(hp)]
    if comp:
        chain.append(Compressor(threshold_db=-16, ratio=2.0, attack_ms=2, release_ms=80))
    chain += [
        Distortion(drive_db=2.5),  # soft tanh saturation: a touch of warmth
        Reverb(room_size=room, damping=0.6, wet_level=wet, dry_level=0.9, width=width),
        Gain(-1.0),
        Limiter(threshold_db=-1.0),
    ]
    return Pedalboard(chain)(x, SR).T.astype(np.float64)  # -> (samples, channels)


# Glass-like voice: inharmonic partials (ratio, amp, decay multiplier) that drift apart a little left and right, so the
# partials beat slowly like real glass. Returns a (2, n) stereo buffer.
GLASS = ((1.0, 1.0, 1.0), (2.32, 0.30, 1.3), (4.25, 0.14, 1.6), (6.63, 0.06, 2.0))


def fade2(sig, a=0.0, r=0.02):
    return np.stack([fade(ch, a, r) for ch in sig])


def glass_st(f0, dur, decay=5.0, amp=1.0, partials=GLASS, drift=0.5):
    t = t_axis(dur)
    out = np.zeros((2, len(t)))
    for ch, side in enumerate((-1, 1)):
        for r, a, dm in partials:
            out[ch] += a * np.sin(2 * np.pi * (f0 * r + side * drift * (1 + 0.5 * r)) * t) * np.exp(-decay * dm * t)
        out[ch] *= np.minimum(1, t / 0.002)
    return fade2(out * amp)


def place2(buf, sig, at):
    i = int(round(at * SR))
    n = min(sig.shape[1], buf.shape[1] - i)
    if n > 0:
        buf[:, i:i + n] += sig[:, :n]


click_rng = np.random.default_rng(66)  # own generator: the clicks must not shift the draws of the other sounds


def click2(amp=0.3, dur=0.004):
    t = t_axis(dur)
    c = highpass_noise(len(t), gen=click_rng) * np.exp(-900 * t) * amp
    return np.stack([c, c])


def build():
    s = {}

    # ---- premium level / alert sounds: glass voices, stereo, studio chain (needs `pip install pedalboard`).
    # Same ids and same hit-at-t=0 as before, so every existing cue (level card launch, banners, score cards) stays in place.

    # chime-easy: soft rising three-note glass chime with a light sparkle on top
    b = np.zeros((2, int(1.5 * SR)))
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        place2(b, glass_st(f, 1.2, 4.2, 0.8 + 0.1 * i), i * 0.09)
    place2(b, glass_st(2093.0, 0.9, 5.5, 0.35), 0.27)
    s["chime-easy"] = studio(b, tail=0.3, hp=150, room=0.45, wet=0.28, comp=True, width=0.7)

    # ping-medium: warmer, woodier two-tone ping (harmonic partials, faster decay), amber to the green chime's glass
    wood = ((1.0, 1.0, 1.0), (2.0, 0.35, 1.8), (3.0, 0.12, 2.5))
    b = np.zeros((2, int(1.0 * SR)))
    place2(b, glass_st(880.0, 0.6, 9.0, 1.0, wood, 0.3), 0)
    place2(b, glass_st(1174.7, 0.6, 9.0, 0.9, wood, 0.3), 0.12)
    place2(b, click2(0.25), 0)
    s["ping-medium"] = studio(b, tail=0.25, hp=150, room=0.25, wet=0.15, comp=True, width=0.6)

    # pulse-hard: dark glass timer chime, then two low pulses with a saturated sub (still audible on phone speakers)
    b = np.zeros((2, int(1.5 * SR)))
    place2(b, glass_st(1318.5, 0.8, 7.0, 0.8), 0)
    for at in (0.18, 0.62):
        t = t_axis(0.45)
        f = 55 + 40 * np.exp(-14 * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        pulse = fade(np.sin(ph) * np.exp(-7 * t) + 0.35 * np.sin(2 * ph) * np.exp(-10 * t), 0.003, 0.02) * 1.6
        place2(b, np.stack([pulse, pulse]), at)
    s["pulse-hard"] = studio(b, tail=0.2, hp=35, room=0.4, wet=0.16, comp=True, width=0.5)

    # tick: dry clock tick
    t = t_axis(0.12)
    click = lowpass(rng.standard_normal(len(t)), 6000) * np.exp(-90 * t)
    s["tick"] = fade(click * 0.8 + np.sin(2 * np.pi * 1900 * t) * np.exp(-60 * t), 0, 0.01)

    # whoosh: app-launch sweep
    d = 0.75
    sig = noise_filtered(d, lambda p: 400 + 5200 * p ** 1.5, q=0.9)
    t = t_axis(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6
    s["whoosh"] = fade(sig * env, 0.01, 0.05)

    # correct: bright rising two-note chime
    b = np.zeros(int(0.9 * SR))
    place(b, bell(1318.5, 0.7, 6.0), 0)
    place(b, bell(1760.0, 0.7, 5.5), 0.1)
    s["correct"] = b

    # wrong-fade: descending soft tone that fades away
    d = 1.0
    t = t_axis(d)
    f = 330 - 110 * (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s["wrong-fade"] = fade((np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-3.2 * t), 0.01, 0.05)

    # buzz-small: short low buzz
    d = 0.28
    t = t_axis(d)
    saw = 2 * ((140 * t) % 1) - 1
    s["buzz-small"] = fade(lowpass(saw, 1500) * np.minimum(1, t / 0.01) * np.exp(-4 * t), 0.004, 0.04)

    # notification: premium glass two-note alert (the most-heard sound in the video: banners, hook, outro asks)
    b = np.zeros((2, int(1.1 * SR)))
    place2(b, glass_st(1568.0, 0.7, 7.5, 1.0, GLASS, 0.4), 0)
    place2(b, glass_st(2093.0, 0.7, 7.0, 0.85, GLASS, 0.4), 0.15)
    t = t_axis(0.18)
    warm = np.sin(2 * np.pi * 392.0 * t) * np.exp(-22 * t) * 0.3
    place2(b, np.stack([warm, warm]), 0)
    place2(b, click2(0.2), 0)
    s["notification"] = studio(b, tail=0.3, hp=200, room=0.3, wet=0.2, comp=True, width=0.6)

    # shake-thud: low thump plus muffled noise
    d = 0.5
    t = t_axis(d)
    f = 45 + 80 * np.exp(-25 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    thump = np.sin(ph) * np.exp(-9 * t)
    nz = lowpass(rng.standard_normal(len(t)), 700) * np.exp(-30 * t) * 0.6
    s["shake-thud"] = fade(thump + nz, 0.002, 0.03)

    # streak: fast rising arpeggio
    b = np.zeros(int(1.4 * SR))
    for i, f in enumerate((523.3, 659.3, 784.0, 1046.5, 1318.5)):
        place(b, bell(f, 0.8, 5.5) * (0.7 + 0.07 * i), i * 0.075)
    s["streak"] = b

    # scorecard: swelling major chord pad (detuned left / right) with glass sparkle on top: the "reward" moment
    d = 1.9
    t = t_axis(d)
    swell = np.minimum(1, t / 0.35) * np.exp(-1.4 * np.maximum(t - 0.35, 0))
    pad = np.zeros((2, len(t)))
    for ch, det in enumerate((-0.7, 0.7)):
        for f in (261.6, 329.6, 392.0, 523.3):
            pad[ch] += np.sin(2 * np.pi * (f + det) * t) + 0.2 * np.sin(2 * np.pi * (2 * f + 2 * det) * t)
    b = fade2(pad * swell * 0.25, 0.01, 0.2)
    place2(b, glass_st(2093.0, 1.2, 4.0, 1.0), 0.35)
    place2(b, glass_st(2637.0, 1.0, 4.2, 0.7), 0.45)
    place2(b, glass_st(3136.0, 0.9, 4.6, 0.4), 0.55)
    s["scorecard"] = studio(b, tail=0.6, hp=90, room=0.5, wet=0.3, comp=True, width=0.8)

    # ---- premium reveal sounds: layered, detuned, stereo, through a small studio chain (needs `pip install pedalboard`) ----
    # reveal-fade (easy reveal, wrong options fading): a soft airy breath that closes down, like an iOS dismiss.
    # 0.5 s = the fade length (timing.ts revealFadeSec) plus a short room tail. Two independent noise channels = natural width.
    d = 0.5
    t = t_axis(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.6) ** 2
    chans = [fade(noise_filtered(d, lambda p: 2600 - 1900 * p, q=0.8) * env, 0.02, 0.12) for _ in range(2)]
    air = np.stack(chans)
    s["reveal-fade"] = studio(air, tail=0.25, hp=180, room=0.3, wet=0.22, comp=False)

    # reveal-pop (easy reveal, the correct option lights up and pops). Layers: (1) a glass bell whose partials are
    # inharmonic and detuned a little differently left and right (slow beating = real glass), (2) a soft warm body,
    # (3) a 3 ms click for the "touch", (4) a quiet sparkle panned off-centre. The hit is at t = 0 (cue = first tick of the pop).
    n = int(1.2 * SR)
    tt = t_axis(1.2)
    glass_partials = ((1.0, 1.0, 5.0), (2.32, 0.30, 6.5), (4.25, 0.14, 8.0), (6.63, 0.06, 10.0))  # ratio, amp, decay

    def glass(f0, side):
        out = np.zeros(n)
        for r, amp, dec in glass_partials:
            det = side * (0.5 + 0.25 * r)  # Hz: left and right drift apart, so the partials beat slowly
            out += amp * np.sin(2 * np.pi * (f0 * r + det) * tt) * np.exp(-dec * tt)
        return out * np.minimum(1, tt / 0.002)

    body_t = t_axis(0.35)
    body = np.sin(2 * np.pi * np.cumsum(190 - 80 * np.clip(body_t / 0.12, 0, 1)) / SR) * np.exp(-14 * body_t)
    body = np.pad(body, (0, n - len(body)))
    click_t = t_axis(0.004)
    click = np.pad(highpass_noise(len(click_t)) * np.exp(-900 * click_t), (0, n - len(click_t)))
    spark = np.zeros(n)
    place(spark, bell(3136.0, 0.6, 7.0, ((1, 1.0), (2.76, 0.15)), attack=0.002), 0.045)
    L = glass(1568.0, -1) + 0.5 * body + 0.35 * click + 0.22 * spark
    R = glass(1568.0, +1) + 0.5 * body + 0.35 * click + 0.42 * spark  # sparkle sits slightly right
    s["reveal-pop"] = studio(np.stack([L, R]), tail=0.0, hp=110, room=0.35, wet=0.2, comp=True, width=0.5)
    return s


# Per-sound level trim in dB on top of the shared loudness target (the reveal sounds sit under the voice).
LEVEL_DB = {"reveal-fade": -10.0, "reveal-pop": -2.0, "notification": -2.0}


def normalise(sig, trim_db=0.0):
    sig = sig - np.mean(sig, axis=0)
    peak = np.max(np.abs(sig)) + 1e-12
    rms = np.sqrt(np.mean(sig ** 2)) + 1e-12
    g_peak = 10 ** (PEAK_DB / 20) / peak
    g_rms = 10 ** (TARGET_RMS_DB / 20) / rms
    return sig * min(g_peak, g_rms) * 10 ** (trim_db / 20)


def write_wav(path, sig):
    pcm = np.clip(sig, -1, 1)
    pcm = (pcm * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1 if pcm.ndim == 1 else pcm.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sid, sig in build().items():
        sig = normalise(sig, LEVEL_DB.get(sid, 0.0))
        write_wav(OUT / f"{sid}.wav", sig)
        sec = len(sig) / SR
        manifest.append({
            "id": sid,
            "file": f"{sid}.wav",
            "length": round(sec, 3),
            "frames": int(np.ceil(sec * 30)),
            "peakDb": round(20 * np.log10(np.max(np.abs(sig))), 1),
            "rmsDb": round(20 * np.log10(np.sqrt(np.mean(sig ** 2))), 1),
        })
    (OUT / "manifest.json").write_text(json.dumps(
        {"sampleRate": SR, "lengthUnit": "seconds", "framesUnit": "design frames at 30 fps (ceil)", "sfx": manifest}, indent=2) + "\n")
    ids = ",\n".join(f"  '{m['id']}'" for m in manifest)
    IDS_TS.write_text(
        "// Generated by scripts/make_gta6_sfx.py. Do not edit by hand.\n"
        f"export const SFX_IDS = [\n{ids},\n] as const;\n")
    for m in manifest:
        print(f"{m['id']:14s} {m['length']:5.2f}s  peak {m['peakDb']:5.1f}  rms {m['rmsDb']:6.1f}")


if __name__ == "__main__":
    main()
