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
 * Type scale in 1280x720 reference units. Mobile-first: nothing under 24 (1.9% of the frame width),
 * so text stays readable on a phone at arm's length.
 */
export const type = {
  caption: { size: 24, weight: 500, lineHeight: 1.25 },
  body: { size: 30, weight: 500, lineHeight: 1.3 },
  clue: { size: 40, weight: 600, lineHeight: 1.2 },
  name: { size: 56, weight: 700, lineHeight: 1.1 },
  title: { size: 64, weight: 800, lineHeight: 1.05 },
  number: { size: 80, weight: 700, lineHeight: 1 },
} as const;
export type TypeRole = keyof typeof type;

export const textStyle = (role: TypeRole) => ({
  fontFamily: fontStack,
  fontSize: px(type[role].size),
  fontWeight: type[role].weight,
  lineHeight: type[role].lineHeight,
  letterSpacing: role === 'title' || role === 'name' ? '-0.02em' : '-0.01em',
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

export { easeOut };

/** Dark background gradient per level (low-key, tinted by the level colour). */
export const levelBackground: Record<Level, string> = {
  rookie: 'radial-gradient(120% 90% at 50% 0%, #0E2A1B 0%, #08140E 55%, #040806 100%)',
  starter: 'radial-gradient(120% 90% at 50% 0%, #2E1E08 0%, #160E04 55%, #080501 100%)',
  hof: 'radial-gradient(120% 90% at 50% 0%, #2F0F0C 0%, #160706 55%, #080303 100%)',
};
