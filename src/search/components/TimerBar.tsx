import React from 'react';
import { px } from '../../style';
import { IOS } from '../../ios';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Slim progress bar that drains over the clock, with the remaining whole seconds beside it.
 * Colour is `accent`, switching to red for the last three seconds. The bar only drains: no pulse, breath or glow.
 * `from` and `duration` are design ticks (30 per second), local to the scene that mounts it.
 * Nothing is drawn before `from`; after the end the bar stays empty.
 */

/** The bar and number turn red for this many seconds at the end. */
const URGENT_SECONDS = 3;

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
  // Quiet by default: level-coloured bar, grey number. Only the last three seconds turn red.
  const urgent = left <= URGENT_SECONDS * FPS;
  const color = urgent ? IOS.color.red : accent;
  const numberColor = urgent ? IOS.color.red : IOS.color.secondary;

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
        fontFamily: IOS.font,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div
        style={{
          width: trackW,
          height: barH,
          borderRadius: barH / 2,
          background: IOS.color.fillStrong,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: barH / 2,
            background: color,
          }}
        />
      </div>
      <div
        style={{
          width: numW,
          textAlign: 'right',
          fontSize: W * 0.05,
          fontWeight: IOS.weight.semibold,
          lineHeight: 1,
          color: numberColor,
        }}
      >
        {seconds}
      </div>
    </div>
  );
};
