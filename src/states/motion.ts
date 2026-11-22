/**
 * motion.ts: the ONE motion language of the States video (Video 4). Every States component takes its springs, staggers,
 * easings and durations from here, so the whole video has one feel. States-only: src/anim.ts and src/ios/motion.ts are
 * not changed (the word quiz and the pixel video keep using them); Step 2 moves the States scenes over to this file.
 *
 * Pure functions of the frame (no Date / Math.random, no CSS transitions, no state). Time is in design ticks (30 per
 * second, FPS from ../timing); the 60 fps output samples these curves twice per tick.
 *
 * WHICH PRESET WHEN
 *   quick   small UI: chips, pills, badges, option chips, voice bars, the HUD pill, rank / scoreboard rows
 *   normal  cards and panels: the answer card, level card demo frame, reminder pop-up, end-screen copy, bonus stamp
 *   slow    hero moments: level title, hook shapes landing, the title lockup, the bonus banner, "your score" headline
 *   settle  (helper) a tiny scale overshoot for a single "arrival" (a stamp, the ready ring); never above 1.03
 * Entrances: spr() drives a translate of 10-24 px + a fade + scale 0.97 -> 1 (see enter()). Exits: about 70% of the
 * entrance, iosOut easing, no bounce (see leave()). Overlap moves: start the next one while the previous settles
 * (stagger gaps of 2-3 ticks, 40-80 ms). Every move must finish inside its existing window (plan.stamp, plan.exit,
 * plan.duration, the iris lead): this file never changes a duration of the timeline.
 *
 * KNOBS: everything tunable is in SPRINGS, STAGGER, DUR, IOS_OUT and SETTLE below.
 */
import { Easing, measureSpring, spring } from 'remotion';
import { FPS } from '../timing';
import { px } from '../style';

// ------------------------------------------------------------------ knobs
export interface SpringPreset {
  damping: number;
  stiffness: number;
  mass: number;
}

/** Spring presets (Remotion spring config). Damping ratios: quick 0.88, normal 0.95, slow 1.47, so overshoot is under 1%. */
export const SPRINGS = {
  quick: { damping: 26, stiffness: 220, mass: 1 },
  normal: { damping: 24, stiffness: 160, mass: 1 },
  slow: { damping: 28, stiffness: 90, mass: 1 },
} as const satisfies Record<string, SpringPreset>;
export type SpringName = keyof typeof SPRINGS;

/** Gap between related elements, ticks (2 = 67 ms, 3 = 100 ms at 30 ticks/s; the brief asks for 40-80 ms, so 2 by default). */
export const STAGGER = { min: 2, max: 3, default: 2 };

/** Duration constants, ticks. UI moves 9-15, hero moves 18-27. */
export const DUR = {
  ui: 12,
  uiShort: 9,
  uiLong: 15,
  hero: 22,
  heroShort: 18,
  heroLong: 27,
  /** exits take this share of the matching entrance */
  exitShare: 0.7,
} as const;

/** Soft ease-out for fades and wipes: cubic-bezier(0.22, 1, 0.36, 1). */
export const IOS_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * FLIGHT (answer-screen hero move): the stage shape flies into its slot in the growing answer map.
 *   arc          arc height as a fraction of the travel distance (FlyIn.ARC; 0.25 is the old default)
 *   fillAt       the map's own piece starts fading to its accent fill at this share (0..1) of the flight
 *   glowFade     ticks the hint-region glow takes to fade out on the answer map, from plan.revealStart
 *   outlineIn    ticks the map's `current` outline takes to fade in after the stamp
 *   settlePeak   scale peak of the landing pulse on the arrived piece (<= SETTLE.maxPeak), settleTicks its length
 * Every move finishes inside the existing reveal / hold windows; none of these change a duration of the timeline.
 */
export const FLIGHT = { arc: 0.25, fillAt: 0.7, glowFade: 6, outlineIn: 4, settlePeak: 1.02, settleTicks: 14 } as const;

/** Largest scale a settle() may reach. */
export const SETTLE = { maxPeak: 1.03 };

// ------------------------------------------------------------------ helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const iosOutFn = Easing.bezier(IOS_OUT[0], IOS_OUT[1], IOS_OUT[2], IOS_OUT[3]);

/** iosOut easing of a 0..1 progress (fades, wipes, exits). */
export const iosOut = (t: number): number => iosOutFn(clamp01(t));

/** Spring progress 0..1 of `preset` that starts at tick `start` (0 before it, 1 once it has settled). */
export const spr = (frame: number, start: number, preset: SpringName = 'normal'): number => {
  const t = frame - start;
  if (t <= 0) return 0;
  const v = spring({ frame: t, fps: FPS, config: SPRINGS[preset] });
  return v;
};

/** Ticks a preset needs to settle (within 0.1% of its end value); use it to check a move fits its window. */
export const settleTicks = (preset: SpringName): number => measureSpring({ fps: FPS, config: SPRINGS[preset], threshold: 0.001 });

/** Start offset of the index-th element of a staggered group. `gap` is clamped to 2-3 ticks. */
export const stagger = (index: number, gap: number = STAGGER.default): number => index * Math.min(STAGGER.max, Math.max(STAGGER.min, gap));

/** Exit length for an entrance of `entranceTicks`: about 70%, at least 1 tick. */
export const exitTicks = (entranceTicks: number): number => Math.max(1, Math.round(entranceTicks * DUR.exitShare));

/** A tiny arrival overshoot: scale 1 -> peak -> 1 over `dur` ticks starting at `start`. `peak` is capped at 1.03. */
export const settle = (frame: number, start: number, dur: number, peak = 1.02): number => {
  const t = clamp01((frame - start) / Math.max(1, dur));
  return 1 + (Math.min(peak, SETTLE.maxPeak) - 1) * Math.sin(Math.PI * iosOut(t));
};

export interface Enter {
  /** 0..1 spring progress */
  t: number;
  opacity: number;
  /** translate + scale to put in `transform` */
  transform: string;
}

/**
 * The standard entrance: spring translate (`dist` reference px, 10-24) + fade + scale 0.97 -> 1.
 * The fade runs ahead of the move (full at about 70% of the spring) so text is readable early.
 */
export const enter = (frame: number, start: number, preset: SpringName = 'normal', dist = 16, scaleFrom = 0.97): Enter => {
  const t = spr(frame, start, preset);
  const d = Math.min(24, Math.max(10, dist));
  return {
    t,
    opacity: Math.min(1, t * 1.4),
    transform: `translateY(${(1 - t) * px(d)}px) scale(${scaleFrom + (1 - scaleFrom) * t})`,
  };
};

export interface Leave {
  /** 0..1 how far the exit has run */
  t: number;
  opacity: number;
  transform: string;
}

/** The standard exit: iosOut fade + a short move up/down of `dist` px, over `dur` ticks (give exitTicks(entrance)). No bounce. */
export const leave = (frame: number, start: number, dur: number, dist = 10): Leave => {
  const t = iosOut((frame - start) / Math.max(1, dur));
  return { t, opacity: 1 - t, transform: `translateY(${-t * px(dist)}px) scale(${1 - 0.02 * t})` };
};

/**
 * Spring progress that reaches exactly 1 at `start + dur`: for moves with a fixed window (outline draw, map move, shape
 * flight) where the timeline must not change. It eases in AND out (a spring starts at zero speed), unlike iosOut, which
 * starts at full speed and is only for fades, wipes and exits. Windows shorter than the preset's settle time end a
 * little early on a slightly steeper tail; give travel moves 18+ ticks.
 */
export const sprFit = (frame: number, start: number, dur: number, preset: SpringName = 'normal'): number => {
  const v = spr(frame, start, preset);
  const end = spr(start + Math.max(1, dur), start, preset);
  return clamp01(end > 0 ? v / end : v);
};
