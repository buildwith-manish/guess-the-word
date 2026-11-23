import React from 'react';
import { LAYOUT, bonusTileGlass, colors, glossStyle, lightZoneStyle, px, springAt, tileGlass, useXmasFrame } from '../system';
import { ClueImage } from './ClueImage';

/**
 * GlassTile: one frosted glass tile (dark translucent fill, bright edge, soft gloss along the top inside edge) that
 * holds one clue image. The image box is 75% of the tile width and centred; ClueImage fits (never crops) inside it, so
 * text baked into an image (34, FRED, NOEL) stays fully inside the tile.
 *
 * All sizes are 1280x720 reference units. All frame props are DESIGN TICKS (30 per second, same unit as springAt and
 * useXmasFrame) on the clock of the scene the tile sits in; the render frame is tick * 2. Leave a prop undefined and
 * that state never runs (no enterFrame = the tile is simply there).
 *
 * Blur budget: one backdrop-blur layer per tile, so at most two blurred tiles may be on screen. `none` tiles (inside
 * bonus layouts, where there can be many) draw the same glass without backdrop blur.
 */
export type GlassTileSide = 'left' | 'right' | 'bonus' | 'none';

export type GlassTileProps = {
  /** Clue image id for ClueImage, e.g. "s01_c1". Omit for an empty glass tile (the Hook). */
  imageId?: string;
  /** left = green light zone, right = red, bonus = gold glass and gold light, none = no light zone (tiles inside bonus layouts). */
  side: GlassTileSide;
  /** Tile edge in reference units. Default is the movie tile (LAYOUT.tile.size, 400). */
  size?: number;
  /** Tick at which the tile springs in (scale, rise, fade). */
  enterFrame?: number;
  /** Tick at which the tile glides up and shrinks slightly. */
  glideFrame?: number;
  /** Tick at which the tile does one soft pulse. */
  pulseFrame?: number;
  /** Override the blur rule: true = backdrop blur, false = none. Default: blur for left, right and bonus, none for `none`. */
  frosted?: boolean;
  /** Draw the tile's own light zone behind it (default true). A scene that draws the two ambient zones itself passes false. */
  light?: boolean;
};

/** Motion constants. Distances are fractions of the tile size so they scale with `size`. */
export const GLASS_TILE = {
  /** the image box, fraction of the tile width (and height) */
  imageBox: 0.75,
  /** corner radius, fraction of the tile (LAYOUT.tile.radius / LAYOUT.tile.size = 0.27) */
  radius: 0.27,
  enter: { spring: 'pop', fromScale: 0.86, rise: 0.06, fadeAt: 0.5 },
  glide: { spring: 'smooth', rise: 0.1, scale: 0.92 },
  /** one pulse: length in ticks, peak scale and peak edge glow (0..1) */
  pulse: { ticks: 16, scale: 0.035, glow: 0.5, zoneBoost: 0.4 },
} as const;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** The three states at design tick `t` (exported so a test or scene can read the same numbers). */
export const glassTileState = (t: number, enterFrame?: number, glideFrame?: number, pulseFrame?: number) => {
  const E = GLASS_TILE.enter;
  const G = GLASS_TILE.glide;
  const P = GLASS_TILE.pulse;
  const enter = enterFrame === undefined ? 1 : springAt(t, enterFrame, E.spring);
  const glide = glideFrame === undefined ? 0 : springAt(t, glideFrame, G.spring);
  const pulseT = pulseFrame === undefined ? 0 : clamp01((t - pulseFrame) / P.ticks);
  const bump = pulseFrame === undefined ? 0 : Math.sin(Math.PI * pulseT) ** 2;
  return {
    enter,
    glide,
    bump,
    opacity: enterFrame === undefined ? 1 : clamp01(enter / E.fadeAt),
    /** fraction of size, negative = up */
    dy: (1 - enter) * E.rise - glide * G.rise,
    scale: (E.fromScale + (1 - E.fromScale) * enter) * (1 - (1 - G.scale) * glide) * (1 + P.scale * bump),
  };
};

const glowColor = (side: GlassTileSide): string => (side === 'left' ? colors.green : side === 'right' ? colors.red : side === 'bonus' ? colors.gold : '#FFFFFF');

export const GlassTile: React.FC<GlassTileProps> = ({ imageId, side, size = LAYOUT.tile.size, enterFrame, glideFrame, pulseFrame, frosted, light = true }) => {
  const t = useXmasFrame();
  const s = glassTileState(t, enterFrame, glideFrame, pulseFrame);
  const P = GLASS_TILE.pulse;
  const blur = frosted ?? side !== 'none';

  const base = side === 'bonus' ? bonusTileGlass() : tileGlass();
  const glass: React.CSSProperties = {
    ...base,
    borderRadius: px(size * GLASS_TILE.radius),
    ...(blur ? {} : { backdropFilter: undefined, WebkitBackdropFilter: undefined }),
    // the pulse brightens the edge glow in the side colour; nothing is added when it is not pulsing
    ...(s.bump > 0.001
      ? { boxShadow: `${base.boxShadow}, 0 0 ${px(size * 0.09)}px ${px(2)}px color-mix(in srgb, ${glowColor(side)} ${Math.round(P.glow * s.bump * 100)}%, transparent)` }
      : {}),
  };

  // The light zone sits behind the tile, centred on it, and moves with it. Same gradient as system.ts lightZoneStyle.
  let zone: React.CSSProperties | null = null;
  if (side !== 'none' && light) {
    const k = size / LAYOUT.tile.size;
    const w = 780 * k;
    const h = 640 * k;
    zone = {
      ...lightZoneStyle(side === 'right' ? 'right' : 'left', 1 + P.zoneBoost * s.bump, side === 'bonus' ? 'gold' : undefined),
      left: px(size / 2 - w / 2),
      top: px(size / 2 + 40 * k - h / 2),
      width: px(w),
      height: px(h),
    };
  }

  const box = GLASS_TILE.imageBox;
  return (
    <div
      style={{
        position: 'relative',
        width: px(size),
        height: px(size),
        transformOrigin: '50% 50%',
        transform: `translateY(${px(s.dy * size)}px) scale(${s.scale})`,
        // opacity below 1 makes this a backdrop root, so it is only set while the tile is fading in
        ...(s.opacity < 1 ? { opacity: s.opacity } : {}),
      }}
    >
      {zone ? <div style={zone} /> : null}
      <div style={{ position: 'absolute', inset: 0, ...glass }}>
        <div style={glossStyle(size)} />
        {imageId ? (
          <div style={{ position: 'absolute', left: `${((1 - box) / 2) * 100}%`, top: `${((1 - box) / 2) * 100}%`, width: `${box * 100}%`, height: `${box * 100}%` }}>
            <ClueImage id={imageId} radius={0} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GlassTile;
