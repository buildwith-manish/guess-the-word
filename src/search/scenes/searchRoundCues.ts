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
import { getRound } from '../search-data';
import { buildRoundPlan } from '../search-timing';
import { slideEnd } from '../components/SearchBar';
import { typingTickFrames } from '../typing';

export const searchRoundCues = (index: number): Cue[] => {
  const plan = buildRoundPlan(index);
  const round = getRound(index);
  const cues: Cue[] = [];
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) =>
    cues.push({ frame: Math.round(frame), sfx, ...extra });

  round.searches.forEach((text, i) => {
    const start = plan.searchAt[i];
    const typeTicks = plan.typeTicks[i]; // this search's own speed, same value the scene uses
    // A quiet tick as each word starts (typing.ts: on the tick its first character appears, uneven human rhythm).
    typingTickFrames(start, text, typeTicks).forEach((f) => add(f, 'ios-tick'));
    // Soft pop when the search lands in the recent list. Levels are set in SOFT_GAIN (search-sound.ts).
    add(slideEnd(start, text.length, typeTicks), 'ios-pop');
  });

  // Hint: one ping when the first emoji pops in.
  add(plan.hintAt, 'ping-hi');

  // Reveal: one gentle chime as the answer lands.
  // Check by ear: the card's stamp takes a few ticks to land (STAMP_SECONDS in AnswerCard); move this later if the chime is early.
  add(plan.revealAt, 'ios-chime');

  // Timer: one tick per second of the clock; the last second uses tick-low.
  const seconds = Math.round(plan.clockFrames / FPS);
  for (let k = 0; k < seconds; k++) {
    add(plan.clockStart + k * FPS, k === seconds - 1 ? 'tick-low' : 'tick');
  }

  return cues.sort((a, b) => a.frame - b.frame);
};
