#!/usr/bin/env python3
"""Synthesize the Christmas Movie Emoji Quiz sound effects (original, numpy synthesis, royalty-free).

Every sound is generated from scratch with numpy (sines, decaying glass partials, filtered noise), then finished through
a pedalboard chain: high-pass, gentle compressor, limiter. The UI sounds (tiles-in, widget-pop, transition) use the
richer `premium` chain: EQ, air shelf, a very small room, compressor, limiter. No samples, no recordings, no tunes: every sound is a
single soft event (tick, pop, ping, a soft air sweep), nothing that sounds like a melody or a song.

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


def premium(sig, hp=120, room=0.16, wet=0.11, air=2.5, tail=0.22):
    """The finishing chain of the UI sounds (pop, transition): pedalboard high-pass, a little low-mid cleanup, an 'air'
    shelf, a very small damped room (it adds depth, not an audible echo), a soft compressor and a limiter. `tail` seconds
    of silence are added first so the room can ring out."""
    from pedalboard import Compressor, HighShelfFilter, HighpassFilter, Limiter, PeakFilter, Pedalboard, Reverb
    x = np.pad(sig, (0, int(tail * SR))).astype(np.float32)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
    board = Pedalboard([
        HighpassFilter(hp),
        PeakFilter(cutoff_frequency_hz=320, gain_db=-2.0, q=0.9),
        HighShelfFilter(cutoff_frequency_hz=7500, gain_db=air, q=0.7),
        Reverb(room_size=room, damping=0.75, wet_level=wet, dry_level=0.92, width=0.6),
        Compressor(threshold_db=-20, ratio=2.2, attack_ms=2, release_ms=70),
        Limiter(threshold_db=-1.0, release_ms=50),
    ])
    y = board(x[None, :], SR)[0].astype(np.float64)
    y = fade(y, 0.0, 0.03)
    return y / (np.max(np.abs(y)) + 1e-9) * 10 ** (PEAK_DB / 20)


def bubble(f0, sec=0.14, amp=1.0):
    """One soft iOS-style bubble pop: a round sine that rises about an octave in a few ms and decays fast, a quiet second
    partial, a muted tick on the attack and a faint glass top. Single event, no pitch pattern."""
    body = sweep(f0 * 0.82, f0 * 1.7, sec, decay=30, attack=0.002)
    t = t_axis(sec)
    over = 0.22 * np.sin(2 * np.pi * f0 * 2.0 * t) * np.exp(-60 * t)
    top = glass(f0 * 5.2, sec, decay=42, amp=0.07)[: len(t)]
    sig = body + over + top
    sig[: int(0.003 * SR)] += click(0.10, 0.003, 1800)
    return sig * amp


def build():
    out = {}

    # tiles-in: the two clue tiles pop in: two soft bubble pops 40 ms apart (the right one a little higher and quieter).
    # (The random stream is restored and the old whoosh's draw is skipped, so every other sound stays bit-identical.)
    state = rng.bit_generator.state
    buf = np.zeros(int(0.32 * SR))
    place(buf, bubble(400, 0.14, 1.0), 0.0)
    place(buf, bubble(450, 0.14, 0.8), 0.04)
    out["tiles-in"] = premium(buf, hp=150)
    rng.bit_generator.state = state
    rng.standard_normal(int(0.5 * SR))

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

    # widget-pop: one soft bubble pop (icons, widgets, outro asks), same family as tiles-in.
    out["widget-pop"] = premium(bubble(360, 0.16, 1.0), hp=120)

    # ring-glow: a soft glow swelling around the odd tree: slow glass swell with a little air.
    sec = 0.85
    t = t_axis(sec)
    env = bell_env(sec, 0.55, 1.6)
    swell = (np.sin(2 * np.pi * 740 * t) + 0.25 * np.sin(2 * np.pi * 740 * 2.32 * t) + 0.1 * np.sin(2 * np.pi * 740 * 4.25 * t)) * env
    air = noise_band(sec, lambda p: 3200 + 900 * p, q=1.2) * env * 0.12
    out["ring-glow"] = finish(swell * 0.8 + air, hp=250)

    # transition: the move to the next question: a soft low tap, then a short air sweep going up and away.
    sec = 0.42
    buf = np.zeros(int(sec * SR))
    place(buf, sweep(150, 82, 0.14, decay=26, attack=0.003) * 0.8, 0.0)
    sw = noise_band(0.34, lambda p: 900 + 3200 * p ** 1.2, q=1.0) * bell_env(0.34, 0.5, 1.3) * 0.45
    place(buf, sw, 0.05)
    place(buf, glass(2600, 0.2, decay=16, amp=0.05), 0.22)
    out["transition"] = premium(buf, hp=70, room=0.2, wet=0.12)

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
