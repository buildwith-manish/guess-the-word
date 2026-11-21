import React from 'react';
import { COLORS, FONTS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Slim progress bar that drains over the clock, with the remaining whole seconds beside it.
 * Colour is `accent`, switching to red for the last second. Once a second the bar and the number pulse.
 * `from` and `duration` are design ticks (30 per second), local to the scene that mounts it.
 * Nothing is drawn before `from`; after the end the bar stays empty.
 */

/** Share of a second the tick pulse lasts, and its strength as a fraction of scale. Motion constants. */
const PULSE_SHARE = 0.5;
const PULSE_GAIN = 0.12;

export type TimerBarProps = {
  /** Tick the clock starts. */
  from: number;
  /** Clock length in ticks. */
  duration: number;
  /** Level accent colour. */
  accent: string;
  /** Bar width in 1280x720 reference units (the number sits inside this width, at the right). */
  size: number;
  /** Centre-x and top-y, reference units. */
  at: { x: number; y: number };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const TimerBar: React.FC<TimerBarProps> = ({ from, duration, accent, size, at }) => {
  const frame = useDesignFrame();
  if (frame < from) return null;

  const elapsed = Math.min(duration, frame - from);
  const left = duration - elapsed; // ticks left
  const progress = duration > 0 ? clamp01(left / duration) : 0;
  const seconds = Math.ceil(left / FPS - 1e-9);
  const lastSecond = left <= FPS;
  const color = lastSecond ? COLORS.red : accent;

  // Pulse on every whole second of elapsed time (including the start), until the clock ends.
  const phase = (elapsed % FPS) / FPS;
  const running = frame - from < duration;
  const pulse = running ? Math.pow(1 - clamp01(phase / PULSE_SHARE), 3) : 0;
  const scale = 1 + PULSE_GAIN * pulse;

  const W = px(size);
  const barH = W * 0.022;
  const numW = W * 0.09;
  const gap = W * 0.025;
  const trackW = W - numW - gap;

  return (
    <div
      style={{
        position: 'absolute',
        left: px(at.x) - W / 2,
        top: px(at.y),
        width: W,
        height: Math.max(barH, W * 0.07),
        display: 'flex',
        alignItems: 'center',
        gap,
        fontFamily: FONTS.mono,
      }}
    >
      <div
        style={{
          width: trackW,
          height: barH,
          borderRadius: barH / 2,
          background: COLORS.glass,
          border: `${px(1)}px solid ${COLORS.stroke}`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          transform: `scaleY(${scale})`,
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: barH / 2,
            background: color,
            boxShadow: `0 0 ${barH * 1.2}px ${color}`,
          }}
        />
      </div>
      <div
        style={{
          width: numW,
          textAlign: 'right',
          fontSize: W * 0.06,
          fontWeight: 700,
          lineHeight: 1,
          color,
          transform: `scale(${scale})`,
          transformOrigin: 'right center',
        }}
      >
        {seconds}
      </div>
    </div>
  );
};
