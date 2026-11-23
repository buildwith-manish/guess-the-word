#!/usr/bin/env python3
"""Synthesize the Christmas Movie Emoji Quiz music bed (original, numpy synthesis, no samples, no tune).

A bed, not a song: a warm detuned pad, a few sparse glass-bell / celesta notes picked at random from a C pentatonic
scale with irregular spacing (at least MIN_GAP seconds apart, so no two notes ever form a phrase), and a very faint
sleigh-bell shimmer. Three sections follow the three video parts (pad chords: C/F, F/Am, Am/C; the bells get a little
denser). During each gold bonus round a brighter, higher layer (shimmer pad + higher bells + more jingle) fades in and out.
Tempo 64 BPM; every bell onset sits on the 8th-note grid of that tempo, with random multiples of it as spacing.

Timing comes from docs/xmas/music-map.json (run `npx tsx scripts/export_xmas_music_map.ts` first; it reads timing.ts).
Stem chains (pedalboard): pad = high-pass 80 Hz, low-pass 2.2 kHz, slow chorus; bells = high-pass, chorus, delay;
shimmer = high-pass, low-pass. Master = high-pass 80 Hz, large soft reverb (high wet), low-pass 9 kHz (never fights the
voice), compressor, limiter at -3 dBFS. Finally the file is set to -26 LUFS (the level src/xmas/mix.ts assumes, MIX.musicGain = 1)
and written as an mp3 with 2 s / 4 s fades.

Writes public/xmas/music/bed.mp3 and docs/xmas/music-notes.txt (every bell with its time and pitch, for a listening check).
Needs:  pip install numpy pedalboard pyloudnorm      Run:  python3 scripts/make_xmas_music.py
Env: LENGTH_SEC (default: video length + 20 s), SEED (default 2025).
Memory: about 1.5 GB for a 13-minute file (float32 stereo stems).
"""
import json
import math
import os
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
from pedalboard import (
    Chorus, Compressor, Delay, HighpassFilter, Limiter, LowpassFilter, Pedalboard, Reverb,
)
from pedalboard.io import AudioFile

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "docs" / "xmas" / "music-map.json"
OUT = ROOT / "public" / "xmas" / "music" / "bed-calm.mp3"
NOTES_TXT = ROOT / "docs" / "xmas" / "music-notes-calm.txt"

BPM = 64.0
BEAT = 60.0 / BPM            # 0.9375 s
GRID = BEAT / 2.0            # 8th note, 0.46875 s
MIN_GAP = 2.8                # s between two bells: nothing here is ever a phrase
TARGET_LUFS = -26.0          # src/xmas/mix.ts musicTargetLufs
PEAK_DB = -3.0
FADE_IN, FADE_OUT = 2.0, 4.0
XFADE = 6.0                  # pad chord crossfade

SEED = int(os.environ.get("SEED", "2025"))
rng = np.random.default_rng(SEED)

midi = lambda m: 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)
db = lambda x: 10.0 ** (x / 20.0)

# Pad chords (midi): all notes sit inside or beside C pentatonic so the bells never clash.
CHORDS = {
    "C": [48, 55, 62, 64],        # C G D E  (C add9)
    "F": [53, 60, 64, 69],        # F C E A  (F maj7)
    "Am": [45, 57, 64, 67, 72],   # A A E G C (A minor 7 add 11 feel)
}
PART_CYCLE = [["C", "F"], ["F", "Am"], ["Am", "C"]]
# C pentatonic bells: C D E G A over two octaves, then the bright (gold) octave above.
PENT = [0, 2, 4, 7, 9]
BELL_POOL = [72 + o * 12 + p for o in range(2) for p in PENT]          # C5..A6
BRIGHT_POOL = [84 + o * 12 + p for o in range(2) for p in PENT]        # C6..A7
BELL_GAP_BEATS = [(6, 12), (5, 11), (4, 10)]                           # per part: gap = a random whole number of beats in this range
BRIGHT_GAP = (1.8, 4.2)


def load_map():
    if not MAP.exists():
        raise SystemExit("docs/xmas/music-map.json missing: run `npx tsx scripts/export_xmas_music_map.ts` first")
    m = json.loads(MAP.read_text())
    if len(m["parts"]) != 3:
        raise SystemExit("music-map.json: expected 3 parts")
    return m


def tvec(sec):
    return np.arange(int(round(sec * SR)), dtype=np.float64) / SR


def raised(n, up):
    """sin^2 ramp of n samples (0->1 when up else 1->0); two complementary ramps sum to 1."""
    r = np.sin(0.5 * math.pi * np.linspace(0.0, 1.0, n, dtype=np.float64)) ** 2
    return (r if up else 1.0 - r).astype(np.float32)


def add(buf, start_sample, sig):
    """Add a stereo signal (2, n) into buf at start_sample, clipped to the buffer."""
    a = max(0, start_sample)
    b = min(buf.shape[1], start_sample + sig.shape[1])
    if b > a:
        buf[:, a:b] += sig[:, a - start_sample : b - start_sample]


def pan_gains(p):
    """Equal-power pan, p in -1..1."""
    ang = (p + 1.0) * math.pi / 4.0
    return math.cos(ang), math.sin(ang)


# ------------------------------------------------------------------ pad
def pad_chord(notes, length_sec):
    """Warm detuned pad for one chord: per note 3 oscillators (-7, 0, +7 cents), 3 harmonics, slow tremolo. (2, n) float32."""
    t = tvec(length_sec)
    n = len(t)
    out = np.zeros((2, n), dtype=np.float32)
    amps = (1.0, 0.33, 0.12)
    for ni, m in enumerate(notes):
        f0 = float(midi(m))
        trem = 1.0 + 0.12 * np.sin(2 * math.pi * rng.uniform(0.04, 0.09) * t + rng.uniform(0, 6.28))
        for cents, pan in ((-7.0, -0.55), (0.0, 0.0), (7.0, 0.55)):
            f = f0 * 2.0 ** (cents / 1200.0)
            ph = rng.uniform(0, 6.28)
            sig = np.zeros(n, dtype=np.float64)
            for h, a in enumerate(amps, start=1):
                sig += a * np.sin(2 * math.pi * f * h * t + ph * h)
            sig *= trem * (1.0 if ni else 1.15)  # root a touch stronger
            l, r = pan_gains(pan)
            out[0] += (sig * l).astype(np.float32)
            out[1] += (sig * r).astype(np.float32)
    return out / (len(notes) * 3.0)


def render_pad(total, parts):
    buf = np.zeros((2, int(total * SR)), dtype=np.float32)
    chords = []
    for pi, (p, cycle) in enumerate(zip(parts, PART_CYCLE)):
        start = p["start"]
        end = total if pi == len(parts) - 1 else p["end"]
        count = max(2, round((end - start) / 32.0))
        for i in range(count):
            a = start + (end - start) * i / count
            b = start + (end - start) * (i + 1) / count
            chords.append((cycle[i % len(cycle)], a, b))
    for name, a, b in chords:
        s0, s1 = a - XFADE, b + XFADE
        seg = pad_chord(CHORDS[name], s1 - s0)
        n = seg.shape[1]
        nx = int(XFADE * 2 * SR)
        env = np.ones(n, dtype=np.float32)
        env[:nx] = raised(nx, True)
        env[-nx:] = raised(nx, False)
        if a <= 0.0:  # first chord: no fade-in at the file start (the master fade handles it)
            env[:nx] = 1.0
        add(buf, int(round(s0 * SR)), seg * env)
    return buf, chords


# ------------------------------------------------------------------ bells
def bell(midi_note, vel, bright=False):
    """Glass bell / celesta: partials 1, 2.0, 4.07 (and 5.9 when bright), exponential decay, soft 3 ms attack. (n,) float32."""
    f = float(midi(midi_note))
    tau = 2.6 if not bright else 2.0
    length = tau * 5.0
    t = tvec(length)
    parts = [(1.0, 1.0, 1.0), (2.0, 0.26 if not bright else 0.34, 1.7), (4.07, 0.09 if not bright else 0.16, 2.6)]
    if bright:
        parts.append((5.93, 0.06, 3.4))
    sig = np.zeros(len(t), dtype=np.float64)
    for ratio, a, dm in parts:
        if f * ratio < 11000:
            sig += a * np.sin(2 * math.pi * f * ratio * t) * np.exp(-t * dm / tau)
    sig *= np.minimum(1.0, t / 0.003)
    return (sig * vel).astype(np.float32)


def bell_times(start, end, gap_fn, min_gap):
    """Onsets in [start, end): gap from gap_fn(), snapped to the 8th-note grid, at least min_gap apart."""
    t = start + rng.uniform(1.0, 4.0)
    out = []
    while t < end - 1.0:
        out.append(round(t / GRID) * GRID)
        g = gap_fn()
        t = out[-1] + max(min_gap, g)
    return out


def pick_note(pool, history):
    """Random pool note, never the same twice in a row, never a third stepwise move in the same direction."""
    for _ in range(50):
        idx = int(rng.choice(len(pool), p=weights(len(pool))))
        if history and idx == history[-1]:
            continue
        if len(history) >= 2:
            d1, d2 = history[-1] - history[-2], idx - history[-1]
            if d1 != 0 and d2 != 0 and (d1 > 0) == (d2 > 0) and abs(d1) <= 1 and abs(d2) <= 1:
                continue
        return idx
    return int(rng.integers(len(pool)))


def weights(n):
    w = np.linspace(1.0, 0.45, n)
    return w / w.sum()


def render_bells(total, parts, gold):
    buf = np.zeros((2, int(total * SR)), dtype=np.float32)
    log = []
    hist = []
    for pi, p in enumerate(parts):
        lo, hi = BELL_GAP_BEATS[pi]
        end = total if pi == len(parts) - 1 else p["end"]
        times = bell_times(p["start"], end, lambda lo=lo, hi=hi: BEAT * int(rng.integers(lo, hi + 1)), MIN_GAP)
        for t in times:
            idx = pick_note(BELL_POOL, hist)
            hist.append(idx)
            m = BELL_POOL[idx]
            vel = float(rng.uniform(0.45, 1.0))
            l, r = pan_gains(float(rng.uniform(-0.6, 0.6)))
            sig = bell(m, vel)
            add(buf, int(round(t * SR)), np.stack([sig * l, sig * r]))
            log.append((t, "bell", m, vel))
    # gold bonus rounds: higher, brighter bells
    bh = []
    for g in gold:
        for t in bell_times(g["start"] + 1.0, g["end"] - 1.0, lambda: float(rng.uniform(*BRIGHT_GAP)), 1.8):
            idx = pick_note(BRIGHT_POOL, bh)
            bh.append(idx)
            m = BRIGHT_POOL[idx]
            vel = float(rng.uniform(0.4, 0.8))
            l, r = pan_gains(float(rng.uniform(-0.7, 0.7)))
            sig = bell(m, vel, bright=True)
            add(buf, int(round(t * SR)), np.stack([sig * l, sig * r]))
            log.append((t, "gold-bell", m, vel))
    log.sort()
    return buf, log


def render_shimmer(total, gold):
    """Gold layer: a high, thin pad (G5, C6, E6) that swells in and out with each gold round."""
    buf = np.zeros((2, int(total * SR)), dtype=np.float32)
    for g in gold:
        a, b = g["start"] + 0.5, g["end"] - 0.5
        t = tvec(b - a)
        n = len(t)
        env = np.minimum(1.0, np.minimum(t / 2.5, (b - a - t) / 2.5)) ** 2
        sig = np.zeros((2, n), dtype=np.float64)
        for m, pan in ((79, -0.5), (84, 0.0), (88, 0.5)):
            f = float(midi(m))
            for cents, dp in ((-6.0, -0.3), (6.0, 0.3)):
                ff = f * 2.0 ** (cents / 1200.0)
                s = np.sin(2 * math.pi * ff * t + rng.uniform(0, 6.28)) * (1 + 0.1 * np.sin(2 * math.pi * 0.11 * t))
                l, r = pan_gains(float(np.clip(pan + dp, -1, 1)))
                sig[0] += s * l
                sig[1] += s * r
        add(buf, int(round(a * SR)), (sig * env / 6.0).astype(np.float32))
    return buf


# ------------------------------------------------------------------ sleigh bells
def jingle(freqs, length=0.3):
    t = tvec(length)
    sig = np.zeros(len(t), dtype=np.float64)
    for f in freqs:
        sig += np.sin(2 * math.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t * rng.uniform(14.0, 26.0))
    sig += 0.5 * rng.standard_normal(len(t)) * np.exp(-t * 40.0)
    sig *= np.minimum(1.0, t / 0.002)
    return (sig / len(freqs)).astype(np.float32)


def render_sleigh(total, gold):
    """A very faint cluster of 3 to 5 jingles every 18 to 40 s (every 8 to 14 s inside a gold round)."""
    buf = np.zeros((2, int(total * SR)), dtype=np.float32)

    def in_gold(t):
        return any(g["start"] <= t <= g["end"] for g in gold)

    t = rng.uniform(6.0, 14.0)
    while t < total - 3.0:
        freqs = rng.uniform(3200.0, 7800.0, size=5)
        pos = t
        for _ in range(int(rng.integers(3, 6))):
            sig = jingle(freqs) * float(rng.uniform(0.5, 1.0))
            l, r = pan_gains(float(rng.uniform(-0.8, 0.8)))
            add(buf, int(round(pos * SR)), np.stack([sig * l, sig * r]))
            pos += float(rng.uniform(0.22, 0.38))
        t += rng.uniform(8.0, 14.0) if in_gold(t) else rng.uniform(18.0, 40.0)
    return buf


# ------------------------------------------------------------------ mix
def peak_scaled(x, peak_db):
    p = float(np.max(np.abs(x)))
    return x * (db(peak_db) / p) if p > 0 else x


def rms_scaled(x, rms_db):
    r = float(np.sqrt(np.mean(np.square(x[:, ::7], dtype=np.float64))))
    return x * (db(rms_db) / r) if r > 0 else x


def main():
    m = load_map()
    total = float(os.environ.get("LENGTH_SEC") or math.ceil(m["totalSec"]) + 20)
    parts, gold = m["parts"], m["gold"]
    print(f"length {total:.0f} s ({total / 60:.1f} min), {len(gold)} gold rounds, seed {SEED}")

    pad, chords = render_pad(total, parts)
    pad = Pedalboard([HighpassFilter(80), LowpassFilter(2200), Chorus(rate_hz=0.15, depth=0.25, mix=0.25, centre_delay_ms=9)])(pad, SR)
    pad = rms_scaled(pad, -23.0)
    mix = pad
    print("pad done")

    bells, log = render_bells(total, parts, gold)
    bells = Pedalboard([HighpassFilter(250), Chorus(rate_hz=0.4, depth=0.2, mix=0.3, centre_delay_ms=7),
                        Delay(delay_seconds=BEAT * 0.75, feedback=0.35, mix=0.22)])(bells, SR)
    mix += peak_scaled(bells, -17.0)
    del bells

    shim = render_shimmer(total, gold)
    shim = Pedalboard([HighpassFilter(500), LowpassFilter(7000)])(shim, SR)
    mix += peak_scaled(shim, -30.0)
    del shim

    sleigh = render_sleigh(total, gold)
    sleigh = Pedalboard([HighpassFilter(3500), LowpassFilter(12000)])(sleigh, SR)
    mix += peak_scaled(sleigh, -36.0)
    del sleigh
    print("stems mixed")

    master = Pedalboard([
        HighpassFilter(80),
        Reverb(room_size=0.92, damping=0.25, wet_level=0.38, dry_level=0.62, width=1.0),
        LowpassFilter(9000),
        Compressor(threshold_db=-24.0, ratio=2.0, attack_ms=30.0, release_ms=400.0),
        Limiter(threshold_db=PEAK_DB),
    ])
    mix = master(mix, SR)

    # fades, then the loudness the mix expects
    nin, nout = int(FADE_IN * SR), int(FADE_OUT * SR)
    mix[:, :nin] *= raised(nin, True)
    mix[:, -nout:] *= raised(nout, False)
    meter = pyln.Meter(SR)
    loud = meter.integrated_loudness(mix.T.astype(np.float64))
    gain = db(TARGET_LUFS - loud)
    mix *= np.float32(gain)
    peak = 20 * math.log10(float(np.max(np.abs(mix))) + 1e-12)
    if peak > PEAK_DB:
        raise SystemExit(f"peak {peak:.1f} dBFS above {PEAK_DB}; lower the bell level")
    print(f"loudness {loud:.1f} -> {TARGET_LUFS} LUFS (gain {20 * math.log10(gain):+.1f} dB), peak {peak:.1f} dBFS")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with AudioFile(str(OUT), "w", SR, 2, quality="V2") as f:
        f.write(mix)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")

    NOTES_TXT.parent.mkdir(parents=True, exist_ok=True)
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    lines = [f"# music bed, seed {SEED}, {len(log)} bells; pitch = note name + octave; gaps are at least {MIN_GAP} s (no phrase can form)"]
    lines += [f"{t:7.2f}s  {kind:9s} {names[n % 12]}{n // 12 - 1}  vel {v:.2f}" for t, kind, n, v in log]
    lines += ["# pad chords (start, end, chord)"] + [f"{a:7.1f}s {b:7.1f}s {c}" for c, a, b in chords]
    NOTES_TXT.write_text("\n".join(lines) + "\n")
    gaps = np.diff([t for t, k, *_ in log if k == "bell"])
    print(f"bell gaps (s): min {gaps.min():.1f}, median {np.median(gaps):.1f}, max {gaps.max():.1f}")


if __name__ == "__main__":
    main()
