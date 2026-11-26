/**
 * levelCard.ts — the level-card app-launch transition.
 *
 * An iOS app launching from a home-screen icon: the card starts small at a
 * position (the "icon"), springs up to full size without overshoot, and the
 * background dims behind it. Adapted from the level-card transition helpers
 * in src/gta6 (pattern only — the gta6 version is inlined in LevelCard.tsx;
 * this extracts the math so task 4a can call it without forking).
 *
 * All values are functions of `frame - at` (local design ticks, 30 fps).
 */
import { FRAME, springAt, u } from '../system';

export type LevelCardLaunch = {
  /** 0..1 spring progress of the zoom. */
  p: number;
  /** Transform string: scale + translate from the icon origin to centre. */
  transform: string;
  /** 0..1 opacity (fades in over the first 6 ticks). */
  opacity: number;
  /** 0..1 background dim behind the card. */
  dim: number;
};

/**
 * @param frame  local design frame
 * @param at     local start frame
 * @param origin icon centre in reference units (default: bottom-right, like a
 *               home-screen icon). The card launches from here to the frame centre.
 */
export const levelCardLaunch = (
  frame: number,
  at: number,
  origin: { x: number; y: number } = { x: FRAME.w * 0.82, y: FRAME.h * 0.82 },
): LevelCardLaunch => {
  const p = springAt(frame, at, 'soft'); // no overshoot: a scaled-up card must not pass the safe area
  const cx = FRAME.w / 2;
  const cy = FRAME.h / 2;
  // interpolate position from icon origin to frame centre
  const x = origin.x + (cx - origin.x) * p;
  const y = origin.y + (cy - origin.y) * p;
  // scale from 0.08 (icon-sized) to 1.0
  const scale = 0.08 + 0.92 * p;
  const opacity = Math.min(1, (frame - at) / 6);
  const dim = Math.min(1, (frame - at) / 12) * 0.5;
  return {
    p,
    transform: `translate(${u(x) - u(cx)}px, ${u(y) - u(cy)}px) scale(${scale})`,
    opacity,
    dim,
  };
};

/**
 * The level card's exit: spring down toward the icon origin over `outLen` ticks
 * at the end of the card's `dur`. Mirrors the launch in reverse.
 */
export const levelCardExit = (
  frame: number,
  at: number,
  dur: number,
  outLen: number,
  origin: { x: number; y: number } = { x: FRAME.w * 0.82, y: FRAME.h * 0.82 },
): { transform: string; opacity: number } => {
  const exitAt = at + dur - outLen;
  const p = springAt(frame, exitAt, 'snappy');
  const cx = FRAME.w / 2;
  const cy = FRAME.h / 2;
  const x = cx + (origin.x - cx) * p;
  const y = cy + (origin.y - cy) * p;
  const scale = 1 - 0.92 * p;
  return {
    transform: `translate(${u(x) - u(cx)}px, ${u(y) - u(cy)}px) scale(${scale})`,
    opacity: 1 - p,
  };
};
