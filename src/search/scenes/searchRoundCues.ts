/** searchRoundCues.ts: sound cues for one search round (task 3a).
 *
 *  Pure function, no React. Frames are design frames (1/30 s ticks), counted from the
 *  start of the round PLAN (lead frames NOT removed). The caller that builds the whole
 *  soundtrack places them with: absolute = seg.from - (seg.lead ?? 0) + cue.frame.
 *
 *  All timings come from search-timing.ts (buildRoundPlan), search-settings.json and the
 *  SearchBar helpers, so they follow the scene exactly. */
import type { Cue } from '../../sound';
import { FPS } from '../../timing';
import cfg from '../search-settings.json';
import { getRound } from '../search-data';
import { buildRoundPlan } from '../search-timing';
import { slideEnd } from '../components/SearchBar';

/** Volume and pitch of the key-click while it is a stand-in sound. Motion constants. */
const CLICK_VOLUME = 0.6;
const CLICK_RATE = 1.6;

/** Ticks per typed character: the settings value, raised so even a short search takes at least minTicks. */
export const typeTicksFor = (searches: readonly string[], typing: { ticksPerChar: number; minTicks: number }): number =>
  Math.max(typing.ticksPerChar, typing.minTicks / Math.max(1, Math.min(...searches.map((s) => s.length))));

export const searchRoundCues = (index: number): Cue[] => {
  const plan = buildRoundPlan(index);
  const round = getRound(index);
  const typeTicks = typeTicksFor(round.searches, cfg.typing);
  const cues: Cue[] = [];
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) =>
    cues.push({ frame: Math.round(frame), sfx, ...extra });

  round.searches.forEach((text, i) => {
    const start = plan.searchAt[i];
    // Key-click on every second typed character. Character k (1-based) appears at start + (k - 1) * typeTicks.
    for (let k = 2; k <= text.length; k += 2) {
      // TODO(6b): 'tick' stands in for a key-click. Task 6b creates a real 'key-click' sound; then switch to it.
      add(start + (k - 1) * typeTicks, 'tick', { volume: CLICK_VOLUME, rate: CLICK_RATE });
    }
    // Soft "send" sound when the search has landed in the history list.
    // TODO(6b): 'pop' stands in for a soft "send". Task 6b creates a real 'send' sound.
    add(slideEnd(start, text.length, typeTicks), 'pop', { volume: 0.7 });
  });

  // Timer: one tick per second of the clock; the last second uses tick-low.
  const seconds = Math.round(plan.clockFrames / FPS);
  for (let k = 0; k < seconds; k++) {
    add(plan.clockStart + k * FPS, k === seconds - 1 ? 'tick-low' : 'tick');
  }

  return cues.sort((a, b) => a.frame - b.frame);
};
