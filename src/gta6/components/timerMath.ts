import { FPS } from '../timing';

/** The last this-many seconds are "urgent" (same rule as TimerBar on search-history). */
export const URGENT_SECONDS = 3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * TimerBar's math, with the ring filling instead of draining.
 * `frame`, `at`, `dur` are local design ticks (30 per second).
 */
export const timerMath = (frame: number, at: number, dur: number) => {
  const started = frame >= at;
  const elapsed = Math.min(dur, Math.max(0, frame - at));
  const left = dur - elapsed;
  const fill = dur > 0 ? clamp01(elapsed / dur) : 1;
  // whole seconds left, rounded up: 6,5,...,1 then 0 at the end (as TimerBar)
  const seconds = Math.ceil(left / FPS - 1e-9);
  const urgent = started && left <= URGENT_SECONDS * FPS;
  // ticks since the urgent window opened; the pulse restarts every second from there
  const urgentTicks = urgent ? Math.max(0, elapsed - (dur - URGENT_SECONDS * FPS)) : 0;
  const tickInSecond = urgentTicks % FPS;
  /** 1 at the start of each urgent second, easing to 0 within 10 ticks. */
  const pulse = urgent && left > 0 ? Math.pow(Math.max(0, 1 - tickInSecond / 10), 2) : 0;
  return { started, elapsed, left, fill, seconds, urgent, urgentTicks, tickInSecond, pulse };
};
