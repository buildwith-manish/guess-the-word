/**
 * look.ts: the material of the States video (Video 4). States-only: the shared style.ts / ios tokens are not changed.
 * Step 3 adds the glass panel here; Steps 4-5 (soft light, colour tokens) and 7 (type scale) extend this file.
 *
 * glassPanel(radius, accent?, depth?) is the ONE panel style of the States video: a translucent white fill over the dark
 * theme, a backdrop blur, a 1 px light inner border, a second faint accent border, a soft large shadow and a top-edge
 * highlight (a white gradient that fades out in the first third of the panel). Everything is static CSS, so it is
 * deterministic in a Remotion render (no animation, no randomness); the entrance transforms live in motion.ts.
 *
 * KNOBS: GLASS (material) and RADIUS (one radius scale) below.
 */
import type { CSSProperties } from 'react';
import { px } from '../style';

export const GLASS = {
  /** translucent fill: white over the dark theme (6-9%) */
  fill: 0.07,
  /** top-edge highlight: white at the top fading to 0 over the first `highlightEnd` of the height */
  highlight: 0.1,
  highlightEnd: 0.35,
  /** backdrop blur (ref px) and saturation */
  blur: 22,
  saturate: 1.15,
  /** 1 px inner border, white (14-22%) */
  borderAlpha: 0.18,
  /** second, faint border in the accent colour (percent of the accent colour) */
  accentRing: 22,
  /** soft large shadow (ref px offset / blur, black alpha) at depth 1 */
  shadowY: 24,
  shadowBlur: 60,
  shadowAlpha: 0.35,
} as const;

/** One radius scale (ref px). Cards and panels 28-40; pills are fully round. */
export const RADIUS = {
  card: 36,
  panel: 32,
  chip: 28,
  pill: 999,
} as const;

/**
 * The glass panel. `radius` in px (use px(RADIUS.x)); `accent` adds the faint accent border; `depth` scales the shadow
 * (1 for cards, about 0.4 for small pills and chips so they do not float too far off the backdrop).
 */
export const glassPanel = (radius: number, accent?: string, depth = 1): CSSProperties => ({
  background: `linear-gradient(180deg, rgba(255,255,255,${GLASS.highlight}) 0%, rgba(255,255,255,0) ${GLASS.highlightEnd * 100}%), rgba(255,255,255,${GLASS.fill})`,
  borderRadius: Math.min(radius, 99999),
  backdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
  WebkitBackdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
  border: `${px(1)}px solid rgba(255,255,255,${GLASS.borderAlpha})`,
  boxShadow: [
    accent ? `inset 0 0 0 ${px(1)}px color-mix(in srgb, ${accent} ${GLASS.accentRing}%, transparent)` : undefined,
    `0 ${px(GLASS.shadowY) * depth}px ${px(GLASS.shadowBlur) * depth}px rgba(0,0,0,${GLASS.shadowAlpha})`,
  ]
    .filter(Boolean)
    .join(', '),
  boxSizing: 'border-box',
});

/**
 * Soft light (Step 4): glow is two wide, low-opacity layers instead of one tight strong one, like
 * `0 0 40px accent 25%` + `0 0 120px accent 10%`. Sizes are multiples of the shape's crisp core stroke (SVG units), so
 * the glow scales with the shape. Glow only ever sits behind shapes and map outlines, never behind text, so it cannot
 * reduce text contrast; the card border is a separate element (look.ts glassPanel) the glow never touches.
 */
export const SOFT_GLOW = {
  /** closer layer: stroke width, Gaussian sigma (x core) and opacity at glow = 1 */
  near: { width: 4, blur: 8, alpha: 0.2 },
  /** far, very wide layer */
  far: { width: 10, blur: 24, alpha: 0.09 },
} as const;

/** Mini-map "current state" halo: how much the 900 ms pulse lifts the halo (0 = none). Was 1.0 (halo doubled at the peak). */
export const MINI_PULSE = { lift: 0.2 } as const;

/**
 * Colour tokens (Step 5). One accent per level (states-settings.json levels[].accent), one neutral white, one secondary
 * grey. GOLD is only the word STATE in the title and rare highlights (the streak banner, the top scoreboard rank);
 * nothing else is gold (the MEDIUM level accent is sky blue for that reason). No hex values in components: use these.
 *
 * Text: primary white at 92%, labels at 60%, hints at 45%. scripts/states-qa.js check 11 measures their contrast over every
 * backdrop colour (primary >= 7:1, labels >= 4.5:1, hints >= 3:1) and checks where gold is used.
 */
export const COLOR = {
  text: {
    primary: 'rgba(255,255,255,0.92)',
    label: 'rgba(255,255,255,0.60)',
    hint: 'rgba(255,255,255,0.45)',
  },
  /** hairline fills for rings, discs and chips */
  fill: 'rgba(255,255,255,0.10)',
  fillStrong: 'rgba(255,255,255,0.16)',
  /** the rare highlight: title word STATE, streak banner, top scoreboard rank */
  gold: '#F5C84C',
  /** the bonus rounds' accent (matches their orange backdrop) */
  bonus: '#FF8A3D',
  /** the clock and ring in the last 3 seconds; the subscribe pill */
  alert: '#FF453A',
  /** the true neighbour on the borders bonus */
  positive: '#30D158',
  /** text on an accent-filled chip (dark) and on the alert pill (white) */
  onAccent: '#0B0B12',
  onAlert: '#FFFFFF',
  black: '#000000',
} as const;

/** Backdrop colours the text sits on (black, the raised dark, the level backgrounds are added from the settings by the QA). */
export const BACKDROP = { black: '#000000', raised: '#0B0B12' } as const;

/** Alpha helpers for the atmosphere layers (Step 6): white light and black shade at a given alpha (0..1). */
export const whiteA = (a: number): string => `rgba(255,255,255,${a})`;
export const blackA = (a: number): string => `rgba(0,0,0,${a})`;

/**
 * Typography (Step 7): exactly two families. FONT.display is Anton (titles: the title lockup and the level name),
 * FONT.sans is Inter (everything else, bundled in public/fonts/ios). Emoji glyphs fall back to the bundled Noto Color
 * Emoji through the stacks; that is a glyph set, not a third text face. No component names a family: use these.
 *
 * KNOB: set FONT.display to FONT.sans to drop Anton and use Inter bold titles again.
 */
const SANS = '"Inter", -apple-system, "SF Pro Text", system-ui, "Noto Color Emoji", sans-serif';
const DISPLAY = '"Anton", Impact, "Arial Narrow", "Noto Color Emoji", sans-serif';
export const FONT = { sans: SANS, display: DISPLAY } as const;

/** Weights: 700 for labels and values, 500 / 400 for secondary text. Inter ships 400, 500, 600, 700 (no 800). */
export const WEIGHT = { regular: 400, medium: 500, strong: 700 } as const;

/** Type scale (reference px, pass through px()): caption, label, body, title, hero, display numeral. */
export const TYPE = { xs: 20, sm: 26, md: 32, lg: 56, xl: 92, xxl: 150 } as const;

/** Letter-spacing: uppercase labels get 0.14em (inside the 0.12-0.2em range); big titles are pulled in a little. */
export const TRACKING = { label: '0.14em', title: '-0.02em' } as const;
