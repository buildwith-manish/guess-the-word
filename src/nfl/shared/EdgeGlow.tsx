import React from 'react';
import { colors, px } from '../system';

export type EdgeGlowProps = {
  frame: number;
  /** Local frame the glow starts building. */
  at: number;
  /** Ticks to build from 0 to full (from timing.ts). */
  dur: number;
};

/** Photosensitivity (A3): peak opacities of the two layers at full. Were 0.7 (inset shadow) and 0.35 (edge tint). */
export const EDGE_GLOW_SHADOW_ALPHA = 0.25;
export const EDGE_GLOW_TINT_ALPHA = 0.12;

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
        boxShadow: `inset 0 0 ${px(53 + 147 * i)}px ${px(7 + 33 * i)}px rgba(255,69,58,${(EDGE_GLOW_SHADOW_ALPHA * i).toFixed(3)})`,
        background: `radial-gradient(120% 120% at 50% 50%, transparent 55%, ${colors.red}${Math.round(i * EDGE_GLOW_TINT_ALPHA * 255).toString(16).padStart(2, '0')} 100%)`,
      }}
    />
  );
};
