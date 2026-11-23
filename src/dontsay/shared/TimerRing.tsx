/**
 * TimerRing.tsx — countdown as a ring or a Dynamic Island pill.
 * Adapted from src/gta6/components/TimerRing.tsx.
 *
 * The island variant is the default for DontSay (the docx calls for a Dynamic
 * Island-style pill under the prompt). It turns red under 2 s (URGENT_SECONDS
 * in timerMath.ts) and the EdgeGlow red pulse beats on every remaining frame.
 */
import React from 'react';
import type { Level } from '../data';
import { colours, SYSTEM, textStyle, u } from '../system';
import { timerMath } from './timerMath';

export type TimerRingProps = {
  /** Local design frame (30 fps ticks). */
  frame: number;
  /** Local frame the clock starts. Nothing is drawn before it. */
  at: number;
  /** Clock length in frames. The ring fills over this many frames. */
  dur: number;
  /** `island` renders a Dynamic Island pill (default). `ring` renders a circle. */
  variant?: 'ring' | 'island';
  /** Level colour for the ring; red in the last 2 s. */
  level?: Level;
  /** Ring diameter (ring) or pill width (island), 1920x1080 reference units. */
  size?: number;
  /** Show the seconds left. */
  digits?: boolean;
};

const R = 44;
const C = 2 * Math.PI * R;

const Ring: React.FC<{ fill: number; color: string; stroke: string; rotate?: number }> = ({
  fill, color, stroke, rotate = -90,
}) => (
  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${rotate}deg)` }}>
    <circle cx={50} cy={50} r={R} fill="none" stroke={stroke} strokeWidth={8} />
    <circle
      cx={50} cy={50} r={R} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
      strokeDasharray={C} strokeDashoffset={C * (1 - fill)}
    />
  </svg>
);

export const TimerRing: React.FC<TimerRingProps> = ({
  frame, at, dur, variant = 'island', level, size = 220, digits = true,
}) => {
  const m = timerMath(frame, at, dur);
  if (!m.started) return null;
  const accent = level ? colours.level[level] : colours.ink;
  const color = m.urgent ? SYSTEM.red : accent;
  const scale = 1 + 0.06 * m.pulse;

  if (variant === 'island') {
    const w = u(size);
    const h = w * 0.3;
    const ringD = h * 0.62;
    return (
      <div
        style={{
          boxSizing: 'border-box',
          width: w,
          height: h,
          borderRadius: h / 2,
          background: '#000',
          border: `${u(1.5)}px solid ${colours.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${h * 0.22}px`,
          transform: `scale(${scale + 0.03 * m.pulse})`,
          transformOrigin: 'center',
        }}
      >
        <div style={{ position: 'relative', width: ringD, height: ringD, flex: 'none' }}>
          <Ring fill={m.fill} color={color} stroke={colours.glassStrong} />
        </div>
        {digits && (
          <div style={{
            ...textStyle('number'),
            fontSize: h * 0.5,
            fontWeight: 800,
            lineHeight: 1,
            color: m.urgent ? SYSTEM.red : colours.ink,
          }}>
            {m.seconds}
          </div>
        )}
      </div>
    );
  }

  const d = u(size);
  return (
    <div style={{ position: 'relative', width: d, height: d, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <Ring fill={m.fill} color={color} stroke={colours.glassStrong} />
      {digits && (
        <div style={{
          ...textStyle('number'),
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: d * 0.4,
          color: m.urgent ? SYSTEM.red : colours.ink,
        }}>
          {m.seconds}
        </div>
      )}
    </div>
  );
};
