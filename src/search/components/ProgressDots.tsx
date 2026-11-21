import React from 'react';
import { COLORS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';

/**
 * A row of small dots, one per round: future dots dim, the current dot pulses,
 * finished dots are filled in their level colour.
 * `index` is the 0-based current round. `levelOf(i)` gives the colour of round i.
 * Ticks are design ticks (30/s), sampled at 60 fps.
 */

/** Pulse period in seconds and its strength. Motion constants. */
const PULSE_SECONDS = 1;
const PULSE_GAIN = 0.35;

export type ProgressDotsProps = {
  /** 0-based index of the current round. */
  index: number;
  /** Number of dots. */
  total: number;
  /** Colour of round i. */
  levelOf: (index: number) => string;
  /** Centre-x and centre-y of the row, reference units. */
  at: { x: number; y: number };
  /** Row width in reference units. */
  size: number;
};

export const ProgressDots: React.FC<ProgressDotsProps> = ({ index, total, levelOf, at, size }) => {
  const frame = useDesignFrame();
  const W = px(size);
  const pitch = W / Math.max(1, total);
  const d = pitch * 0.42;
  const wave = 0.5 + 0.5 * Math.sin((frame / (PULSE_SECONDS * FPS)) * Math.PI * 2);

  return (
    <div
      style={{
        position: 'absolute',
        left: px(at.x) - W / 2,
        top: px(at.y) - d * 1.6,
        width: W,
        height: d * 3.2,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const color = levelOf(i);
        const done = i < index;
        const current = i === index;
        return (
          <div key={i} style={{ width: pitch, display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: d,
                height: d,
                borderRadius: '50%',
                background: done || current ? color : COLORS.stroke,
                opacity: current ? 0.65 + 0.35 * wave : done ? 1 : 0.6,
                transform: current ? `scale(${1 + PULSE_GAIN * wave})` : undefined,
                boxShadow: current ? `0 0 ${d * (0.6 + wave)}px ${color}` : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
