/**
 * gsap-helpers.js — Pattern 1.
 * ---------------------------------------------------------------------------
 * GSAP is used ONLY as a source of easing math: gsap.parseEase() gives us pure
 * (progress) => eased functions. There is no gsap.timeline(), no gsap.to(),
 * no tween targeting a DOM node. Remotion owns the clock: every scene asks for
 * `useCurrentFrame()`, this file turns that frame into an eased 0..1 value.
 *
 * Benefits: frame-perfect parallel rendering, seekable in the Studio timeline,
 * and no imperative animation state to leak between frames.
 */
// @ts-check
const { gsap } = require('gsap');

/**
 * Compile a GSAP ease string into a pure, clamped function.
 * @param {string} easeString e.g. "back.out(1.7)", "elastic.out(1,0.35)"
 * @returns {(p:number)=>number}
 */
const ease = (easeString) => {
  const compiled = typeof gsap.parseEase === 'function' ? gsap.parseEase(easeString) : null;
  if (typeof compiled !== 'function') {
    throw new Error(`Unknown GSAP ease: ${easeString}`);
  }
  return (p) => {
    const t = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
    return compiled(t);
  };
};

/** back.out — slide-ins, cards, score rows, tiles. Overshoots once, settles. */
const backOut = ease('back.out(1.7)');
/** back.in — used on exits so elements wind up before leaving. */
const backIn = ease('back.in(1.7)');
/** expo.out — crisp reveals: headlines, rules, letter blanks. */
const expoOut = ease('expo.out');
/** elastic.out — stamps: answer letters, badges, chips, result card. */
const elasticOut = ease('elastic.out(1, 0.35)');
/** elastic.out, softer tail for large surfaces. */
const elasticOutSoft = ease('elastic.out(1, 0.65)');
/** power3.out — smooth generic motion. */
const power3Out = ease('power3.out');
/** power2.inOut — symmetric moves (iris wipes). */
const power2InOut = ease('power2.inOut');
/** power1.in — gentle wind-ups. */
const power1In = ease('power1.in');
/** sine.inOut — ambient breathing. */
const sineInOut = ease('sine.inOut');
/** circ.out — heavy deceleration for big objects. */
const circOut = ease('circ.out');
/** linear — timers and countdown bars only. */
const linear = (p) => Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0));

/** Clamp to 0..1. @param {number} v */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Unclamped lerp — feed it an eased progress and it can overshoot naturally.
 * @param {number} from
 * @param {number} to
 * @param {number} p
 */
const mix = (from, to, p) => from + (to - from) * p;

/**
 * Eased progress of a frame inside [start, start + duration].
 * @param {number} frame
 * @param {number} start
 * @param {number} duration
 * @param {(p:number)=>number} [easeFn]
 */
const progress = (frame, start, duration, easeFn) => {
  const raw = clamp01((frame - start) / Math.max(1, duration));
  return easeFn ? easeFn(raw) : raw;
};

/**
 * Eased progress for the i-th item of a staggered sequence — this is how
 * stagger works without a timeline: itemStart = start + i * staggerFrames.
 * @param {number} frame
 * @param {number} start
 * @param {number} staggerFrames
 * @param {number} duration
 * @param {number} index
 * @param {(p:number)=>number} easeFn
 */
const stagger = (frame, start, staggerFrames, duration, index, easeFn) =>
  progress(frame, start + index * staggerFrames, duration, easeFn);

/**
 * Spring-like settle used by the reference HTML's spring(): translate + scale
 * + rotate returning to rest with back.out. Kept here so motion math lives in
 * one place.
 * @param {number} p eased progress
 * @param {number} fromY
 * @param {number} rotate
 */
const seatTransform = (p, fromY = 150, rotate = -35) =>
  `translate3d(0, ${mix(fromY, 0, p)}px, 0) scale(${mix(0.2, 1, p)}) rotate(${mix(rotate, 0, p)}deg)`;

module.exports = {
  ease,
  backOut,
  backIn,
  expoOut,
  elasticOut,
  elasticOutSoft,
  power3Out,
  power2InOut,
  power1In,
  sineInOut,
  circOut,
  linear,
  clamp01,
  mix,
  progress,
  stagger,
  seatTransform,
};
