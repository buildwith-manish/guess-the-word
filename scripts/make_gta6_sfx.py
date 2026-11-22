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


def build():
    s = {}

    # chime-easy: soft rising three-note bell
    b = np.zeros(int(1.1 * SR))
    for i, f in enumerate((1046.5, 1318.5, 1568.0)):
        place(b, bell(f, 0.9, 5.0) * (0.8 + 0.1 * i), i * 0.09)
    s["chime-easy"] = b

    # ping-medium: system-alert style two-tone ping
    b = np.zeros(int(0.7 * SR))
    place(b, bell(880, 0.5, 9.0, ((1, 1), (2, 0.2))), 0)
    place(b, bell(1174.7, 0.5, 9.0, ((1, 1), (2, 0.2))), 0.12)
    s["ping-medium"] = b

    # pulse-hard: timer chime followed by two low pulses
    b = np.zeros(int(1.3 * SR))
    place(b, bell(1318.5, 0.6, 7.0), 0)
    for at in (0.18, 0.62):
        t = t_axis(0.4)
        f = 55 + 40 * np.exp(-14 * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        place(b, fade(np.sin(ph) * np.exp(-7 * t), 0.003, 0.02) * 1.6, at)
    s["pulse-hard"] = b

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

    # notification: glassy two-note
    b = np.zeros(int(0.9 * SR))
    place(b, bell(1568.0, 0.6, 8.0, ((1, 1), (3.0, 0.15))), 0)
    place(b, bell(2093.0, 0.7, 7.0, ((1, 1), (3.0, 0.15))), 0.15)
    s["notification"] = b

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

    # scorecard: swelling major chord with sparkle on top
    d = 1.8
    t = t_axis(d)
    swell = np.minimum(1, t / 0.35) * np.exp(-1.4 * np.maximum(t - 0.35, 0))
    chord = sum(np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t) for f in (261.6, 329.6, 392.0, 523.3))
    b = fade(chord * swell * 0.25, 0.01, 0.2)
    place(b, bell(2093.0, 1.0, 4.5), 0.35)
    place(b, bell(2637.0, 0.9, 4.5) * 0.7, 0.45)
    s["scorecard"] = b
    return s


def normalise(sig):
    sig = sig - np.mean(sig)
    peak = np.max(np.abs(sig)) + 1e-12
    rms = np.sqrt(np.mean(sig ** 2)) + 1e-12
    g_peak = 10 ** (PEAK_DB / 20) / peak
    g_rms = 10 ** (TARGET_RMS_DB / 20) / rms
    return sig * min(g_peak, g_rms)


def write_wav(path, sig):
    pcm = np.clip(sig, -1, 1)
    pcm = (pcm * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sid, sig in build().items():
        sig = normalise(sig)
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
