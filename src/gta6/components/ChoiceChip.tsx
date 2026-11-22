import React from 'react';
import type { Level } from '../data';
import { FPS } from '../timing';
import { colors, radius, springAt, textStyle, u } from '../system';

export type ChipState = 'idle' | 'tremble' | 'greyed' | 'correct';

export type ChoiceChipProps = {
  /** 0..3 -> badge letter A..D. */
  index: number;
  text: string;
  state: ChipState;
  /** Local design frame (30 fps ticks) of the scene. */
  frame: number;
  /** Local frame the chip starts entering. */
  at: number;
  /** Local frame the current `state` began (drives tremble ramp and the correct expansion). Defaults to `at`. */
  stateAt?: number;
  /** Level tint for the idle border and badge. */
  level?: Level;
  /** Reference units (1920x1080). */
  width?: number;
  height?: number;
};

const LETTERS = ['A', 'B', 'C', 'D'];
const CORRECT_SCALE = 1.06;

export const ChoiceChip: React.FC<ChoiceChipProps> = ({
  index, text, state, frame, at, stateAt, level, width = 1100, height = 132,
}) => {
  const since = frame - (stateAt ?? at);
  const enter = springAt(frame, at, 'snappy');
  const correct = state === 'correct' ? springAt(frame, stateAt ?? at, 'bouncy') : 0;
  const accent = level ? colors.level[level] : colors.hairline;

  // tremble: small deterministic shake, ramps in over 4 ticks, ~7 Hz at 30 fps ticks
  let dx = 0;
  let rot = 0;
  if (state === 'tremble') {
    const ramp = Math.min(1, Math.max(0, since) / 4);
    const t = (frame / FPS) * Math.PI * 2 * 7;
    dx = Math.sin(t) * u(5) * ramp;
    rot = Math.sin(t * 1.3 + 1) * 0.35 * ramp;
  }

  const isCorrect = state === 'correct';
  const greyed = state === 'greyed';
  const scale = 1 + (CORRECT_SCALE - 1) * correct;
  const fill = isCorrect
    ? `linear-gradient(160deg, ${colors.easy}, ${colors.easy}CC)`
    : `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`;

  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: u(28),
        width: u(width),
        height: u(height),
        padding: `0 ${u(32)}px 0 ${u(24)}px`,
        borderRadius: u(radius.lg),
        background: fill,
        border: `${u(1.5)}px solid ${isCorrect ? colors.easy : level && !greyed ? `${accent}55` : colors.hairline}`,
        backdropFilter: `blur(${u(22)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${u(22)}px) saturate(1.4)`,
        boxShadow: isCorrect ? `0 ${u(20)}px ${u(56)}px ${colors.easy}55` : `0 ${u(14)}px ${u(36)}px ${colors.shadow}`,
        opacity: enter * (greyed ? 0.35 : 1),
        filter: greyed ? 'saturate(0.2)' : undefined,
        transform: `translate(${dx}px, ${(1 - enter) * u(24)}px) rotate(${rot}deg) scale(${scale})`,
        transformOrigin: 'center',
        color: isCorrect ? colors.onAccent : colors.ink,
      }}
    >
      <div
        style={{
          ...textStyle('choice'),
          flex: 'none',
          width: u(76),
          height: u(76),
          borderRadius: u(radius.md),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isCorrect ? colors.onAccent : level && !greyed ? `${accent}33` : colors.glassStrong,
          color: isCorrect ? colors.easy : level && !greyed ? accent : colors.ink,
        }}
      >
        {LETTERS[index] ?? ''}
      </div>
      <div style={{ ...textStyle('choice'), flex: 1, minWidth: 0 }}>{text}</div>
    </div>
  );
};
