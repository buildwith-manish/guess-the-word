/**
 * TimerRing: a ring that shrinks with the clock, the remaining seconds in the centre (or below),
 * level-accent colour, red in the last second, and a pulse on every whole second.
 * Time comes from useDesignFrame() (design ticks, local to the enclosing Sequence); pass `frame`
 * to drive it from a parent instead. `from` and `duration` are design ticks (30 per second).
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { COLORS, FONTS } from '../../style';
import { ms } from '../../anim';
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

/** Proportions of the ring (fractions of `size`) and the pulse. */
const LOOK = {
  stroke: 0.028,
  trackAlpha: 0.14,
  /** halo layers: stroke width (x stroke) and opacity, widest first */
  halo: [
    { k: 4.5, a: 0.07 },
    { k: 2.6, a: 0.14 },
  ],
  digitSize: 0.3,
  digitBelowGap: 0.06,
  /** pulse length in ms, and how much the digits / halo grow at its peak */
  pulseMs: 220,
  pulseScale: 0.2,
  pulseHalo: 1.6,
};

/** the last second of the clock turns red */
const RED_TICKS = FPS;

export const TimerRing: React.FC<TimerRingProps> = ({ from, duration, accent, size, digits = 'center', frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;

  const elapsed = Math.max(0, Math.min(duration, f - from));
  const remainingTicks = Math.max(0, duration - elapsed);
  const remainingFrac = duration > 0 ? remainingTicks / duration : 0;
  const seconds = Math.ceil(remainingTicks / FPS - 1e-6);
  const red = remainingTicks <= RED_TICKS;
  const color = red ? COLORS.red : accent;

  // pulse: once per whole second elapsed (not at the very start), decays over pulseMs
  const raw = f - from;
  const running = raw > 0 && raw < duration;
  const whole = Math.floor(raw / FPS);
  const phase = raw - whole * FPS;
  const pulseTicks = ms(LOOK.pulseMs);
  const pulse = running && whole >= 1 ? Math.pow(Math.max(0, 1 - phase / pulseTicks), 2) : 0;

  const stroke = size * LOOK.stroke;
  const r = (size - stroke * (1 + LOOK.halo[0].k)) / 2; // room for the widest halo
  const c = size / 2;
  const len = 2 * Math.PI * r;
  const arc = len * remainingFrac;

  const ringPath = (width: number, opacity: number, key: string) => (
    <circle
      key={key}
      cx={c}
      cy={c}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeOpacity={opacity}
      strokeLinecap="round"
      strokeDasharray={`${arc} ${len}`}
      transform={`rotate(-90 ${c} ${c})`}
    />
  );

  const digitPx = size * LOOK.digitSize;
  const digitStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: size,
    textAlign: 'center',
    fontFamily: FONTS.display,
    fontSize: digitPx,
    lineHeight: 1,
    color,
    transform: `scale(${1 + LOOK.pulseScale * pulse})`,
    transformOrigin: '50% 50%',
    ...(digits === 'below'
      ? { top: size + size * LOOK.digitBelowGap }
      : { top: c - digitPx / 2 }),
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={COLORS.ink} strokeOpacity={LOOK.trackAlpha} strokeWidth={stroke} />
        {arc > 0 && LOOK.halo.map((h, i) => ringPath(stroke * h.k, Math.min(1, h.a * (1 + (LOOK.pulseHalo - 1) * pulse)), `h${i}`))}
        {arc > 0 && ringPath(stroke, 1, 'core')}
      </svg>
      {digits !== 'none' && <div style={digitStyle}>{seconds}</div>}
    </div>
  );
};
