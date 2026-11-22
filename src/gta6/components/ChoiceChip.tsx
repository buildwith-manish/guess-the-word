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
  /**
   * 0..1 colour fade glass -> solid accent (RevealEngine `highlight`). Fades fill, border, glow, badge and text together,
   * so the answer lights up smoothly instead of switching. Default: 1 when `state` is 'correct', else 0.
   */
  highlight?: number;
  /** Reference units (1920x1080). */
  width?: number;
  height?: number;
};

const LETTERS = ['A', 'B', 'C', 'D'];
const CORRECT_SCALE = 1.06;

/** `a` over `b` by `p` (0..1), in CSS, so it works for any colour string in `colors`. */
const mix = (a: string, p: number, b: string) => `color-mix(in srgb, ${a} ${(p * 100).toFixed(2)}%, ${b})`;

export const ChoiceChip: React.FC<ChoiceChipProps> = ({
  index, text, state, frame, at, stateAt, level, highlight, width = 1100, height = 132,
}) => {
  const since = frame - (stateAt ?? at);
  const enter = springAt(frame, at, 'snappy');
  const correct = state === 'correct' ? springAt(frame, stateAt ?? at, 'smooth') : 0;
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

  const greyed = state === 'greyed';
  const h = Math.max(0, Math.min(1, highlight ?? (state === 'correct' ? 1 : 0)));
  const scale = 1 + (CORRECT_SCALE - 1) * correct;
  const baseBorder = level && !greyed ? `${accent}55` : colors.hairline;
  const baseBadge = level && !greyed ? `${accent}33` : colors.glassStrong;
  const baseBadgeInk = level && !greyed ? accent : colors.ink;

  return (
    <div
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: u(28),
        width: u(width),
        height: u(height),
        padding: `0 ${u(32)}px 0 ${u(24)}px`,
        borderRadius: u(radius.lg),
        background: `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
        border: `${u(1.5)}px solid ${mix(colors.easy, h, baseBorder)}`,
        backdropFilter: `blur(${u(22)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${u(22)}px) saturate(1.4)`,
        boxShadow: `0 ${u(14)}px ${u(36)}px ${mix(colors.shadow, 1 - h, 'transparent')}, 0 ${u(20)}px ${u(56)}px ${mix(`${colors.easy}55`, h, 'transparent')}`,
        opacity: enter * (greyed ? 0.35 : 1),
        filter: greyed ? 'saturate(0.2)' : undefined,
        transform: `translate(${dx}px, ${(1 - enter) * u(24)}px) rotate(${rot}deg) scale(${scale})`,
        transformOrigin: 'center',
        color: mix(colors.onAccent, h, colors.ink),
      }}
    >
      {/* solid accent fill, faded in over the glass */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: `linear-gradient(160deg, ${colors.easy}, ${colors.easy}CC)`,
          opacity: h,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          ...textStyle('choice'),
          position: 'relative',
          flex: 'none',
          width: u(76),
          height: u(76),
          borderRadius: u(radius.md),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: mix(colors.onAccent, h, baseBadge),
          color: mix(colors.easy, h, baseBadgeInk),
        }}
      >
        {LETTERS[index] ?? ''}
      </div>
      <div style={{ ...textStyle('choice'), position: 'relative', flex: 1, minWidth: 0 }}>{text}</div>
    </div>
  );
};
