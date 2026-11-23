import type { CSSProperties } from 'react';
import { px, REF } from './shared/px';
import { glassSurface, glossStyle } from './shared/glass';

/**
 * system.ts: the design system of the Christmas quiz (dark iOS glass, red and green, gold for bonus rounds).
 * Every size is in 1280x720 reference units; wrap in px() when it goes into CSS. Plain TypeScript (no JSX), so a Node
 * script can import it. Nothing here names a movie, a clue or a slot.
 */
export { px, REF } from './shared/px';
export { SPRINGS, springAt } from './shared/springs';
export type { SpringName } from './shared/springs';
export { useXmasFonts } from './shared/fonts';
export { useXmasFrame } from './shared/clock';
export { glassSurface, glossStyle } from './shared/glass';

/* ------------------------------------------------------------------ colour roles */

export const colors = {
  /** dark background: near-black blue, lighter at the top */
  background: 'radial-gradient(120% 95% at 50% 0%, #0F1424 0%, #080B15 55%, #040509 100%)',
  /** frosted tile: dark blue-grey base under the white highlight (reads as glass over the dark background) */
  glassBase: 'rgba(34,44,66,0.55)',
  glassFill: 'rgba(255,255,255,0.07)',
  /** the bright rim of a tile (top-left); the helper in shared/glass.ts draws it */
  glassEdge: 'rgba(255,255,255,0.70)',
  ink: 'rgba(255,255,255,0.95)',
  muted: 'rgba(235,235,245,0.62)',
  /** the one dim text colour, for "OF 50" */
  faint: 'rgba(235,235,245,0.45)',
  green: '#30D158',
  red: '#FF453A',
  orange: '#FF9F0A',
  /** gold: bonus rounds only */
  gold: '#FFC857',
  /** soft light behind the left tile (green) and the right tile (red) */
  greenGlow: 'rgba(48,209,88,0.30)',
  redGlow: 'rgba(255,69,58,0.30)',
  goldGlow: 'rgba(255,200,87,0.28)',
  bulbRed: '#FF453A',
  bulbGreen: '#30D158',
  bulbGold: '#FFC857',
  /** an unlit bulb: dim blue-grey glass */
  bulbOff: 'rgba(110,128,160,0.34)',
  bulbOffEdge: 'rgba(160,178,210,0.22)',
  /** unlit timer segment */
  segmentOff: 'rgba(255,255,255,0.12)',
} as const;

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: string, b: string, k: number): string => {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgb(${f(r1, r2)}, ${f(g1, g2)}, ${f(b1, b2)})`;
};

/** Timer colour from green (t = 0, full time) through yellow and orange to red (t = 1, time up). */
const TIMER_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#30D158'],
  [0.5, '#E8C23A'],
  [0.78, '#FF9F0A'],
  [1, '#FF453A'],
];
export const timerColor = (t: number): string => {
  const k = Math.max(0, Math.min(1, t));
  for (let i = 1; i < TIMER_STOPS.length; i++) {
    const [t1, c1] = TIMER_STOPS[i];
    if (k <= t1) {
      const [t0, c0] = TIMER_STOPS[i - 1];
      return mix(c0, c1, (k - t0) / (t1 - t0));
    }
  }
  return TIMER_STOPS[TIMER_STOPS.length - 1][1];
};

/* ------------------------------------------------------------------ type */

/** Inter (loaded by useXmasFonts), emoji from the bundled Noto Color Emoji. */
export const fontStack = '"Inter", -apple-system, "SF Pro Text", system-ui, "Noto Color Emoji", sans-serif';
export const weights = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;

/** Type scale in reference units. Caption and counter are 24 (2/3 of a percent of the frame height more than the smallest phone-safe size). */
export const TYPE = { caption: 24, counter: 24, label: 26, body: 32, title: 56, hero: 92 } as const;

export type TypeRole = 'caption' | 'counter' | 'counterRest' | 'label' | 'body' | 'title' | 'hero';

const ROLES: Record<TypeRole, { size: number; weight: number; tracking: string; color: string; upper?: boolean }> = {
  caption: { size: TYPE.caption, weight: weights.medium, tracking: '0.34em', color: colors.muted, upper: true },
  counter: { size: TYPE.counter, weight: weights.bold, tracking: '0.3em', color: colors.ink },
  counterRest: { size: TYPE.counter, weight: weights.regular, tracking: '0.3em', color: colors.faint },
  label: { size: TYPE.label, weight: weights.semibold, tracking: '0.14em', color: colors.muted, upper: true },
  body: { size: TYPE.body, weight: weights.medium, tracking: '0', color: colors.ink },
  title: { size: TYPE.title, weight: weights.bold, tracking: '-0.02em', color: colors.ink },
  hero: { size: TYPE.hero, weight: weights.bold, tracking: '-0.02em', color: colors.ink },
};

export const textStyle = (role: TypeRole): CSSProperties => {
  const r = ROLES[role];
  return {
    fontFamily: fontStack,
    fontSize: px(r.size),
    fontWeight: r.weight,
    letterSpacing: r.tracking,
    color: r.color,
    textTransform: r.upper ? 'uppercase' : 'none',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
    margin: 0,
  };
};

/* ------------------------------------------------------------------ safe margins and layout */

/** The centre 80% of the frame. All text stays inside, except the counter below the timer. */
export const SAFE = {
  left: REF.w * 0.1, // 128
  right: REF.w * 0.9, // 1152
  top: REF.h * 0.1, // 72
  bottom: REF.h * 0.9, // 648
} as const;

type Rect = { x: number; y: number; w: number; h: number };

const TILE = 400;
const TILE_GAP = 44;
const TILE_Y = 138;
const TILE_X0 = (REF.w - (2 * TILE + TILE_GAP)) / 2; // 218

/**
 * One layout block, reference units (1280x720). Numbers come from the look reference (its pixels / 2).
 *   lights    y 40..77   (50 small bulbs on a swagged wire)
 *   caption   centred y 98 (box y 79..117)
 *   tiles     x 218..618 and 662..1062, y 138..538, corner 108 (0.27 of the tile), 44 gap, no plus sign
 *   timer     capsule x 320..960, y 578..642, 8 segments inside
 *   counter   centred y 688 (box y 674..702), the one text item below the safe band
 */
export const LAYOUT = {
  tile: {
    size: TILE,
    gap: TILE_GAP,
    radius: Math.round(TILE * 0.27), // 108
    left: { x: TILE_X0, y: TILE_Y, w: TILE, h: TILE } as Rect,
    right: { x: TILE_X0 + TILE + TILE_GAP, y: TILE_Y, w: TILE, h: TILE } as Rect,
    /** inner padding for the clue image */
    inset: 40,
  },
  timer: {
    capsule: { x: 320, y: 578, w: 640, h: 64 } as Rect,
    radius: 32,
    segments: 8,
    padX: 14,
    padY: 17,
    gap: 8,
  },
  lights: {
    top: 40,
    bottom: 77,
    /** one bulb per slot: 40 movies + 10 bonus rounds (ui.ts TOTAL_SLOTS) */
    count: 50,
    firstX: 40,
    lastX: 1240,
    bulbW: 14,
    bulbH: 19,
    /** bulb top below the wire */
    hang: 3,
    /** wire swag: peak (highest) at x 100, one swag every 247 units, 14 units of sag */
    swagPeakX: 100,
    swagPeriod: 247,
    wireTop: 40,
    wireSag: 14,
  },
  caption: { cy: 98, box: { x: (REF.w - 560) / 2, y: 79, w: 560, h: 38 } as Rect },
  counter: { cy: 688, box: { x: (REF.w - 240) / 2, y: 674, w: 240, h: 28 } as Rect },
} as const;

/** x, y, w, h of timer segment `i` (0..7) relative to the capsule's top-left corner, reference units. */
export const timerSegment = (i: number): Rect => {
  const { capsule, segments, padX, padY, gap } = LAYOUT.timer;
  const w = (capsule.w - padX * 2 - gap * (segments - 1)) / segments;
  return { x: padX + i * (w + gap), y: padY, w, h: capsule.h - padY * 2 };
};

/** Colour of timer segment `i` when lit: green on the left through amber to red on the right. */
export const segmentColor = (i: number): string => timerColor(i / (LAYOUT.timer.segments - 1));

/** The wire's y at x (reference units). */
export const lightWireY = (x: number): number => {
  const L = LAYOUT.lights;
  return L.wireTop + L.wireSag / 2 - (L.wireSag / 2) * Math.cos((2 * Math.PI * (x - L.swagPeakX)) / L.swagPeriod);
};

export type Bulb = { i: number; x: number; wireY: number; top: number; color: string };
const BULB_COLORS = [colors.bulbRed, colors.bulbGreen, colors.bulbGold] as const;
/** The light string geometry: 50 bulbs. `color` is a default cycle only; LightString colours each bulb from data.ts bulbColor(slot). */
export const bulbs = (): Bulb[] => {
  const L = LAYOUT.lights;
  const step = (L.lastX - L.firstX) / (L.count - 1);
  return Array.from({ length: L.count }, (_, i) => {
    const x = L.firstX + i * step;
    const wireY = lightWireY(x);
    return { i, x, wireY, top: wireY + L.hang, color: BULB_COLORS[i % BULB_COLORS.length] };
  });
};

/** SVG path of the wire across the full width (reference units; the scene scales the SVG). */
export const lightWirePath = (): string => {
  const pts: string[] = [];
  for (let x = 0; x <= REF.w; x += 8) pts.push(`${x === 0 ? 'M' : 'L'} ${x} ${lightWireY(x).toFixed(2)}`);
  return pts.join(' ');
};

/**
 * Checks the layout against the 1280x720 frame and the safe band. Returns a list of problems (empty = fits).
 * Run by hand: see docs/xmas-context.md.
 */
export const checkLayout = (): string[] => {
  const bad: string[] = [];
  const inFrame = (n: string, r: Rect) => {
    if (r.x < 0 || r.y < 0 || r.x + r.w > REF.w || r.y + r.h > REF.h) bad.push(`${n} leaves the frame`);
  };
  const inSafe = (n: string, r: Rect) => {
    if (r.x < SAFE.left || r.x + r.w > SAFE.right || r.y < SAFE.top || r.y + r.h > SAFE.bottom) bad.push(`${n} leaves the safe band`);
  };
  const { tile, timer, caption, counter, lights } = LAYOUT;
  const rects: Record<string, Rect> = {
    tileLeft: tile.left,
    tileRight: tile.right,
    timer: timer.capsule,
    caption: caption.box,
    counter: counter.box,
  };
  for (const [n, r] of Object.entries(rects)) inFrame(n, r);
  for (const n of ['tileLeft', 'tileRight', 'timer', 'caption']) inSafe(n, rects[n]);
  if (tile.left.w < 400 || tile.left.h < 400) bad.push('tile smaller than 400');
  if (tile.right.x - (tile.left.x + tile.left.w) < 24) bad.push('gap between tiles is not visible');
  if (Math.abs(tile.left.x + tile.left.w / 2 + (tile.right.x + tile.right.w / 2) - REF.w) > 0.5) bad.push('tiles are not centred');
  if (Math.abs(timer.capsule.x + timer.capsule.w / 2 - REF.w / 2) > 0.5) bad.push('timer is not centred');
  const bulbList = bulbs();
  const lowest = Math.max(...bulbList.map((b) => b.top + lights.bulbH));
  const highest = Math.min(...bulbList.map((b) => b.wireY));
  if (lowest > lights.bottom + 0.01) bad.push(`bulbs reach y ${lowest.toFixed(1)}, past ${lights.bottom}`);
  if (highest < lights.top - 0.01) bad.push('wire above the light string band');
  if (lowest >= caption.box.y) bad.push('bulbs touch the caption');
  if (caption.box.y + caption.box.h >= tile.left.y) bad.push('caption touches the tiles');
  if (tile.left.y + tile.left.h >= timer.capsule.y) bad.push('tiles touch the timer');
  if (timer.capsule.y + timer.capsule.h >= counter.box.y) bad.push('timer touches the counter');
  const seg = timerSegment(timer.segments - 1);
  if (seg.x + seg.w > timer.capsule.w - timer.padX + 0.01) bad.push('timer segments overflow the capsule');
  return bad;
};

/* ------------------------------------------------------------------ glass looks */

/** Frosted tile with the bright edge. Add a child with glossStyle(tile size) for the lens highlight. */
export const tileGlass = (): CSSProperties => ({
  ...glassSurface(LAYOUT.tile.radius, { edge: 1, depth: 1, base: colors.glassBase }),
});
/** Bonus rounds: the same tile in warmer, gold-tinted glass. */
export const bonusTileGlass = (): CSSProperties => ({
  ...glassSurface(LAYOUT.tile.radius, { edge: 1, depth: 1, base: colors.glassBase, tint: colors.gold, tintPercent: 18 }),
});
/** The timer capsule (small pill: fainter edge, shallower shadow). */
export const timerGlass = (): CSSProperties => ({
  ...glassSurface(LAYOUT.timer.radius, { edge: 0.6, depth: 0.45, base: colors.glassBase }),
});

/* ------------------------------------------------------------------ frame border, background, bokeh, light zones */

/**
 * Rounded frame border: a thin gradient outline just inside the frame edge, green at the top left, through orange, to
 * red on the right and bottom. Absolutely positioned; give it a parent that fills the frame. Built with a mask that
 * cuts out the middle (so only the ring shows); -webkit- and standard properties are both set.
 */
export const FRAME_BORDER = { inset: 8, width: 2, radius: 50 } as const;
export const frameBorderStyle = (): CSSProperties => ({
  position: 'absolute',
  inset: px(FRAME_BORDER.inset),
  borderRadius: px(FRAME_BORDER.radius),
  padding: px(FRAME_BORDER.width),
  background: `linear-gradient(135deg, ${colors.green} 0%, rgba(48,209,88,0.85) 14%, ${colors.orange} 56%, ${colors.red} 82%, ${colors.red} 100%)`,
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
  pointerEvents: 'none',
  boxSizing: 'border-box',
});

/** Full-frame dark background (apply to the root div). */
export const backgroundStyle = (): CSSProperties => ({ background: colors.background });

/**
 * Soft ambient light zones: green behind the left tile (left half), red behind the right tile (right half). Absolutely
 * positioned radial gradients (no blur filter), meant to sit under the tiles and over the background. `strength` 0..1.5.
 * `tint` swaps the colour pair for the bonus rounds' warmer light (both zones gold).
 */
export const lightZoneStyle = (side: 'left' | 'right', strength = 1, tint?: 'gold'): CSSProperties => {
  const t = side === 'left' ? LAYOUT.tile.left : LAYOUT.tile.right;
  const w = 780;
  const h = 640;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2 + 40;
  const glow = tint === 'gold' ? colors.goldGlow : side === 'left' ? colors.greenGlow : colors.redGlow;
  return {
    position: 'absolute',
    left: px(cx - w / 2),
    top: px(cy - h / 2),
    width: px(w),
    height: px(h),
    opacity: Math.max(0, Math.min(1.5, strength)),
    background: `radial-gradient(ellipse at 50% 50%, ${glow} 0%, ${glow.replace(/[\d.]+\)$/, '0.12)')} 45%, rgba(0,0,0,0) 72%)`,
    pointerEvents: 'none',
  };
};

/* Bokeh: soft blurred red and green dots on the background. Seeded, so every render is identical. */
export type BokehDot = { x: number; y: number; r: number; color: string; alpha: number; amp: number; period: number; phase: number };

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const BOKEH_COUNT = 26;
export const BOKEH: BokehDot[] = (() => {
  const rnd = mulberry32(2512);
  return Array.from({ length: BOKEH_COUNT }, () => {
    const x = rnd() * REF.w;
    const y = rnd() * REF.h;
    const green = rnd() < (x < REF.w / 2 ? 0.7 : 0.3);
    return {
      x,
      y,
      r: 14 + rnd() * 30,
      color: green ? colors.green : colors.red,
      alpha: 0.07 + rnd() * 0.1,
      amp: 3 + rnd() * 7,
      period: 38 + rnd() * 34,
      phase: rnd() * Math.PI * 2,
    };
  });
})();

/** Style of one bokeh dot at time `seconds`. A very slow sine drift of at most 10 reference units. */
export const bokehStyle = (d: BokehDot, seconds: number): CSSProperties => {
  const a = (2 * Math.PI * seconds) / d.period + d.phase;
  const x = d.x + Math.sin(a) * d.amp;
  const y = d.y + Math.cos(a * 0.8) * d.amp;
  const c = d.color === colors.green ? '48,209,88' : '255,69,58';
  return {
    position: 'absolute',
    left: px(x - d.r),
    top: px(y - d.r),
    width: px(d.r * 2),
    height: px(d.r * 2),
    borderRadius: '50%',
    background: `radial-gradient(circle at 50% 50%, rgba(${c},${d.alpha}) 0%, rgba(${c},${d.alpha * 0.8}) 55%, rgba(${c},0) 100%)`,
    pointerEvents: 'none',
  };
};

/** Style of one bulb's glass body (reference units in the LAYOUT.lights block); `lit` colours it, unlit is dim blue-grey glass. */
export const bulbStyle = (b: Bulb, lit: boolean, glow = 1): CSSProperties => {
  const L = LAYOUT.lights;
  return {
    position: 'absolute',
    left: px(b.x - L.bulbW / 2),
    top: px(b.top),
    width: px(L.bulbW),
    height: px(L.bulbH),
    borderRadius: '50% 50% 50% 50% / 42% 42% 58% 58%',
    background: lit ? b.color : colors.bulbOff,
    border: lit ? 'none' : `${px(1)}px solid ${colors.bulbOffEdge}`,
    boxShadow: lit ? `0 0 ${px(10 * glow)}px ${b.color}, 0 0 ${px(26 * glow)}px ${b.color}55` : 'none',
    boxSizing: 'border-box',
  };
};
