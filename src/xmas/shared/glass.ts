import type { CSSProperties } from 'react';
import { px } from './px';

/**
 * GLOSS: every number of the tile gloss, in one place. Fractions are of the tile edge unless noted.
 *   wash   a very light white-to-clear vertical gradient over the whole glass
 *   edge   a thin curved highlight hugging the top inside edge; a horizontal mask fades it out toward the corners
 */
export const GLOSS = {
  wash: { topAlpha: 0.07, clearAt: 0.6 },
  edge: {
    /** gap between the tile's rim and the highlight, reference units */
    inset: 3.5,
    /** the highlight box is this tall (fraction); its lower part is faded by a vertical mask */
    height: 0.34,
    /** thickness of the bright line, reference units */
    thickness: 2.2,
    /** softness of the line (box-shadow blur, reference units; not a filter) */
    soft: 1.2,
    alpha: 0.55,
    /** horizontal fade: transparent at the ends, full between `fadeIn` and `1 - fadeIn` */
    fadeIn: 0.3,
    /** vertical fade: full until `solidUntil`, clear at the bottom of the box */
    solidUntil: 0.4,
  },
} as const;

/**
 * glass.ts: the frosted glass surface of this video.
 * Adapted from the glass panel of the States video (fill, top highlight, blur, rim light from two inset shadows, soft
 * shadow). Changes: the rim is brighter (`edge`), there is an optional tint (gold for the bonus rounds), and the
 * continuous-corner property was dropped so a render never depends on browser support. The directional rim (`rimLightStyle`) is the one mask here.
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
  /** 'inset' (default, unchanged): rim from two inset shadows. 'none': no rim here, the caller draws `rimLightStyle` instead. */
  rim?: 'inset' | 'none';
  /** false: leave out the built-in top highlight (tiles draw GLOSS.wash instead). Default true. */
  highlight?: boolean;
};

/**
 * Directional edge light: a thin ring that is brightest at the top-left corner and fades to nothing along the border
 * (clockwise over the top edge, counter-clockwise down the left edge), so a tile looks lit from the top left.
 * An absolutely positioned child (`inset: 0`) of the tile; pointer-free, no blur, no backdrop filter. Uses a mask that
 * cuts out the middle, like the frame border in system.ts. `strength` 0..1.5, `tint` mixes a colour into the white.
 */
export const RIM_LIGHT = { width: 2, peak: 0.9, shoulder: 0.5, shoulderAt: 12, fadeAt: 30 } as const;
export const rimLightStyle = (radius: number, opts: { strength?: number; tint?: string } = {}): CSSProperties => {
  const { strength = 1, tint } = opts;
  const R = RIM_LIGHT;
  const white = tint ? `color-mix(in srgb, ${tint} 35%, #FFFFFF)` : '#FFFFFF';
  const a = (v: number) => `color-mix(in srgb, ${white} ${Math.round(Math.min(1, v * strength) * 100)}%, transparent)`;
  // conic angle 0 sits at the top-left corner; the sweep wraps, so the left edge is the end of the gradient
  const stops = `${a(R.peak)} 0%, ${a(R.shoulder)} ${R.shoulderAt}%, transparent ${R.fadeAt}%, transparent ${100 - R.fadeAt}%, ${a(R.shoulder)} ${100 - R.shoulderAt}%, ${a(R.peak)} 100%`;
  return {
    position: 'absolute',
    inset: 0,
    borderRadius: px(radius),
    padding: px(R.width),
    background: `conic-gradient(from 315deg at 50% 50%, ${stops})`,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  };
};

/**
 * Tile gloss, part 1: a very light white-to-clear vertical wash over the glass (an absolutely positioned child of the tile,
 * under the rim and the clue image). Top alpha GLOSS.wash.topAlpha, clear by GLOSS.wash.clearAt. Static.
 * Part 2 is glossEdgeStyle. Both are children of the tile; the tile's corner radius is `tileSize * radius`.
 */
export const glossStyle = (tileSize: number, radius = 0.27): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  borderRadius: px(tileSize * radius),
  background: `linear-gradient(180deg, rgba(255,255,255,${GLOSS.wash.topAlpha}) 0%, rgba(255,255,255,0) ${GLOSS.wash.clearAt * 100}%)`,
  pointerEvents: 'none',
});

/**
 * Tile gloss, part 2: a thin curved highlight just inside the top edge. It follows the tile's rounded top corners (an
 * inset box-shadow on a box with the same radius), a horizontal mask fades it out toward the corners and a vertical mask
 * removes the box's lower end. No blur filter, no backdrop filter. `tint` mixes a colour into the white (gold bonus tiles).
 */
export const glossEdgeStyle = (tileSize: number, opts: { radius?: number; tint?: string } = {}): CSSProperties => {
  const { radius = 0.27, tint } = opts;
  const E = GLOSS.edge;
  const white = tint ? `color-mix(in srgb, ${tint} 30%, #FFFFFF)` : '#FFFFFF';
  const line = `color-mix(in srgb, ${white} ${Math.round(E.alpha * 100)}%, transparent)`;
  const fade = `linear-gradient(90deg, transparent 0%, #000 ${E.fadeIn * 100}%, #000 ${(1 - E.fadeIn) * 100}%, transparent 100%)`;
  const down = `linear-gradient(180deg, #000 0%, #000 ${E.solidUntil * 100}%, transparent 100%)`;
  const r = tileSize * radius - E.inset;
  return {
    position: 'absolute',
    left: px(E.inset),
    right: px(E.inset),
    top: px(E.inset),
    height: px(tileSize * E.height),
    borderRadius: `${px(r)}px ${px(r)}px 0 0`,
    boxShadow: `inset 0 ${px(E.thickness)}px ${px(E.soft)}px ${line}`,
    WebkitMaskImage: `${fade}, ${down}`,
    maskImage: `${fade}, ${down}`,
    WebkitMaskComposite: 'source-in',
    maskComposite: 'intersect',
    pointerEvents: 'none',
  };
};

export const glassSurface = (radius: number, opts: GlassOptions = {}): CSSProperties => {
  const { tint, edge = 1, depth = 1, tintPercent = 16, rim: rimMode = 'inset', highlight = true } = opts;
  const under = opts.base ?? `rgba(255,255,255,${GLASS.fill})`;
  const base = tint ? `color-mix(in srgb, ${tint} ${tintPercent}%, ${under})` : under;
  const rim = px(GLASS.rimWidth);
  return {
    background: highlight ? `linear-gradient(180deg, rgba(255,255,255,${GLASS.highlight}) 0%, rgba(255,255,255,0) ${GLASS.highlightEnd * 100}%), ${base}` : base,
    borderRadius: px(radius),
    backdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
    WebkitBackdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
    border: `${px(1)}px solid ${
      tint ? `color-mix(in srgb, ${tint} 40%, rgba(255,255,255,${GLASS.borderAlpha}))` : `rgba(255,255,255,${GLASS.borderAlpha})`
    }`,
    boxShadow: [
      ...(rimMode === 'none'
        ? []
        : [
            `inset ${rim}px ${rim}px 0 rgba(255,255,255,${Math.min(1, GLASS.rimStart * edge)})`,
            `inset ${-rim}px ${-rim}px 0 rgba(255,255,255,${Math.min(1, GLASS.rimEnd * edge)})`,
          ]),
      `0 ${px(GLASS.shadowY) * depth}px ${px(GLASS.shadowBlur) * depth}px rgba(0,0,0,${GLASS.shadowAlpha})`,
    ].join(', '),
    boxSizing: 'border-box',
  };
};
