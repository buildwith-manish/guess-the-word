#!/usr/bin/env python3
"""Master every Christmas quiz voice clip through ONE identical pedalboard chain, then match loudness.

Reads  public/xmas/voiceover/clips/*.wav        (the cleaned clips; never modified)
Writes public/xmas/voiceover/clips_master/*.wav (same file names, same sample rate, same length)

The chain, in this order, the same for every clip (no reverb, no effects on the voice):
  1. high-pass            80 Hz
  2. compressor           3:1, threshold -18 dB, attack 10 ms, release 100 ms
  3. presence boost       +1.5 dB bell at 3 kHz
  4. limiter              ceiling -1 dB
Then every clip gets one gain so its integrated loudness is -16 LUFS (ITU-R BS.1770, pyloudnorm). A gain can push a
peak above the ceiling, so the same -1 dB limiter runs again on a clip only when that happens (the report counts them)
and the gain is corrected once more; nothing else is applied to any clip.

Clip length is never changed (slot timing in src/xmas/timing.ts comes from the clip lengths); the script stops if a
clip comes out with a different number of samples.

Needs:  pip install numpy pedalboard pyloudnorm       Run:  python3 scripts/master_xmas_voice.py
Options:  --src DIR  --dst DIR  --target LUFS (default -16)  --top N (default 10, rows per table)
Pattern: scripts/make_xmas_sfx.py (pedalboard) and scripts/clean_xmas_clips.sh (the -16 LUFS target).
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
from pedalboard import Compressor, HighpassFilter, Limiter, Pedalboard, PeakFilter
from pedalboard.io import AudioFile

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "xmas" / "voiceover" / "clips"
DST = ROOT / "public" / "xmas" / "voiceover" / "clips_master"

TARGET_LUFS = -16.0
CEILING_DB = -1.0
# One chain for the whole voice. Edit here only; every clip goes through exactly these settings.
CHAIN_SETTINGS = {
    "highpass_hz": 80,
    "comp_threshold_db": -18,
    "comp_ratio": 3.0,
    "comp_attack_ms": 10,
    "comp_release_ms": 100,
    "presence_hz": 3000,
    "presence_gain_db": 1.5,  # keep at 2 dB or less
    "presence_q": 0.8,
    "limiter_db": CEILING_DB,
    "limiter_release_ms": 100,
}


def build_chain() -> Pedalboard:
    s = CHAIN_SETTINGS
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=s["highpass_hz"]),
        Compressor(threshold_db=s["comp_threshold_db"], ratio=s["comp_ratio"], attack_ms=s["comp_attack_ms"], release_ms=s["comp_release_ms"]),
        PeakFilter(cutoff_frequency_hz=s["presence_hz"], gain_db=s["presence_gain_db"], q=s["presence_q"]),
        Limiter(threshold_db=s["limiter_db"], release_ms=s["limiter_release_ms"]),
    ])


def build_ceiling() -> Pedalboard:
    """The same limiter as the end of the chain, used only after the loudness gain."""
    s = CHAIN_SETTINGS
    return Pedalboard([Limiter(threshold_db=s["limiter_db"], release_ms=s["limiter_release_ms"])])


def peak_db(x: np.ndarray) -> float:
    p = float(np.max(np.abs(x))) if x.size else 0.0
    return -120.0 if p <= 0 else 20 * np.log10(p)


def lufs(meter: pyln.Meter, x: np.ndarray) -> float:
    return float(meter.integrated_loudness(x.astype(np.float64)))


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def master_one(path: Path, chain: Pedalboard, ceiling: Pedalboard, target: float):
    with AudioFile(str(path)) as f:
        sr = int(f.samplerate)
        audio = f.read(f.frames)  # (channels, samples) float32
    if audio.shape[0] != 1:
        fail(f"{path.name}: {audio.shape[0]} channels; the voice clips are mono")
    x = audio[0]
    meter = pyln.Meter(sr)
    try:
        before_lufs = lufs(meter, x)
    except ValueError as e:
        fail(f"{path.name}: cannot measure loudness ({e}); clips must be at least 0.4 s")
    before_peak = peak_db(x)

    y = chain(audio, sr)  # state is reset for every clip
    limited = False
    for _ in range(3):
        gain = target - lufs(meter, y[0])
        y = y * np.float32(10 ** (gain / 20))
        if peak_db(y[0]) > CEILING_DB + 0.01:
            y = ceiling(y, sr)
            limited = True
        else:
            break
    if y.shape[1] != audio.shape[1]:
        fail(f"{path.name}: length changed from {audio.shape[1]} to {y.shape[1]} samples")
    after_lufs = lufs(meter, y[0])
    after_peak = peak_db(y[0])
    return sr, y, dict(id=path.stem, bp=before_peak, bl=before_lufs, ap=after_peak, al=after_lufs, limited=limited)


def table(title: str, rows: list) -> None:
    print(f"\n{title}")
    print(f"{'clip':10s} {'before peak':>11s} {'before LUFS':>11s} {'after peak':>10s} {'after LUFS':>10s}")
    for r in rows:
        print(f"{r['id']:10s} {r['bp']:8.1f} dB {r['bl']:8.1f} LU {r['ap']:7.1f} dB {r['al']:7.1f} LU")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--src", type=Path, default=SRC)
    ap.add_argument("--dst", type=Path, default=DST)
    ap.add_argument("--target", type=float, default=TARGET_LUFS)
    ap.add_argument("--top", type=int, default=10)
    a = ap.parse_args()

    files = sorted(a.src.glob("*.wav"))
    if not files:
        fail(f"no .wav clips in {a.src}")
    a.dst.mkdir(parents=True, exist_ok=True)
    chain, ceiling = build_chain(), build_ceiling()

    rows = []
    for p in files:
        sr, y, row = master_one(p, chain, ceiling, a.target)
        with AudioFile(str(a.dst / p.name), "w", sr, 1, bit_depth=16) as out:
            out.write(y)
        rows.append(row)

    print(f"Mastered {len(rows)} clips: {a.src} -> {a.dst}")
    print("Chain (same for every clip): " + ", ".join([
        f"high-pass {CHAIN_SETTINGS['highpass_hz']} Hz",
        f"compressor {CHAIN_SETTINGS['comp_ratio']:g}:1 thr {CHAIN_SETTINGS['comp_threshold_db']} dB atk {CHAIN_SETTINGS['comp_attack_ms']} ms rel {CHAIN_SETTINGS['comp_release_ms']} ms",
        f"presence +{CHAIN_SETTINGS['presence_gain_db']:g} dB @ {CHAIN_SETTINGS['presence_hz']} Hz",
        f"limiter {CHAIN_SETTINGS['limiter_db']:g} dB",
        f"loudness gain to {a.target:g} LUFS",
    ]))

    by_before = sorted(rows, key=lambda r: r["bl"])
    n = max(1, a.top)
    table(f"{n} loudest clips before mastering", by_before[::-1][:n])
    table(f"{n} quietest clips before mastering", by_before[:n])

    err = [abs(r["al"] - a.target) for r in rows]
    limited = [r["id"] for r in rows if r["limited"]]
    print(f"\nAfter: loudness {min(r['al'] for r in rows):.2f} to {max(r['al'] for r in rows):.2f} LUFS (target {a.target:g}, worst miss {max(err):.2f} LU); "
          f"highest peak {max(r['ap'] for r in rows):.2f} dBFS (ceiling {CEILING_DB:g}).")
    print(f"Clips that needed the ceiling limiter again after the gain: {len(limited)}" + (f" ({', '.join(limited)})" if limited else ""))
    off = [r["id"] for r in rows if max(err) > 0.3 and abs(r["al"] - a.target) > 0.3]
    if off:
        print(f"WARNING: more than 0.3 LU from target: {', '.join(off)}")


if __name__ == "__main__":
    main()
