import React from 'react';
import { COAST_PATH, LAND_PATH } from '../scenes/looks/mapsArt';
import { DroppedPin, PinLabel } from './pinParts';
import { colors, u } from '../system';

/** Outline view box in mapsArt coordinates. */
export const OUTLINE_VIEW = { x: -50, y: -50, w: 1350, h: 1150 } as const;

export type MapOutlineProps = {
  frame: number;
  /** Local frame the outline starts drawing. */
  at: number;
  /** Frames for the coast line to draw (default 36). */
  dur?: number;
  /** Pin tip in mapsArt coordinates (e.g. one of TOWNS). */
  pin: { x: number; y: number };
  /** Local frame the pin drops. Default `at + dur`. */
  pinAt?: number;
  label?: string;
  width?: number;
  height?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * The invented Florida-like coast (mapsArt.ts) drawing itself, land filling in as it completes, then a pin drops.
 * Invented art: not traced from any real map.
 */
export const MapOutline: React.FC<MapOutlineProps> = ({ frame, at, dur = 36, pin, pinAt, label, width = 760, height = 900 }) => {
  const p = clamp01((frame - at) / Math.max(1, dur));
  const fill = clamp01((p - 0.6) / 0.4);
  const k = Math.min(width / OUTLINE_VIEW.w, height / OUTLINE_VIEW.h);
  const ox = (width - OUTLINE_VIEW.w * k) / 2 - OUTLINE_VIEW.x * k;
  const oy = (height - OUTLINE_VIEW.h * k) / 2 - OUTLINE_VIEW.y * k;
  const px = pin.x * k + ox;
  const py = pin.y * k + oy;
  const dropAt = pinAt ?? at + dur;
  return (
    <div style={{ position: 'relative', width: u(width), height: u(height) }}>
      <svg viewBox={`${OUTLINE_VIEW.x} ${OUTLINE_VIEW.y} ${OUTLINE_VIEW.w} ${OUTLINE_VIEW.h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
        <path d={LAND_PATH} fill={`rgba(255,159,10,${0.16 * fill})`} />
        <path d={COAST_PATH} pathLength={1} fill="none" stroke={colors.medium} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
      </svg>
      <div style={{ position: 'absolute', left: u(px), top: u(py), width: 0, height: 0 }}>
        <DroppedPin frame={frame} at={dropAt} />
      </div>
      {label ? (
        <div style={{ position: 'absolute', left: u(px + 50), top: u(py - 96) }}>
          <PinLabel text={label} frame={frame} at={dropAt + 6} />
        </div>
      ) : null}
    </div>
  );
};
