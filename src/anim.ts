/**
 * anim.ts — the ONLY place that turns a frame + an easing function into CSS.
 * Pattern 1 in practice: gsap-helpers supplies the curves, Remotion supplies
 * the frame, this module mixes them into style values. Deterministic, pure,
 * and safe to call for any frame in any order (parallel render lanes).
 */
import {
  backOut,
  backIn,
  expoOut,
  elasticOut,
  power3Out,
  power2InOut,
  sineInOut,
  linear,
  clamp01,
  mix,
} from './gsap-helpers';

type Ease = (p: number) => number;

/** Eased progress of `frame` inside [start, start + duration]. */
export const prog = (frame: number, start: number, duration: number, easeFn: Ease = linear) =>
  easeFn(clamp01((frame - start) / Math.max(1, duration)));

/** Fade 0 -> 1. */
export const fadeIn = (frame: number, start: number, duration = 12) =>
  clamp01((frame - start) / Math.max(1, duration));

/** Fade 1 -> 0. */
export const fadeOut = (frame: number, start: number, duration = 12) =>
  1 - fadeIn(frame, start, duration);

export type SlideOpts = {
  duration?: number;
  fromY?: number;
  fromX?: number;
  rotate?: number;
  scaleFrom?: number;
  ease?: Ease;
};

/** back.out seat: the reference HTML's spring() (translate + scale + rotate). */
export const slideIn = (frame: number, start: number, opts: SlideOpts = {}) => {
  const {
    duration = 27,
    fromY = 150,
    fromX = 0,
    rotate = -35,
    scaleFrom = 0.2,
    ease = backOut,
  } = opts;
  const p = prog(frame, start, duration, ease);
  return {
    opacity: clamp01((frame - start) / Math.max(1, duration * 0.33)),
    transform: `translate3d(${mix(fromX, 0, p)}px, ${mix(fromY, 0, p)}px, 0) scale(${mix(scaleFrom, 1, p)}) rotate(${mix(rotate, 0, p)}deg)`,
    p,
  };
};

/** expo.out reveal — crisp, no overshoot. */
export const revealIn = (frame: number, start: number, duration = 14, fromY = 30) => {
  const p = prog(frame, start, duration, expoOut);
  return {
    opacity: clamp01((frame - start) / Math.max(1, duration * 0.5)),
    transform: `translate3d(0, ${mix(fromY, 0, p)}px, 0)`,
    p,
  };
};

/** elastic.out stamp — badges, chips, answer letters. */
export const stampIn = (frame: number, start: number, duration = 20, fromScale = 0.35) => {
  const p = prog(frame, start, duration, elasticOut);
  return {
    opacity: clamp01((frame - start) / Math.max(1, Math.min(8, duration))),
    transform: `scale(${mix(fromScale, 1, p)})`,
    p,
  };
};

/** slam: scale 2.8 + blur 14px -> 0.93 dip -> 1 (hook + end-screen headlines). */
export const slamIn = (frame: number, start: number, duration = 16) => {
  const raw = clamp01((frame - start) / Math.max(1, duration));
  const settle = prog(frame, start, duration * 0.68, power3Out);
  const bounce = prog(frame, start + duration * 0.68, duration * 0.32, backOut);
  const scale = raw < 0.68 ? mix(2.8, 0.93, settle) : mix(0.93, 1, bounce);
  return {
    // fade like slam(): visible within the first frames, never "black on black"
    opacity: clamp01((frame - start) / 3),
    transform: `scale(${scale})`,
    filter: `blur(${mix(14, 0, clamp01(raw / 0.68))}px)`,
    raw,
  };
};

/** Gentle idle float (emoji hover, badge bob). */
export const floatY = (frame: number, amplitude = 8, periodFrames = 72, phase = 0) =>
  Math.sin(((frame + phase) / periodFrames) * Math.PI * 2) * amplitude;

/** 0..1 breathing value for glows. */
export const breathe = (frame: number, periodFrames = 102) =>
  0.5 + 0.5 * sineInOut(((frame % periodFrames) / periodFrames));

/** A hairline growing from its left edge. */
export const lineGrow = (frame: number, start: number, duration = 13, from = 0) =>
  `scaleX(${mix(from, 1, prog(frame, start, duration, expoOut))})`;

/** Countdown fill — strictly linear; an easing curve on a clock lies. */
export const linearScaleX = (frame: number, start: number, duration: number) =>
  `scaleX(${1 - clamp01((frame - start) / Math.max(1, duration))})`;

/** Iris wipe progress (power2.inOut mirrors cubic-bezier(.65,0,.25,1)). */
export const irisProgress = (frame: number, start: number, duration: number) =>
  prog(frame, start, duration, power2InOut);

/** Exit: wind up with back.in, then leave. */
export const exitUp = (frame: number, start: number, duration = 12, distance = 40) => {
  const p = prog(frame, start, duration, backIn);
  return {
    opacity: 1 - clamp01(p),
    transform: `translate3d(0, ${-distance * p}px, 0) scale(${1 - 0.15 * p})`,
    p,
  };
};

export const eases = { backOut, backIn, expoOut, elasticOut, power3Out, power2InOut, sineInOut, linear };
export { mix, clamp01 };
