/**
 * Level-card transition helpers: the app-launch zoom (icon on a home-screen grid springs up to fill the frame)
 * and the iris wipe out. Pure geometry and math, copied from gta6/scenes/LevelCard.tsx and converted from
 * 1920x1080 units to 1280x720 (x 2/3). No durations, no text and no level names live here: the beat lengths
 * (launch, wipe length, tail) come from timing.ts and are passed in, and the card text comes from data.ts.
 * The scene itself (LevelCard) is built in task 4a.
 */
import type { Level } from '../data';
import { FRAME } from '../system';

export type WipeVariant = 'circle' | 'curtain' | 'sweep';

/** Which iris clip fits which level (as the source: circle, curtain, sweep). */
export const WIPE_VARIANT: Record<Level, WipeVariant> = { rookie: 'circle', starter: 'curtain', hof: 'sweep' };

/** Home-screen grid, 1280x720 reference units. */
export const GRID = { icon: 100, gap: 32, cols: 6, rows: 4, iconRadius: 23 } as const;

/** Cell (col, row) of the level icon, one cell further right per level (as the source). */
export const ICON_CELL: Record<Level, readonly [number, number]> = { rookie: [1, 1], starter: [2, 1], hof: [3, 1] };

/** Skew of the sweep edge (degrees-ish, as a percentage) and circle size, same values as the source. */
const SWEEP_SKEW = 12;
const CIRCLE_MAX = 80;

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Top-left of grid cell (c, r), reference units. */
export const cellPos = (c: number, r: number): { x: number; y: number } => {
  const gridW = GRID.cols * GRID.icon + (GRID.cols - 1) * GRID.gap;
  const gridH = GRID.rows * GRID.icon + (GRID.rows - 1) * GRID.gap;
  return {
    x: (FRAME.w - gridW) / 2 + c * (GRID.icon + GRID.gap),
    y: (FRAME.h - gridH) / 2 + r * (GRID.icon + GRID.gap),
  };
};

/**
 * Card rect (reference units) while the icon launches. `pressed` and `launch` are 0..1 spring progress values
 * (press squash, then zoom). At launch = 0 it is the icon, at launch = 1 it fills the frame.
 */
export const launchRect = (level: Level, pressed: number, launch: number) => {
  const [cc, cr] = ICON_CELL[level];
  const pos = cellPos(cc, cr);
  const k = 1 - 0.1 * pressed;
  const size0 = GRID.icon * k;
  const left0 = pos.x + (GRID.icon - size0) / 2;
  const top0 = pos.y + (GRID.icon - size0) / 2;
  return {
    left: lerp(left0, 0, launch),
    top: lerp(top0, 0, launch),
    width: lerp(size0, FRAME.w, launch),
    height: lerp(size0, FRAME.h, launch),
    radius: Math.max(0, lerp(GRID.iconRadius * k, 0, launch)),
  };
};

/** Clip shape at progress p (1 = card fully covers, 0 = nothing). */
export const wipeClip = (variant: WipeVariant, p: number): string => {
  if (variant === 'sweep') {
    const e = -SWEEP_SKEW + p * (100 + 2 * SWEEP_SKEW);
    return `polygon(0 0, ${e + SWEEP_SKEW}% 0, ${e - SWEEP_SKEW}% 100%, 0 100%)`;
  }
  if (variant === 'curtain') {
    const half = 50 * p;
    return `inset(0 ${50 - half}% 0 ${50 - half}%)`;
  }
  return `circle(${CIRCLE_MAX * p}% at 50% 50%)`;
};

/**
 * clip-path for the exit at local tick `frame`: undefined before the wipe starts, then the shrinking shape.
 * `exitAt` and `exitLen` are ticks (from timing.ts).
 */
export const exitClip = (level: Level, frame: number, exitAt: number, exitLen: number): string | undefined => {
  if (frame < exitAt) return undefined;
  const p = clamp01((frame - exitAt) / exitLen);
  const ease = 1 - Math.pow(1 - p, 3);
  return wipeClip(WIPE_VARIANT[level], 1 - ease);
};
