/**
 * titleFit.ts: shrinks a title so it sits on ONE line inside the title pill and the safe band.
 * Plain TypeScript (no React, no DOM), so a Node script can run it. Nothing here names a movie or a slot.
 *
 * Width is computed from the real advance widths of Inter Bold (public/fonts/ios/Inter-700.woff2, read with fontTools,
 * em units, 2048 upm), plus the title tracking of -0.02em. Kerning is ignored: pairs only ever tighten, so the
 * estimate is slightly wide and the text errs on the side of fitting. A character not in the table counts as 0.72 em.
 * All sizes are 1280x720 reference units.
 */
import { REF } from './shared/px';

/** Advance widths of Inter Bold (700), in em. */
export const INTER_BOLD_ADVANCE: Readonly<Record<string, number>> = {
  ' ': 0.2368, '!': 0.3379, '"': 0.5513, '#': 0.6489, '$': 0.6548, '%': 1.0156,
  '&': 0.6719, '\'': 0.3389, '(': 0.377, ')': 0.377, '*': 0.5591, '+': 0.6787,
  ',': 0.334, '-': 0.4678, '.': 0.334, '/': 0.3882, '0': 0.6743, '1': 0.4312,
  '2': 0.6294, '3': 0.6455, '4': 0.6763, '5': 0.6221, '6': 0.6494, '7': 0.5815,
  '8': 0.6509, '9': 0.6494, ':': 0.334, ';': 0.3428, '<': 0.6787, '=': 0.6787,
  '>': 0.6787, '?': 0.5596, '@': 1.0161, 'A': 0.7466, 'B': 0.6616, 'C': 0.7397,
  'D': 0.7222, 'E': 0.6074, 'F': 0.5869, 'G': 0.7505, 'H': 0.7471, 'I': 0.2808,
  'J': 0.5845, 'K': 0.7192, 'L': 0.5654, 'M': 0.9316, 'N': 0.7622, 'O': 0.7705,
  'P': 0.6479, 'Q': 0.7769, 'R': 0.6567, 'S': 0.6548, 'T': 0.6675, 'U': 0.7319,
  'V': 0.7466, 'W': 1.0376, 'X': 0.7383, 'Y': 0.731, 'Z': 0.6641, '[': 0.377,
  '\\': 0.3882, ']': 0.377, '^': 0.4868, '_': 0.4761, '`': 0.3652, 'a': 0.5806,
  'b': 0.6304, 'c': 0.5884, 'd': 0.6304, 'e': 0.5957, 'f': 0.3979, 'g': 0.6318,
  'h': 0.6226, 'i': 0.271, 'j': 0.271, 'k': 0.5801, 'l': 0.271, 'm': 0.9126,
  'n': 0.6226, 'o': 0.6133, 'p': 0.6304, 'q': 0.6304, 'r': 0.4072, 's': 0.5601,
  't': 0.3662, 'u': 0.6226, 'v': 0.5996, 'w': 0.8501, 'x': 0.5801, 'y': 0.6021,
  'z': 0.5728, '{': 0.4688, '|': 0.3716, '}': 0.4688, '~': 0.6787, '’': 0.3105,
  '‘': 0.3105, '“': 0.54, '”': 0.5317, '–': 0.5, '—': 1.0, 'é': 0.5957,
};

const UNKNOWN_EM = 0.72;
/** Same tracking as textStyle('title') in system.ts. */
export const TITLE_TRACKING_EM = -0.02;

/** Pill and size limits. The safe band is the centre 80% of the frame (128..1152, 1024 wide). */
export const TITLE_FIT = {
  /** Largest title size. */
  maxSize: 44,
  /** Smallest title size: never go below this (28 units = 3.9% of the frame height, about 4.5 mm on a 6.1 in phone held landscape). */
  minSize: 28,
  /** Pill height. */
  pillHeight: 72,
  /** Space between the pill edge and the text on each side. */
  padX: 32,
  /** The pill is never narrower than this (short titles still get a proper pill). */
  minPillWidth: 360,
  /** Widest the pill may be: the safe band. */
  maxPillWidth: REF.w * 0.8,
} as const;

/** Width of `text` at `size`, in reference units. */
export const titleWidth = (text: string, size: number): number => {
  let em = 0;
  for (const ch of text) em += INTER_BOLD_ADVANCE[ch] ?? UNKNOWN_EM;
  em += TITLE_TRACKING_EM * [...text].length;
  return em * size;
};

export type TitleFit = {
  /** The size to draw the title at (reference units, a whole or half number). */
  fontSize: number;
  /** Width of the text at that size. */
  textWidth: number;
  /** Outer width of the pill. */
  pillWidth: number;
  pillHeight: number;
  /** True when the whole title fits on one line at fontSize >= minSize inside the safe band. */
  fits: boolean;
};

/**
 * Largest size from maxSize down to minSize (steps of 0.5) at which the title fits the pill's inner width.
 * If even minSize does not fit, fontSize stays at minSize and fits is false: the caller (and the checker script) must
 * report it, the text is never shrunk below minSize.
 */
export const fitTitle = (title: string, opts: Partial<typeof TITLE_FIT> = {}): TitleFit => {
  const o = { ...TITLE_FIT, ...opts };
  const inner = o.maxPillWidth - o.padX * 2;
  let size = o.maxSize;
  while (size > o.minSize && titleWidth(title, size) > inner) size -= 0.5;
  const textWidth = titleWidth(title, size);
  const pillWidth = Math.min(o.maxPillWidth, Math.max(o.minPillWidth, Math.ceil(textWidth + o.padX * 2)));
  return { fontSize: size, textWidth, pillWidth, pillHeight: o.pillHeight, fits: textWidth <= inner + 0.01 };
};
