/**
 * Waveform: silent animated bars. Heights are a pure function of `frame` (two sines per bar, phases from a hash of `seed`).
 * Draws nothing before `at`; fades in with the snappy spring. No audio.
 */
import React from 'react';
import { colors, springAt, u } from '../system';
import { hash01 } from './util';

export type WaveformProps = {
  frame: number;
  at: number;
  /** Reference units. */
  width?: number;
  height?: number;
  bars?: number;
  seed?: string | number;
  color?: string;
  /** Ticks for one wave cycle. */
  period?: number;
  /** Ticks after which the bars stop moving and settle (omit to keep moving). */
  freezeAt?: number;
};

export const Waveform: React.FC<WaveformProps> = ({ frame, at, width = 640, height = 200, bars = 32, seed = 1, color = colors.ink, period = 48, freezeAt }) => {
  const enter = springAt(frame, at, 'snappy');
  if (enter <= 0) return null;
  const f = freezeAt === undefined ? frame : Math.min(frame, freezeAt);
  const t = (f - at) / period;
  return (
    <div style={{ width: u(width), height: u(height), display: 'flex', alignItems: 'center', gap: u(width / bars / 2.5), opacity: Math.min(1, enter) }}>
      {Array.from({ length: bars }, (_, k) => {
        const a = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t + hash01(seed, k)));
        const b = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * 1.7 - hash01(seed, k + 100)));
        const h = (0.15 + 0.85 * (0.6 * a + 0.4 * b)) * enter;
        return <span key={k} style={{ flex: 1, height: `${h * 100}%`, borderRadius: u(6), background: color, opacity: 0.9 }} />;
      })}
    </div>
  );
};
