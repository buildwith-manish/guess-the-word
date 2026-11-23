/**
 * px.ts: reference units to screen pixels.
 * Copied from src/style.ts (SCALE and px only). Every size in src/xmas is written in 1280x720 reference units and passed
 * through px(); the render is 2560x1440, so one reference unit is 2 screen pixels.
 */
export const SCALE = 2;
export const px = (v: number): number => Math.round(v * SCALE * 100) / 100;

/** The reference frame every layout number is written in. */
export const REF = { w: 1280, h: 720 } as const;
