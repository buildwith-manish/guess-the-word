/**
 * timerMath.ts — countdown math for the Dynamic Island pill.
 * Adapted from src/gta6/components/timerMath.ts.
 *
 * Change for DontSay: URGENT_SECONDS = 2 (the docx says the countdown turns red
 * under 2 s, not 3 s as in GTA 6).
 *
 * `frame`, `at`, `dur` are local design ticks (30 per second).
 */
import { FPS } from '../timing';

/** The last this-many seconds are "urgent" (countdown turns red, EdgeGlow beats). */
export const URGENT_SECONDS = 2;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const timerMath = (frame: number, at: number, dur: number) => {
  const started = frame >= at;
  const elapsed = Math.min(dur, Math.max(0, frame - at));
  const left = dur - elapsed;
  // Ring fills as time elapses (0 -> 1).
  const fill = dur > 0 ? clamp01(elapsed / dur) : 1;
  // Whole seconds left, rounded up: 5,4,...,1 then 0 at the end.
  const seconds = Math.ceil(left / FPS - 1e-9);
  const urgent = started && left <= URGENT_SECONDS * FPS;
  const urgentTicks = urgent ? Math.max(0, elapsed - (dur - URGENT_SECONDS * FPS)) : 0;
  const tickInSecond = urgentTicks % FPS;
  /** 1 at the start of each urgent second, easing to 0 within 10 ticks. */
  const pulse = urgent && left > 0 ? Math.pow(Math.max(0, 1 - tickInSecond / 10), 2) : 0;
  return { started, elapsed, left, fill, seconds, urgent, urgentTicks, tickInSecond, pulse };
};
