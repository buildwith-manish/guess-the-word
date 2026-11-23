import { useCurrentFrame } from 'remotion';

/**
 * clock.ts: the one place for the frame size and the frame rate of this video.
 * Copied from src/clock.ts (useDesignFrame) and the constants it reads from timing.
 *
 * The composition renders at 60 fps, 2560x1440. Scenes author their motion in 30 fps "design ticks"
 * (TIME_SCALE = 2 renders per tick), so a spring or fade sampled at tick `t` is smooth at 60 fps.
 * There is exactly one frame size and one frame rate: do not add another.
 * src/xmas/timing.ts (a later task) re-exports these rather than redefining them.
 */
export const WIDTH = 2560;
export const HEIGHT = 1440;
export const RENDER_FPS = 60;
/** design ticks per second (the unit scenes author in) */
export const FPS = 30;
export const TIME_SCALE = RENDER_FPS / FPS;

/** Current time in design ticks (fractional): 12, 12.5, 13 ... Sampled at the full 60 fps output rate. */
export const useXmasFrame = (): number => useCurrentFrame() / TIME_SCALE;

export const secToTicks = (s: number): number => Math.round(s * FPS);
export const ticksToFrames = (t: number): number => Math.round(t * TIME_SCALE);
export const secToFrames = (s: number): number => Math.round(s * RENDER_FPS);
