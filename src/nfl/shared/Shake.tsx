import React from 'react';
import { FPS } from './clock';
import { px } from '../system';

/** Deterministic hash -> [0, 1). Same input, same output, on every render. */
export const seeded = (n: number): number => {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Photosensitivity (A3): a shake never changes direction faster than this many times per second. */
export const SHAKE_MAX_HZ = 3;
/** Default shake rate. Was a new random offset on every 30 fps tick (30 Hz). */
export const SHAKE_HZ = 2.5;

export type ShakeProps = {
  frame: number;
  /** Local frame the shake starts. */
  at: number;
  /** Shake length in ticks. Outside [at, at + dur) the child is not moved. */
  dur: number;
  /** Peak offset, 1280x720 reference units. */
  amp?: number;
  /** Changes the phase of the pattern. */
  seed?: number;
  /** Oscillation rate in Hz, clamped to SHAKE_MAX_HZ. */
  hz?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export const Shake: React.FC<ShakeProps> = ({ frame, at, dur, amp = 4, seed = 1, hz = SHAKE_HZ, children, style }) => {
  const t = frame - at;
  let transform: string | undefined;
  if (t >= 0 && t < dur) {
    const w = (2 * Math.PI * Math.min(hz, SHAKE_MAX_HZ)) / FPS; // radians per tick, smooth in t (no per-tick jumps)
    const env = Math.min(1, t / 2) * (1 - t / dur); // quick ramp in, linear fade out
    const ph = (k: number) => seeded(seed * 101 + k) * 2 * Math.PI;
    const dx = Math.sin(w * t + ph(0)) * px(amp) * env;
    const dy = Math.sin(w * t + ph(1)) * px(amp) * 0.6 * env;
    const rot = Math.sin(w * t + ph(2)) * 0.4 * env;
    transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  }
  return <div style={{ transform, ...style }}>{children}</div>;
};
