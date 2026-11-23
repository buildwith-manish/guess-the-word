import { spring } from 'remotion';
import { FPS } from './clock';

/**
 * springs.ts: the spring presets of this video.
 * Adapted from the gta6 SPRINGS table (the configs only; its level colours and 1920 units were left behind).
 * `frame` and `at` are design ticks (30 per second), see clock.ts.
 */
export const SPRINGS = {
  gentle: { damping: 22, stiffness: 140, mass: 1 },
  snappy: { damping: 18, stiffness: 260, mass: 0.8 },
  /** critically damped: settles with no overshoot (reveals, anything that must feel like iOS) */
  smooth: { damping: 26, stiffness: 170, mass: 1 },
  /** same stiffness as smooth, damping ratio about 0.73: a hair of life when it lands */
  pop: { damping: 19, stiffness: 170, mass: 1 },
  bouncy: { damping: 11, stiffness: 190, mass: 0.9 },
} as const;
export type SpringName = keyof typeof SPRINGS;

/** 0..1 progress of a spring that starts at design tick `at`. */
export const springAt = (frame: number, at: number, preset: SpringName = 'snappy'): number =>
  spring({ frame: Math.max(0, frame - at), fps: FPS, config: SPRINGS[preset] });
