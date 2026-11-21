/**
 * TimerRing: a thin ring that shrinks with the clock, the remaining seconds in the centre (or below),
 * level-accent colour. iOS look: no halo, no pulse; the number is a quiet grey, and the ring and number turn
 * red only for the last three seconds.
 * Time comes from useDesignFrame() (design ticks, local to the enclosing Sequence); pass `frame`
 * to drive it from a parent instead. `from` and `duration` are design ticks (30 per second).
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { IOS } from '../../ios';
import { FPS } from '../state-timing';

export interface TimerRingProps {
  /** tick the clock starts */
  from: number;
  /** clock length in ticks (timerSeconds * 30, see buildQuestionPlan().timerFrames) */
  duration: number;
  /** level accent colour */
  accent: string;
  /** outer diameter in px (use px()) */
  size: number;
  /** where the seconds are drawn (default 'center') */
  digits?: 'center' | 'below' | 'none';
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** Proportions of the ring (fractions of `size`). */
const LOOK = {
  stroke: 0.016,
  digitSize: 0.24,
  digitBelowGap: 0.06,
};

/** the last three seconds of the clock turn red */
const RED_TICKS = 3 * FPS;

export const TimerRing: React.FC<TimerRingProps> = ({ from, duration, accent, size, digits = 'center', frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;

  const elapsed = Math.max(0, Math.min(duration, f - from));
  const remainingTicks = Math.max(0, duration - elapsed);
  const remainingFrac = duration > 0 ? remainingTicks / duration : 0;
  const seconds = Math.ceil(remainingTicks / FPS - 1e-6);
  const red = remainingTicks <= RED_TICKS;
  const color = red ? IOS.color.red : accent;
  const digitColor = red ? IOS.color.red : IOS.color.secondary;

  const stroke = size * LOOK.stroke;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const len = 2 * Math.PI * r;
  const arc = len * remainingFrac;

  const digitPx = size * LOOK.digitSize;
  const digitStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: size,
    textAlign: 'center',
    fontFamily: IOS.font,
    fontWeight: IOS.weight.semibold,
    fontVariantNumeric: 'tabular-nums',
    fontSize: digitPx,
    lineHeight: 1,
    color: digitColor,
    ...(digits === 'below'
      ? { top: size + size * LOOK.digitBelowGap }
      : { top: c - digitPx / 2 }),
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={IOS.color.fillStrong} strokeWidth={stroke} />
        {arc > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${len}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </svg>
      {digits !== 'none' && <div style={digitStyle}>{seconds}</div>}
    </div>
  );
};
