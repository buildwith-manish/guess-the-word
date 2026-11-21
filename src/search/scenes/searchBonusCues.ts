/** searchBonusCues.ts: sound cues for one bonus scene (task 4b).
 *
 *  Pure function, no React. Same pattern as searchRoundCues.ts: frames are design
 *  frames (1/30 s ticks), absolute = f0 (the bonus segment's `from`) + scene tick.
 *  Every tick comes from buildBonusPlan (bonus-engine.ts via search-timing.ts), so the
 *  cues follow the scene exactly. Quiet on purpose: key-clicks, one pop per chip, the
 *  clock, one stamp. */
import type { Cue } from '../../sound';
import { makeRandom } from '../../util';
import { FPS, buildBonusPlan } from '../search-timing';

/** Key-click pitch: playbackRate varies by +/- this fraction per click (same value as searchRoundCues.ts; seeded, so every render is identical). */
const CLICK_JITTER = 0.12;
/** Seed offset for the bonus streams, so they never repeat a round's stream (rounds seed with index + 1). */
const BONUS_SEED_BASE = 1000;

export const buildBonusCues = (index: number, f0: number): Cue[] => {
  const plan = buildBonusPlan(index);
  const cues: Cue[] = [];
  const rand = makeRandom(BONUS_SEED_BASE + index + 1); // one stream per bonus, drawn in click order
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) =>
    cues.push({ frame: Math.round(frame), sfx, ...extra });

  // Key-click on every second character of every search (character k lands at start + (k - 1) * typeTicks).
  plan.searches.forEach((text, i) => {
    for (let k = 2; k <= text.length; k += 2) add(f0 + plan.searchAt[i] + (k - 1) * plan.typeTicks, 'key-click', { rate: 1 + (rand() * 2 - 1) * CLICK_JITTER });
  });
  // Option chips, one pop each.
  plan.chipsAt.forEach((at) => add(f0 + at, 'pop'));
  // Clock: one tick per second, a thump in the last three.
  for (let k = 0; k * FPS < plan.clockFrames; k++) {
    const left = Math.ceil((plan.clockFrames - k * FPS) / FPS);
    add(f0 + plan.clockStart + k * FPS, left <= 3 ? 'thump' : 'tick');
  }
  // Reveal: the correct chip lights up and the answer card stamps.
  add(f0 + plan.revealAt, 'stamp');
  return cues;
};
