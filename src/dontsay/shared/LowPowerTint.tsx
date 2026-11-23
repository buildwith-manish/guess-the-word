/**
 * LowPowerTint.tsx — iOS Low Power Mode yellow tint overlay.
 * Adapted from src/gta6/components/LowPowerTint.tsx (pattern only).
 *
 * Optional: the docx does not require Low Power Mode for any round, but it is
 * a useful iOS metaphor for warning states (e.g. a "last heart" hint if a
 * future variant wants one). Included here so task 2f (BonusWrapper) and
 * task 4a (LevelCard) can opt in without rebuilding the pattern.
 */
import React from 'react';
import { colours, u } from '../system';

export type LowPowerTintProps = {
  frame: number;
  /** Local frame the tint starts. */
  at: number;
  /** Frames to build from 0 to full. */
  dur?: number;
  /** Peak opacity 0..1 (default 0.12). */
  peak?: number;
};

export const LowPowerTint: React.FC<LowPowerTintProps> = ({ frame, at, dur = 12, peak = 0.12 }) => {
  if (frame < at) return null;
  const p = dur > 0 ? Math.min(1, (frame - at) / dur) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: colours.lowPower,
        opacity: p * peak,
      }}
    />
  );
};
