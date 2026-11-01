/**
 * anim.ts — the ONLY place that turns a frame + an easing function into CSS.
 * Pattern 1 in practice: gsap-helpers supplies the curves, Remotion supplies
 * the frame, this module mixes them into style values. Deterministic, pure,
 * and safe to call for any frame in any order (parallel render lanes).
 */
import {
  backOut,
  expoOut,
  power3Out,
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

/** expo.out reveal — crisp, no overshoot. */
export const revealIn = (frame: number, start: number, duration = 14, fromY = 30) => {
  const p = prog(frame, start, duration, expoOut);
  return {
    opacity: clamp01((frame - start) / Math.max(1, duration * 0.5)),
    transform: `translate3d(0, ${mix(fromY, 0, p)}px, 0)`,
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

/**
 * CSS cubic-bezier(x1, y1, x2, y2) as a pure easing function (same maths the
 * browser uses), so a Web Animations curve from the HTML can be reproduced exactly.
 */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t;
      else hi = t;
      t = (hi - lo) / 2 + lo;
      if (hi - lo < 1e-7) break;
    }
    return sy(t);
  };
};

/** The HTML's iris wipe curve: cubic-bezier(.65,0,.25,1). */
export const irisEase = cubicBezier(0.65, 0, 0.25, 1);

export { mix, clamp01 };
