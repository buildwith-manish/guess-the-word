import { clamp01 } from './anim';

/**
 * Camera helpers. Everything is a pure function of the (design) frame, like the rest of the
 * project, so renders stay deterministic and parallel lanes produce identical frames.
 */

/**
 * A tiny, never-repeating sway (sum of incommensurate sines, each axis in -1..1). Scaled by the
 * caller, it keeps holds (countdown, fact, cards) from ever looking frozen.
 */
export const handheld = (frame: number) => {
  const t = frame / 60;
  const x = (Math.sin(t * 0.83) + 0.5 * Math.sin(t * 1.91 + 1.3)) / 1.5;
  const y = (Math.sin(t * 0.67 + 0.6) + 0.5 * Math.sin(t * 1.57 + 2.1)) / 1.5;
  const r = (Math.sin(t * 0.51 + 2.4) + 0.5 * Math.sin(t * 1.37)) / 1.5;
  return { x, y, r };
};

/**
 * 0 -> 1 -> 0 over a scene. Camera moves on card scenes are multiplied by this, so the camera is
 * back at identity on the first and last frame and never pops at a cut.
 */
export const bell = (frame: number, duration: number) => Math.sin(Math.PI * clamp01(frame / Math.max(1, duration)));
