import { spring } from 'remotion';
import { FPS } from './clock';
import { SPRINGS } from './springs';

/**
 * motion.ts: the single source for the premium motion of this video.
 * Units: design ticks (30 per second, see clock.ts). Nothing here draws anything.
 */

/**
 * Spring presets: everything in springs.ts plus "ios".
 * ios: stiffness 170, mass 1, damping 21 gives a damping ratio of about 0.80,
 * which overshoots by about 1.5% (exp(-pi * z / sqrt(1 - z^2))) and then settles.
 */
export const MOTION_SPRINGS = {
  ...SPRINGS,
  ios: { damping: 21, stiffness: 170, mass: 1 },
} as const;
export type MotionSpringName = keyof typeof MOTION_SPRINGS;

/** 0..1 progress (ios overshoots to about 1.015) of a spring that starts at design tick `at`. */
export const motionSpringAt = (frame: number, at: number, preset: MotionSpringName = 'ios'): number =>
  spring({ frame: Math.max(0, frame - at), fps: FPS, config: MOTION_SPRINGS[preset] });

/**
 * ENTRANCE: when each element of a movie slot starts to enter, in design ticks
 * relative to the slot's enter tick (add the slot's enter tick to get the absolute tick).
 * 2 ticks = about 67 ms at 30 fps, the stagger between the two tiles.
 */
export const ENTRANCE = {
  leftTile: 0,
  rightTile: 2,
  caption: 4,
  timer: 7,
} as const;
export type EntranceKey = keyof typeof ENTRANCE;

/** Absolute design tick at which `key` enters, given the slot's enter tick. */
export const entranceAt = (enterTick: number, key: EntranceKey): number => enterTick + ENTRANCE[key];

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export type EaseFn = (t: number) => number;

/** Smooth ease-in-out (smootherstep: zero slope at both ends). Input and output 0..1. */
export const easeInOut: EaseFn = (t) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Ease-out (cubic: fast start, soft landing). Input and output 0..1. */
export const easeOut: EaseFn = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export const EASE = { inOut: easeInOut, out: easeOut } as const;
export type EaseName = keyof typeof EASE;

/** 0..1 eased progress of `frame` inside the window [at, at + dur] (design ticks). */
export const easeWindow = (frame: number, at: number, dur: number, ease: EaseFn = easeOut): number =>
  ease(dur <= 0 ? (frame >= at ? 1 : 0) : (frame - at) / dur);
