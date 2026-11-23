import type { CSSProperties } from 'react';
import { px } from './px';

/**
 * glass.ts: the frosted glass surface of this video.
 * Adapted from the glass panel of the States video (fill, top highlight, blur, rim light from two inset shadows, soft
 * shadow). Changes: the rim is brighter (`edge`), there is an optional tint (gold for the bonus rounds), and the
 * continuous-corner property was dropped so a render never depends on browser support. No masks, no images.
 *
 * Colours come in as arguments (system.ts owns the palette), so this file has no colour roles of its own.
 * All sizes are reference units, passed through px(). `radius` is in reference units too.
 */
export const GLASS = {
  /** translucent white fill over the dark background */
  fill: 0.07,
  /** top-edge highlight: white fading to 0 over the first `highlightEnd` of the height */
  highlight: 0.12,
  highlightEnd: 0.38,
  blur: 22,
  saturate: 1.25,
  /** hairline border */
  borderAlpha: 0.16,
  /** rim light: bright at the top-left edge, faint at the bottom-right. `edge` = 1 is the tile look. */
  rimStart: 0.7,
  rimEnd: 0.22,
  rimWidth: 1.5,
  shadowY: 24,
  shadowBlur: 60,
  shadowAlpha: 0.4,
} as const;

export type GlassOptions = {
  /** a colour that tints the fill and the hairline (gold for bonus rounds); omit for neutral white glass */
  tint?: string;
  /** how bright the edge is, 0..1.5 (1 = tile, about 0.5 = small pills) */
  edge?: number;
  /** shadow depth, 1 for tiles, about 0.4 for small pills */
  depth?: number;
  /** tint strength in percent of the colour mixed into the fill */
  tintPercent?: number;
  /** fill colour under the highlight; default is white at GLASS.fill. Tiles pass a dark blue-grey so they read as frosted glass. */
  base?: string;
};

/**
 * The soft lens-shaped gloss on a tile's top edge (an absolutely positioned child of the tile). Fractions of the tile.
 * Static, no animation. Sits under the clue image.
 */
export const glossStyle = (tileSize: number): CSSProperties => ({
  position: 'absolute',
  left: px(tileSize * 0.08),
  right: px(tileSize * 0.08),
  top: px(tileSize * 0.018),
  height: px(tileSize * 0.14),
  borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)',
  pointerEvents: 'none',
});

export const glassSurface = (radius: number, opts: GlassOptions = {}): CSSProperties => {
  const { tint, edge = 1, depth = 1, tintPercent = 16 } = opts;
  const under = opts.base ?? `rgba(255,255,255,${GLASS.fill})`;
  const base = tint ? `color-mix(in srgb, ${tint} ${tintPercent}%, ${under})` : under;
  const rim = px(GLASS.rimWidth);
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,${GLASS.highlight}) 0%, rgba(255,255,255,0) ${GLASS.highlightEnd * 100}%), ${base}`,
    borderRadius: px(radius),
    backdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
    WebkitBackdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
    border: `${px(1)}px solid ${
      tint ? `color-mix(in srgb, ${tint} 40%, rgba(255,255,255,${GLASS.borderAlpha}))` : `rgba(255,255,255,${GLASS.borderAlpha})`
    }`,
    boxShadow: [
      `inset ${rim}px ${rim}px 0 rgba(255,255,255,${Math.min(1, GLASS.rimStart * edge)})`,
      `inset ${-rim}px ${-rim}px 0 rgba(255,255,255,${Math.min(1, GLASS.rimEnd * edge)})`,
      `0 ${px(GLASS.shadowY) * depth}px ${px(GLASS.shadowBlur) * depth}px rgba(0,0,0,${GLASS.shadowAlpha})`,
    ].join(', '),
    boxSizing: 'border-box',
  };
};
