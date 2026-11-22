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
