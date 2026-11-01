/**
 * util.ts — deterministic helpers. There is no Math.random() in this project:
 * confetti, shuffles and puzzle boards all come from seeds, so parallel render
 * lanes and repeated renders produce byte-identical frames.
 */

/** Mulberry32 seeded PRNG. */
export const makeRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffle = <T,>(arr: T[], rand: () => number): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const pickN = <T,>(arr: T[], n: number, rand: () => number): T[] =>
  shuffle(arr, rand).slice(0, n);

export const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Emoji-safe character split (astral emoji must never be cut in half). */
export const splitChars = (s: string) => Array.from(s);

export type Glyph = { ch: string; accent: boolean; space: boolean };

/**
 * Split a headline into glyphs; text wrapped in #..# is highlighted.
 * "WITH #ZERO# MISTAKES?" -> W,I,T,H,space,Z,E,R,O(accent),...
 */
export const glyphs = (text: string): Glyph[] => {
  const out: Glyph[] = [];
  let accent = false;
  for (const ch of Array.from(text)) {
    if (ch === '#') {
      accent = !accent;
      continue;
    }
    out.push({ ch, accent, space: ch === ' ' });
  }
  return out;
};

export type ConfettiPiece = {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  round: boolean;
  delay: number;
  duration: number;
  spin: number;
};

/** Seeded confetti burst (answer stamp, bonus reveal, LEGEND row, end screen). */
export const makeConfetti = (
  seed: number,
  count: number,
  origin = { x: 960, y: 660 },
): ConfettiPiece[] => {
  const rand = makeRandom(seed);
  const colors = ['#ffd60a', '#ffffff', '#ff453a', '#ff9f0a'];
  return range(count).map((i) => {
    const size = 8 + rand() * 10;
    return {
      id: `cf-${seed}-${i}`,
      x: origin.x,
      y: origin.y,
      dx: (rand() - 0.5) * 1300,
      dy: -(160 + rand() * 420),
      size,
      color: colors[i % colors.length],
      round: i % 3 === 0,
      delay: Math.floor(rand() * 4),
      duration: 56 + Math.floor(rand() * 22),
      spin: rand() * 720 - 360,
    };
  });
};
