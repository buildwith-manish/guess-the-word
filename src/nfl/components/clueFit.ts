import type { Card } from '../data';
import { type, safeBox } from '../system';
import { INTER_600_EM } from './clueMetrics.generated';

/**
 * Deterministic wrap and size for clue text. Widths come from the real Inter 600 advance widths
 * (clueMetrics.generated.ts), so the result does not depend on the DOM or on the font having loaded.
 * All sizes are 1280x720 reference units.
 */

/** Smallest clue text size. 32 units = 2.5% of the frame width: about 11 pt when the frame fills a 6.3 in phone screen held landscape. */
export const CLUE_MIN_SIZE = 32;
/** Largest clue text size (the type scale's `clue` role). */
export const CLUE_MAX_SIZE = type.clue.size;
/** Longest clue wraps to at most this many lines. */
export const CLUE_MAX_LINES = 2;

export type Box = { left: number; top: number; width: number; height: number };

/** Default area: the centre-80% safe box, below the HUD pill (ScoreHud ends near y = 160). */
export const DEFAULT_BOX: Box = { left: safeBox.left, top: 168, width: safeBox.w, height: safeBox.bottom - 168 };

/** Row geometry, reference units. */
export const ROW = { chipW: 56, chipH: 44, chipGap: 16, padY: 6, gap: 8, lineHeight: type.clue.lineHeight } as const;

const LETTER_EM = -0.01; // textStyle letterSpacing for body roles is -0.01em
const FALLBACK_EM = 0.6;
/** Keep 3% of the line free: the table has no kerning. */
const SAFETY = 0.97;

export const measure = (text: string, size: number): number => {
  let em = 0;
  for (const ch of text) em += (INTER_600_EM[ch] ?? FALLBACK_EM) + LETTER_EM;
  return em * size;
};

const lineOf = (words: string[]) => words.join(' ');

/** Greedy wrap at word boundaries; a 2-line result is rebalanced (smallest longest line) so the lines look even. */
export const wrap = (text: string, size: number, maxW: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[][] = [[]];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (cur.length === 0 || measure(lineOf([...cur, w]), size) <= maxW) cur.push(w);
    else lines.push([w]);
  }
  if (lines.length === 2) {
    let best = lines.map(lineOf);
    let bestW = Math.max(...best.map((l) => measure(l, size)));
    for (let i = 1; i < words.length; i++) {
      const a = lineOf(words.slice(0, i));
      const b = lineOf(words.slice(i));
      const w = Math.max(measure(a, size), measure(b, size));
      if (w <= maxW && w < bestW) [best, bestW] = [[a, b], w];
    }
    return best;
  }
  return lines.map(lineOf);
};

export type ClueFit = {
  /** One size for all five rows. */
  size: number;
  /** Wrapped lines per clue, in clue order. */
  lines: string[][];
  /** Width a text line may use (the centred column between the two chip-width gutters). */
  textW: number;
  /** Lines every slot reserves (2, or more if a clue could not fit two lines at the minimum size). */
  slotLines: number;
  slotH: number;
  /** false when a clue needs more than two lines even at the minimum size. */
  fits: boolean;
};

export const clueFit = (card: Card, box: Box = DEFAULT_BOX): ClueFit => {
  const n = card.clues.length;
  const textW = (box.width - 2 * (ROW.chipW + ROW.chipGap)) * SAFETY;
  const capH = ((box.height - (n - 1) * ROW.gap) / n - 2 * ROW.padY) / (CLUE_MAX_LINES * ROW.lineHeight);
  const top = Math.max(CLUE_MIN_SIZE, Math.floor(Math.min(CLUE_MAX_SIZE, capH)));
  let size = CLUE_MIN_SIZE;
  let lines = card.clues.map((c) => wrap(c, size, textW));
  let fits = lines.every((l) => l.length <= CLUE_MAX_LINES);
  for (let s = top; s >= CLUE_MIN_SIZE; s--) {
    const l = card.clues.map((c) => wrap(c, s, textW));
    if (l.every((x) => x.length <= CLUE_MAX_LINES)) {
      size = s; lines = l; fits = true;
      break;
    }
  }
  const slotLines = Math.max(CLUE_MAX_LINES, ...lines.map((l) => l.length));
  return { size, lines, textW, slotLines, slotH: slotLines * size * ROW.lineHeight + 2 * ROW.padY, fits };
};
