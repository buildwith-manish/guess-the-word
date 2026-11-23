/**
 * Shake.tsx — deterministic shake. Same input, same output, on every render.
 * Copied from src/gta6/components/Shake.tsx, import path fixed to ../system.
 *
 * Used for the lock-icon shake before the ink dissolve (RevealEngine).
 */
import React from 'react';
import { u } from '../system';

/** Deterministic hash -> [0, 1). */
export const seeded = (n: number): number => {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 429497296;
};

export type ShakeProps = {
  frame: number;
  /** Local frame the shake starts. */
  at: number;
  /** Shake length in frames. Outside [at, at + dur) the child is not moved. */
  dur: number;
  /** Peak offset, reference units. */
  amp?: number;
  /** Changes the pattern. */
  seed?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export const Shake: React.FC<ShakeProps> = ({ frame, at, dur, amp = 6, seed = 1, children, style }) => {
  const t = frame - at;
  let transform: string | undefined;
  if (t >= 0 && t < dur) {
    const k = Math.floor(frame);
    const env = Math.min(1, t / 2) * (1 - t / dur); // quick ramp in, linear fade out
    const dx = (seeded(k * 3 + seed * 101) - 0.5) * 2 * u(amp) * env;
    const dy = (seeded(k * 3 + 1 + seed * 101) - 0.5) * 2 * u(amp) * 0.6 * env;
    const rot = (seeded(k * 3 + 2 + seed * 101) - 0.5) * 2 * 0.4 * env;
    transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  }
  return <div style={{ transform, ...style }}>{children}</div>;
};
