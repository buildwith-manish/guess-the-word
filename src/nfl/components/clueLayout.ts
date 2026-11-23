import { INTER_600_EM } from './clueMetrics.generated';

/**
 * Clue layout (iOS-6): one HERO slot for the live clue and four fixed HISTORY rows below it. Pure numbers and functions,
 * no React and no system.ts import, so scripts/check_nfl_clues.ts can run it under tsx. All sizes are 1280x720 reference
 * units on an 8-unit grid. Card box = the centre 80% of the frame (1024 x 576).
 *
 *   card 1024 x 576:  header = the level bar only (8) | field 504 (8 above and below) | footer 48
 *   field 648 x 504:  hero 248, gap 8, four history rows of 56 with 8 gaps  (248 + 8 + 4 x 56 + 3 x 8 = 504)
 *   jersey panel 304 wide = 29.7% of the card
 */
export const LAYOUT = {
  card: { w: 1024, h: 592 },
  header: 8,
  footer: 48,
  /** Top-left chip and top-right watermark: distance from the left and right frame edges. */
  cornerInset: 48,
  pad: 24,
  gap: 24,
  bodyPadY: 8,
  answerW: 304,
  /** Corner radii: card 32; surfaces 16 inside it (card inset 24 -> optical), rows 12. */
  radius: { card: 32, surface: 16, row: 12 },
  heroH: 200,
  heroPadY: 8,
  heroPadX: 16,
  rowH: 72,
  rowGap: 8,
  historyRows: 4,
  /** Right gutter reserved in every slot for the "N pts" tag. */
  tagW: 80,
} as const;

export const FIELD = {
  w: LAYOUT.card.w - LAYOUT.pad * 2 - LAYOUT.gap - LAYOUT.answerW,
  h: LAYOUT.card.h - LAYOUT.header - LAYOUT.footer - LAYOUT.bodyPadY * 2,
} as const;

/** Hero text: the same size range for every card, largest first, never below `min`. At most `lines` lines. */
export const HERO = { max: 40, min: 32, lines: 4, lineHeight: 1.2 } as const;
/** History rows: one size for every row and every card, at most `lines` lines. */
export const HISTORY = { size: 28, lines: 2, lineHeight: 1.15 } as const;

export const heroTextW = FIELD.w - LAYOUT.heroPadX * 2 - LAYOUT.tagW;
export const rowTextW = FIELD.w - 32 - LAYOUT.tagW;
export const heroInnerH = LAYOUT.heroH - LAYOUT.heroPadY * 2;

const NBSP = '\u00a0';
const LETTER_EM = -0.01; // textStyle tracking on running text
const FALLBACK_EM = 0.6;
const SAFETY = 0.97; // no kerning in the table

export const measure = (text: string, size: number): number => {
  let em = 0;
  for (const ch of text) em += (INTER_600_EM[ch === NBSP ? ' ' : ch] ?? FALLBACK_EM) + LETTER_EM;
  return em * size;
};

/**
 * Text prep: the characters are unchanged, only some spaces become no-break spaces, so a number never parts from its
 * unit or label ("22,895 receiving yards", "No. 80", "Super Bowl XXIII", "16th overall", "2007 and"), and the last two
 * words always sit together (no orphan last word).
 */
export const prepClue = (text: string): string => {
  const w = text.trim().split(/\s+/);
  const isNum = (s: string) => /^\d[\d,.]*(st|nd|rd|th)?[,.;:]?$/.test(s);
  let out = '';
  for (let i = 0; i < w.length; i++) {
    out += w[i];
    if (i === w.length - 1) break;
    const next = w[i + 1];
    const bare = w[i].replace(/[,.;:]$/, '');
    const join =
      /^(No\.|#)$/.test(w[i]) || // "No. 80"
      (isNum(w[i]) && !/[,;:]$/.test(w[i]) && next !== undefined) || // number + next word ("16th overall", "2007 and")
      (/^(Super|Pro)$/.test(bare) && /^Bowl$/.test(next)) || // "Super Bowl"
      (/^Bowl$/.test(bare) && /^[IVXLC]+[,.;:]?$/.test(next)) || // "Bowl XXIII"
      (isNum(next) && /^(No\.|Pick|Round|Week|Card|Number)$/.test(w[i])) ||
      i === w.length - 2; // last two words
    out += join ? NBSP : ' ';
  }
  return out;
};

const tokensOf = (s: string): string[] => s.split(' ').filter(Boolean);

const greedy = (words: string[], size: number, maxW: number): string[] => {
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur === '' ? w : `${cur} ${w}`;
    if (cur === '' || measure(t, size) <= maxW) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== '') lines.push(cur);
  return lines;
};

/** Greedy wrap at ordinary spaces, then balanced: the smallest width that keeps the same line count (even lines, no short last line). */
export const wrapBalanced = (text: string, size: number, maxW: number): string[] => {
  const words = tokensOf(text);
  const base = greedy(words, size, maxW);
  if (base.length < 2) return base;
  let lo = maxW * 0.4;
  let hi = maxW;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (greedy(words, size, mid).length <= base.length) hi = mid;
    else lo = mid;
  }
  return greedy(words, size, hi);
};

export type Fit = { size: number; lines: string[]; ok: boolean };

/** Hero: the largest size in [HERO.min, HERO.max] whose lines fit both HERO.lines and the hero's height; at the minimum if none does (ok = false). */
export const heroFit = (clue: string): Fit => {
  const t = prepClue(clue);
  for (let s = HERO.max; s >= HERO.min; s--) {
    const lines = wrapBalanced(t, s, heroTextW * SAFETY);
    if (lines.length <= HERO.lines && lines.length * s * HERO.lineHeight <= heroInnerH) return { size: s, lines, ok: true };
  }
  return { size: HERO.min, lines: wrapBalanced(t, HERO.min, heroTextW * SAFETY), ok: false };
};

export const historyFit = (clue: string): Fit => {
  const lines = wrapBalanced(prepClue(clue), HISTORY.size, rowTextW * SAFETY);
  return { size: HISTORY.size, lines, ok: lines.length <= HISTORY.lines };
};

export type ClueFailure = { card: number; clue: number; where: 'hero' | 'history'; lines: number; allowed: number };

/** Every clue that does not fit: more than HERO.lines at HERO.min, or more than HISTORY.lines in a history row. */
export const clueFailures = (list: { n: number; clues: string[] }[]): ClueFailure[] =>
  list.flatMap((c) =>
    c.clues.flatMap((t, i): ClueFailure[] => {
      const out: ClueFailure[] = [];
      const h = heroFit(t);
      if (!h.ok) out.push({ card: c.n, clue: i + 1, where: 'hero', lines: h.lines.length, allowed: HERO.lines });
      if (i < LAYOUT.historyRows) {
        const r = historyFit(t);
        if (!r.ok) out.push({ card: c.n, clue: i + 1, where: 'history', lines: r.lines.length, allowed: HISTORY.lines });
      }
      return out;
    }),
  );
