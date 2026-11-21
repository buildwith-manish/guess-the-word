/**
 * states/bonus-engine.ts (task 4a): the four bonus puzzles of Video 4, built from the data and nothing else.
 * Adapted from src/bonus-engine.ts (the seeding pattern): each slot gets its own generator
 * `makeRandom(seed + slot * 977)`, so the same data and seed give the same puzzles every render.
 *
 * Slot s (0-based) follows question `settings.bonus.after[s]` and plays `settings.bonus.kinds[s]`.
 * Its subject state is picked from the level of that question. Facts come from states-data.ts
 * (name, capital, nickname, region) and states-geo.json via geo.ts (`borders`); nothing is typed here.
 *
 *   missing   the US map with the subject removed: "Which state is missing from the map?"
 *             options = the subject + 3 other states (all drawn on the map)
 *   borders   "Which of these borders <subject>?": 1 true neighbour (geo `borders`) + 3 states that do not
 *             border it (checked in both directions). Island states (no borders) are never the subject.
 *   capital   "What is the capital of <subject>?": the subject's capital + 3 other states' capitals
 *   nickname  "Which nickname belongs to <subject>?": the subject's nickname + 3 other states' nicknames
 *
 * Wrong options prefer states of the subject's region (the harder, more plausible ones), then any other.
 * Option texts are unique inside a puzzle. The clock (`seconds`) is the clock of the subject's level
 * (states-settings.json levels[].time).
 */
import settings from './states-settings.json';
import { STATES } from './states-data';
import type { Level, StateInfo } from './states-data';
import { getShape } from './geo';
import { makeRandom, shuffle } from '../util';
import type { BonusKind } from './types';

/** Base seed of the bonus rounds. Change it to get different (still repeatable) puzzles. */
export const BONUS_SEED = 20261121;

export type BonusPuzzle = {
  kind: BonusKind;
  /** 0-based bonus slot (settings.bonus.after / kinds) */
  slot: number;
  /** level of the question this bonus follows; the subject comes from it */
  level: Level;
  prompt: string;
  /** exactly 4, texts unique */
  options: string[];
  correctIndex: number;
  /** the state the question is about (missing: the removed state; borders: the state whose neighbours are asked) */
  subject: string;
  /** state key each option belongs to, same order as `options` */
  optionKeys: string[];
  /** every state key the puzzle uses (subject first, then the option states, no repeats) */
  states: string[];
  /** length of the clock in seconds */
  seconds: number;
};

const OPTION_COUNT = 4;

const byName = new Map(STATES.map((s) => [s.name, s]));

/** Neighbour keys of a state, from the geometry data. */
const neighbours = (s: StateInfo): string[] =>
  getShape(s.key)
    .borders.map((n) => byName.get(n)?.key)
    .filter((k): k is string => !!k);

const levelTime = (level: Level): number => {
  const cfg = settings.levels.find((l) => l.name === level);
  if (!cfg) throw new Error(`bonus: unknown level ${level}`);
  return cfg.time;
};

/** `n` states from `pool`, the subject's region first, each group in seeded order. */
const pickNear = (pool: StateInfo[], region: string, n: number, rand: () => number): StateInfo[] => {
  const near = shuffle(pool.filter((s) => s.region === region), rand);
  const far = shuffle(pool.filter((s) => s.region !== region), rand);
  return [...near, ...far].slice(0, n);
};

/** Distractors whose option text differs from every text already taken. */
const pickDistinct = (
  pool: StateInfo[],
  subject: StateInfo,
  text: (s: StateInfo) => string,
  taken: string[],
  rand: () => number,
): StateInfo[] => {
  const seen = new Set(taken.map((t) => t.trim().toLowerCase()));
  const unique: StateInfo[] = [];
  for (const s of pickNear(pool, subject.region, pool.length, rand)) {
    const t = text(s).trim().toLowerCase();
    if (seen.has(t)) continue;
    seen.add(t);
    unique.push(s);
  }
  return unique.slice(0, OPTION_COUNT - 1);
};

/** Shuffle `[correct, ...wrong]` and report where the correct one went. */
const arrange = (correct: StateInfo, wrong: StateInfo[], text: (s: StateInfo) => string, rand: () => number) => {
  const order = shuffle([correct, ...wrong], rand);
  return {
    options: order.map(text),
    optionKeys: order.map((s) => s.key),
    correctIndex: order.findIndex((s) => s.key === correct.key),
  };
};

const makePuzzle = (kind: BonusKind, slot: number, level: Level, rand: () => number): BonusPuzzle => {
  const others = (s: StateInfo) => STATES.filter((o) => o.key !== s.key);
  const inLevel = STATES.filter((s) => s.level === level);
  // borders needs a state with at least one land neighbour
  const candidates = kind === 'borders' ? inLevel.filter((s) => neighbours(s).length > 0) : inLevel;
  if (candidates.length === 0) throw new Error(`bonus slot ${slot}: no ${kind} subject in level ${level}`);
  const subject = shuffle(candidates, rand)[0];
  const name = (s: StateInfo) => s.name;

  let prompt: string;
  let picked: { options: string[]; optionKeys: string[]; correctIndex: number };

  if (kind === 'missing') {
    prompt = 'Which state is missing from the map?';
    picked = arrange(subject, pickNear(others(subject), subject.region, OPTION_COUNT - 1, rand), name, rand);
  } else if (kind === 'borders') {
    prompt = `Which of these borders ${subject.name}?`;
    const mine = new Set(neighbours(subject));
    // the one true neighbour: a seeded pick from the subject's `borders`
    const real = shuffle(
      STATES.filter((s) => mine.has(s.key)),
      rand,
    )[0];
    // a state that does not border the subject, in either direction
    const far = STATES.filter((s) => s.key !== subject.key && !mine.has(s.key) && !neighbours(s).includes(subject.key));
    picked = arrange(real, pickNear(far, subject.region, OPTION_COUNT - 1, rand), name, rand);
  } else if (kind === 'capital') {
    prompt = `What is the capital of ${subject.name}?`;
    const text = (s: StateInfo) => s.capital;
    picked = arrange(subject, pickDistinct(others(subject), subject, text, [text(subject)], rand), text, rand);
  } else {
    prompt = `Which nickname belongs to ${subject.name}?`;
    const text = (s: StateInfo) => s.nickname;
    picked = arrange(subject, pickDistinct(others(subject), subject, text, [text(subject)], rand), text, rand);
  }

  return {
    kind,
    slot,
    level,
    prompt,
    options: picked.options,
    correctIndex: picked.correctIndex,
    subject: subject.key,
    optionKeys: picked.optionKeys,
    states: Array.from(new Set([subject.key, ...picked.optionKeys])),
    seconds: levelTime(level),
  };
};

/** All bonus puzzles in video order (one per settings.bonus.after entry). Same seed => same puzzles. */
export const buildBonusPuzzles = (seed: number = BONUS_SEED): BonusPuzzle[] => {
  const after = settings.bonus.after as number[];
  const kinds = settings.bonus.kinds as BonusKind[];
  return after.map((questionId, slot) => {
    const followed = STATES[questionId - 1];
    if (!followed) throw new Error(`bonus slot ${slot}: no question ${questionId}`);
    return makePuzzle(kinds[slot], slot, followed.level, makeRandom(seed + slot * 977));
  });
};
