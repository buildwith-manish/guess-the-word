import React from 'react';
import type { Level } from '../data';
import { colors, textStyle, px } from '../system';
import { timerMath } from './timerMath';

export type TimerRingProps = {
  /** Local design frame (30 fps ticks). */
  frame: number;
  /** Local frame the clock starts. Nothing is drawn before it. */
  at: number;
  /** Clock length in ticks. The ring fills over this many ticks. */
  dur: number;
  /** `island` renders a Dynamic Island pill. */
  variant?: 'ring' | 'island';
  /** Level colour for the ring; red in the last 3 s. */
  level?: Level;
  /** Ring diameter (ring) or pill width (island), 1280x720 reference units. Island text is 0.15 x width: pass 160 or more. */
  size?: number;
  /** Show the seconds left. */
  digits?: boolean;
};

const R = 44;
const C = 2 * Math.PI * R;

const Ring: React.FC<{ fill: number; color: string; stroke: string; rotate?: number }> = ({ fill, color, stroke, rotate = -90 }) => (
  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${rotate}deg)` }}>
    <circle cx={50} cy={50} r={R} fill="none" stroke={stroke} strokeWidth={8} />
    <circle
      cx={50} cy={50} r={R} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
      strokeDasharray={C} strokeDashoffset={C * (1 - fill)}
    />
  </svg>
);

export const TimerRing: React.FC<TimerRingProps> = ({ frame, at, dur, variant = 'ring', level, size = 132, digits = true }) => {
  const m = timerMath(frame, at, dur);
  if (!m.started) return null;
  const accent = level ? colors.level[level] : colors.ink;
  const color = m.urgent ? colors.red : accent;
  const scale = 1 + 0.06 * m.pulse;

  if (variant === 'island') {
    const w = px(size);
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
          border: `${px(1)}px solid ${colors.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${h * 0.22}px`,
          transform: `scale(${scale + 0.03 * m.pulse})`,
          transformOrigin: 'center',
        }}
      >
        <div style={{ position: 'relative', width: ringD, height: ringD, flex: 'none' }}>
          <Ring fill={m.fill} color={color} stroke={colors.glassStrong} />
        </div>
        {digits && (
          <div style={{ ...textStyle('body'), fontSize: h * 0.5, fontWeight: 700, lineHeight: 1, color: m.urgent ? colors.red : colors.ink }}>
            {m.seconds}
          </div>
        )}
      </div>
    );
  }

  const d = px(size);
  return (
    <div style={{ position: 'relative', width: d, height: d, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <Ring fill={m.fill} color={color} stroke={colors.glassStrong} />
      {digits && (
        <div
          style={{
            ...textStyle('number'),
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: d * 0.4,
            color: m.urgent ? colors.red : colors.ink,
          }}
        >
          {m.seconds}
        </div>
      )}
    </div>
  );
};
