#!/usr/bin/env python3
"""Synthesize the Christmas Movie Emoji Quiz sound effects (original, numpy synthesis, royalty-free).

Every sound is generated from scratch with numpy (sines, decaying glass partials, filtered noise), then finished through
a small pedalboard chain: high-pass, gentle compressor, limiter. No samples, no recordings, no tunes: every sound is a
single soft event (tick, whoosh, pop, ping), nothing that sounds like a melody or a song.

Writes 48 kHz 16-bit mono wavs to public/xmas/sfx/, public/xmas/sfx/manifest.json and src/xmas/sfx-ids.ts (typed ids,
read by src/xmas/sfx.ts).  Needs:  pip install numpy pedalboard      Run:  python3 scripts/make_xmas_sfx.py
Pattern: scripts/make_gta6_sfx.py and scripts/make_nfl_sfx.py.

Level: every file is scaled so its peak is exactly PEAK_DB (-3 dBFS) after the chain. Relative loudness is set in the
scenes (Remotion volume), the manifest lists rms so a quiet sound can be seen at a glance.
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 48000
PEAK_DB = -3.0
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "xmas" / "sfx"
IDS_TS = ROOT / "src" / "xmas" / "sfx-ids.ts"
rng = np.random.default_rng(25)

# One soft glass voice: inharmonic partials (ratio, amp, decay multiplier).
GLASS = ((1.0, 1.0, 1.0), (2.32, 0.30, 1.3), (4.25, 0.14, 1.6), (6.63, 0.06, 2.0))


def t_axis(sec):
    return np.arange(int(round(sec * SR))) / SR


def fade(sig, a=0.003, r=0.012):
    s = sig.copy()
    na, nr = int(a * SR), int(r * SR)
    if na:
        s[:na] *= np.linspace(0, 1, na)
    if nr:
        s[-nr:] *= np.linspace(1, 0, nr)
    return s


def place(buf, sig, at):
    i = int(round(at * SR))
    n = min(len(sig), len(buf) - i)
    if n > 0:
        buf[i:i + n] += sig[:n]


def glass(f0, sec, decay=6.0, amp=1.0, attack=0.002, partials=GLASS):
    t = t_axis(sec)
    sig = np.zeros_like(t)
    for r, a, dm in partials:
        sig += a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-decay * dm * t)
    return fade(sig * np.minimum(1, t / attack) * amp, 0, 0.01)


def sweep(f_from, f_to, sec, decay, attack=0.004):
    """Sine whose frequency glides f_from -> f_to (exponential), with a decaying envelope."""
    t = t_axis(sec)
    f = f_from * (f_to / f_from) ** (t / sec)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return fade(np.sin(phase) * np.exp(-decay * t) * np.minimum(1, t / attack), 0, 0.01)


def noise_band(sec, centers, q=1.2):
    """Noise through a band-pass whose centre follows `centers(progress)` (STFT overlap-add)."""
    n = int(sec * SR)
    x = rng.standard_normal(n)
    win, hop = 1024, 256
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


def bell_env(sec, peak=0.4, power=1.0):
    t = np.linspace(0, 1, int(sec * SR))
    rise = np.minimum(1, t / peak) ** power
    fall = np.minimum(1, (1 - t) / (1 - peak)) ** (power * 1.4)
    return rise * fall


def click(amp=1.0, dur=0.004, lo=2500):
    t = t_axis(dur)
    x = rng.standard_normal(len(t))
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)  # high-pass
    return np.fft.irfft(spec, len(x)) * np.exp(-1100 * t) * amp


def chain(sig, hp=80, comp=True):
    """High-pass, gentle compressor, limiter (pedalboard). `sig` is mono; returns mono."""
    from pedalboard import Compressor, Gain, HighpassFilter, Limiter, Pedalboard
    x = np.pad(sig, (0, int(0.02 * SR))).astype(np.float32)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
    fx = [HighpassFilter(hp)]
    if comp:
        fx.append(Compressor(threshold_db=-18, ratio=1.8, attack_ms=3, release_ms=90))
    fx += [Gain(1.0), Limiter(threshold_db=-1.0, release_ms=60)]
    return Pedalboard(fx)(x[None, :], SR)[0].astype(np.float64)


def finish(sig, hp=80, comp=True):
    y = chain(sig, hp, comp)
    y = fade(y, 0.0, 0.012)
    return y / (np.max(np.abs(y)) + 1e-9) * 10 ** (PEAK_DB / 20)


def build():
    out = {}

    # tiles-in: soft glass whoosh, the two clue tiles gliding in (noise band sweeping up, a faint shimmer at the end).
    sec = 0.5
    w = noise_band(sec, lambda p: 500 + 2600 * p ** 1.3, q=1.1) * bell_env(sec, 0.55, 1.2)
    shim = glass(2900, 0.2, decay=14, amp=0.10)
    buf = np.zeros(int(sec * SR))
    buf += w
    place(buf, shim, 0.28)
    out["tiles-in"] = finish(buf, hp=150)

    # tick-01..tick-10: one soft tick per timer segment, pitch rising slightly with each number (about 3% a step).
    for i in range(10):
        f = 760 * 1.028 ** i
        t = t_axis(0.09)
        body = np.sin(2 * np.pi * f * t) * np.exp(-55 * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-80 * t)
        sig = body * np.minimum(1, t / 0.0015)
        sig[: int(0.004 * SR)] += click(0.25, 0.004, 3000)
        out[f"tick-{i + 1:02d}"] = finish(sig, hp=200, comp=False)

    # timer-full: a short soft flash (bright air burst plus a faint high ping), not a beep.
    sec = 0.22
    t = t_axis(sec)
    flash = noise_band(sec, lambda p: 5200 - 2200 * p, q=0.8) * np.exp(-16 * t) * np.minimum(1, t / 0.004)
    flash += glass(2350, sec, decay=18, amp=0.22)
    out["timer-full"] = finish(flash, hp=500)

    # reveal-chime: one clean glass sound, nothing else.
    out["reveal-chime"] = finish(glass(1318.5, 1.1, decay=4.6, partials=((1, 1.0, 1.0), (2.32, 0.18, 1.4), (4.25, 0.06, 1.8))), hp=300)

    # bulb-on: tiny glow pop, a short upward blip with a soft click.
    sig = sweep(430, 1050, 0.13, decay=26)
    sig[: int(0.004 * SR)] += click(0.18, 0.004, 3500)
    sig = sig + glass(2100, 0.13, decay=30, amp=0.12)[: len(sig)]
    out["bulb-on"] = finish(sig, hp=200)

    # bonus-banner: a warm swell of air, then one soft gold glass ping.
    sec = 0.8
    buf = noise_band(sec, lambda p: 700 + 1800 * p, q=1.0) * bell_env(sec, 0.45, 1.3) * 0.7
    place(buf, glass(880, 0.55, decay=5.0, amp=0.9, partials=((1, 1.0, 1.0), (2.0, 0.22, 1.2), (3.0, 0.08, 1.6))), 0.22)
    out["bonus-banner"] = finish(buf, hp=200)

    # gold-bulb: a warm gold ping with a faint sparkle on top.
    buf = np.zeros(int(0.5 * SR))
    place(buf, glass(1568, 0.5, decay=7.5, amp=1.0), 0)
    place(buf, glass(4100, 0.18, decay=24, amp=0.14), 0.012)
    out["gold-bulb"] = finish(buf, hp=300)

    # rank-reveal: a slow soft rise of air, then one deep glass bell with a long tail.
    sec = 1.3
    buf = noise_band(sec, lambda p: 400 + 2200 * p ** 1.5, q=1.0) * bell_env(sec, 0.4, 1.4) * 0.55
    place(buf, glass(660, 0.95, decay=3.4, amp=1.0, partials=((1, 1.0, 1.0), (2.32, 0.28, 1.3), (4.25, 0.10, 1.7))), 0.38)
    out["rank-reveal"] = finish(buf, hp=120)

    # type-key: a soft key click (Spotlight typing).
    t = t_axis(0.055)
    key = np.sin(2 * np.pi * 330 * t) * np.exp(-90 * t) * 0.8 + 0.5 * np.sin(2 * np.pi * 1700 * t) * np.exp(-140 * t)
    key[: int(0.004 * SR)] += click(0.3, 0.004, 2000)
    out["type-key"] = finish(key * np.minimum(1, t / 0.0012), hp=150, comp=False)

    # focus-lock: a soft focus confirm: a small settling glide with a faint low thud. Not a shutter.
    sig = sweep(760, 520, 0.26, decay=13, attack=0.01) * 0.9
    thud = np.zeros_like(sig)
    place(thud, sweep(190, 110, 0.12, decay=38, attack=0.003), 0.19)
    out["focus-lock"] = finish(sig + 0.35 * thud, hp=100)

    # clean-sparkle: a handful of tiny high glass sparkles, uneven in time and pitch, no pattern that reads as a tune.
    sec = 0.7
    buf = np.zeros(int(sec * SR))
    for at, f, a in ((0.00, 5200, 0.9), (0.07, 6900, 0.6), (0.13, 4300, 0.7), (0.22, 7600, 0.45), (0.31, 5600, 0.5), (0.43, 6300, 0.3)):
        place(buf, glass(f, 0.22, decay=22, amp=a, partials=((1, 1.0, 1.0), (1.51, 0.3, 1.4))), at)
    out["clean-sparkle"] = finish(buf, hp=1500)

    # flash-blip: a very short soft blip, one per light flash (Count the Lights).
    t = t_axis(0.075)
    blip = np.sin(2 * np.pi * 1040 * t) * np.exp(-48 * t) * np.minimum(1, t / 0.004)
    out["flash-blip"] = finish(blip, hp=300, comp=False)

    # swipe: the app-switcher card moving: a quick soft air sweep, high to low.
    sec = 0.3
    sw = noise_band(sec, lambda p: 2200 - 1300 * p, q=1.0) * bell_env(sec, 0.35, 1.2)
    out["swipe"] = finish(sw, hp=300)

    # widget-pop: a soft bubble pop, short upward glide with a tiny glass top.
    sig = sweep(300, 560, 0.16, decay=24)
    sig = sig + glass(1500, 0.16, decay=26, amp=0.10)[: len(sig)]
    sig[: int(0.003 * SR)] += click(0.12, 0.003, 2500)
    out["widget-pop"] = finish(sig, hp=120)

    # ring-glow: a soft glow swelling around the odd tree: slow glass swell with a little air.
    sec = 0.85
    t = t_axis(sec)
    env = bell_env(sec, 0.55, 1.6)
    swell = (np.sin(2 * np.pi * 740 * t) + 0.25 * np.sin(2 * np.pi * 740 * 2.32 * t) + 0.1 * np.sin(2 * np.pi * 740 * 4.25 * t)) * env
    air = noise_band(sec, lambda p: 3200 + 900 * p, q=1.2) * env * 0.12
    out["ring-glow"] = finish(swell * 0.8 + air, hp=250)

    return out


def write_wav(path, sig):
    pcm = (np.clip(sig, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    IDS_TS.parent.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sid, sig in build().items():
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
        "// Generated by scripts/make_xmas_sfx.py. Do not edit by hand.\n"
        f"export const SFX_IDS = [\n{ids},\n] as const;\n")
    for m in manifest:
        print(f"{m['id']:14s} {m['length']:5.2f}s  peak {m['peakDb']:5.1f}  rms {m['rmsDb']:6.1f}")


if __name__ == "__main__":
    main()
