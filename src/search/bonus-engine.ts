/** bonus-engine.ts: turns one BONUS entry into a scene plan.
 *
 *  Order inside the bonus scene (all values in 30 fps design frames, "ticks",
 *  scene-local): three searches typed one by one, four option chips popping in
 *  one by one, a short pause, the clock, then the reveal (the correct chip
 *  lights up).
 *
 *  Pure: it reads search-data.ts and search-settings.json only, so
 *  search-timing.ts can import it (it must not import search-timing.ts back).
 *  The option order is the order in the data. Nothing is shuffled at render
 *  time, so there is no seed here (unlike src/bonus-engine.ts).
 *
 *  Settings used: typing.ticksPerChar, typing.minTicks, bonus.clockSeconds,
 *  bonus.searchHoldChars (must equal HOLD_CHARS in components/SearchBar.tsx,
 *  scripts/check-search.js compares them), bonus.chipStaggerTicks,
 *  bonus.chipsToClockTicks. */
import { BONUS } from './search-data';
import type { Bonus } from './search-data';
import cfg from './search-settings.json';

export type BonusOption = { text: string; correct: boolean };

export type BonusScenePlan = {
  index: number; // 0-based into BONUS
  afterRound: number;
  answer: string;
  from: string;
  searches: [string, string, string];
  searchAt: [number, number, number]; // start tick of each search
  typeTicks: number; // ticks per character (pass to SearchBar)
  options: [BonusOption, BonusOption, BonusOption, BonusOption]; // fixed data order
  correctIndex: number;
  chipsAt: [number, number, number, number]; // tick each chip pops in
  clockStart: number;
  clockFrames: number;
  revealAt: number; // = clockStart + clockFrames; the correct chip lights up here
};

export type BonusSceneOpts = {
  startTick: number; // scene tick of the first search (the pre-roll)
  fps: number; // design frames per second (search-timing.ts FPS)
};

/** Ticks one search needs before the next may start: typing plus the hold
 *  (same rule as the Known issue note in docs/search-context.md, section D). */
const searchSpan = (text: string) => {
  const per = cfg.typing.ticksPerChar;
  return Math.max(cfg.typing.minTicks, text.length * per) + cfg.bonus.searchHoldChars * per;
};

export const buildBonusScene = (index: number, { startTick, fps }: BonusSceneOpts): BonusScenePlan => {
  const b: Bonus | undefined = BONUS[index];
  if (!b) throw new Error(`no bonus puzzle ${index + 1}`);

  let cursor = startTick;
  const searchAt = b.searches.map((s) => {
    const at = cursor;
    cursor += searchSpan(s);
    return at;
  }) as BonusScenePlan['searchAt'];

  const chipsAt = b.options.map((_, i) => cursor + i * cfg.bonus.chipStaggerTicks) as BonusScenePlan['chipsAt'];
  const clockStart = chipsAt[chipsAt.length - 1] + cfg.bonus.chipsToClockTicks;
  const clockFrames = Math.round(cfg.bonus.clockSeconds * fps);

  return {
    index,
    afterRound: b.afterRound,
    answer: b.answer,
    from: b.from,
    searches: b.searches,
    searchAt,
    typeTicks: cfg.typing.ticksPerChar,
    options: b.options.map((text, i) => ({ text, correct: i === b.correctIndex })) as BonusScenePlan['options'],
    correctIndex: b.correctIndex,
    chipsAt,
    clockStart,
    clockFrames,
    revealAt: clockStart + clockFrames,
  };
};

export const buildBonusScenes = (opts: BonusSceneOpts): BonusScenePlan[] =>
  BONUS.map((_, i) => buildBonusScene(i, opts));
