import React from 'react';
import type { CSSProperties } from 'react';
import { REF, px, useXmasFrame } from '../system';

/**
 * Snow: a light, slow snowfall of soft, out-of-focus dots on the background layer (small far flakes plus a few larger, softer near ones).
 * Deterministic: positions come from a seeded generator and the time comes from the frame, so every render is identical.
 * Place it BEHIND the tiles, caption and timer (right after the bokeh layer); it never draws over text.
 * Units: reference units (1280x720) through px(). Time: design ticks (30 per second) from useXmasFrame.
 */

export const SNOW = {
  count: 44,
  /** radius range in reference units (tiny) */
  rMin: 1.8,
  rMax: 7,
  /** fall speed in reference units per second (slow) */
  speedMin: 9,
  speedMax: 24,
  /** sideways sway: amplitude (units) and period (seconds) */
  swayAmp: 9,
  periodMin: 7,
  periodMax: 13,
  /** peak opacity range (low) */
  alphaMin: 0.2,
  alphaMax: 0.5,
  /** dots wrap this far above and below the frame so they never pop in view */
  margin: 16,
} as const;

type Flake = { x: number; y0: number; r: number; speed: number; alpha: number; amp: number; period: number; phase: number };

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const FLAKES: Flake[] = (() => {
  const rnd = mulberry32(1225);
  return Array.from({ length: SNOW.count }, () => ({
    x: rnd() * REF.w,
    y0: rnd() * (REF.h + SNOW.margin * 2),
    r: SNOW.rMin + rnd() * (SNOW.rMax - SNOW.rMin),
    speed: SNOW.speedMin + rnd() * (SNOW.speedMax - SNOW.speedMin),
    alpha: SNOW.alphaMin + rnd() * (SNOW.alphaMax - SNOW.alphaMin),
    amp: SNOW.swayAmp * (0.5 + rnd() * 0.5),
    period: SNOW.periodMin + rnd() * (SNOW.periodMax - SNOW.periodMin),
    phase: rnd() * Math.PI * 2,
  }));
})();

/** Style of one flake at time `seconds`. A soft radial dot (no blur filter), so it reads as out of focus. */
export const flakeStyle = (f: Flake, seconds: number): CSSProperties => {
  const span = REF.h + SNOW.margin * 2;
  const y = ((f.y0 + f.speed * seconds) % span) - SNOW.margin;
  const x = f.x + Math.sin((2 * Math.PI * seconds) / f.period + f.phase) * f.amp;
  // fade near the wrap edges so a dot never appears or vanishes abruptly
  const edge = Math.min(1, Math.max(0, Math.min(y + SNOW.margin, REF.h + SNOW.margin - y) / SNOW.margin));
  return {
    position: 'absolute',
    left: px(x - f.r),
    top: px(y - f.r),
    width: px(f.r * 2),
    height: px(f.r * 2),
    borderRadius: '50%',
    opacity: edge,
    background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${f.alpha}) 0%, rgba(255,255,255,${f.alpha * 0.6}) 45%, rgba(255,255,255,0) 100%)`,
    pointerEvents: 'none',
  };
};

export const Snow: React.FC = () => {
  const seconds = useXmasFrame() / 30;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {FLAKES.map((f, i) => (
        <div key={i} style={flakeStyle(f, seconds)} />
      ))}
    </div>
  );
};

export default Snow;
