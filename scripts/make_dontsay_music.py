#!/usr/bin/env python3
"""Generate original music beds for "Don't Say The Same As Me" (numpy + pedalboard, no samples).

Run:   python3 scripts/make_dontsay_music.py
Needs: pip install numpy scipy pedalboard soundfile --break-system-packages
Writes 48 kHz 24-bit stereo wavs and manifest.json to public/dontsay/music/.

Style: warm, airy, calm. 90 BPM, D major, Dadd9 | Bm7 | Gmaj7 | Asus4, one chord per 2 bars (one
cycle = 8 bars = 21.33 s). Pad (detuned sine + triangle), felt-piano-like FM pluck, quiet sub,
sparse airy bells, a very soft pulse in levels 4 and 5 only. No drums, no sharp transients: every
note has an attack of at least 6 ms (raised cosine).

Seamless loops: the dry cycle is rendered 3 times back to back, run through the chain, and the MIDDLE
copy is kept. Every effect is time-invariant (the chorus LFO runs a whole number of periods per
cycle), so the kept copy starts and ends in the same state and tiling it has no seam.

Chain (pedalboard): HighpassFilter 120 Hz, PeakFilter dip at 3 kHz (-3 dB, wide: the 2 to 4 kHz
voice pocket), Chorus (subtle), Reverb (large, wet 0.35), Compressor (gentle); then a gain to the
loudness target and Limiter at -1 dB.  The sub is added AFTER the high-pass (parallel path): a 120 Hz
high-pass would remove it completely.  SUB_GAIN = 0 turns it off.

Nothing here has been listened to.  Loudness is BS.1770 integrated (K-weighted, gated), computed
in this file.
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from pedalboard import Chorus, Compressor, HighpassFilter, Limiter, Pedalboard, PeakFilter, Reverb
from scipy import signal

SR = 48000
BPM = 90
KEY = "D major"
BEAT = 60.0 / BPM
BAR = 4 * BEAT
CHORD_SEC = 2 * BAR  # 5.333 s
CYCLE_SEC = 4 * CHORD_SEC  # 21.333 s = 8 bars
CYCLE_N = int(round(CYCLE_SEC * SR))  # 1,024,000 samples: an exact integer
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "dontsay" / "music"
FALLBACK_LONGEST_PART_SEC = 150.0

# Loudness targets (LUFS integrated). Levels rise 0.5 LU per level around -30.
LEVEL_LUFS = {1: -31.0, 2: -30.5, 3: -30.0, 4: -29.5, 5: -29.0}
BONUS_LUFS = -30.0
SUB_GAIN = 0.09  # sub sits about 17 dB under the 200 Hz to 2 kHz band (first try at 0.35 was only 6 dB under: not "very quiet")
LIMIT_DB = -1.0

# (name, pad notes as MIDI, sub root MIDI)
CHORDS = [
    ("Dadd9", [50, 57, 64, 66], 38),
    ("Bm7", [47, 54, 57, 62], 35),
    ("Gmaj7", [55, 59, 62, 66], 31),
    ("Asus4", [52, 57, 62, 64], 33),
]


def mtof(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


# ---------------------------------------------------------------- envelopes
def env_ar(n, att, rel):
    """Raised-cosine attack over `att` samples, hold, raised-cosine release over `rel` samples."""
    e = np.ones(n)
    att = min(att, n)
    rel = min(rel, n - att)
    if att > 0:
        x = np.arange(att) / att
        e[:att] = 0.5 - 0.5 * np.cos(np.pi * x)
    if rel > 0:
        x = np.arange(rel) / rel
        e[n - rel:] *= 0.5 + 0.5 * np.cos(np.pi * x)
    return e


def add(buf, sig, at_sec):
    """Add stereo sig (n, 2) into buf (m, 2) at `at_sec`, clipped to the buffer."""
    i = int(round(at_sec * SR))
    n = min(sig.shape[0], buf.shape[0] - i)
    if n > 0 and i >= 0:
        buf[i:i + n] += sig[:n]


def pan(mono, p):
    """Equal-power pan, p 0 (left) .. 1 (right)."""
    a = p * math.pi / 2
    return np.stack([mono * math.cos(a), mono * math.sin(a)], axis=1)


# ---------------------------------------------------------------- instruments
def pad(buf, notes, t0, hold, bright, gain, rng):
    """Soft pad: 3 detuned voices per note, sine blended with triangle, 1.2 s attack, 1.6 s release."""
    att, rel = 1.2, 1.6
    n = int(round((hold + rel) * SR))
    t = np.arange(n) / SR
    env = env_ar(n, int(att * SR), int(rel * SR))
    tri_mix = 0.25 + 0.5 * bright
    for k, m in enumerate(notes):
        for cents, p in ((-7, 0.25), (0, 0.5), (7, 0.75)):
            f = mtof(m) * 2 ** (cents / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            s = (1 - tri_mix) * np.sin(2 * np.pi * f * t + ph) + tri_mix * (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * f * t + ph))
            add(buf, pan(s * env * gain, p), t0)
        if bright > 0 and k >= len(notes) - 2:  # a little air on the top two voices
            ph = rng.uniform(0, 2 * np.pi)
            s = np.sin(2 * np.pi * mtof(m + 12) * t + ph) * env * gain * 0.5 * bright
            add(buf, pan(s, 0.5), t0)


def sub(buf, root, t0, hold, gain):
    """Very quiet sine sub, slow attack and release, centred."""
    n = int(round((hold + 1.2) * SR))
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * mtof(root) * t) * env_ar(n, int(0.8 * SR), int(1.2 * SR)) * gain
    add(buf, np.stack([s, s], axis=1), t0)


def pluck(buf, midi, t0, gain, index, p):
    """Felt-piano-like pluck: simple 2-operator FM (ratio 1), index and amplitude decay, 10 ms attack."""
    dur = 2.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    idx = index * np.exp(-t / 0.22)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    s += 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.15)  # soft body
    amp = np.exp(-t / 0.8) * env_ar(n, int(0.010 * SR), int(0.15 * SR))
    add(buf, pan(s * amp * gain, p), t0)


def bell(buf, midi, t0, gain, p):
    """Sparse airy high note: sine + quiet 2nd/3rd partial, 40 ms attack, long decay."""
    dur = 3.2
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    amp = np.exp(-t / 1.1) * env_ar(n, int(0.040 * SR), int(0.3 * SR))
    add(buf, pan(s * amp * gain, p), t0)


def pulse(buf, t0, gain):
    """Very soft pulse: D3 sine, 12 ms attack, 120 ms decay. Not a drum."""
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * mtof(50) * t) * np.exp(-t / 0.12) * env_ar(n, int(0.012 * SR), int(0.05 * SR))
    add(buf, pan(s * gain, 0.5), t0)


# ---------------------------------------------------------------- arrangements
# pluck: eighth-note positions inside a chord (16 per chord); idx: which chord tone each one plays.
LEVELS = {
    1: dict(bright=0.0, pluck=[], air=0, pulse=0, pluck_index=1.0),
    2: dict(bright=0.15, pluck=[], air=1, pulse=0, pluck_index=1.0),
    3: dict(bright=0.30, pluck=[0, 6, 10], air=1, pulse=0, pluck_index=1.2),
    4: dict(bright=0.50, pluck=[0, 3, 6, 8, 11, 14], air=2, pulse=2, pluck_index=1.5),
    5: dict(bright=0.70, pluck=[0, 2, 3, 6, 8, 10, 11, 14], air=2, pulse=1, pluck_index=1.8),
}
PLUCK_TONES = [0, 2, 3, 1, 2, 3, 1, 2]
BONUS = dict(bright=0.50, pluck=[0, 2, 3, 5, 8, 10, 11, 13], air=2, pulse=0, pluck_index=2.2, bells=[4, 12])
GAIN_PAD, GAIN_PLUCK, GAIN_AIR, GAIN_PULSE = 0.10, 0.20, 0.09, 0.16


def air_notes(chord_notes, count, rng):
    """Deterministic sparse high notes: chord tones two octaves up, kept under about 1.5 kHz."""
    out = []
    for i in range(count):
        m = chord_notes[int(rng.integers(0, len(chord_notes)))] + 24
        while m > 88:
            m -= 12
        beat = float(rng.choice([1.0, 2.5, 4.0, 5.5, 6.5])) + 0.5 * i
        out.append((m, beat * BEAT))
    return out


def render_chord(main, subbuf, chord, t0, cfg, rng, with_pulse=True):
    """One chord (2 bars) of a level-style arrangement starting at t0 seconds."""
    _, notes, root = chord
    pad(main, notes, t0, CHORD_SEC, cfg["bright"], GAIN_PAD, rng)
    sub(subbuf, root, t0, CHORD_SEC, 1.0)
    for j, e in enumerate(cfg["pluck"]):
        m = sorted(notes)[PLUCK_TONES[j % len(PLUCK_TONES)]] + 12
        pluck(main, m, t0 + e * BEAT / 2, GAIN_PLUCK, cfg["pluck_index"], 0.3 if j % 2 else 0.7)
    for m, off in air_notes(notes, cfg["air"], rng):
        bell(main, m, t0 + off, GAIN_AIR, float(rng.uniform(0.25, 0.75)))
    for b in cfg.get("bells", []):
        bell(main, min(sorted(notes)[3] + 24, 90), t0 + b * BEAT / 2, GAIN_AIR * 0.9, 0.65)
    if with_pulse and cfg["pulse"]:
        for beat in range(8):
            if cfg["pulse"] == 2 and beat % 2:
                continue
            accent = 1.0 if beat % 4 == 0 else 0.7
            pulse(main, t0 + beat * BEAT, GAIN_PULSE * accent)


def render_cycles(cfg, seed, copies=3):
    rng = np.random.default_rng(seed)
    # one rng draw per chord per cycle copy would differ between copies; draw once and reuse
    state = rng.bit_generator.state
    n = CYCLE_N * copies
    main = np.zeros((n, 2))
    subbuf = np.zeros((n, 2))
    for k in range(copies):
        rng.bit_generator.state = state  # identical material in every copy: that is what makes it loop
        for c, chord in enumerate(CHORDS):
            render_chord(main, subbuf, chord, k * CYCLE_SEC + c * CHORD_SEC, cfg, rng)
    return main, subbuf


# ---------------------------------------------------------------- chain and loudness
def board():
    return Pedalboard([
        HighpassFilter(cutoff_frequency_hz=120.0),
        PeakFilter(cutoff_frequency_hz=3000.0, gain_db=-3.0, q=0.5),
        # rate 0.375 Hz = exactly 8 LFO periods per 21.333 s cycle, so the chorus is loop-periodic
        Chorus(rate_hz=0.375, depth=0.08, centre_delay_ms=7.0, feedback=0.0, mix=0.25),
        Reverb(room_size=0.85, damping=0.55, wet_level=0.35, dry_level=0.65, width=1.0),
        Compressor(threshold_db=-28.0, ratio=1.8, attack_ms=40.0, release_ms=300.0),
    ])


def run_chain(main, subbuf):
    x = board()(main.T.astype(np.float32), SR).T.astype(np.float64)
    return x + subbuf * SUB_GAIN * 0.1  # sub is added after the high-pass


def k_weight(x):
    """BS.1770 K-weighting (shelf + high-pass), x is (n, ch)."""
    g, q, fc = 3.999843853973347, 0.7071752369554196, 1681.974450955533
    a = 10 ** (g / 40)
    w0 = 2 * math.pi * fc / SR
    al = math.sin(w0) / (2 * q)
    c = math.cos(w0)
    b = [a * ((a + 1) + (a - 1) * c + 2 * math.sqrt(a) * al), -2 * a * ((a - 1) + (a + 1) * c), a * ((a + 1) + (a - 1) * c - 2 * math.sqrt(a) * al)]
    aa = [(a + 1) - (a - 1) * c + 2 * math.sqrt(a) * al, 2 * ((a - 1) - (a + 1) * c), (a + 1) - (a - 1) * c - 2 * math.sqrt(a) * al]
    y = signal.lfilter(np.array(b) / aa[0], np.array(aa) / aa[0], x, axis=0)
    fc2, q2 = 38.13547087613982, 0.5003270373253953
    k = math.tan(math.pi * fc2 / SR)
    a0 = 1 + k / q2 + k * k
    return signal.lfilter([1, -2, 1], [1, 2 * (k * k - 1) / a0, (1 - k / q2 + k * k) / a0], y, axis=0)


def lufs(x):
    """Integrated loudness, 400 ms blocks, 75 % overlap, absolute -70 and relative -10 LU gates."""
    y = k_weight(x)
    blk, step = int(0.4 * SR), int(0.1 * SR)
    if len(y) < blk:
        z = np.array([np.sum(np.mean(y ** 2, axis=0))])
    else:
        z = np.array([np.sum(np.mean(y[i:i + blk] ** 2, axis=0)) for i in range(0, len(y) - blk + 1, step)])
    l = -0.691 + 10 * np.log10(z + 1e-20)
    z1 = z[l > -70]
    if len(z1) == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z[l > rel]
    return -0.691 + 10 * np.log10(np.mean(z2))


def finish(x, gain_db):
    """Gain, then Limiter at -1 dB. pedalboard's Limiter adds a fixed make-up gain of its own (measured +4.75 dB
    in the linear region), so loudness targets are reached with finish_to(), which measures AFTER the limiter."""
    y = x * 10 ** (gain_db / 20)
    return Pedalboard([Limiter(threshold_db=LIMIT_DB, release_ms=100.0)])(y.T.astype(np.float32), SR).T.astype(np.float64)


def finish_to(x, target):
    """Find the gain that puts the integrated loudness AFTER the limiter on `target`; returns (audio, gain_db)."""
    g = target - lufs(x)
    for _ in range(3):
        out = finish(x, g)
        err = lufs(out) - target
        if abs(err) < 0.05:
            break
        g -= err
    return out, g


def peak_db(x):
    return 20 * np.log10(np.max(np.abs(x)) + 1e-12)


def seam_ratio(loop):
    """Largest sample-to-sample jump across the loop seam / largest jump anywhere inside the file (<= ~1 means no click)."""
    d = np.abs(np.diff(np.concatenate([loop[-2:], loop[:2]]), axis=0)).max()
    inner = np.abs(np.diff(loop, axis=0)).max()
    return float(d / (inner + 1e-12))


def bands(x):
    """Energy by band in dB relative to 200 Hz to 2 kHz (to see a 3 kHz build-up without listening)."""
    m = x.mean(axis=1)[: 8 * SR]
    sp = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1 / SR)
    e = lambda a, b: sp[(f >= a) & (f < b)].sum() + 1e-20
    ref = e(200, 2000)
    return {k: round(10 * math.log10(e(a, b) / ref), 1) for k, (a, b) in {"<120": (0, 120), "2-4k": (2000, 4000), "4-8k": (4000, 8000)}.items()}


# ---------------------------------------------------------------- files
def longest_part_sec():
    tmp = Path("/tmp/dontsay_parts.ts")
    tmp.write_text(f"import {{ partRanges }} from '{ROOT}/src/dontsay/timing';\nconsole.log(JSON.stringify(partRanges.map((p) => p.ticks / 30)));\n")
    try:
        r = subprocess.run(["npx", "tsx", str(tmp)], cwd=ROOT, capture_output=True, text=True, timeout=180)
        secs = json.loads(r.stdout.strip().splitlines()[-1])
        return max(secs), "timing.ts partRanges"
    except Exception as e:  # noqa: BLE001
        print(f"WARNING: could not read partRanges ({e}); using {FALLBACK_LONGEST_PART_SEC} s", file=sys.stderr)
        return FALLBACK_LONGEST_PART_SEC, "fallback constant"


def write(name, x):
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(str(OUT / name), x.astype(np.float32), SR, subtype="PCM_24")


def loop_file(cfg, seed, target_lufs, cycles):
    main, subbuf = render_cycles(cfg, seed)
    full = run_chain(main, subbuf)
    cyc = full[CYCLE_N:2 * CYCLE_N]
    x = np.tile(cyc, (cycles, 1))
    return finish_to(x, target_lufs)


def one_shot(chords_t, seed, seconds, ramp=None, fade_out=0.0, extra=None):
    """Non-looping file. chords_t = [(chord, start_sec, arrangement)]. Rendered with a 6 s reverb tail, cut to `seconds`."""
    rng = np.random.default_rng(seed)
    n = int((seconds + 6) * SR)
    main, subbuf = np.zeros((n, 2)), np.zeros((n, 2))
    for chord, t0, cfg in chords_t:
        render_chord(main, subbuf, chord, t0, cfg, rng)
    if extra:
        extra(main, rng)
    if ramp is not None:
        t = np.arange(n) / SR
        g = ramp(t)
        main *= g[:, None]
        subbuf *= g[:, None]
    x = run_chain(main, subbuf)[: int(seconds * SR)]
    if fade_out:
        nf = int(fade_out * SR)
        x[-nf:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(nf) / nf))[:, None]
    return x


def main():
    longest, src = longest_part_sec()
    cycles = math.ceil(longest / CYCLE_SEC)
    level_sec = cycles * CYCLE_SEC
    print(f"longest part {longest:.1f} s ({src}); level files = {cycles} cycles of 8 bars = {level_sec:.2f} s ({cycles * 8} bars)")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, rows = [], []

    def record(name, x, loop, bars, gain_db):
        write(name, x)
        l = lufs(x)
        row = dict(file=name, seconds=round(len(x) / SR, 3), bpm=BPM, key=KEY, loop=loop, bars=bars,
                   lufs=round(l, 1), samplePeakDb=round(peak_db(x), 1), gainDb=round(gain_db, 1))
        manifest.append(row)
        rows.append((row, seam_ratio(x) if loop else None, bands(x)))

    gains = {}
    for lv in range(1, 6):
        x, g = loop_file(LEVELS[lv], 100 + lv, LEVEL_LUFS[lv], cycles)
        gains[lv] = g
        record(f"level{lv}.wav", x, True, cycles * 8, g)

    x, g = loop_file(BONUS, 200, BONUS_LUFS, 2)
    record("bonus.wav", x, True, 16, g)

    g1 = gains[1]  # hook, check-in and outro use level 1's gain so they sit at the same level as the beds
    cs = CHORDS
    # hook: 8 s = 3 bars. Gmaj7 (2 bars) then Asus4 (1 bar): leads into level 1's Dadd9. Level-1 material, near-silence to full.
    hook = one_shot([(cs[2], 0.0, LEVELS[1]), (cs[3], CHORD_SEC, LEVELS[1])], 300, 8.0,
                    ramp=lambda t: 0.015 + 0.985 * np.clip(t / 8.0, 0, 1) ** 2, fade_out=0.02)
    record("hook.wav", finish(hook, g1), False, 3, g1)

    # check-in: 2 s soft swell on Asus4 with one rising bell, back down at the end
    def swell(main, rng):
        n = int(2.0 * SR)
        t = np.arange(n) / SR
        e = np.sin(np.pi * np.clip(t / 2.0, 0, 1) ** 1.6) ** 2
        for m in (57, 62, 64, 69):
            for cents, p in ((-6, 0.3), (6, 0.7)):
                s = np.sin(2 * np.pi * mtof(m) * 2 ** (cents / 1200) * t + rng.uniform(0, 6.28)) * e * 0.12
                add(main, pan(s, p), 0.0)
        bell(main, 81, 0.9, 0.12, 0.5)

    ci = np.zeros((int(8 * SR), 2))
    rng = np.random.default_rng(400)
    swell(ci, rng)
    x = run_chain(ci, np.zeros_like(ci))[: int(2.0 * SR)]
    nf = int(0.15 * SR)
    x[-nf:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(nf) / nf))[:, None]
    record("checkin.wav", finish(x, g1), False, 0, g1)

    # outro: 12 bars = 32 s. Dadd9 Bm7 Gmaj7 Asus4, then Dadd9 for 4 bars; fade over the last 6 s.
    def outro_extra(main, rng):
        t0 = 4 * CHORD_SEC
        for j, m in enumerate([62, 66, 69, 76]):  # D4 F#4 A4 E5, slow and soft
            pluck(main, m, t0 + 0.4 + j * BEAT * 1.5, 0.16, 1.0, 0.35 + 0.1 * j)
        bell(main, 86, t0 + 4 * BEAT, 0.08, 0.6)

    body = dict(LEVELS[3], pluck=[0, 6, 10])
    tail = dict(bright=0.15, pluck=[], air=1, pulse=0, pluck_index=1.0)  # final Dadd9: pad, sub and one bell (+ the arpeggio below)
    chord_t = [(cs[i], i * CHORD_SEC, body) for i in range(4)] + [(cs[0], 4 * CHORD_SEC, tail), (cs[0], 5 * CHORD_SEC, tail)]
    o = one_shot(chord_t, 500, 32.0, extra=outro_extra)
    fo = int(6.0 * SR)
    o[-fo:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(fo) / fo))[:, None]
    record("outro.wav", finish(o, g1), False, 12, g1)

    (OUT / "manifest.json").write_text(json.dumps(
        {"sampleRate": SR, "bitDepth": 24, "bpm": BPM, "key": KEY, "chords": [c[0] for c in CHORDS], "chordBars": 2, "cycleBars": 8,
         "cycleSeconds": round(CYCLE_SEC, 4), "music": manifest}, indent=2) + "\n")

    print(f"\n{'file':14} {'seconds':>8} {'bars':>5} {'loop':>5} {'LUFS':>6} {'peak dB':>8} {'gain dB':>8} {'seam':>6}  bands re 200-2k (dB)")
    for r, seam, b in rows:
        print(f"{r['file']:14} {r['seconds']:8.2f} {r['bars']:5d} {str(r['loop']):>5} {r['lufs']:6.1f} {r['samplePeakDb']:8.1f} {r['gainDb']:8.1f} "
              f"{'' if seam is None else format(seam, '.2f'):>6}  {b}")


if __name__ == "__main__":
    main()
