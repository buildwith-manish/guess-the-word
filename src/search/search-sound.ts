/** search-sound.ts: the audio plan for the search-history video (task 6b).
 *
 *  Copy-and-adapt of src/sound.ts, built from the search TIMELINE and the scenes' own cue
 *  lists. Pure arithmetic, no DOM, so Remotion can render any frame range in any order.
 *  All frames are design frames (1/30 s ticks); SearchSoundtrack converts to 60 fps.
 *
 *  Nothing from src/sound.ts is imported as a value (that would build GTW's whole audio
 *  plan); only its types. Clip lengths come from src/sound-manifest.json.
 *
 *  Music: the three GTW layers are stacked by level (music-base < music-l1 < music-l2):
 *    EASY   -> base only            (hook and the end of the video also sit here)
 *    MEDIUM -> base + l1
 *    HARD   -> base + l1 + l2
 *    bonus  -> all three (as in GTW)
 *  A level card switches the layers for its level; the music stops when the scoreboard starts. */
import rootSettings from '../../settings.json';
import manifest from '../sound-manifest.json';
import iosFiles from './search-sound-files.json';
import type { Cue, Sfx, Voice } from '../sound';
import { FPS, TIMELINE, TIME_SCALE, buildBonusPlan, voiceLevel, voiceIntro, voiceBonus, voiceClue } from './search-timing';
import { buildBonusCues } from './scenes/searchBonusCues';
import { searchRoundCues } from './scenes/searchRoundCues';
import { searchHookCues } from './scenes/SearchHook';
import { searchScoreboardCues, scoreboardVoice } from './scenes/searchScoreboardCues';
import { searchEndScreenCues, endScreenVoice } from './scenes/searchEndScreenCues';
import { buildRoundPlan } from './search-timing';
import { ROUNDS } from './search-data';

export type { Cue, Voice };
export { TIME_SCALE };

export const SOUND_ENABLED = Boolean((rootSettings as { sound?: { enabled?: boolean } }).sound?.enabled);
export const VOICE_DIR = rootSettings.voiceover.dir;
/** Music loop = exactly 256 ticks (scripts/generate-audio.js). */
export const MUSIC_LOOP_FRAMES = 256;

/** The iOS clips (public/sounds/ios-*.wav). search-sound-files.json says which of them exist and how long they are
 *  (written by `npm run search:sounds`). A clip that is missing is never referenced: soften() plays IOS_FALLBACK
 *  instead, so a missing file cannot fail a render. */
type IosSfx = keyof typeof iosFiles;
const isIos = (sfx: Sfx): sfx is IosSfx => sfx in iosFiles;
const IOS_FALLBACK: Record<IosSfx, { sfx: Sfx; volume: number }> = {
  'ios-tick': { sfx: 'key-click', volume: 1 }, // the old typing click; its gain is baked in (quiet)
  'ios-pop': { sfx: 'send', volume: 1 }, // the old row-landed blip, also baked quiet
  'ios-chime': { sfx: 'ding', volume: 0.5 },
};

/** Clip length in ticks (rounded up, +1 so a clip is never cut). */
export const clipFrames = (sfx: Sfx, rate = 1) => {
  const seconds = isIos(sfx) && iosFiles[sfx].present ? iosFiles[sfx].seconds : manifest[sfx];
  return Math.ceil((seconds * FPS) / rate) + 1;
};

// ---- sound design constants (not content, not timing from the settings files)
/** level card stinger: heartbeat, then a two-note jingle, one step higher for each level */
const STINGER_THUMP_AT = 3;
const STINGER_JINGLE_AT = 8;
const STINGER_RATE_STEP = 0.12;
/** cues that never duck the music (typing ticks and row pops are too small to pump it) */
const NO_DUCK: ReadonlySet<Sfx> = new Set<Sfx>(['key-click', 'ios-tick', 'ios-pop']);
const DUCK_FLOOR = 0.44; // as GTW: music bus .5 -> .22 under a sound
const MUSIC_RAMP = 10; // ticks for a layer to fade in or out
const MAX_LAYER = 2;

const layerForLevel = (levelIndex: number) => Math.min(MAX_LAYER, Math.max(0, levelIndex));

// ---------------------------------------------------------------- cues + voice

const VOICE_LIST: Voice[] = [];

/** Music hush windows (ticks): from a few ticks before every reveal until it lands, so the riser ends on silence.
 *  Same idea as HUSHES in src/sound.ts (ramp and floor from settings.sound.panic). */
const HUSH_LEAD = 9; // ticks of silence before the reveal (the same lead GTW uses)
const HUSHES: { from: number; to: number }[] = [];

/** iOS-style sound: loud effects are swapped for the soft clips we already have (tick, pop, send) and the rest are
 *  turned down. Applied to every cue in one place, so the scenes' own cue lists stay unchanged. */
const SOFT_SWAP: Partial<Record<Sfx, { sfx: Sfx; volume?: number }>> = {
  stamp: { sfx: 'pop', volume: 0.55 }, // was a hard stamp
  whoosh: { sfx: 'send' }, // 'send' has its gain baked in (quiet)
  boom: { sfx: 'pop', volume: 0.6 },
  thump: { sfx: 'tick-low' },
};
const SOFT_GAIN: Partial<Record<Sfx, number>> = {
  riser: 0.5,
  'jingle-rules': 0.5,
  'jingle-cta': 0.5,
  ding: 0.6,
  'ding-hi': 0.6,
  title: 0.6,
  'rule-sweep': 0.6,
  remind: 0.6,
  row: 0.7,
  // iOS clips are peak-normalised to 0.8 (scripts/generate-audio.js), so these are the real levels:
  // typed-word tick 12 %, row pop 25 %, answer chime 30 %. Change them here.
  'ios-tick': 0.12,
  'ios-pop': 0.25,
  'ios-chime': 0.3,
};
const soften = (c: Cue): Cue => {
  const swap = SOFT_SWAP[c.sfx] ?? (isIos(c.sfx) && !iosFiles[c.sfx].present ? IOS_FALLBACK[c.sfx] : undefined);
  const sfx = swap ? swap.sfx : c.sfx;
  const gain = (swap?.volume ?? SOFT_GAIN[c.sfx] ?? 1) * (c.volume ?? 1);
  return { ...c, sfx, volume: gain };
};

const buildCues = (): Cue[] => {
  const cues: Cue[] = [];
  const add = (frame: number, sfx: Sfx, extra: Partial<Cue> = {}) =>
    cues.push({ frame: Math.round(frame), sfx, ...extra });
  const place = (f0: number, list: Cue[]) => list.forEach((c) => cues.push({ ...c, frame: Math.round(f0 + c.frame) }));
  const voice = (frame: number, clip?: { file: string; frames: number }) => {
    if (clip) VOICE_LIST.push({ frame: Math.round(frame), file: clip.file, frames: clip.frames });
  };
  const VO_AT = rootSettings.voiceover.offsetFrames;
  const riserFrames = rootSettings.sound.panic.riserFrames;

  TIMELINE.segments.forEach((seg) => {
    const f0 = seg.from;
    switch (seg.kind) {
      case 'hook':
        place(f0, searchHookCues(seg.duration));
        voice(f0 + VO_AT, voiceIntro());
        break;
      case 'levelCard':
        add(f0 + STINGER_THUMP_AT, 'pop');
        add(f0 + STINGER_JINGLE_AT, 'jingle-rules', { rate: 1 + seg.levelIndex * STINGER_RATE_STEP });
        voice(f0 + VO_AT, voiceLevel(seg.levelIndex));
        break;
      case 'round': {
        const plan = buildRoundPlan(seg.index);
        const base = f0 - (seg.lead ?? 0); // the first `lead` ticks play inside the previous wipe
        place(base, searchRoundCues(seg.index));
        // each clue is read while it types (clips exist only once the manifest has all four for the round)
        ROUNDS[seg.index].searches.forEach((_, i) => voice(base + plan.searchAt[i], voiceClue(ROUNDS[seg.index].id, i)));
        // riser into the answer: the last second of the clock
        add(base + Math.max(plan.clockStart, plan.revealAt - riserFrames), 'riser');
        HUSHES.push({ from: Math.round(base + plan.revealAt - HUSH_LEAD), to: Math.round(base + plan.revealAt) });
        voice(base + plan.revealAt + VO_AT, plan.vo);
        break;
      }
      case 'bonus': {
        const plan = buildBonusPlan(seg.index);
        place(0, buildBonusCues(seg.index, f0));
        add(f0 + Math.max(plan.clockStart, plan.clockStart + plan.clockFrames - riserFrames), 'riser');
        HUSHES.push({ from: Math.round(f0 + plan.revealAt - HUSH_LEAD), to: Math.round(f0 + plan.revealAt) });
        voice(f0 + plan.revealAt + VO_AT, voiceBonus(seg.index + 1));
        break;
      }
      case 'reminder':
        add(f0, 'remind');
        break;
      case 'iris':
        add(f0, 'whoosh');
        break;
      case 'scoreboard':
        place(f0, searchScoreboardCues());
        scoreboardVoice(f0).forEach((v) => VOICE_LIST.push(v));
        break;
      case 'endScreen':
        place(f0, searchEndScreenCues());
        endScreenVoice(f0).forEach((v) => VOICE_LIST.push(v));
        break;
    }
  });
  return cues.map(soften).sort((a, b) => a.frame - b.frame);
};

export const CUES: Cue[] = buildCues();
/** Every voiceover clip in the video, in order (empty while the manifest is empty). */
export const VOICE: Voice[] = VOICE_LIST.slice().sort((a, b) => a.frame - b.frame);

// ----------------------------------------------------------------------- music

/** First tick with no music: the scoreboard starts. */
export const MUSIC_END = (TIMELINE.segments.find((s) => s.kind === 'scoreboard') ?? { from: TIMELINE.totalFrames }).from;

/** Ticks where the number of music layers changes; the value holds until the next entry. */
const layerChanges = (): { frame: number; layer: number }[] => {
  const out: { frame: number; layer: number }[] = [{ frame: 0, layer: 0 }];
  TIMELINE.segments.forEach((seg) => {
    if (seg.kind === 'levelCard') out.push({ frame: seg.from, layer: layerForLevel(seg.levelIndex) });
    else if (seg.kind === 'round') out.push({ frame: seg.from, layer: layerForLevel(seg.levelIndex) });
    else if (seg.kind === 'bonus') out.push({ frame: seg.from, layer: MAX_LAYER });
  });
  return out;
};

/** Per-tick volume for each of the three layers, with ducking under sounds and voiceover baked in. */
const buildMusicEnvelopes = (): Float32Array[] => {
  const n = Math.max(1, TIMELINE.totalFrames);
  const changes = layerChanges();
  const duck = new Float32Array(n).fill(1);

  const duckFrames = FPS * 0.28;
  const recover = FPS * 0.18;
  for (const c of CUES) {
    if (NO_DUCK.has(c.sfx)) continue;
    for (let f = Math.max(0, c.frame); f < Math.min(n, c.frame + duckFrames + recover * 4); f++) {
      const dt = f - c.frame;
      const v = dt < duckFrames ? DUCK_FLOOR : 1 - (1 - DUCK_FLOOR) * Math.exp(-(dt - duckFrames) / recover);
      if (v < duck[f]) duck[f] = v;
    }
  }

  // hush windows: ramp down just before, hold at the floor, snap back when the answer lands
  const panic = rootSettings.sound.panic;
  for (const h of HUSHES) {
    for (let f = Math.max(0, h.from - panic.hushRamp); f < Math.min(n, h.to); f++) {
      const v = f < h.from ? 1 - (1 - panic.hushFloor) * ((f - (h.from - panic.hushRamp) + 1) / (panic.hushRamp + 1)) : panic.hushFloor;
      if (v < duck[f]) duck[f] = v;
    }
  }

  // under every voiceover clip: quick attack, slower release (only when clips exist)
  const vDuck = rootSettings.voiceover.duckFloor;
  for (const v of VOICE) {
    const a = Math.max(0, v.frame - 4);
    const b = Math.min(n, v.frame + v.frames + 12);
    for (let f = a; f < b; f++) {
      const down = Math.min(1, (f - a) / 4);
      const up = Math.min(1, (v.frame + v.frames + 12 - f) / 12);
      const val = 1 - (1 - vDuck) * Math.min(down, up);
      if (val < duck[f]) duck[f] = val;
    }
  }

  return [0, 1, 2].map((layer) => {
    const env = new Float32Array(n);
    let active = 0;
    let ci = 0;
    let cur = layer === 0 ? 1 : 0;
    for (let f = 0; f < n; f++) {
      while (ci < changes.length && changes[ci].frame <= f) active = changes[ci++].layer;
      const target = f >= MUSIC_END ? 0 : layer <= active ? 1 : 0;
      const step = 1 / MUSIC_RAMP;
      cur = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
      env[f] = cur * duck[f];
    }
    return env;
  });
};

export const MUSIC_ENVELOPES = buildMusicEnvelopes();

/** Does `layer` make any sound inside [from, to)? Lets the soundtrack skip silent loop repeats. */
export const layerAudible = (layer: number, from: number, to: number) => {
  const env = MUSIC_ENVELOPES[layer];
  for (let f = Math.max(0, from); f < Math.min(env.length, to); f += 3) if (env[f] > 0.001) return true;
  return false;
};
