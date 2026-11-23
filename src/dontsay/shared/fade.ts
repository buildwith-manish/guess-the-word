/**
 * fade.ts — tiny deterministic helpers shared by the HUD components.
 * Copied from src/gta6/components/fade.ts (no external deps).
 * Frames are local design ticks (30 fps).
 */
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * 0..1 opacity window: ramps in over `inTicks` from `at`, and (optionally)
 * ramps out over `outTicks` ending at `outAt`. Pure function of `frame`.
 */
export const fadeWindow = (
  frame: number,
  at: number,
  outAt?: number,
  inTicks = 8,
  outTicks = 8,
): number => {
  const fin = clamp01((frame - at) / inTicks);
  const fout = outAt === undefined ? 1 : clamp01((outAt - frame) / outTicks);
  return Math.min(fin, fout);
};
