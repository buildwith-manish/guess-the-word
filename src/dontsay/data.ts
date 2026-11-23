/**
 * Don't Say The Same As Me: typed data layer.
 * Source of truth: docs/dontsay/rounds.json and docs/dontsay/poll.json (imported, never retyped).
 * Fixes from the brief are applied here (not in scenes) and are idempotent: if the JSON
 * already carries a fix, the override just re-states it.
 * Scenes read prompts, answers, rules, round numbers, points and durations from here
 * and from src/dontsay/timing.ts only.
 */
import roundsJson from '../../docs/dontsay/rounds.json';
import pollJson from '../../docs/dontsay/poll.json';

export type Level = 1 | 2 | 3 | 4 | 5;
export type RuleType = 'none' | 'banned' | 'filter' | 'heavy';
export type Collision = 'High' | 'Medium' | 'Low';
export type BonusName = 'mind-reader' | 'triple-lock' | 'chain-reaction' | 'opposite-day' | 'voice-only';

export type Round = {
  n: number;
  level: Level;
  prompt: string;
  rule?: string;
  ruleType?: RuleType;
  banned?: string[];
  swatches?: string[];
  iconChips?: string[];
  heavy?: boolean;
  answer: string;
  collision: Collision;
  regionSensitive?: boolean;
  // Present in rounds.json; kept so timing.ts and scenes need no second source.
  clarificationChip?: string;
  logoFree?: boolean;
  callback?: boolean;
  callbackFrom?: number[];
  skipResultLine?: boolean;
  introSec?: number;
  timerSec?: number;
};

export type Bonus = {
  n: 1 | 2 | 3 | 4 | 5;
  afterRound: number;
  name: BonusName;
  iosIdea: string;
  prompt: string;
  passCondition: string;
  answer: string | string[];
  voiceIntro: string;
  voiceReveal: string;
  rule?: string;
  onScreenNote?: string;
  durationSec?: number;
  costsHearts?: boolean;
};

export type HeartCheckIn = {
  afterRound: number;
  beforeRound: number;
  durationSec: number;
  voice: string;
  animateHearts: false;
};

export type LevelStyle = {
  name: string;
  tint: string;
  voice: string;
  /** Accent colour for the level (hex). Chosen here; the JSON only names the tint. */
  accent: string;
  /** Wallpaper gradient stops, top to bottom (hex). Wallpaper follows LEVEL, never hearts. */
  wallpaper: [string, string];
};

export type RankTier = { name: string; min: number; max: number };

// ---------- fixes (applied here, not in scenes) ----------
const REGION_SENSITIVE = new Set([6, 25, 28, 33, 36]);

const fixRound = (r: Round): Round => {
  const out: Round = { ...r };
  if (REGION_SENSITIVE.has(out.n)) out.regionSensitive = true;
  if (out.n === 41) out.collision = 'High';
  if (out.n === 38) out.clarificationChip = 'Not shark, not clownfish either.';
  if (out.n === 45) out.banned = ['Banana', 'Orange', 'Kiwi', 'Grapes'];
  return out;
};

const fixBonus = (b: Bonus): Bonus => {
  const out: Bonus = { ...b };
  if (out.name === 'mind-reader') out.passCondition = 'Match me = 1 point';
  else out.passCondition = 'Differ from me = 1 point';
  if (out.name === 'triple-lock') out.answer = ['Cow', 'Pig', 'Chicken'];
  if (out.name === 'chain-reaction') out.onScreenNote = 'Tiger is mine \u2014 you can\u2019t reuse it';
  return out;
};

// ---------- exports ----------
export const sourceName: string | null = (roundsJson.meta as { sourceName: string | null }).sourceName ?? null;

/** 45 rounds, play order. */
export const rounds: Round[] = (roundsJson.rounds as unknown as Round[]).map(fixRound);

/** 5 bonuses, after rounds 9 / 18 / 27 / 36 / 45. */
export const bonuses: Bonus[] = (roundsJson.bonuses as unknown as Bonus[]).map(fixBonus);

/** Static heart check-in between rounds 23 and 24. Never animates a heart. */
export const heartCheckIn: HeartCheckIn = {
  afterRound: roundsJson.heartCheckIn.afterRound,
  beforeRound: roundsJson.heartCheckIn.beforeRound,
  durationSec: roundsJson.heartCheckIn.durationSec,
  voice: roundsJson.heartCheckIn.voice,
  animateHearts: false,
};

const ACCENTS: Record<Level, { accent: string; wallpaper: [string, string] }> = {
  1: { accent: '#4DA3FF', wallpaper: ['#0B2A55', '#16437A'] }, // cool blue
  2: { accent: '#6F7BFF', wallpaper: ['#1A2160', '#2E3A9A'] }, // blue-violet
  3: { accent: '#9B6BFF', wallpaper: ['#2A1668', '#4A2AA0'] }, // violet
  4: { accent: '#FFB02E', wallpaper: ['#5A2E08', '#A8540F'] }, // warm amber
  5: { accent: '#FF5A36', wallpaper: ['#5E1408', '#B22A12'] }, // red-orange
};

export const levelColors: Record<Level, LevelStyle> = ([1, 2, 3, 4, 5] as Level[]).reduce(
  (acc, l) => {
    const j = (roundsJson.levelColors as Record<string, { name: string; tint: string; voice: string }>)[String(l)];
    acc[l] = { name: j.name, tint: j.tint, voice: j.voice, ...ACCENTS[l] };
    return acc;
  },
  {} as Record<Level, LevelStyle>,
);

/** Echo 0-15, Parrot 16-27, Free Thinker 28-37, Rare Mind 38-45, One of a Kind 46-50 (lowest first). */
export const ranks: RankTier[] = (roundsJson.ranks as RankTier[])
  .map((r) => ({ name: r.name, min: r.min, max: r.max }))
  .sort((a, b) => a.min - b.min);

/** Rounds to confirm in the community poll. */
export const pollRounds: number[] = [...(pollJson.pollRounds as number[])];
