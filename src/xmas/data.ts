import raw from './questions.json';

/**
 * Typed view of src/xmas/questions.json (a copy of docs/xmas/questions.json made by scripts/sync_xmas_data.ts).
 * Nothing from the JSON is retyped here: scenes read titles, clues, quips and bonus text from these exports.
 */

/** A clue tile: a slot's own clue, or a tile reused from another slot, or a new image that has only an id. */
export type ClueRef = { slot: number; clue: 1 | 2 } | { new: string };

export type Clue = {
  id: string;
  /** What the clue image shows (art brief, not on screen). */
  label: string;
  /** Text drawn inside the clue image itself; null if the image has none. */
  bakedText: string | null;
};

export type MovieSlot = {
  /** Play order, 1..50. */
  slot: number;
  kind: 'movie';
  /** 1..40 among movies only; drives the bulb colour. */
  movieIndex: number;
  star: boolean;
  clue1: Clue;
  clue2: Clue;
  answer: string;
  voice: { intro: string; reveal: string };
};

type BonusBase = {
  slot: number;
  kind: 'bonus';
  /** 1..10 among bonuses only. */
  bonus: number;
  star: boolean;
  key: string;
  name: string;
  /** The iOS surface the round imitates. */
  ios: string;
  intro: string;
  reveal: string;
  answers: string[];
  /** Whether the round needs new art or code beyond reused tiles. */
  newContent?: string;
  passRule?: string;
};

export type SpotlightBonus = BonusBase & { key: 'spotlight'; title: string; lettersPerSec: number };
export type FocusBonus = BonusBase & { key: 'focus'; tiles: ClueRef[]; sharpenSec: number };
export type OddOneOutBonus = BonusBase & {
  key: 'oddOneOut';
  grid: { cols: number; rows: number; common: string; odd: string; oddIndex: number };
};
export type DoubleFeatureBonus = BonusBase & { key: 'doubleFeature'; left: ClueRef; right: ClueRef };
export type AutocompleteBonus = BonusBase & { key: 'autocomplete'; prefix: string; chips: string[]; correct: string };
export type CleanUpBonus = BonusBase & { key: 'cleanUp'; tiles: ClueRef[] };
export type CountLightsBonus = BonusBase & { key: 'countLights'; flashSec: number; sequence: ('r' | 'g')[]; redCount: number };
export type ControlCenterBonus = BonusBase & { key: 'controlCenter'; icons: ClueRef[]; decoy: string };
export type SpeedRoundBonus = BonusBase & { key: 'speedRound'; tiles: ClueRef[]; perTileSec: number };
export type FinaleBonus = BonusBase & { key: 'finale'; tiles: ClueRef[] };

export type BonusSlot =
  | SpotlightBonus
  | FocusBonus
  | OddOneOutBonus
  | DoubleFeatureBonus
  | AutocompleteBonus
  | CleanUpBonus
  | CountLightsBonus
  | ControlCenterBonus
  | SpeedRoundBonus
  | FinaleBonus;

export type Slot = MovieSlot | BonusSlot;

export type Meta = {
  title: string;
  totalSlots: number;
  movieSlots: number;
  bonusSlots: number;
  bonusEvery: number;
  maxScore: number;
  starMeaning: string;
  musicLicenseText: string | null;
  disclaimer: string;
  pinnedComment: string;
  titles: string[];
};

export type Rank = { name: string; min: number; max: number; voice: string };

const data = raw as unknown as { meta: Meta; slots: Slot[]; ranks: Rank[]; outro: string[] };

export const meta: Meta = data.meta;
/** All 50 slots in play order. */
export const slots: Slot[] = data.slots.slice().sort((a, b) => a.slot - b.slot);
export const movies: MovieSlot[] = slots.filter((s): s is MovieSlot => s.kind === 'movie');
export const bonuses: BonusSlot[] = slots.filter((s): s is BonusSlot => s.kind === 'bonus');
export const ranks: Rank[] = data.ranks;
/** The spoken asks of the outro, in order. */
export const outroAsks: string[] = data.outro;

/** Show the pass rule of a bonus round on screen. */
export const showPassRule = true;

/** Slot by its play number (1-based). Throws for a number outside the video. */
export const slotAt = (n: number): Slot => {
  const s = slots[n - 1];
  if (!s || s.slot !== n) throw new Error(`no slot ${n}`);
  return s;
};

export const isStar = (n: number): boolean => slotAt(n).star;

/** Bulb colours of the light string: our own red, green and gold. */
export const BULB = { red: '#FF453A', green: '#30D158', gold: '#F5C451' } as const;

/** Movie bulbs: odd movieIndex red, even green. Bonus bulbs are gold. */
export const bulbColor = (slot: Slot): string =>
  slot.kind === 'bonus' ? BULB.gold : slot.movieIndex % 2 === 1 ? BULB.red : BULB.green;

/** The two lines spoken for a slot: for a movie the quip and the reveal, for a bonus the intro and the reveal. */
export const voiceOf = (slot: Slot): { intro: string; reveal: string } =>
  slot.kind === 'movie' ? { intro: slot.voice.intro, reveal: slot.voice.reveal } : { intro: slot.intro, reveal: slot.reveal };
