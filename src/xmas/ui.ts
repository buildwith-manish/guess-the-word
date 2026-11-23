/**
 * ui.ts: the fixed UI strings of the Christmas quiz. Nothing here is movie text (no title, clue, answer or voice line);
 * those live in src/xmas/data.ts. Scenes read every label from here, never inline.
 */

/** number of slots in the video: 40 movie questions plus 10 bonus rounds */
export const TOTAL_SLOTS = 50;

export const UI = {
  /** caption in the pill above the tiles on every movie question */
  caption: 'WHICH CHRISTMAS MOVIE?',
  /** tag on a bonus round */
  bonus: 'BONUS',
  /** scoring notes for the bonus rounds */
  allThree: 'ALL 3 TO SCORE',
  threeOfFour: '3 OF 4 TO SCORE',
} as const;

/** The counter under the timer: "7 OF 50". `n` is the 1-based slot number. */
export const counterText = (n: number, total: number = TOTAL_SLOTS): string => `${n} OF ${total}`;

/** Same counter in two parts, so the number can be bright and "OF 50" dim: { n: '7', rest: 'OF 50' }. */
export const counterParts = (n: number, total: number = TOTAL_SLOTS): { n: string; rest: string } => ({
  n: String(n),
  rest: `OF ${total}`,
});

/**
 * FILL-IN labels: shown only by placeholder content (a scene built before its data exists). They are deliberately
 * obvious, so a placeholder can never be mistaken for a finished frame. Never used when real data is present.
 */
export const FILL_IN = {
  clueLeft: 'FILL IN: LEFT CLUE',
  clueRight: 'FILL IN: RIGHT CLUE',
  answer: 'FILL IN: ANSWER',
  bonusPrompt: 'FILL IN: BONUS TEXT',
  slot: 'FILL IN: SLOT',
} as const;

/** The visible placeholder of a bonus round whose real play area is not built yet (see bonus/registry.ts). */
export const todoBonus = (n: number): string => `TODO bonus ${n}`;
