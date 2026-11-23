/**
 * NFL Scouting Card Quiz data. Everything is read from the JSON files in docs/nfl/ (never retyped here).
 * Validation: npx tsx scripts/check_nfl_data.ts
 */
import cardsFile from '../../docs/nfl/cards.json';
import picksFile from '../../docs/nfl/picks.json';

export type Level = 'rookie' | 'starter' | 'hof';

export type Card = {
  /** 1..30, play order. */
  n: number;
  level: Level;
  /** Cards 5, 15, 25: shorter clues and 2.5 s slots. */
  twoMinuteWarning: boolean;
  /** Card 30. */
  final: boolean;
  /** Minimum seconds per clue slot (3.5, or 2.5 on a Two-Minute Warning card). */
  clueSec: number;
  /** Five clues, hardest first. */
  clues: string[];
  /** Points for guessing after clue 1..5: 5, 4, 3, 2, 1. */
  points: number[];
  name: string;
  revealLine?: string;
  /** Own clip, only on cards 3, 6, 9, 12, 15, 18, 22, 24, 27, 30. Never part of the reveal. */
  didYouKnow?: string;
  /** Extra reveal sentence (card 14). */
  revealExtra?: string;
};

export type Rank = { name: string; min: number; max: number };
export type Pick = { pick: number; matchup: string | null; kickoffET: string | null };

type RawCard = Omit<Card, 'revealLine' | 'didYouKnow' | 'revealExtra'> & {
  revealLine: string | null;
  didYouKnow: string | null;
  revealExtra: string | null;
};

const orUndefined = (v: string | null | undefined): string | undefined => (v ? v : undefined);

/** The 30 cards in play order. */
export const cards: Card[] = (cardsFile.cards as unknown as RawCard[])
  .map(
    (c): Card => ({
      ...c,
      revealLine: orUndefined(c.revealLine),
      didYouKnow: orUndefined(c.didYouKnow),
      revealExtra: orUndefined(c.revealExtra),
    }),
  )
  .sort((a, b) => a.n - b.n);

export const levels: Level[] = ['rookie', 'starter', 'hof'];

/** Level colours, not team colours: green, amber, red (the iOS dark-mode palette). */
export const levelColors: Record<Level, string> = {
  rookie: '#30D158',
  starter: '#FF9F0A',
  hof: '#FF453A',
};

/**
 * On-screen level strings (task 4a brief): the Rookie banner and the Starter / Hall of Fame level cards.
 * The spoken level clips come from the audio map, never from here.
 */
export const levelText: Record<Level, { title: string; subtitle: string }> = {
  rookie: { title: 'Level one: Rookie', subtitle: 'Famous names' },
  starter: { title: 'Level two: Starter', subtitle: 'Record holders' },
  hof: { title: 'Level three: Hall of Fame', subtitle: 'Deep cuts' },
};

/** Lock-screen notification of the hook (task 3b). On-screen only: the hook clip is spoken from the script, never from here. */
export const hookText = {
  appName: 'Scouting',
  title: `Scouting report: ${cards.length} players.`,
  body: `Name each player from ${cards[0].clues.length} clues.`,
  timeLabel: 'now',
} as const;

/** Rank bands, best first. */
export const ranks: Rank[] = (cardsFile.meta.ranks as { rank: string; min: number; max: number }[]).map((r) => ({
  name: r.rank,
  min: r.min,
  max: r.max,
}));

export const maxPoints: number = cardsFile.meta.maxPoints;
export const title: string = cardsFile.meta.title;

/** The site the facts were checked against. null until set in cards.json. */
export const sourceName: string | null = cardsFile.meta.sourceName ?? null;

/** The three prediction games (matchup and kickoff time in ET), null until filled in picks.json. */
export const picks: Pick[] = picksFile.picks as Pick[];

/** True when every pick has a matchup and a kickoff time. The Predictions scene draws a placeholder until this is true. */
export const picksFilled = (list: Pick[] = picks): boolean => list.length === 3 && list.every((p) => p.matchup !== null && p.kickoffET !== null);

/** UI text of the Predictions scene (labels are mine; the games come from picks.json only). */
export const predictionsText = {
  appName: 'Game day',
  pickLabel: (n: number): string => `Pick ${n}`,
  kickoffLabel: 'Kickoff (ET)',
  placeholder: 'FILL IN PICKS',
} as const;

/** Reveal clip text: the name, then the reveal line and the extra sentence when present. */
export const spokenReveal = (card: Card): string =>
  [`${card.name}.`, card.revealLine, card.revealExtra].filter((s): s is string => !!s).join(' ');

/** Did-you-know clip text, its own clip. undefined when the card has none. */
export const dykText = (card: Card): string | undefined => (card.didYouKnow ? `Did you know? ${card.didYouKnow}` : undefined);

export const cardByN = (n: number): Card => {
  const c = cards.find((x) => x.n === n);
  if (!c) throw new Error(`nfl data: no card ${n}`);
  return c;
};

export const byLevel: Record<Level, Card[]> = {
  rookie: cards.filter((c) => c.level === 'rookie'),
  starter: cards.filter((c) => c.level === 'starter'),
  hof: cards.filter((c) => c.level === 'hof'),
};

/** Badge text of the Two-Minute Warning wrapper. cards.json has no field for it; UI label, not card content. */
export const tmwLabel = 'Two-Minute Warning';
