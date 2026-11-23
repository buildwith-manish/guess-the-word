import { easeOut, spring } from '../ios/motion';
import '../ios/fonts'; // Inter x4 via @remotion/fonts loadFont: it holds the frame until the faces are ready, so any scene that imports system waits for them
import { levelColors } from './data';
import type { Level } from './data';
import { FPS, WIDTH } from './shared/clock';

/**
 * NFL Scouting Card Quiz design system.
 * Authored in a 1280x720 reference frame; every size goes through px(), which scales to the real 2560x1440 frame.
 * Nothing here is video content: no card text, names, numbers, points or durations.
 */
export const FRAME = { w: 1280, h: 720 } as const;
export const SCALE = WIDTH / FRAME.w;
export const px = (v: number): number => Math.round(v * SCALE * 100) / 100;

/**
 * Safe margins in reference units: the centre 80% of the frame on both axes (10% each side).
 * Clue and name text lives inside safeBox.
 */
export const SAFE = { x: FRAME.w * 0.1, top: FRAME.h * 0.1, bottom: FRAME.h * 0.1 } as const;
export const safeBox = {
  left: SAFE.x,
  right: FRAME.w - SAFE.x,
  top: SAFE.top,
  bottom: FRAME.h - SAFE.bottom,
  w: FRAME.w - SAFE.x * 2,
  h: FRAME.h - SAFE.top - SAFE.bottom,
} as const;

/** Level colour roles. Level colours only, never team colours. */
export const colors = {
  green: levelColors.rookie,
  amber: levelColors.starter,
  red: levelColors.hof,
  level: levelColors as Record<Level, string>,
  ink: '#F5F5F7',
  muted: 'rgba(235,235,245,0.60)',
  mutedStrong: 'rgba(235,235,245,0.32)',
  glass: 'rgba(255,255,255,0.10)',
  glassStrong: 'rgba(255,255,255,0.16)',
  hairline: 'rgba(255,255,255,0.16)',
  shadow: 'rgba(0,0,0,0.38)',
  onAccent: '#06130A',
  /** iOS Low Power Mode yellow. */
  lowPower: '#FFD60A',
} as const;

/** Inter first (loaded by ../ios/fonts, imported above); SF and system as fallback. */
export const fontStack = '"Inter", -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, "Noto Color Emoji", sans-serif';
export const tabular = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' } as const;

/**
 * Type scale (one for the whole video), in 1280x720 reference units. Inter only, and only the four bundled weights:
 * 400 regular, 500 medium, 600 semibold, 700 bold (src/ios/fonts.ts loads exactly these). Mobile-first: nothing under
 * 24 (1.9% of the frame width), so text stays readable on a phone at arm's length.
 *
 * Weight per role: clue 500, chips 600, name and numbers 700. Tracking is in em: -0.01 on running text, tighter on
 * large type (-0.02 name, title, rank; -0.03 the big numbers, the card number and the reveal name), wider (+0.06, +0.08)
 * only on all-caps chips and labels. Every role carries tabular figures through textStyle() (see `tabular`).
 * A component may set a size inside the scale's range (the clue fit steps 24 to 40) but never a weight of its own.
 */
export const weights = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;
export type Weight = (typeof weights)[keyof typeof weights];

export const type = {
  caption: { size: 24, weight: weights.medium, lineHeight: 1.25, tracking: -0.01 },
  chip: { size: 24, weight: weights.semibold, lineHeight: 1.25, tracking: 0.06 },
  label: { size: 30, weight: weights.bold, lineHeight: 1.3, tracking: 0.08 },
  body: { size: 30, weight: weights.medium, lineHeight: 1.3, tracking: -0.01 },
  bodyStrong: { size: 30, weight: weights.semibold, lineHeight: 1.3, tracking: -0.01 },
  clue: { size: 40, weight: weights.medium, lineHeight: 1.2, tracking: -0.01 },
  chipNumber: { size: 28, weight: weights.semibold, lineHeight: 1, tracking: -0.02 },
  cardNumber: { size: 30, weight: weights.bold, lineHeight: 1, tracking: -0.03 },
  counter: { size: 36, weight: weights.bold, lineHeight: 1.1, tracking: -0.03 },
  pill: { size: 40, weight: weights.bold, lineHeight: 1, tracking: -0.03 },
  rank: { size: 52, weight: weights.bold, lineHeight: 1.1, tracking: -0.02 },
  name: { size: 56, weight: weights.bold, lineHeight: 1.1, tracking: -0.02 },
  title: { size: 64, weight: weights.bold, lineHeight: 1.05, tracking: -0.02 },
  number: { size: 80, weight: weights.bold, lineHeight: 1, tracking: -0.03 },
  reveal: { size: 88, weight: weights.bold, lineHeight: 1.05, tracking: -0.03 },
} as const;
export type TypeRole = keyof typeof type;

export const textStyle = (role: TypeRole) => ({
  fontFamily: fontStack,
  fontSize: px(type[role].size),
  fontWeight: type[role].weight,
  lineHeight: type[role].lineHeight,
  letterSpacing: `${type[role].tracking}em`,
  ...tabular,
});

export const radius = { sm: 8, md: 14, lg: 22, xl: 30 } as const;
export const blurPx = 22;

/**
 * Spring presets. They use the one iOS curve from src/ios/motion.ts (`spring`, about 1.5% overshoot); a preset is
 * only how long the curve takes, in seconds (the 0.3 to 0.45 s range the iOS helper documents).
 */
export const SPRINGS = {
  snappy: 0.3,
  gentle: 0.45,
  slow: 0.6,
} as const;
export type SpringName = keyof typeof SPRINGS;

/** 0..1 progress of the iOS spring that starts at design tick `at`. `frame` and `at` are design ticks (30 fps). */
export const springAt = (frame: number, at: number, preset: SpringName = 'snappy'): number =>
  spring((frame - at) / (SPRINGS[preset] * FPS));

/** The same preset length over an explicit number of ticks (the caller's slot from timing.ts). */
export const springOver = (frame: number, at: number, ticks: number): number => spring(ticks > 0 ? (frame - at) / ticks : 1);

/**
 * POP: the one spring with a slight overshoot, shared by the chips, the points pill and the answer reveal (iOS-2).
 * A real damped spring, evaluated in closed form so it is a pure function of the frame (no state, no timers):
 *   stiffness 180, damping 18, mass 1  ->  natural frequency sqrt(k/m) = 13.4 rad/s, damping ratio c / (2 sqrt(k m)) = 0.67
 *   overshoot exp(-pi z / sqrt(1 - z^2)) = 5.8 % of the travel, settled to about 1 % at 0.5 s.
 * The curve is evaluated over `windowSec` and normalised so it lands exactly on 1 there. Lengths are motion, not scene timing.
 */
export const POP = {
  stiffness: 180,
  damping: 18,
  mass: 1,
  windowSec: 0.6,
  /** Seconds until the curve is visually at rest; the next motion in a component starts after this. */
  settleSec: 0.5,
  /** Toast press-down: scale at the bottom of the press, and the seconds it takes to get there. */
  pressScale: 0.96,
  pressDownSec: 0.1,
} as const;
export const POP_SETTLE_TICKS = Math.round(POP.settleSec * FPS);
export const POP_PRESS_DOWN_TICKS = Math.round(POP.pressDownSec * FPS);

const popCurve = (sec: number): number => {
  if (sec <= 0) return 0;
  const w0 = Math.sqrt(POP.stiffness / POP.mass);
  const z = POP.damping / (2 * Math.sqrt(POP.stiffness * POP.mass));
  const wd = w0 * Math.sqrt(1 - z * z);
  const at = (t: number) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  return at(Math.min(sec, POP.windowSec)) / at(POP.windowSec);
};

/** Progress of the POP spring that starts at design tick `at`: 0 before, about 1.058 at the peak, exactly 1 after `windowSec`. */
export const popAt = (frame: number, at: number): number => popCurve((frame - at) / FPS);

export { easeOut };

/** Dark background gradient per level (low-key, tinted by the level colour). */
export const levelBackground: Record<Level, string> = {
  rookie: 'radial-gradient(120% 90% at 50% 0%, #0E2A1B 0%, #08140E 55%, #040806 100%)',
  starter: 'radial-gradient(120% 90% at 50% 0%, #2E1E08 0%, #160E04 55%, #080501 100%)',
  hof: 'radial-gradient(120% 90% at 50% 0%, #2F0F0C 0%, #160706 55%, #080303 100%)',
};

/**
 * Finish (B2, reduced): there is no frame-wide finish layer any more (no grain, vignette or chromatic split).
 * Only an optional, very faint bloom inside the lock-screen banner, the banner and the points pill (shared/BloomLayer.tsx).
 * `finishBloom` is its own switch (default false = off). `finishStrength` (0..1, default 0 = off) scales the bloom; it draws only
 * when the switch is on and the strength is above 0.
 */
export const finishStrength = 0;
export const finishBloom = false;
