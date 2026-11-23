import React from 'react';
import { LAYOUT, colors, glossStyle, lightZoneStyle, px, springAt, useXmasFrame } from '../system';
import { glassSurface, glossEdgeStyle, rimLightStyle } from '../shared/glass';
import { ENTRANCE } from '../shared/motion';
import { ClueImage } from './ClueImage';

/**
 * GlassTile: one frosted glass tile (dark translucent fill, bright edge, a light white wash and a thin curved highlight along the top inside edge) that
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
  /** Extra style on the image box only (a blur filter or a mask for a bonus round). Never changes the glass. */
  imageStyle?: React.CSSProperties;
  /** Depth: a soft contact shadow under the clue image and a very faint reflection of it on the glass (default true). Bonus layouts can pass false. */
  depth?: boolean;
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
  pulse: { ticks: 16, scale: 0.035, glow: 0.2, zoneBoost: 0.2 },
} as const;

/**
 * Depth constants, fractions of the tile edge. `floorAt` is the line the clue image "stands" on: the contact shadow is
 * centred on it and the reflection is the image mirrored about it. One fixed line for every tile (the clue images are not
 * trimmed to their artwork), so tune it here. Gradients and box-shadows only, no blur filter.
 */
export const GLASS_DEPTH = {
  floorAt: 0.8,
  shadow: { width: 0.44, height: 0.065, alpha: 0.42 },
  /** reflection: peak opacity (0.08 to 0.12 asked for) and where the mask has faded out, as a fraction of the part below the floor */
  reflection: { opacity: 0.1, fadeEnd: 0.85 },
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

/**
 * Contact shadow + faint reflection, drawn under the clue image and clipped inside the tile (the tile's own rounded
 * corners clip nothing here, so the pieces are kept well inside it). The reflection gets the same `imageStyle` as the
 * image, so a blurred or masked bonus clue is blurred or masked in its reflection too.
 */
const TileDepth: React.FC<{ imageId: string; size: number; imageStyle?: React.CSSProperties }> = ({ imageId, size, imageStyle }) => {
  const D = GLASS_DEPTH;
  const box = GLASS_TILE.imageBox;
  const boxBottom = (1 + box) / 2;
  const belowTop = D.floorAt * size;
  const belowH = (1 - D.floorAt) * size;
  const sw = D.shadow.width * size;
  const sh = D.shadow.height * size;
  const fade = `linear-gradient(180deg, #000 0%, transparent ${D.reflection.fadeEnd * 100}%)`;
  return (
    <>
      {/* reflection: the image box mirrored about the floor line, only the part below it, fading out */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: px(belowTop), height: px(belowH), overflow: 'hidden', opacity: D.reflection.opacity, WebkitMaskImage: fade, maskImage: fade, pointerEvents: 'none' }}>
        <div
          style={{
            ...imageStyle,
            position: 'absolute',
            left: `${((1 - box) / 2) * 100}%`,
            width: `${box * 100}%`,
            height: px(box * size),
            top: px((D.floorAt - boxBottom) * size),
            transform: 'scaleY(-1)',
            transformOrigin: '50% 50%',
          }}
        >
          <ClueImage id={imageId} radius={0} />
        </div>
      </div>
      {/* contact shadow: a flat dark ellipse centred on the floor line */}
      <div
        style={{
          position: 'absolute',
          left: px((size - sw) / 2),
          top: px(belowTop - sh / 2),
          width: px(sw),
          height: px(sh),
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${D.shadow.alpha}) 0%, rgba(0,0,0,${D.shadow.alpha * 0.5}) 45%, rgba(0,0,0,0) 72%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

export const GlassTile: React.FC<GlassTileProps> = ({ imageId, side, size = LAYOUT.tile.size, enterFrame, glideFrame, pulseFrame, frosted, light = true, imageStyle, depth = true }) => {
  const t = useXmasFrame();
  // the right tile enters ENTRANCE.rightTile ticks after the left one (only when the tile has an enterFrame at all)
  const enterAt = enterFrame === undefined ? undefined : enterFrame + (side === 'right' ? ENTRANCE.rightTile : 0);
  const s = glassTileState(t, enterAt, glideFrame, pulseFrame);
  const P = GLASS_TILE.pulse;
  const blur = frosted ?? side !== 'none';

  // same glass as system.ts tileGlass() / bonusTileGlass(), but the rim is the directional RimLight child below
  const gold = side === 'bonus';
  const base = glassSurface(LAYOUT.tile.radius, {
    edge: 1,
    depth: 1,
    base: colors.glassBase,
    rim: 'none',
    // the tile draws its own gentler wash (glossStyle) instead of the built-in 0.12 highlight
    highlight: false,
    ...(gold ? { tint: colors.gold, tintPercent: 18 } : {}),
  });
  // depth: a soft wide shadow (from glassSurface) plus a tighter contact shadow; box-shadow only, no blur filter
  const shadow = `${base.boxShadow}, 0 ${px(size * 0.012)}px ${px(size * 0.04)}px rgba(0,0,0,0.35)`;
  const glass: React.CSSProperties = {
    ...base,
    boxShadow: shadow,
    borderRadius: px(size * GLASS_TILE.radius),
    ...(blur ? {} : { backdropFilter: undefined, WebkitBackdropFilter: undefined }),
    // the pulse brightens the edge glow in the side colour; nothing is added when it is not pulsing
    ...(s.bump > 0.001
      ? { boxShadow: `${shadow}, 0 0 ${px(size * 0.22)}px color-mix(in srgb, ${glowColor(side)} ${Math.round(P.glow * s.bump * 100)}%, transparent)` }
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
        <div style={glossStyle(size, GLASS_TILE.radius)} />
        <div style={glossEdgeStyle(size, { radius: GLASS_TILE.radius, tint: gold ? colors.gold : undefined })} />
        <div style={rimLightStyle(size * GLASS_TILE.radius, { tint: gold ? colors.gold : undefined })} />
        {imageId && depth ? <TileDepth imageId={imageId} size={size} imageStyle={imageStyle} /> : null}
        {imageId ? (
          <div style={{ position: 'absolute', left: `${((1 - box) / 2) * 100}%`, top: `${((1 - box) / 2) * 100}%`, width: `${box * 100}%`, height: `${box * 100}%`, ...imageStyle }}>
            <ClueImage id={imageId} radius={0} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GlassTile;
