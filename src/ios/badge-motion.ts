/**
 * badge-motion.ts: the entrance of the QUIZ MATRIX watermark, as a pure function of the design frame (30 ticks per
 * second). No React, no clock: the same frame always gives the same numbers, in any render order.
 *
 * The order is the point: the logo comes in ALONE first (spring, small scale-up), then QUIZ slides out from the logo,
 * then MATRIX a beat after it. The layout never moves: the text space is reserved from the first frame, so nothing
 * jumps when the words arrive.
 */
import { spring, easeOut } from './motion';

/** Milliseconds, relative to `since` (the tick the badge first appears). */
export const BADGE_TIMING = {
  logoDelay: 200,
  logoLen: 500,
  /** the first word starts this long after the logo starts (the logo is settled by then) */
  textAfterLogo: 700,
  /** MATRIX starts this long after QUIZ */
  lineStagger: 130,
  textLen: 620,
};

/** Distance the words travel while sliding out, in 1280x720 reference units. */
export const BADGE_SLIDE = 12;

const toTicks = (ms: number) => (ms * 30) / 1000;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type BadgeMotion = {
  logo: { opacity: number; scale: number };
  /** one entry per word, top to bottom: opacity and the share of BADGE_SLIDE still to travel (1 = hidden, 0 = home) */
  words: { opacity: number; offset: number }[];
};

export const badgeMotion = (frame: number, since = 0, wordCount = 2): BadgeMotion => {
  const T = BADGE_TIMING;
  const lk = clamp01((frame - since - toTicks(T.logoDelay)) / toTicks(T.logoLen));
  const logo = { opacity: easeOut(lk * 2.2), scale: 0.82 + 0.18 * spring(lk) };
  const words = Array.from({ length: wordCount }, (_, i) => {
    const k = clamp01((frame - since - toTicks(T.logoDelay + T.textAfterLogo + i * T.lineStagger)) / toTicks(T.textLen));
    return { opacity: easeOut(k * 1.6), offset: 1 - spring(k) };
  });
  return { logo, words };
};
