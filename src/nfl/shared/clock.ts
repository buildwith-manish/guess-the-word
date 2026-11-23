import { useCurrentFrame } from 'remotion';

/**
 * Clock for the NFL video. Output is 2560x1440 at 60 fps (same as root settings.json); every scene is authored in
 * 30 fps "design frames" (ticks) and 1280x720 reference units. Copy of the idea in src/clock.ts, with the numbers
 * written here so nothing in src/nfl/ needs src/style.ts, src/clock.ts or src/timing.ts.
 */
export const WIDTH = 2560;
export const HEIGHT = 1440;
export const RENDER_FPS = 60;
export const FPS = 30;
export const TIME_SCALE = RENDER_FPS / FPS;

/** Current time in design ticks (fractional), sampled at the full output rate. */
export const useDesignFrame = (): number => useCurrentFrame() / TIME_SCALE;
