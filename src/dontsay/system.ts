/**
 * system.ts — Don't Say The Same As Me design system.
 *
 * Authored in a 1920x1080 reference frame (same convention as src/gta6/system.ts).
 * The composition itself is 2560x1440 at 60 fps (30 fps design clock), so every
 * size goes through u(), which scales reference units by WIDTH / 1920.
 *
 * Level accent colours come from data.ts (levelColors[l].accent), shifting cool → warm
 * across the 5 levels. data.ts is the source of truth; this file derives a plain
 * Record<Level, string> from the .accent field so components can use it as a hex.
 *   L1 #4DA3FF (cool blue) → L2 #6F7BFF (blue-violet) → L3 #9B6BFF (violet)
 *   → L4 #FFB02E (warm amber) → L5 #FF5A36 (red-orange)
 * These are brighter than the iOS system colours (SYSTEM.blue #007AFF etc.) on
 * purpose: they tint dark wallpapers, so they need to read at low alpha.
 * The wallpaper shifts with LEVEL, never with hearts left (honour-system: the video
 * does not track hearts — see docs/dontsay-context.md decision 1).
 *
 * Fonts: Inter ExtraBold (tight tracking) for headlines, Nunito ExtraBold (tabular
 * numbers) for timer and counter. Both must be loaded by the scene — see
 * shared/fonts.ts and the note in docs/dontsay-context.md.
 */
import { spring } from 'remotion';
import { levelColors, type Level } from './data';
import { FPS, WIDTH } from './timing';

// ---------------------------------------------------------------------------
// Reference frame + scaler
// ---------------------------------------------------------------------------
export const FRAME = { w: 1920, h: 1080 } as const;
export const UNIT = WIDTH / FRAME.w;
/** Reference units (1920x1080) → screen px (2560x1440). */
export const u = (v: number): number => Math.round(v * UNIT * 100) / 100;

// ---------------------------------------------------------------------------
// Safe area: centre 80% (10% margin each side on the reference frame)
// ---------------------------------------------------------------------------
export const SAFE = { x: 96, top: 72, bottom: 72 } as const;
export const safeBox = {
  left: SAFE.x,
  right: FRAME.w - SAFE.x,
  top: SAFE.top,
  bottom: FRAME.h - SAFE.bottom,
  w: FRAME.w - SAFE.x * 2,
  h: FRAME.h - SAFE.top - SAFE.bottom,
} as const;

// ---------------------------------------------------------------------------
// Colours — iOS system palette. Red reserved for collisions and the last 2 s.
// ---------------------------------------------------------------------------
export const SYSTEM = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
} as const;

/** Level accent hex strings, derived from data.ts levelColors[l].accent. */
const levelAccents: Record<Level, string> = {
  1: levelColors[1].accent,
  2: levelColors[2].accent,
  3: levelColors[3].accent,
  4: levelColors[4].accent,
  5: levelColors[5].accent,
};

export const colours = {
  /** Level accent colours (cool blue → red-orange across 5 levels, from data.ts). */
  level: levelAccents,
  ink: '#F5F5F7',
  muted: 'rgba(235,235,245,0.60)',
  mutedStrong: 'rgba(235,235,245,0.32)',
  glass: 'rgba(255,255,255,0.10)',
  glassStrong: 'rgba(255,255,255,0.16)',
  hairline: 'rgba(255,255,255,0.16)',
  hairlineBright: 'rgba(255,255,255,0.28)',
  shadow: 'rgba(0,0,0,0.38)',
  shadowSoft: 'rgba(0,0,0,0.22)',
  onAccent: '#06130A',
  /** Collision red (SYSTEM.red, reserved for "Same answer" beats — distinct from the L5 accent). */
  collision: SYSTEM.red,
  /** Safe green (reserved for "Different? Safe" beats). */
  safe: SYSTEM.green,
  /** Bonus gold tint. */
  bonusGold: '#FFD60A',
  /** iOS Low Power Mode yellow (optional warning tint). */
  lowPower: '#FFD60A',
} as const;

// Alias for components that use the gta6 spelling.
export const colors = colours;

// ---------------------------------------------------------------------------
// Fonts — Inter for headlines, Nunito for numbers. Both SIL OFL.
// Poppins is already loaded by src/fonts.ts and serves as the fallback before
// Inter/Nunito are added to public/fonts/ (see shared/fonts.ts).
// ---------------------------------------------------------------------------
export const fontHeadline =
  '"Inter", "Poppins", -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
export const fontNumeric =
  '"Nunito", "Poppins", -apple-system, "SF Pro Text", system-ui, sans-serif';

export const tabular = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
} as const;

// ---------------------------------------------------------------------------
// Type scale (1920x1080 reference units). Tight tracking on headlines.
// ---------------------------------------------------------------------------
export const type = {
  caption:   { size: 28, weight: 500, lineHeight: 1.25, family: fontHeadline, tracking: '-0.01em' },
  body:      { size: 36, weight: 500, lineHeight: 1.3,  family: fontHeadline, tracking: '-0.01em' },
  chip:      { size: 32, weight: 600, lineHeight: 1.2,  family: fontHeadline, tracking: '-0.01em' },
  prompt:    { size: 72, weight: 800, lineHeight: 1.1,  family: fontHeadline, tracking: '-0.025em' },
  answer:    { size: 120, weight: 800, lineHeight: 1.0, family: fontHeadline, tracking: '-0.03em' },
  title:     { size: 96, weight: 800, lineHeight: 1.05, family: fontHeadline, tracking: '-0.03em' },
  /** Big countdown number inside the Dynamic Island pill. */
  number:    { size: 140, weight: 800, lineHeight: 1,   family: fontNumeric, tracking: '-0.02em' },
  /** "N OF 45" counter pill. */
  counter:   { size: 40, weight: 800, lineHeight: 1,    family: fontNumeric, tracking: '-0.01em' },
} as const;
export type TypeRole = keyof typeof type;

export const textStyle = (role: TypeRole): React.CSSProperties => ({
  fontFamily: type[role].family,
  fontSize: u(type[role].size),
  fontWeight: type[role].weight,
  lineHeight: type[role].lineHeight,
  letterSpacing: type[role].tracking,
  ...tabular,
});

// ---------------------------------------------------------------------------
// Radii + glass
// ---------------------------------------------------------------------------
export const radius = { sm: 12, md: 22, lg: 34, xl: 48 } as const;

/**
 * Glass blur in reference units. 30 ref units ≈ 40 screen px at the 1.333 scale,
 * matching the docx "blur(40px)" spec. saturate(180%) per the docx.
 */
export const blurPx = 30;
export const saturate = 1.8;

/**
 * Frosted-glass surface used by every card / pill / sheet.
 * Spec (docx section 9): blur(40px) saturate(180%), thin bright top edge, 0.5px light
 * border, soft shadows.
 * Tint: `tint` (any colour) is the strong tint used by chips and bubbles.
 * `level` is the light house tint (about 12% of the level accent) for ordinary cards;
 * it is ignored when `tint` is given.
 */
export const glassSurface = (
  radiusUnits: number,
  opts: { tint?: string; level?: Level; shadow?: number; alpha?: number } = {},
): React.CSSProperties => {
  const { tint, level, shadow = 1, alpha = 0.10 } = opts;
  const r = u(radiusUnits);
  const white = `linear-gradient(160deg, rgba(255,255,255,${alpha + 0.06}), rgba(255,255,255,${alpha * 0.4}))`;
  const levelTint = level ? levelAccents[level] : undefined;
  return {
    boxSizing: 'border-box',
    borderRadius: r,
    background: tint
      ? `linear-gradient(160deg, ${tint}40, rgba(255,255,255,${alpha * 0.4}))`
      : levelTint
        ? `linear-gradient(160deg, ${levelTint}1F 0%, ${levelTint}0A 100%), ${white}`
        : white,
    border: `${u(0.5)}px solid ${colours.hairline}`,
    backdropFilter: `blur(${u(blurPx)}px) saturate(${saturate})`,
    WebkitBackdropFilter: `blur(${u(blurPx)}px) saturate(${saturate})`,
    boxShadow: [
      `inset 0 ${u(0.75)}px 0 rgba(255,255,255,0.55)`, // thin bright top edge
      `0 ${u(18 * shadow)}px ${u(48 * shadow)}px rgba(0,0,0,0.30)`, // soft, wide
      `0 ${u(3 * shadow)}px ${u(10 * shadow)}px rgba(0,0,0,0.14)`, // contact
    ].join(', '),
  };
};

// ---------------------------------------------------------------------------
// Springs: four real curves, all mass 1 (damping 17.5-20, stiffness 120-180).
// Overshoot is the share of the travel past the target.
//   soft   — damping 20,   stiffness 120, clamped: no overshoot. The default.
//   reveal — damping 17.5, stiffness 120, overshoot ~1.5%. The answer reveal ONLY.
//   ios    — damping 20,   stiffness 150, overshoot ~1.2% (the nfl iOS feel).
//   pop    — damping 18,   stiffness 180, overshoot ~5.8% (same values as the
//            nfl-quiz POP spring, copied here; nothing is imported from nfl).
// ios and pop can pass 1: near the safe edge or the HUD, check the peak or use soft.
// Legacy aliases: snappy, gentle -> ios; bouncy -> pop; smooth -> soft.
// Nothing aliases `reveal`: a scene must ask for it by name.
// ---------------------------------------------------------------------------
const soft = { damping: 20, stiffness: 120, mass: 1, overshootClamping: true } as const;
const reveal = { damping: 17.5, stiffness: 120, mass: 1 } as const;
const ios = { damping: 20, stiffness: 150, mass: 1 } as const;
const pop = { damping: 18, stiffness: 180, mass: 1 } as const;

export const SPRINGS = {
  soft,
  reveal,
  ios,
  pop,
  // Legacy aliases. Do not use in new code.
  gentle: ios,
  snappy: ios,
  smooth: soft,
  bouncy: pop,
} as const;
export type SpringName = keyof typeof SPRINGS;

/**
 * 0..1 progress of a spring that starts at local design frame `at`.
 * `frame` and `at` are design ticks (30 fps). Output is sampled at the full
 * 60 fps rate via useDesignFrame() in shared/clock.ts.
 */
export const springAt = (frame: number, at: number, preset: SpringName = 'soft'): number =>
  spring({ frame: Math.max(0, frame - at), fps: FPS, config: SPRINGS[preset] });

/**
 * Ease-out for non-spring moves (fades, short slides, exits). `t` is 0..1 and is
 * clamped. `power` 3 = cubic (default); 2 is gentler, 4 is sharper. Never linear.
 */
export const easeOut = (t: number, power = 3): number => {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, power);
};

// ---------------------------------------------------------------------------
// Background gradients per level: a near-black base with ONE faint accent light
// (13% = 0x21) at the top. Wallpaper shifts with LEVEL, not with hearts left.
// ---------------------------------------------------------------------------
const LIGHT = '21';
export const levelBackground: Record<Level, string> = {
  1: `radial-gradient(120% 90% at 50% 0%, ${colours.level[1]}${LIGHT} 0%, #060B16 55%, #03060C 100%)`,
  2: `radial-gradient(120% 90% at 50% 0%, ${colours.level[2]}${LIGHT} 0%, #0A0716 55%, #050309 100%)`,
  3: `radial-gradient(120% 90% at 50% 0%, ${colours.level[3]}${LIGHT} 0%, #0E0616 55%, #07030B 100%)`,
  4: `radial-gradient(120% 90% at 50% 0%, ${colours.level[4]}${LIGHT} 0%, #160B06 55%, #0A0503 100%)`,
  5: `radial-gradient(120% 90% at 50% 0%, ${colours.level[5]}${LIGHT} 0%, #160606 55%, #0A0303 100%)`,
};

// ---------------------------------------------------------------------------
// Film grain — 2-3% over gradients to hide banding after YouTube compression.
// Applied as a repeating SVG noise overlay at this opacity.
// ---------------------------------------------------------------------------
export const grainOpacity = 0.03;

// ---------------------------------------------------------------------------
// Stagger, in design ticks (30 fps), 3 to 6. Named values are the building blocks;
// arrival / chip / heart are the existing keys, kept at 4 so nothing shifts.
// ---------------------------------------------------------------------------
export const STAGGER = {
  tight: 3,
  base: 4,
  loose: 5,
  slow: 6,
  arrival: 4,   // ticks between element arrivals
  chip: 4,      // ticks between exclusion chips
  heart: 4,     // ticks between the 3 hearts at level start
} as const;
