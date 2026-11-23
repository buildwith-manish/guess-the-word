#!/usr/bin/env python3
"""Synthesize the NFL Scouting Card Quiz sound effects (original, numpy synthesis, royalty-free).

Every sound is generated from scratch with numpy (sines, filtered noise, decaying partials), then finished through the
same small pedalboard chain: high-pass, gentle compressor, limiter. No samples, no recordings, nothing copyrighted.

Writes 48 kHz 16-bit mono wavs to public/nfl/sfx/, public/nfl/sfx/manifest.json and src/nfl/sfx-ids.ts (typed ids and
lengths, read by src/nfl/sfx.ts).

Run:  pip install numpy pedalboard && python3 scripts/make_nfl_sfx.py

Level: each sound is scaled so its RMS reaches TARGET_RMS_DB (a loudness proxy), but never so far that the peak goes
above PEAK_DB (-3 dBFS). Short impulsive sounds end up peak-limited. The script exits 1 if any file peaks above -3 dB.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from pedalboard import Compressor, HighpassFilter, Limiter, Pedalboard

SR = 48000
PEAK_DB = -3.0
TARGET_RMS_DB = -19.0
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "nfl" / "sfx"
IDS_TS = ROOT / "src" / "nfl" / "sfx-ids.ts"
rng = np.random.default_rng(32)  # deterministic: the same files on every run

# Pitch ladders. Clue flips rise with the clue number; points drops fall with the points left.
FLIP_HZ = {1: 523.3, 2: 587.3, 3: 659.3, 4: 784.0, 5: 880.0}
DROP_HZ = {5: 1350.0, 4: 1200.0, 3: 1050.0, 2: 900.0, 1: 750.0}


# ---------------------------------------------------------------- synthesis helpers


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
    return fade(sig * np.minimum(1, t / attack), 0, 0.02)


def soft_tone(freq, sec, decay=5.0, harmonic=0.3):
    t = t_axis(sec)
    sig = np.sin(2 * np.pi * freq * t) + harmonic * np.sin(2 * np.pi * freq * 2 * t)
    return fade(sig * np.exp(-decay * t) * np.minimum(1, t / 0.006), 0, 0.02)


def lowpass(sig, cutoff):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(sig))


def highpass_noise(n, cutoff=3500):
    x = rng.standard_normal(n)
    return x - lowpass(x, cutoff)


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
        mask = np.exp(-0.5 * ((freqs - c) / (c / q)) ** 2)
        y = np.fft.irfft(np.fft.rfft(seg * w) * mask) * w
        out[s:s + win] += y
        norm[s:s + win] += w ** 2
    return out[:n] / np.maximum(norm[:n], 1e-6)


def click(amp=0.3, dur=0.004, cutoff=3500):
    t = t_axis(dur)
    return highpass_noise(len(t), cutoff) * np.exp(-900 * t) * amp


def thump(sec=0.4, f_lo=50.0, f_hi=130.0, rate=22.0, decay=8.0):
    t = t_axis(sec)
    ph = 2 * np.pi * np.cumsum(f_lo + (f_hi - f_lo) * np.exp(-rate * t)) / SR
    return fade(np.sin(ph) * np.exp(-decay * t), 0.002, 0.03)


def sweep_noise(sec, f0, f1, power=1.4, q=0.9, shape=1.6):
    sig = noise_filtered(sec, lambda p: f0 + (f1 - f0) * p ** power, q=q)
    t = t_axis(sec)
    env = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** shape
    return fade(sig * env, 0.01, 0.05)


# ---------------------------------------------------------------- the sounds


def build():
    s = {}

    # card-in: soft whoosh as the scouting card slides in, with a tiny soft landing
    b = np.zeros(int(0.7 * SR))
    place(b, sweep_noise(0.55, 300, 2100, power=1.3, q=0.8, shape=1.8), 0)
    place(b, soft_tone(196.0, 0.28, 11.0) * 0.18, 0.4)
    s["card-in"] = b

    # clue-flip-1..5: paper flip (two tiny noise ticks) plus a soft tone that rises with the clue number
    for k, f in FLIP_HZ.items():
        b = np.zeros(int(0.34 * SR))
        place(b, click(0.35, 0.012, 2500), 0)
        place(b, click(0.22, 0.010, 3000), 0.045)
        place(b, soft_tone(f, 0.28, 12.0, 0.25) * 0.8, 0.03)
        s[f"clue-flip-{k}"] = b

    # points-drop-5..1: soft tick, lower for each point left (5 = highest, 1 = lowest)
    for p, f in DROP_HZ.items():
        t = t_axis(0.14)
        tick = np.sin(2 * np.pi * f * t) * np.exp(-48 * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-70 * t)
        tick = fade(tick * np.minimum(1, t / 0.002), 0, 0.01)
        b = np.zeros(len(t))
        place(b, tick, 0)
        place(b, click(0.12, 0.004, 3000), 0)
        s[f"points-drop-{p}"] = b

    # lock-shake: the locked card refuses: three quick low thumps with a muffled rattle
    b = np.zeros(int(0.6 * SR))
    for i, (at, f_lo) in enumerate(((0.0, 55.0), (0.13, 48.0), (0.26, 55.0))):
        place(b, thump(0.28, f_lo, f_lo + 85, 24.0, 11.0) * (1.0 - 0.12 * i), at)
        place(b, lowpass(rng.standard_normal(int(0.1 * SR)), 900) * np.exp(-40 * t_axis(0.1)) * 0.5, at)
    s["lock-shake"] = b

    # lock-open: latch click, then a soft rising two-note chime
    b = np.zeros(int(1.0 * SR))
    place(b, click(0.7, 0.006, 2200), 0)
    place(b, click(0.5, 0.005, 3200), 0.07)
    place(b, bell(880.0, 0.8, 6.0) * 0.8, 0.12)
    place(b, bell(1318.5, 0.8, 5.5) * 0.85, 0.24)
    s["lock-open"] = b

    # name-reveal: bright major chime with a sparkle on top: the answer moment
    b = np.zeros(int(2.0 * SR))
    place(b, bell(1046.5, 1.8, 3.6), 0)
    place(b, bell(1318.5, 1.6, 3.8) * 0.8, 0.06)
    place(b, bell(1568.0, 1.5, 4.0) * 0.7, 0.12)
    place(b, bell(2093.0, 1.1, 5.0, ((1, 1.0), (2.76, 0.12))) * 0.45, 0.2)
    s["name-reveal"] = b

    # wallet-stack: cards drop onto the stack: six quick soft taps rising in pitch, then a settle thud
    b = np.zeros(int(1.2 * SR))
    for i in range(6):
        at = 0.075 * i
        place(b, click(0.4, 0.008, 2200), at)
        place(b, soft_tone(330.0 * 2 ** (i / 12), 0.12, 24.0, 0.2) * 0.6, at)
    place(b, thump(0.35, 70.0, 150.0, 25.0, 10.0) * 0.7, 0.5)
    place(b, bell(1568.0, 0.7, 7.0, ((1, 1.0), (2.76, 0.12))) * 0.25, 0.52)
    s["wallet-stack"] = b

    # notification: soft two-note ping, the "something arrived" alert
    b = np.zeros(int(1.1 * SR))
    place(b, bell(1568.0, 0.8, 7.0, ((1, 1.0), (2.32, 0.2), (4.25, 0.08))), 0)
    place(b, bell(2093.0, 0.8, 6.5, ((1, 1.0), (2.32, 0.2), (4.25, 0.08))) * 0.85, 0.15)
    place(b, soft_tone(392.0, 0.18, 22.0) * 0.3, 0)
    place(b, click(0.2, 0.004, 3500), 0)
    s["notification"] = b

    # streak: fast rising five-note arpeggio
    b = np.zeros(int(1.4 * SR))
    for i, f in enumerate((587.3, 740.0, 880.0, 1174.7, 1480.0)):
        place(b, bell(f, 0.8, 5.5) * (0.7 + 0.07 * i), i * 0.075)
    s["streak"] = b

    # tmw-tick: fast clock, exactly 1.0 s (8 alternating tick / tock): the two-minute-warning clue clock
    b = np.zeros(SR)
    for i in range(8):
        at = i * 0.125
        f = 2100.0 if i % 2 == 0 else 1500.0
        tt = t_axis(0.06)
        tick = lowpass(rng.standard_normal(len(tt)), 6000) * np.exp(-110 * tt) * 0.7 + np.sin(2 * np.pi * f * tt) * np.exp(-85 * tt)
        place(b, fade(tick, 0, 0.004), at)
    s["tmw-tick"] = b

    # tmw-alert: urgent but not harsh: three alternating beeps, with a low edge
    b = np.zeros(int(1.0 * SR))
    for i in range(3):
        at = i * 0.27
        for j, f in enumerate((988.0, 740.0)):
            tt = t_axis(0.12)
            beep = (2 * np.abs(2 * ((f * tt) % 1) - 1) - 1) * 0.5 + np.sin(2 * np.pi * f * tt) * 0.6  # triangle + sine
            place(b, fade(lowpass(beep, 4000) * np.exp(-6 * tt), 0.004, 0.02), at + 0.12 * j)
    place(b, thump(0.3, 60.0, 110.0, 20.0, 9.0) * 0.5, 0)
    s["tmw-alert"] = b

    # level-rookie: soft chime, gentle and low-key (green)
    b = np.zeros(int(1.4 * SR))
    place(b, bell(1318.5, 1.1, 4.5) * 0.9, 0)
    place(b, bell(1568.0, 1.0, 4.8) * 0.7, 0.1)
    place(b, bell(2093.0, 0.8, 6.0, ((1, 1.0), (2.76, 0.1))) * 0.3, 0.2)
    s["level-rookie"] = b

    # level-starter: system ping, woodier and warmer than the chime (amber)
    wood = ((1.0, 1.0), (2.0, 0.35), (3.0, 0.12))
    b = np.zeros(int(1.0 * SR))
    place(b, bell(880.0, 0.6, 8.0, wood), 0)
    place(b, bell(1174.7, 0.6, 8.0, wood) * 0.9, 0.12)
    place(b, click(0.25, 0.004, 3000), 0)
    s["level-starter"] = b

    # level-hof: timer-style chime, then two low pulses with a saturated sub (red, still audible on phone speakers)
    b = np.zeros(int(1.5 * SR))
    place(b, bell(1318.5, 0.9, 6.0) * 0.8, 0)
    for at in (0.18, 0.62):
        t = t_axis(0.45)
        ph = 2 * np.pi * np.cumsum(55 + 40 * np.exp(-14 * t)) / SR
        pulse = fade(np.sin(ph) * np.exp(-7 * t) + 0.35 * np.sin(2 * ph) * np.exp(-10 * t), 0.003, 0.02) * 1.6
        place(b, np.tanh(pulse * 1.5), at)
    s["level-hof"] = b

    # score-card: swelling major chord pad with a glass sparkle on top: the reward moment
    d = 1.9
    t = t_axis(d)
    swell = np.minimum(1, t / 0.35) * np.exp(-1.4 * np.maximum(t - 0.35, 0))
    pad = np.zeros(len(t))
    for f in (261.6, 329.6, 392.0, 523.3):
        for det in (-0.7, 0.7):
            pad += (np.sin(2 * np.pi * (f + det) * t) + 0.2 * np.sin(2 * np.pi * (2 * f + 2 * det) * t)) * 0.5
    b = fade(pad * swell * 0.25, 0.01, 0.2)
    place(b, bell(2093.0, 1.2, 4.0) * 0.9, 0.35)
    place(b, bell(2637.0, 1.0, 4.2) * 0.6, 0.45)
    place(b, bell(3136.0, 0.9, 4.6) * 0.35, 0.55)
    s["score-card"] = b

    # rank-reveal: rising sweep into a bright stacked hit with a low thump
    b = np.zeros(int(1.6 * SR))
    place(b, sweep_noise(0.55, 400, 4200, power=1.8, q=0.9, shape=2.2), 0)
    place(b, thump(0.4, 55.0, 140.0, 22.0, 8.0) * 0.7, 0.52)
    place(b, bell(784.0, 1.0, 4.5), 0.52)
    place(b, bell(987.8, 1.0, 4.7) * 0.8, 0.54)
    place(b, bell(1174.7, 1.0, 5.0) * 0.7, 0.56)
    place(b, bell(1568.0, 0.8, 6.0, ((1, 1.0), (2.76, 0.12))) * 0.4, 0.6)
    s["rank-reveal"] = b

    # end-sting: three rising notes resolving into a held major chord with a soft low root
    b = np.zeros(int(2.8 * SR))
    for i, f in enumerate((523.3, 659.3, 784.0)):
        place(b, bell(f, 0.6, 7.0) * 0.7, i * 0.12)
    for f, a in ((523.3, 1.0), (659.3, 0.8), (784.0, 0.8), (1046.5, 0.6)):
        place(b, bell(f, 2.2, 2.4) * a, 0.42)
    place(b, soft_tone(130.8, 1.8, 2.2, 0.4) * 0.5, 0.42)
    place(b, bell(2093.0, 1.2, 5.0, ((1, 1.0), (2.76, 0.1))) * 0.3, 0.5)
    s["end-sting"] = b

    return s


# Per-sound high-pass cutoff (Hz) for the chain; low-end sounds keep their sub. Everything else uses the default.
HP_DEFAULT = 120.0
HP_HZ = {"lock-shake": 35.0, "level-hof": 35.0, "rank-reveal": 40.0, "tmw-alert": 45.0, "wallet-stack": 60.0, "end-sting": 70.0}
# Per-sound level trim in dB on top of the shared loudness target (small ticks sit under the voice).
LEVEL_DB = {"points-drop-1": -3, "points-drop-2": -3, "points-drop-3": -3, "points-drop-4": -3, "points-drop-5": -3,
            "tmw-tick": -3.0, "card-in": -2.0, "clue-flip-1": -2, "clue-flip-2": -2, "clue-flip-3": -2,
            "clue-flip-4": -2, "clue-flip-5": -2}
# No added tail for the loop-length sound, a short one for the rest so the limiter release is not cut off.
TAIL_SEC = {"tmw-tick": 0.0}


def finish(sid, sig):
    """Pedalboard chain: high-pass, gentle compressor, limiter. Pure gain afterwards (see normalise)."""
    x = np.pad(sig - np.mean(sig), (0, int(TAIL_SEC.get(sid, 0.05) * SR)))
    x = (x / (np.max(np.abs(x)) + 1e-9) * 0.7).astype(np.float32)[None, :]
    chain = Pedalboard([
        HighpassFilter(cutoff_frequency_hz=HP_HZ.get(sid, HP_DEFAULT)),
        Compressor(threshold_db=-18.0, ratio=1.8, attack_ms=5.0, release_ms=90.0),
        Limiter(threshold_db=-2.0, release_ms=80.0),
    ])
    return chain(x, SR)[0].astype(np.float64)


def normalise(sig, trim_db=0.0):
    peak = np.max(np.abs(sig)) + 1e-12
    rms = np.sqrt(np.mean(sig ** 2)) + 1e-12
    g_peak = 10 ** (PEAK_DB / 20) / peak
    g_rms = 10 ** (TARGET_RMS_DB / 20) / rms
    return sig * min(g_peak, g_rms) * 10 ** (min(trim_db, 0.0) / 20)


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
    for sid, raw in build().items():
        sig = normalise(finish(sid, raw), LEVEL_DB.get(sid, 0.0))
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
    rows = ",\n".join(f"  {{ id: '{m['id']}', file: '{m['file']}', length: {m['length']}, frames: {m['frames']} }}" for m in manifest)
    IDS_TS.write_text(
        "// Generated by scripts/make_nfl_sfx.py. Do not edit by hand.\n"
        f"export const SFX_IDS = [\n{ids},\n] as const;\n\n"
        f"export const SFX_ROWS = [\n{rows},\n] as const;\n")

    for m in manifest:
        print(f"{m['id']:16s} {m['length']:5.2f}s  {m['frames']:3d} fr  peak {m['peakDb']:5.1f}  rms {m['rmsDb']:6.1f}")
    worst = max(m["peakDb"] for m in manifest)
    print(f"{len(manifest)} files, highest peak {worst} dBFS (limit {PEAK_DB})")
    if worst > PEAK_DB + 0.05:
        sys.exit(1)


if __name__ == "__main__":
    main()
