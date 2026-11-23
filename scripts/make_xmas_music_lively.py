#!/usr/bin/env python3
"""Lively Christmas music bed (original synthesis, no samples, no tune, no carol). Fast and bright: 120 BPM.

Layers: sleigh-bell groove (the Christmas signal), glockenspiel arpeggio (an ostinato of chord tones, not a melody),
bouncing bass, soft kick on the beat, snap on 2 and 4, off-beat marimba stabs, a pad that pumps with the beat, and a rising
noise swell before every 8th bar. Chords change every bar: C Am F G (part 1), C G Am F (part 2), F G C Am (part 3, ends
on C). Energy builds per part (part 1 half-time kick and 8th-note arpeggio, part 2 four on the floor and 16ths, part 3 adds
stabs and full groove). Inside each gold bonus round (snapped to whole bars) a higher, brighter arpeggio and a denser
sleigh groove come in. The mix keeps the middle open: the voice sits on top, and the bed ducks 8 dB under it in the video.

Reads docs/xmas/music-map.json (npx tsx scripts/export_xmas_music_map.ts). Writes public/xmas/music/bed.mp3 at -24 LUFS
(src/xmas/mix.ts MIX.musicTargetLufs) and docs/xmas/music-notes.txt (the bar-by-bar plan).
Needs:  pip install numpy pedalboard pyloudnorm      Run:  python3 scripts/make_xmas_music_lively.py
Env: LENGTH_SEC (default video length + 20 s), SEED (default 2025). Memory about 1.5 GB for 13 minutes.
"""
import math
import os
import sys
from pathlib import Path

import numpy as np
from pedalboard import Chorus, Compressor, Delay, HighpassFilter, Limiter, LowpassFilter, Pedalboard, Reverb
from pedalboard.io import AudioFile
import pyloudnorm as pyln

sys.path.insert(0, str(Path(__file__).resolve().parent))
import make_xmas_music as M  # shared helpers (synthesis primitives, map loader)
from make_xmas_music import SR, add, db, load_map, midi, pan_gains, peak_scaled, raised, rms_scaled, tvec

rng = M.rng
BPM = 120.0
BEAT = 60.0 / BPM          # 0.5 s
S16 = BEAT / 4.0           # 0.125 s
BAR = BEAT * 4.0           # 2.0 s
TARGET_LUFS = -24.0
PEAK_DB = -3.0
FADE_IN, FADE_OUT = 0.5, 4.0
OUT = M.ROOT / "public" / "xmas" / "music" / "bed.mp3"
NOTES_TXT = M.ROOT / "docs" / "xmas" / "music-notes.txt"

# chord: bass note, stab triad, glock arpeggio pool (midi)
CH = {
    "C": (48, [60, 64, 67], [72, 76, 79, 84]),
    "Am": (45, [60, 64, 69], [69, 72, 76, 81]),
    "F": (53, [60, 65, 69], [69, 72, 77, 81]),
    "G": (55, [62, 67, 71], [71, 74, 79, 83]),
}
PROG = [["C", "Am", "F", "G"], ["C", "G", "Am", "F"], ["F", "G", "C", "Am"]]
SLEIGH_PAT = [1, .3, .55, .3, .8, .3, .55, .3, 1, .3, .55, .3, .8, .3, .55, .6]
ARP8 = [0, 1, 2, 3, 2, 1, 2, 3]
ARP16 = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2]


def stereo(sig, pan=0.0):
    l, r = pan_gains(pan)
    return np.stack([sig * l, sig * r]).astype(np.float32)


# ------------------------------------------------------------------ one-shot sounds (cached)
def kick():
    t = tvec(0.25)
    ph = 2 * math.pi * (48 * t + 100 / 30.0 * (1 - np.exp(-30 * t)))
    return (np.sin(ph) * np.exp(-t * 13) * np.minimum(1, t / 0.002)).astype(np.float32)


def snap():
    t = tvec(0.16)
    n = rng.standard_normal(len(t))
    env = np.exp(-t * 38) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 38) * (t > 0.012) + 0.5 * np.exp(-np.maximum(t - 0.026, 0) * 30) * (t > 0.026)
    return (n * env * np.minimum(1, t / 0.001)).astype(np.float32)


def mallet(m, bright=False):
    f = float(midi(m))
    tau = 0.5 if not bright else 0.38
    t = tvec(tau * 5)
    parts = [(1.0, 1.0, 1.0), (3.99, 0.30, 2.2), (9.2, 0.07, 3.5)] if not bright else [(1.0, 1.0, 1.0), (3.99, 0.40, 2.0), (7.9, 0.12, 3.0)]
    sig = np.zeros(len(t))
    for r, a, dm in parts:
        if f * r < 11000:
            sig += a * np.sin(2 * math.pi * f * r * t) * np.exp(-t * dm / tau)
    return (sig * np.minimum(1, t / 0.002)).astype(np.float32)


def pluck(m):
    f = float(midi(m))
    t = tvec(0.32)
    sig = np.sin(2 * math.pi * f * t) + 0.35 * np.sin(2 * math.pi * 2 * f * t) + 0.12 * np.sin(2 * math.pi * 3 * f * t)
    return (sig * np.exp(-t / 0.085) * np.minimum(1, t / 0.003)).astype(np.float32)


def bass(m):
    f = float(midi(m))
    t = tvec(0.45)
    sig = np.sin(2 * math.pi * f * t) + 0.35 * np.sin(2 * math.pi * 2 * f * t)
    return (sig * np.exp(-t / 0.2) * np.minimum(1, t / 0.004)).astype(np.float32)


def swell(length):
    t = tvec(length)
    return (rng.standard_normal(len(t)) * (t / length) ** 2.2).astype(np.float32)


class Cache(dict):
    def get_or(self, key, fn):
        if key not in self:
            self[key] = fn()
        return self[key]


C = Cache()
JINGLES = [M.jingle(rng.uniform(3200, 7800, size=5), 0.32) for _ in range(8)]


# ------------------------------------------------------------------ plan
def plan(total, parts, gold):
    nbars = int(total // BAR)
    part_of = lambda t: next((i for i, p in enumerate(parts) if p["start"] <= t < p["end"]), len(parts) - 1)
    wins = [(round(g["start"] / BAR), round(g["end"] / BAR)) for g in gold]        # gold windows snapped to bars
    gold_bar = lambda b: any(a <= b < e for a, e in wins)
    bars = []
    pbar0 = {}
    for b in range(nbars):
        p = part_of(b * BAR)
        pbar0.setdefault(p, b)
        k = b - pbar0[p]
        last = b >= nbars - 2
        chord = "C" if last else PROG[p][k % 4]
        bars.append({"bar": b, "part": p, "k": k, "chord": chord, "gold": gold_bar(b), "intro": b < 2, "riser": (p > 0 and k % 8 == 7), "last": last})
    return bars


# ------------------------------------------------------------------ rendering
def render(total, bars):
    n = int(total * SR)
    mk = lambda: np.zeros((2, n), dtype=np.float32)
    drums, sleigh, bassb, stabs, glock, pad, fx = mk(), mk(), mk(), mk(), mk(), mk(), mk()
    plan_lines = []
    for bd in bars:
        b, p, k, ch = bd["bar"], bd["part"], bd["k"], CH[bd["chord"]]
        t0 = b * BAR
        mid = p >= 1 or k >= 4                           # part 1 starts lean, then fills out after 4 bars
        full = p >= 2
        at = lambda step: int(round((t0 + step * S16) * SR))
        brk = bd["riser"] and (k % 8 == 7)
        # drums: kick and snap
        if not bd["intro"] and not bd["last"]:
            ksteps = [0, 4, 8, 12] if mid else [0, 8]
            if brk:
                ksteps = []
            for s in ksteps:
                add(drums, at(s), stereo(C.get_or("kick", kick) * (0.95 if s % 8 == 0 else 0.75)))
            for s in ([4, 12] if mid else [12]):
                if not brk:
                    add(fx, at(s), stereo(C.get_or("snap", snap) * 0.8, pan=0.1))
        # sleigh bells
        steps = range(16) if (mid or bd["gold"]) else range(0, 16, 2)
        for s in steps:
            v = SLEIGH_PAT[s] * (1.15 if bd["gold"] else 1.0)
            if s % 2 == 1 and not (mid or bd["gold"]):
                continue
            j = JINGLES[int(rng.integers(len(JINGLES)))]
            add(sleigh, at(s), stereo(j * v * float(rng.uniform(0.85, 1.0)), pan=float(rng.uniform(-0.5, 0.5))))
        # bass
        if not bd["intro"] and not brk:
            bsteps = [0, 8, 14] if not mid else list(range(0, 16, 2))
            for s in bsteps:
                note = ch[0] + (12 if (mid and s % 4 == 2 and s % 8 != 0 and full) else 0)
                add(bassb, at(s), stereo(C.get_or(("bass", note), lambda note=note: bass(note)) * (1.0 if s % 8 == 0 else 0.7)))
        # stabs: off-beat triads
        if mid:
            for s in ([2, 6, 10, 14] if full else [6, 14]):
                for m in ch[1]:
                    add(stabs, at(s), stereo(C.get_or(("pl", m), lambda m=m: pluck(m)) * 0.5, pan=(m - 64) / 14.0))
        # glock arpeggio (the sparkle): 8ths, 16ths from part 2
        pool = ch[2]
        if mid and p >= 1:
            for s in range(16):
                m = pool[ARP16[s]]
                v = 1.0 if s % 2 == 0 else 0.6
                add(glock, at(s), stereo(C.get_or(("g", m, 0), lambda m=m: mallet(m)) * v, pan=(s % 4 - 1.5) / 3.0))
        else:
            for i, s in enumerate(range(0, 16, 2)):
                m = pool[ARP8[i]]
                add(glock, at(s), stereo(C.get_or(("g", m, 0), lambda m=m: mallet(m)) * (1.0 if s % 4 == 0 else 0.65), pan=(i % 4 - 1.5) / 3.0))
        # gold: octave-up bright arpeggio, offset by an 8th so it dovetails
        if bd["gold"]:
            for s in range(1, 16, 2):
                m = pool[ARP16[s]] + 12
                add(glock, at(s), stereo(C.get_or(("g", m, 1), lambda m=m: mallet(m, True)) * 0.7, pan=float(rng.uniform(-0.7, 0.7))))
        # riser before every 8th bar, parts 2 and 3
        if brk:
            add(fx, at(0), stereo(swell(BAR) * 0.5))
        # pad (one chord per bar, soft overlaps)
        pt = tvec(BAR + 0.3)
        sig = np.zeros(len(pt))
        for m in [ch[0] + 12] + ch[1]:
            f = float(midi(m))
            for cents in (-6.0, 6.0):
                sig += np.sin(2 * math.pi * f * 2.0 ** (cents / 1200.0) * pt + rng.uniform(0, 6.28)) + 0.3 * np.sin(2 * math.pi * 2 * f * pt)
        env = np.ones(len(pt))
        nf = int(0.15 * SR)
        env[:nf] = np.linspace(0, 1, nf)
        env[-nf:] = np.linspace(1, 0, nf)
        add(pad, int(round((t0 - 0.15) * SR)), stereo(sig * env / 18.0))
        plan_lines.append(f"bar {b:3d}  {t0:6.1f}s  part {p + 1}  {bd['chord']:2s}{'  GOLD' if bd['gold'] else ''}{'  riser' if brk else ''}{'  intro' if bd['intro'] else ''}")
    return dict(drums=drums, sleigh=sleigh, bass=bassb, stabs=stabs, glock=glock, pad=pad, fx=fx), plan_lines


def pump(buf, depth, tau=0.2, start_off=0.0):
    """Beat-synchronous ducking (a side-chain feel) applied in place, in chunks."""
    step = SR * 10
    for a in range(0, buf.shape[1], step):
        t = (np.arange(a, min(a + step, buf.shape[1])) / SR + start_off) % BEAT
        buf[:, a : a + len(t)] *= (1.0 - depth * np.exp(-t / tau)).astype(np.float32)


def main():
    m = load_map()
    total = float(os.environ.get("LENGTH_SEC") or math.ceil(m["totalSec"]) + 20)
    bars = plan(total, m["parts"], m["gold"])
    print(f"length {total:.0f} s, {len(bars)} bars at {BPM:.0f} BPM, {sum(b['gold'] for b in bars)} gold bars")
    st, lines = render(total, bars)
    print("rendered")

    st["drums"] = Pedalboard([HighpassFilter(40), LowpassFilter(1800)])(st["drums"], SR)
    mix = peak_scaled(st["drums"], -13.0)
    del st["drums"]
    st["fx"] = Pedalboard([HighpassFilter(1200), LowpassFilter(9000)])(st["fx"], SR)
    mix += peak_scaled(st["fx"], -24.0)
    del st["fx"]
    st["sleigh"] = Pedalboard([HighpassFilter(3000), LowpassFilter(12000)])(st["sleigh"], SR)
    mix += peak_scaled(st["sleigh"], -21.0)
    del st["sleigh"]
    st["bass"] = Pedalboard([HighpassFilter(60), LowpassFilter(600)])(st["bass"], SR)
    mix += peak_scaled(st["bass"], -17.0)
    del st["bass"]
    pump(st["pad"], 0.5)
    st["pad"] = Pedalboard([HighpassFilter(120), LowpassFilter(2600), Chorus(rate_hz=0.2, depth=0.25, mix=0.25)])(st["pad"], SR)
    mix += rms_scaled(st["pad"], -30.0)
    del st["pad"]
    pump(st["stabs"], 0.25)
    st["stabs"] = Pedalboard([HighpassFilter(300), LowpassFilter(5500), Delay(delay_seconds=BEAT * 0.75, feedback=0.25, mix=0.18)])(st["stabs"], SR)
    mix += peak_scaled(st["stabs"], -25.0)
    del st["stabs"]
    st["glock"] = Pedalboard([HighpassFilter(350), Chorus(rate_hz=0.5, depth=0.18, mix=0.25, centre_delay_ms=7),
                              Delay(delay_seconds=BEAT * 0.75, feedback=0.3, mix=0.22)])(st["glock"], SR)
    mix += peak_scaled(st["glock"], -19.0)
    del st["glock"]
    print("stems mixed")

    master = Pedalboard([
        HighpassFilter(80),
        Reverb(room_size=0.5, damping=0.45, wet_level=0.16, dry_level=0.84, width=1.0),
        LowpassFilter(10000),
        Compressor(threshold_db=-20.0, ratio=2.5, attack_ms=20.0, release_ms=180.0),
        Limiter(threshold_db=PEAK_DB),
    ])
    mix = master(mix, SR)
    nin, nout = int(FADE_IN * SR), int(FADE_OUT * SR)
    mix[:, :nin] *= raised(nin, True)
    mix[:, -nout:] *= raised(nout, False)
    loud = pyln.Meter(SR).integrated_loudness(mix.T.astype(np.float64))
    gain = db(TARGET_LUFS - loud)
    mix *= np.float32(gain)
    peak = 20 * math.log10(float(np.max(np.abs(mix))) + 1e-12)
    if peak > PEAK_DB:
        raise SystemExit(f"peak {peak:.1f} dBFS above {PEAK_DB}")
    print(f"loudness {loud:.1f} -> {TARGET_LUFS} LUFS (gain {20 * math.log10(gain):+.1f} dB), peak {peak:.1f} dBFS")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with AudioFile(str(OUT), "w", SR, 2, quality="V2") as f:
        f.write(mix)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
    NOTES_TXT.write_text(f"# lively bed, {BPM:.0f} BPM, seed {M.SEED}\n" + "\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
