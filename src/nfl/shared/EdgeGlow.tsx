import React from 'react';
import { colors, px } from '../system';

export type EdgeGlowProps = {
  frame: number;
  /** Local frame the glow starts building. */
  at: number;
  /** Ticks to build from 0 to full (from timing.ts). */
  dur: number;
};

/** Red glow around the screen edge that builds from `at` over `dur` and stays at full after. Fill the parent. */
export const EdgeGlow: React.FC<EdgeGlowProps> = ({ frame, at, dur }) => {
  if (frame < at) return null;
  const p = dur > 0 ? Math.min(1, (frame - at) / dur) : 1;
  const i = Math.pow(p, 1.6);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        boxShadow: `inset 0 0 ${px(53 + 147 * i)}px ${px(7 + 33 * i)}px rgba(255,69,58,${(0.7 * i).toFixed(3)})`,
        background: `radial-gradient(120% 120% at 50% 50%, transparent 55%, ${colors.red}${Math.round(i * 0.35 * 255).toString(16).padStart(2, '0')} 100%)`,
      }}
    />
  );
};
