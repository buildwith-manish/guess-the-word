/**
 * StreakChip, SpoilerBadge, FastestBadge: small glass pills that rise in and (optionally) out.
 * Text comes only from props. Every state is a pure function of `frame`, `at` and `outAt`
 * (local design ticks, 30 fps). No internal timers.
 */
import React from 'react';
import { blurPx, colors, radius, springAt, textStyle, u } from './../system';
import { fadeWindow } from './fade';

type PillBase = {
  frame: number;
  /** Local start frame. */
  at: number;
  /** Local frame at which the pill has finished fading out (omit to stay). */
  outAt?: number;
};

const pillStyle = (
  tint: string,
  frame: number,
  at: number,
  outAt: number | undefined,
): React.CSSProperties => {
  const p = springAt(frame, at, 'bouncy');
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: u(14),
    padding: `${u(14)}px ${u(30)}px`,
    borderRadius: u(radius.xl),
    background: colors.glass,
    border: `${u(1.5)}px solid ${tint}`,
    backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
    boxShadow: `0 ${u(8)}px ${u(26)}px ${colors.shadow}`,
    ...textStyle('caption'),
    fontSize: u(34),
    fontWeight: 700,
    letterSpacing: u(1.5),
    color: colors.ink,
    whiteSpace: 'nowrap',
    opacity: fadeWindow(frame, at, outAt, 6, 8),
    transform: `translateY(${u(24) * (1 - p)}px) scale(${0.9 + 0.1 * p})`,
  };
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ width: u(16), height: u(16), borderRadius: '50%', background: color, flex: 'none' }} />
);

export type StreakChipProps = PillBase & {
  /** The streak number, e.g. 5. */
  count: number;
  /** Text after "N IN A ROW", e.g. the comment prompt. Supplied by the scene. */
  label: string;
  /** Text between the number and the label. Supplied by the scene. */
  unit: string;
};

export const StreakChip: React.FC<StreakChipProps> = ({ count, unit, label, frame, at, outAt }) => (
  <div style={pillStyle(colors.medium, frame, at, outAt)}>
    <Dot color={colors.medium} />
    <span>
      <span style={{ ...textStyle('number'), fontSize: u(34) }}>{count}</span> {unit}
      <span style={{ color: colors.muted, fontWeight: 500 }}>, {label}</span>
    </span>
  </div>
);

export type SpoilerBadgeProps = PillBase & { text: string };

/** Green "spoiler" badge. */
export const SpoilerBadge: React.FC<SpoilerBadgeProps> = ({ text, frame, at, outAt }) => (
  <div style={{ ...pillStyle(colors.easy, frame, at, outAt), background: `${colors.easy}26` }}>
    <Dot color={colors.easy} />
    <span style={{ color: colors.easy }}>{text}</span>
  </div>
);

export type FastestBadgeProps = PillBase & { text: string };

/** "Fastest" badge: bolt glyph + text. */
export const FastestBadge: React.FC<FastestBadgeProps> = ({ text, frame, at, outAt }) => (
  <div style={pillStyle(colors.medium, frame, at, outAt)}>
    <svg width={u(26)} height={u(34)} viewBox="0 0 26 34" style={{ flex: 'none' }}>
      <path d="M15 0 L0 20 H11 L9 34 L26 12 H15 Z" fill={colors.medium} />
    </svg>
    <span>{text}</span>
  </div>
);
