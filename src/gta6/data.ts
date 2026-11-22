import raw from '../../docs/gta6/questions.json';

export type Level = 'easy' | 'medium' | 'hard';
export type Kind = 'q' | 'bonus';

/** One item of the video, exactly as it is in docs/gta6/questions.json. */
export type Item = {
  /** Display number: "1".."42" for questions, "B1".."B3" for bonuses. */
  n: string;
  /** 1-based play order. */
  order: number;
  level: Level;
  kind: Kind;
  q: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  reveal: string;
  didYouKnow?: string;
  /** iOS app look the item is shown in (messages, maps, photos, safari, controlCenter, ...). */
  look: string;
  /** Comma-separated extra ids; split with `extraIds`. */
  extra: string;
  timerSec: number;
  fastest: boolean;
  /** Fact-check note to resolve before recording. */
  verify?: string;
};

/** All 45 items in play order. */
export const items: Item[] = (raw.items as Item[]).slice().sort((a, b) => a.order - b.order);

export const levels: Level[] = ['easy', 'medium', 'hard'];

export const byLevel: Record<Level, Item[]> = {
  easy: items.filter((i) => i.level === 'easy'),
  medium: items.filter((i) => i.level === 'medium'),
  hard: items.filter((i) => i.level === 'hard'),
};

/** Level accents: easy green, medium amber, hard red (iOS system green / orange / red). */
export const levelColors: Record<Level, string> = {
  easy: '#30D158',
  medium: '#FF9F0A',
  hard: '#FF453A',
};

/** Score = number of correct items out of 45. */
export const rankTiers = [
  { name: 'LEGEND', min: 41, max: 45 },
  { name: 'EXPERT', min: 32, max: 40 },
  { name: 'GOOD', min: 23, max: 31 },
  { name: 'BEGINNER', min: 14, max: 22 },
  { name: 'KEEP GOING', min: 0, max: 13 },
] as const;

/** Splits an item's `extra` string into its ids ("streak15,easyScoreCard" -> ["streak15", "easyScoreCard"]). */
export const extraIds = (item: Pick<Item, 'extra'>): string[] =>
  item.extra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
