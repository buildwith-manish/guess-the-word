import React from 'react';
import { colors, springAt, textStyle, u } from '../system';
import { timerMath } from './timerMath';

export type LowPowerTintProps = {
  frame: number;
  /** Local frame the tint starts fading in. */
  at: number;
  /** Frames the tint stays up (fade in 6, fade out 6 inside this). */
  dur: number;
};

/** Yellow Low Power Mode tint over the whole parent. */
export const LowPowerTint: React.FC<LowPowerTintProps> = ({ frame, at, dur }) => {
  const t = frame - at;
  if (t < 0 || t > dur) return null;
  const a = Math.min(1, t / 6) * Math.min(1, (dur - t) / 6);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: colors.lowPower,
        opacity: 0.16 * a,
        mixBlendMode: 'screen',
      }}
    />
  );
};

export type LowPowerRingProps = {
  frame: number;
  at: number;
  /** Clock length in frames (3 s = 90 for the fastest guess). */
  dur: number;
  /** Ring diameter, reference units. */
  size?: number;
  digits?: boolean;
  /** Full turns per second of the spinning head. */
  turnsPerSecond?: number;
};

const R = 44;
const C = 2 * Math.PI * R;

/** Yellow 3 s ring: fills over `dur` while the whole ring spins fast. */
export const LowPowerRing: React.FC<LowPowerRingProps> = ({ frame, at, dur, size = 200, digits = true, turnsPerSecond = 2 }) => {
  const m = timerMath(frame, at, dur);
  if (!m.started) return null;
  const enter = springAt(frame, at, 'snappy');
  const d = u(size);
  const spin = (m.elapsed / 30) * 360 * turnsPerSecond;
  return (
    <div style={{ position: 'relative', width: d, height: d, opacity: enter, transform: `scale(${0.9 + 0.1 * enter})` }}>
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${-90 + spin}deg)` }}>
        <circle cx={50} cy={50} r={R} fill="none" stroke={colors.glassStrong} strokeWidth={8} />
        <circle
          cx={50} cy={50} r={R} fill="none" stroke={colors.lowPower} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - m.fill)}
        />
      </svg>
      {digits && (
        <div style={{ ...textStyle('number'), position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: d * 0.4, color: colors.lowPower }}>
          {m.seconds}
        </div>
      )}
    </div>
  );
};
