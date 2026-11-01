#!/usr/bin/env node
/**
 * scripts/generate-audio.js
 * ---------------------------------------------------------------------------
 * Renders every sound the reference HTML makes with WebAudio into real WAV
 * files under public/sounds/, so Remotion can mix them into the video.
 *
 *   SFX    whoosh, pop, tick, flip, flare, boom, thump, siren, drumroll,
 *          chimes, jingles ...
 *   MUSIC  a 112.5 BPM loop (see below) split into three stacked layers:
 *            music-base.wav  bass + kick + hats + arpeggio (intensity 0)
 *            music-l1.wav    + off-beat arpeggio notes      (intensity 1)
 *            music-l2.wav    + off-beat hats                (intensity 2)
 *          The layers are phase-locked and each is exactly 256 frames long
 *          (8.5333 s at 30 fps), so Remotion can loop them with Sequences and
 *          fade layers in/out as the quiz gets busier — with no drift.
 *
 * Deterministic: noise comes from a seeded PRNG, so re-running the script gives
 * byte-identical files. No dependencies, no ffmpeg.
 *
 * Usage: node scripts/generate-audio.js            (also: npm run sounds)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8'));
const OUT = path.resolve(ROOT, settings.sound && settings.sound.dir ? settings.sound.dir : 'public/sounds');

const SR = 44100;
const FPS = settings.fps || 30;
/** The HTML's context master gain (0.5). Baked into the files together with the
 *  loudness trims from settings.json -> sound, so Remotion plays everything at volume <= 1.
 *  (The browser quiz is played through speakers at the viewer's volume; a rendered
 *  video needs real headroom, so sfxGain / musicGain lift it.) */
const MASTER = 0.5;
const SFX_GAIN = Number((settings.sound && settings.sound.sfxGain) || 3);
const MUSIC_GAIN = Number((settings.sound && settings.sound.musicGain) || 2.5);

/* ------------------------------------------------------------------ helpers */

const makeRandom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const buf = (seconds) => new Float32Array(Math.round(seconds * SR));

const osc = (type, ph) => {
  const x = ph - Math.floor(ph);
  switch (type) {
    case 'triangle':
      return 1 - 4 * Math.abs(x - 0.5);
    case 'square':
      return x < 0.5 ? 1 : -1;
    case 'sawtooth':
      return 2 * x - 1;
    default:
      return Math.sin(2 * Math.PI * x);
  }
};

/**
 * One oscillator voice, mixed into `out` at time `at` (seconds).
 *   env 'tone' : gain v -> exponential ramp to .001 over d      (HTML tone())
 *   env 'note' : .0001 -> linear to v in 5 ms -> exp to .0008   (HTML note())
 * `wrap` lets the music loop wrap its last notes back onto the start.
 */
const voice = (out, { at, f, f2, d, type = 'sine', v, env = 'tone', wrap = false }) => {
  const start = Math.round(at * SR);
  const len = Math.round((env === 'note' ? d + 0.02 : d) * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const freq = f2 ? f * Math.pow(f2 / f, Math.min(1, t / d)) : f;
    phase += freq / SR;
    let g;
    if (env === 'note') {
      if (t < 0.005) g = 0.0001 + (v - 0.0001) * (t / 0.005);
      else g = v * Math.pow(0.0008 / v, Math.min(1, (t - 0.005) / (d - 0.005)));
    } else {
      g = v * Math.pow(0.001 / v, Math.min(1, t / d));
    }
    // 2 ms fade on the last samples so a voice never ends on a click
    const tail = Math.min(1, (len - i) / (0.002 * SR));
    let idx = start + i;
    if (wrap) idx %= out.length;
    else if (idx >= out.length) break;
    out[idx] += osc(type, phase) * g * tail;
  }
};

/** RBJ band-pass (constant 0 dB peak), Q = 1 like a default BiquadFilter. */
const makeBandpass = () => {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x, fc) => {
    const w0 = (2 * Math.PI * fc) / SR;
    const alpha = Math.sin(w0) / 2; // Q = 1
    const a0 = 1 + alpha;
    const b0 = alpha / a0;
    const b2 = -alpha / a0;
    const a1 = (-2 * Math.cos(w0)) / a0;
    const a2 = (1 - alpha) / a0;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
};

const WHOOSH_SECONDS = 0.7;
const whooshInto = (out, at, rand) => {
  const bp = makeBandpass();
  const start = Math.round(at * SR);
  const n = Math.round(WHOOSH_SECONDS * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fc = t < 0.55 ? 250 * Math.pow(4500 / 250, t / 0.55) : 4500;
    let g;
    if (t < 0.25) g = 0.001 + (0.3 - 0.001) * (t / 0.25);
    else if (t < 0.65) g = 0.3 * Math.pow(0.001 / 0.3, (t - 0.25) / 0.4);
    else g = 0.001;
    if (start + i < out.length) out[start + i] += bp(rand() * 2 - 1, fc) * g;
  }
};

const drumrollInto = (out, sec, rand) => {
  const n = Math.max(1, Math.floor(sec / 0.055));
  const burst = Math.round(0.08 * SR);
  const noise = new Float32Array(burst);
  for (let i = 0; i < burst; i++) noise[i] = rand() * 2 - 1;
  for (let k = 0; k < n; k++) {
    const bp = makeBandpass();
    const start = Math.round(k * 0.055 * SR);
    const v = 0.04 + 0.22 * (k / n);
    for (let i = 0; i < burst; i++) {
      const t = i / SR;
      const g = t < 0.05 ? v * Math.pow(0.001 / v, t / 0.05) : 0.001;
      if (start + i < out.length) out[start + i] += bp(noise[i], 1800) * g;
    }
  }
};

/** Normalise only if a mix would clip; never boosts quiet material. */
const finish = (b, gain = MASTER) => {
  let peak = 0;
  for (let i = 0; i < b.length; i++) {
    b[i] *= gain;
    peak = Math.max(peak, Math.abs(b[i]));
  }
  if (peak > 0.97) for (let i = 0; i < b.length; i++) b[i] *= 0.97 / peak;
  return b;
};

const writeWav = (name, samples) => {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([head, data]));
  return (samples.length / SR).toFixed(3);
};

/* ---------------------------------------------------------------------- SFX */

const T = (at, f, d, type, v, f2) => ({ at, f, f2, d, type, v });

/** name -> list of oscillator voices (times in seconds) — straight from the HTML. */
const TONES = {
  // titleIn: tone(520,.25,'triangle',.12)
  title: [T(0, 520, 0.25, 'triangle', 0.12)],
  // emoji / board pop: tone(300,.3,'sine',.22,90)
  pop: [T(0, 300, 0.3, 'sine', 0.22, 90)],
  // timer tick: tone(760,.09,'square',.07) and the last-3-seconds tone(1250,...)
  tick: [T(0, 760, 0.09, 'square', 0.07)],
  'tick-low': [T(0, 1250, 0.09, 'square', 0.07)],
  // free-letter flip: tone(1568,.25,'triangle',.14)
  flip: [T(0, 1568, 0.25, 'triangle', 0.14)],
  // bulb flare: tone(1760,.5,'sine',.13)
  flare: [T(0, 1760, 0.5, 'sine', 0.13)],
  // answer letters: tone(520+k*60,.18,'triangle',.13) — pitched with playbackRate
  letter: [T(0, 520, 0.18, 'triangle', 0.13)],
  // hook "hard pair" blips: tone(500+i*160,.1,'square',.1) — pitched with playbackRate
  blip: [T(0, 500, 0.1, 'square', 0.1)],
  // answer stamp: tone(110,.4,'sine',.38,45) + tone(660,.15,'triangle',.1)
  stamp: [T(0, 110, 0.4, 'sine', 0.38, 45), T(0, 660, 0.15, 'triangle', 0.1)],
  // correct answer arpeggio: 784 / 988 / 1318 at 0, 110, 220 ms
  'chime-arp': [
    T(0, 784, 0.45, 'triangle', 0.18),
    T(0.11, 988, 0.45, 'triangle', 0.18),
    T(0.22, 1318, 0.6, 'triangle', 0.18),
  ],
  // heartbeat (thump()): two low sine hits 170 ms apart
  thump: [T(0, 64, 0.22, 'sine', 0.55, 36), T(0.17, 58, 0.22, 'sine', 0.45, 34)],
  // boom(): sawtooth + sine drop
  boom: [T(0, 90, 0.5, 'sawtooth', 0.28, 38), T(0, 55, 0.6, 'sine', 0.5, 30)],
  // rules slam: tone(200,.25,'sawtooth',.15,90)
  'rule-sweep': [T(0, 200, 0.25, 'sawtooth', 0.15, 90)],
  // rules line 2: tone(988,.15,'triangle',.15)
  'ping-hi': [T(0, 988, 0.15, 'triangle', 0.15)],
  // rules line 3 / "under 4 wrong = legend": 784 then 1046 at 120 ms
  'jingle-rules': [T(0, 784, 0.3, 'triangle', 0.2), T(0.12, 1046, 0.4, 'triangle', 0.2)],
  // end screen CTA: 1046 then 1318 at 120 ms
  'jingle-cta': [T(0, 1046, 0.3, 'triangle', 0.2), T(0.12, 1318, 0.4, 'triangle', 0.2)],
  // end screen frame / subscribe pings
  ding: [T(0, 784, 0.4, 'triangle', 0.2)],
  'ding-hi': [T(0, 988, 0.3, 'triangle', 0.2)],
  // scoreboard rows: tone(330+(4-i)*110,.3,'triangle',.18) — pitched with playbackRate
  row: [T(0, 330, 0.3, 'triangle', 0.18)],
  // LEGEND row: 784 (.6) + 1046 (.8) at 150 ms
  legend: [T(0, 784, 0.6, 'triangle', 0.2), T(0.15, 1046, 0.8, 'triangle', 0.2)],
  // "Still counting?" reminder: tone(660,.2,'sine',.12)
  remind: [T(0, 660, 0.2, 'sine', 0.12)],
  // bonus: erase-chip chime tone(1318,.5,'triangle',.18)
  'chime-erase': [T(0, 1318, 0.5, 'triangle', 0.18)],
  // bonus reveal accent: tone(660,.15,'triangle',.1) rides on `stamp`, so nothing extra
  // siren(): 620<->980 sawtooth sweeps at 0 / 340 / 680 ms
  siren: [
    T(0, 620, 0.34, 'sawtooth', 0.1, 980),
    T(0.34, 980, 0.34, 'sawtooth', 0.1, 620),
    T(0.68, 620, 0.34, 'sawtooth', 0.1, 980),
  ],
};

const SECONDS = (list) => Math.max(...list.map((v) => v.at + v.d)) + 0.05;

/* -------------------------------------------------------------------- MUSIC */

const BPM = 112.5; // HTML uses 112; 112.5 makes the 4-bar loop exactly 256 frames at 30 fps
const STEPS = 32; // 4 bars x 8 eighth-notes
const LOOP_SAMPLES = Math.round((SR * 256) / FPS); // 376320 at 30 fps
const STEP_S = LOOP_SAMPLES / STEPS / SR;
const CHORD_ROOTS = [48, 43, 45, 41];
const CH = [0, 4, 7, 12];
const ARP = [0, 1, 2, 3, 2, 1, 2, 1];

/** layer: 0 = base, 1 = off-beat arp, 2 = off-beat hats */
const musicLayer = (layer) => {
  const out = new Float32Array(LOOP_SAMPLES);
  for (let step = 0; step < STEPS; step++) {
    const at = step * STEP_S;
    const bar = Math.floor(step / 8);
    const s = step % 8;
    const r = CHORD_ROOTS[bar];
    const arp = { at, f: hz(r + 12 + CH[ARP[s] % 4]), d: 0.3, type: 'sine', v: 0.13, env: 'note', wrap: true };
    if (layer === 0) {
      if ([0, 3, 4, 6].includes(s)) voice(out, { at, f: hz(r), d: 0.28, type: 'triangle', v: 0.3, env: 'note', wrap: true });
      if (s % 2 === 0) voice(out, arp);
      if (s === 0 || s === 4) voice(out, { at, f: 55, f2: 40, d: 0.16, type: 'sine', v: 0.35, env: 'note', wrap: true });
      if (s % 2 === 0) voice(out, { at, f: 7000, d: 0.04, type: 'square', v: 0.012, env: 'note', wrap: true });
    }
    if (layer === 1 && s % 2 === 1) voice(out, arp);
    if (layer === 2 && s % 2 === 1) voice(out, { at, f: 7000, d: 0.03, type: 'square', v: 0.012, env: 'note', wrap: true });
  }
  // HTML music bus = 0.5 on top of the 0.5 master
  return finish(out, MASTER * 0.5 * MUSIC_GAIN);
};

/* --------------------------------------------------------------------- main */

const main = () => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = [];

  for (const [name, list] of Object.entries(TONES)) {
    const out = buf(SECONDS(list));
    list.forEach((v) => voice(out, v));
    report.push([name, writeWav(name, finish(out, MASTER * SFX_GAIN))]);
  }

  {
    const out = buf(WHOOSH_SECONDS);
    whooshInto(out, 0, makeRandom(11));
    report.push(['whoosh', writeWav('whoosh', finish(out, MASTER * SFX_GAIN))]);
  }

  for (const sec of [2]) {
    const out = buf(sec + 0.1);
    drumrollInto(out, sec, makeRandom(23));
    report.push([`drumroll`, writeWav('drumroll', finish(out, MASTER * SFX_GAIN))]);
  }

  ['base', 'l1', 'l2'].forEach((n, layer) => {
    report.push([`music-${n}`, writeWav(`music-${n}`, musicLayer(layer))]);
  });

  // durations for src/sound.ts (it needs each clip's length to size its <Sequence>)
  const manifest = {};
  report.forEach(([n, sec]) => (manifest[n] = Number(sec)));
  fs.writeFileSync(path.join(ROOT, 'src', 'sound-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  report.forEach(([n, s]) => console.log(`  ${n.padEnd(14)} ${s}s`));
  console.log(`✔ ${report.length} files -> ${path.relative(ROOT, OUT)}/  (loop = ${LOOP_SAMPLES / SR}s @ ${BPM} BPM, step ${STEP_S.toFixed(4)}s)`);
};

main();
