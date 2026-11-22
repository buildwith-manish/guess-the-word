/**
 * CounterTick: a number that ticks from `from` to `to` (e.g. 1 to 8) over `dur` ticks, one step per equal slice, with a small
 * pop on every change and a row of dots below. The numbers come from props; nothing is written here.
 */
import React from 'react';
import type { Level } from '../data';
import { blurPx, colors, radius, textStyle, u, springAt } from '../system';
import { clamp01 } from './util';

/** The value shown at `frame`: `from` before the first slice, `to` from the last slice on. */
export const counterValue = (frame: number, at: number, dur: number, from: number, to: number): number => {
  const steps = to - from + 1;
  const p = dur > 0 ? clamp01((frame - at) / dur) : 1;
  return from + Math.min(steps - 1, Math.floor(p * steps));
};

export type CounterTickProps = {
  from: number;
  to: number;
  frame: number;
  at: number;
  /** Ticks for the whole count. */
  dur: number;
  level?: Level;
  /** Reference units. */
  size?: number;
  /** Ticks the pop on each change lasts. */
  popTicks?: number;
};

export const CounterTick: React.FC<CounterTickProps> = ({ from, to, frame, at, dur, level, size = 300, popTicks = 8 }) => {
  const enter = springAt(frame, at, 'snappy');
  if (enter <= 0) return null;
  const steps = to - from + 1;
  const value = counterValue(frame, at, dur, from, to);
  const sliceStart = at + ((value - from) * dur) / steps;
  const pop = 1 - clamp01((frame - sliceStart) / popTicks);
  const accent = level ? colors.level[level] : colors.ink;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(24), opacity: Math.min(1, enter), transform: `scale(${0.9 + 0.1 * enter})` }}>
      <div
        style={{
          width: u(size), height: u(size), borderRadius: u(radius.lg), background: colors.glass, border: `${u(1.5)}px solid ${colors.hairline}`,
          backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${1 + 0.1 * pop})`,
        }}
      >
        <span style={{ ...textStyle('number'), fontSize: u(size * 0.6), fontWeight: 800, color: accent }}>{value}</span>
      </div>
      <div style={{ display: 'flex', gap: u(12) }}>
        {Array.from({ length: steps }, (_, k) => (
          <span key={k} style={{ width: u(16), height: u(16), borderRadius: '50%', background: from + k <= value ? accent : colors.mutedStrong }} />
        ))}
      </div>
    </div>
  );
};
