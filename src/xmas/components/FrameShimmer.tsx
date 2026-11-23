import React from 'react';
import type { CSSProperties } from 'react';
import { FRAME_BORDER, REF, frameBorderStyle, useXmasFrame } from '../system';

/**
 * FrameShimmer: one faint highlight that travels once around the frame border during the slot.
 * It reuses the ring geometry of frameBorderStyle() (same inset, radius, width and ring mask) and only swaps the
 * background for a narrow conic highlight, so it sits exactly on top of the existing border. frameBorderStyle is not edited.
 * Local tick 0 = the slot's first tick (place it inside the scene). Deterministic from the frame.
 */

export const SHIMMER = {
  /** tick at which the highlight starts its lap */
  startTick: 12,
  /** length of the lap in ticks (4 s) */
  lapTicks: 120,
  /** the highlight is about this long along the border, reference units */
  lengthUnits: 190,
  /** peak opacity of the whole layer (faint) */
  peak: 0.7,
  /** ticks to fade in at the start and out at the end of the lap */
  fadeTicks: 10,
} as const;

/** Where the highlight centre sits on the frame border for lap progress p (0..1), clockwise from the top-centre. */
export const perimeterPoint = (p: number): { dx: number; dy: number } => {
  const w = REF.w - 2 * FRAME_BORDER.inset;
  const h = REF.h - 2 * FRAME_BORDER.inset;
  const perim = 2 * (w + h);
  // start at the top-centre, so the first segment is half the top side
  let d = (p * perim + w / 2) % perim;
  if (d < w) return { dx: d - w / 2, dy: -h / 2 };
  d -= w;
  if (d < h) return { dx: w / 2, dy: d - h / 2 };
  d -= h;
  if (d < w) return { dx: w / 2 - d, dy: h / 2 };
  d -= w;
  return { dx: -w / 2, dy: h / 2 - d };
};

/** CSS conic-gradient (0deg = up, clockwise) of the highlight at lap progress p, in the given RGB colour. */
export const shimmerGradient = (p: number, rgb: string): string => {
  const { dx, dy } = perimeterPoint(p);
  const centre = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  const dist = Math.max(60, Math.hypot(dx, dy));
  // half the arc length seen from the frame centre; keeps the highlight about lengthUnits long on every side
  const half = Math.min(40, (Math.atan2(SHIMMER.lengthUnits / 2, dist) * 180) / Math.PI);
  // rotate the gradient so its peak (at 180deg inside the gradient) lands on `centre`; the stops then never wrap past 0 or 360
  const from = (centre + 180) % 360;
  const clear = `rgba(${rgb},0)`;
  return `conic-gradient(from ${from.toFixed(2)}deg at 50% 50%, ${clear} 0deg, ${clear} ${(180 - half).toFixed(2)}deg, rgba(${rgb},0.95) 180deg, ${clear} ${(180 + half).toFixed(2)}deg, ${clear} 360deg)`;
};

export type FrameShimmerProps = {
  /** RGB triple of the highlight, default a soft gold. The bonus scene passes a paler gold so it shows on its gold border. */
  rgb?: string;
  /** tick the lap starts at (default SHIMMER.startTick) */
  startTick?: number;
};

export const FrameShimmer: React.FC<FrameShimmerProps> = ({ rgb = '255,214,120', startTick = SHIMMER.startTick }) => {
  const t = useXmasFrame();
  const p = (t - startTick) / SHIMMER.lapTicks;
  if (p < 0 || p > 1) return null;
  const f = SHIMMER.fadeTicks / SHIMMER.lapTicks;
  const env = Math.min(1, p / f, (1 - p) / f);
  const style: CSSProperties = {
    ...frameBorderStyle(),
    background: shimmerGradient(p, rgb),
    opacity: SHIMMER.peak * env,
  };
  return <div style={style} />;
};

export default FrameShimmer;
