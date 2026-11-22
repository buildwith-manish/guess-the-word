import { spring } from 'remotion';
import { levelColors, type Level } from './data';
import { FPS, WIDTH } from './timing';

/**
 * GTA 6 design system. Authored in a 1920x1080 reference frame (as asked in task 2a).
 * The composition itself is whatever settings.json says (2560x1440 today), so every size
 * goes through u(), which scales reference units by WIDTH / 1920.
 */
export const FRAME = { w: 1920, h: 1080 } as const;
export const UNIT = WIDTH / FRAME.w;
export const u = (v: number): number => Math.round(v * UNIT * 100) / 100;

/** Safe margins in 1920x1080 reference units. */
export const SAFE = { x: 96, top: 72, bottom: 72 } as const;
export const safeBox = {
  left: SAFE.x,
  right: FRAME.w - SAFE.x,
  top: SAFE.top,
  bottom: FRAME.h - SAFE.bottom,
  w: FRAME.w - SAFE.x * 2,
  h: FRAME.h - SAFE.top - SAFE.bottom,
} as const;

export const colors = {
  easy: levelColors.easy,
  medium: levelColors.medium,
  hard: levelColors.hard,
  level: levelColors as Record<Level, string>,
  ink: '#F5F5F7',
  muted: 'rgba(235,235,245,0.60)',
  mutedStrong: 'rgba(235,235,245,0.32)',
  glass: 'rgba(255,255,255,0.10)',
  glassStrong: 'rgba(255,255,255,0.16)',
  hairline: 'rgba(255,255,255,0.16)',
  shadow: 'rgba(0,0,0,0.38)',
  onAccent: '#06130A',
} as const;

/** iOS-style stack (Inter first, as the other iOS videos; SF and system as fallback). Inter must be loaded by the scene. */
export const fontStack = '"Inter", -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
export const tabular = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' } as const;

/** Type scale in 1920x1080 reference units. */
export const type = {
  caption: { size: 28, weight: 500, lineHeight: 1.25 },
  body: { size: 36, weight: 500, lineHeight: 1.3 },
  choice: { size: 44, weight: 600, lineHeight: 1.2 },
  question: { size: 64, weight: 700, lineHeight: 1.15 },
  title: { size: 88, weight: 800, lineHeight: 1.05 },
  number: { size: 120, weight: 700, lineHeight: 1 },
} as const;
export type TypeRole = keyof typeof type;

export const textStyle = (role: TypeRole) => ({
  fontFamily: fontStack,
  fontSize: u(type[role].size),
  fontWeight: type[role].weight,
  lineHeight: type[role].lineHeight,
  letterSpacing: role === 'title' || role === 'question' ? '-0.02em' : '-0.01em',
  ...tabular,
});

export const radius = { sm: 12, md: 22, lg: 34, xl: 48 } as const;
export const blurPx = 22;

/**
 * Spring presets. NOT copied from src/ios/motion.ts: that folder is not on this branch
 * (only on us-states / search-history), so these are local Remotion spring configs.
 */
export const SPRINGS = {
  gentle: { damping: 22, stiffness: 140, mass: 1 },
  snappy: { damping: 18, stiffness: 260, mass: 0.8 },
  bouncy: { damping: 11, stiffness: 190, mass: 0.9 },
} as const;
export type SpringName = keyof typeof SPRINGS;

/** 0..1 progress of a spring that starts at local design frame `at`. `frame` and `at` are design ticks (30 fps). */
export const springAt = (frame: number, at: number, preset: SpringName = 'snappy'): number =>
  spring({ frame: Math.max(0, frame - at), fps: FPS, config: SPRINGS[preset] });

/** Dark background gradient per level (low-key, tinted by the level colour). */
export const levelBackground: Record<Level, string> = {
  easy: 'radial-gradient(120% 90% at 50% 0%, #0E2A1B 0%, #08140E 55%, #040806 100%)',
  medium: 'radial-gradient(120% 90% at 50% 0%, #2E1E08 0%, #160E04 55%, #080501 100%)',
  hard: 'radial-gradient(120% 90% at 50% 0%, #2F0F0C 0%, #160706 55%, #080303 100%)',
};
