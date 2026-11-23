/**
 * EdgeGlow.tsx — red glow around the screen edge that builds from `at` over
 * `dur` and stays at full after. Fill the parent.
 *
 * Adapted from src/gta6/components/EdgeGlow.tsx. Default dur = 60 ticks (2 s
 * at 30 fps), matching the docx "turns red under 2 s".
 */
import React from 'react';
import { SYSTEM, u } from '../system';

export type EdgeGlowProps = {
  frame: number;
  /** Local frame the glow starts building (the start of the last 2 s). */
  at: number;
  /** Frames to build from 0 to full. Defaults to 60 (2 s at 30 fps ticks). */
  dur?: number;
};

export const EdgeGlow: React.FC<EdgeGlowProps> = ({ frame, at, dur = 60 }) => {
  if (frame < at) return null;
  const p = dur > 0 ? Math.min(1, (frame - at) / dur) : 1;
  const i = Math.pow(p, 1.6);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        boxShadow: `inset 0 0 ${u(80 + 220 * i)}px ${u(10 + 50 * i)}px rgba(255,59,48,${(0.7 * i).toFixed(3)})`,
        background: `radial-gradient(120% 120% at 50% 50%, transparent 55%, ${SYSTEM.red}${Math.round(i * 0.35 * 255).toString(16).padStart(2, '0')} 100%)`,
      }}
    />
  );
};
