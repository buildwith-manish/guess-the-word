/**
 * music.ts: the music-bed plan for "Don't Say The Same As Me" (task MU2). Pure data and maths, no React:
 * `components/MusicBeds.tsx` mounts it, `scripts/dontsay_music_plan.ts` prints it.
 * Spans, crossfades and duck windows all come from timing.ts (`segments`, `voiceCues`, `clipSec`) and the
 * file lengths from public/dontsay/music/manifest.json. No frame number is written here.
 */
import manifest from '../../public/dontsay/music/manifest.json';
import { RENDER_TOTAL_FRAMES, clipSec, outroFadeSec, secToFrames, segments, ticksToFrames, voiceCues } from './timing';

/* ---------- the knobs (change the mix here) ---------- */
/** Master music volume. 1 = the files as MU1 wrote them (beds -31 to -29 LUFS, voice about -16). Lower = quieter. */
export const MUSIC_VOLUME = 1;
/** Length of the crossfade between two beds. */
export const CROSSFADE_SEC = 1;
/** The first bed (the hook) fades in over this, so nothing starts with a click. */
export const START_FADE_SEC = 0.1;
/** Music is pulled down by this much while a voice clip plays. */
export const DUCK_DB = -6;
export const DUCK_ATTACK_SEC = 0.15;
export const DUCK_RELEASE_SEC = 0.5;

/* ---------- beds ---------- */
export type Bed = {
  /** hook, level1..level5, bonus, outro */
  key: string;
  file: string;
  loop: boolean;
  /** Frames of the segments that use this bed (absolute, 60 fps). */
  from: number;
  to: number;
  /** The Sequence that carries the Audio: from the start of the fade-in to the end of the fade-out. */
  seqFrom: number;
  seqTo: number;
  fadeIn: [number, number] | null;
  fadeOut: [number, number] | null;
  /** Frames cut off the start of the file (only the outro: its own fade must end with the video). */
  skip: number;
};

type Entry = { file: string; seconds: number; loop: boolean };
const files = new Map<string, Entry>((manifest.music as Entry[]).map((m) => [m.file, m]));
const fileOf = (key: string): Entry => {
  const e = files.get(`${key}.wav`);
  if (!e) throw new Error(`music: ${key}.wav is not in public/dontsay/music/manifest.json`);
  return e;
};

type Span = { key: string; from: number; to: number };

/** Which bed each segment sits on. A settings card takes the level of the level card after it; the rank card and
 *  scoreboard go back to the last level's bed after the final bonus; a heart check-in stays on the bed it is in. */
const buildSpans = (): Span[] => {
  const out: Span[] = [];
  let lastLevel: number | undefined;
  segments.forEach((s, i) => {
    let key: string;
    switch (s.kind) {
      case 'hook':
        key = 'hook';
        break;
      case 'settingsCard': {
        const next = segments.slice(i + 1).find((x) => x.kind === 'levelCard');
        if (!next || next.kind !== 'levelCard') throw new Error('music: settings card without a level card after it');
        key = `level${next.level}`;
        break;
      }
      case 'levelCard':
        lastLevel = s.level;
        key = `level${s.level}`;
        break;
      case 'round':
        lastLevel = s.round.level;
        key = `level${s.round.level}`;
        break;
      case 'heartCheckIn':
        key = out[out.length - 1].key;
        break;
      case 'bonus':
        key = 'bonus';
        break;
      case 'rankCard':
      case 'scoreboard':
        if (lastLevel === undefined) throw new Error('music: rank card before any level');
        key = `level${lastLevel}`;
        break;
      case 'outro':
        key = 'outro';
        break;
    }
    const from = ticksToFrames(s.from);
    const to = ticksToFrames(s.to);
    const prev = out[out.length - 1];
    if (prev && prev.key === key) prev.to = to;
    else out.push({ key, from, to });
  });
  return out;
};

const X = secToFrames(CROSSFADE_SEC);
const HALF = Math.round(X / 2);

const buildBeds = (): Bed[] => {
  const spans = buildSpans();
  const beds: Bed[] = spans.map((s, i) => {
    const f = fileOf(s.key);
    return { key: s.key, file: f.file, loop: f.loop, from: s.from, to: s.to, seqFrom: s.from, seqTo: s.to, fadeIn: null, fadeOut: null, skip: 0 };
  });
  // Crossfade windows. Centred on the boundary, except when the outgoing file is a one-shot that ends first
  // (the hook): then the window ends at the end of the file, so the file never stops in the middle of a fade.
  for (let i = 0; i + 1 < beds.length; i++) {
    const a = beds[i];
    const b = beds[i + 1];
    const aStart = a.fadeIn ? a.fadeIn[0] : 0;
    const aFileEnd = a.loop ? Infinity : aStart + secToFrames(fileOf(a.key).seconds);
    const w1 = Math.min(b.from + HALF, aFileEnd);
    const w0 = w1 - X;
    if (w0 < (a.fadeIn ? a.fadeIn[1] : 0)) throw new Error(`music: bed ${a.key} is too short for its crossfade into ${b.key}`);
    a.fadeOut = [w0, w1];
    a.seqTo = w1;
    b.fadeIn = [w0, w1];
    b.seqFrom = w0;
  }
  const first = beds[0];
  first.seqFrom = 0;
  first.fadeIn = [0, secToFrames(START_FADE_SEC)];
  const last = beds[beds.length - 1];
  last.seqTo = RENDER_TOTAL_FRAMES;
  last.fadeOut = [RENDER_TOTAL_FRAMES - secToFrames(outroFadeSec), RENDER_TOTAL_FRAMES];
  // A one-shot last bed (the outro) is trimmed so the END of the file lands on the end of the video.
  if (!last.loop) last.skip = Math.max(0, secToFrames(fileOf(last.key).seconds) - (last.seqTo - last.seqFrom));
  return beds;
};

export const musicBeds: Bed[] = buildBeds();

/** Heart check-in cards: the swell (checkin.wav) plays on top of the bed over each one. */
export const checkInSwells = segments
  .filter((s) => s.kind === 'heartCheckIn')
  .map((s) => ({ from: ticksToFrames(s.from), to: ticksToFrames(s.to), file: fileOf('checkin').file, fileFrames: secToFrames(fileOf('checkin').seconds) }));

/* ---------- gains ---------- */
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const ease = (x: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

/** Equal-power crossfade gain of a bed at an absolute frame (1 inside the bed, 0 outside the window). */
export const fadeGain = (bed: Bed, frame: number): number => {
  let g = 1;
  if (bed.fadeIn) g *= Math.sin((Math.PI / 2) * clamp01((frame - bed.fadeIn[0]) / Math.max(1, bed.fadeIn[1] - bed.fadeIn[0])));
  if (bed.fadeOut) g *= Math.cos((Math.PI / 2) * clamp01((frame - bed.fadeOut[0]) / Math.max(1, bed.fadeOut[1] - bed.fadeOut[0])));
  return g;
};

/** Voice windows (absolute frames) from the existing voice cues; a clip without a measured length is skipped. */
export type VoiceWindow = { start: number; end: number };
export const voiceWindows: VoiceWindow[] = segments
  .flatMap((seg) =>
    voiceCues(seg).flatMap((c) => {
      const len = clipSec(c.id);
      if (len === undefined) return [];
      const start = ticksToFrames(seg.from + c.tick);
      return [{ start, end: start + secToFrames(len) }];
    }),
  )
  .sort((a, b) => a.start - b.start);

const ATTACK = secToFrames(DUCK_ATTACK_SEC);
const RELEASE = secToFrames(DUCK_RELEASE_SEC);
const DUCK_DEPTH = 1 - 10 ** (DUCK_DB / 20);

/** 0..1 how far the music is ducked at an absolute frame: eased attack, hold while a clip plays, eased release; the deepest window wins. */
export const duckDepth = (frame: number): number => {
  let d = 0;
  for (const w of voiceWindows) {
    if (w.start > frame) break;
    const end = Math.max(w.end, w.start + ATTACK);
    if (frame > end + RELEASE) continue;
    const v = frame < w.start + ATTACK ? ease((frame - w.start) / ATTACK) : frame <= end ? 1 : 1 - ease((frame - end) / RELEASE);
    if (v > d) d = v;
  }
  return d;
};
export const duckGain = (frame: number): number => 1 - duckDepth(frame) * DUCK_DEPTH;

/** Volume of a bed at an absolute frame, before the check-in lift: master x crossfade x duck. */
export const bedGain = (bed: Bed, frame: number): number => MUSIC_VOLUME * fadeGain(bed, frame) * duckGain(frame);
