import { items, levels } from '../data';
import type { Item } from '../data';

/**
 * What the corner counter (ScoreHud) shows. Only real questions (kind "q") are counted: 42 of them, never the 3 bonuses.
 * This is the same count the score cards use (scenes/ScoreCard.tsx), so the corner and the summary always agree.
 * On a bonus item the counter holds the number of questions played so far (no tween, no step).
 */
const qs = items.filter((i) => i.kind === 'q');

/** Total scored questions and the per-level split, in level order. */
export const hudTotals = {
  total: qs.length,
  levelTotals: levels.map((l) => qs.filter((i) => i.level === l).length) as [number, number, number],
};

/** ScoreHud `score` / `from` / `total` / `levelTotals` for `item`. */
export const hudCounts = (item: Item) => {
  const played = qs.filter((i) => i.order <= item.order).length;
  return { score: played, from: item.kind === 'q' ? played - 1 : played, ...hudTotals };
};
