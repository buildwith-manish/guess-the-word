import { items, levels } from '../data';
import type { Item } from '../data';

/**
 * What the corner counter (ScoreHud) shows: ALL items count, the 3 bonuses included (n / 45). The counter moves on
 * every item. This is the same count as the score cards (scenes/ScoreCard.tsx), the final scoreboard ring, the ranks
 * (0 to 45) and the outro ("out of 45"). Bonus items are marked with a small label (`HUD_TEXT.bonus`).
 */

/** Text of the small label on bonus items. */
export const HUD_TEXT = { bonus: 'BONUS' } as const;

/** Total items and the per-level split, in level order. */
export const hudTotals = {
  total: items.length,
  levelTotals: levels.map((l) => items.filter((i) => i.level === l).length) as [number, number, number],
};

/** ScoreHud `score` / `from` / `total` / `levelTotals` for `item`. */
export const hudCounts = (item: Item) => ({ score: item.order, from: item.order - 1, ...hudTotals });
