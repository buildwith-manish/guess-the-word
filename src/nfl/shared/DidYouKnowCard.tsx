import React from 'react';
import type { Level } from '../data';
import { colors, radius, textStyle, px } from '../system';
import { FrostCard } from './FrostCard';
import { presence } from './presence';

export type DidYouKnowCardProps = {
  /** The did-you-know text of the card (from data.ts). */
  text: string;
  /** Local design frame of the scene. */
  frame: number;
  /** Local frame the card springs in. */
  at: number;
  /** Ticks on screen including the spring-out (from timing.ts: the voice clip plus a small tail). */
  dur: number;
  /** Ticks the spring-out takes at the end of `dur` (from timing.ts). */
  outTicks: number;
  level?: Level;
  /** Position of the card's top-left corner, 1280x720 reference units. Keep it inside SAFE. */
  left: number;
  top: number;
  width?: number;
  /** Small caps label above the text. Pass it from data / timing text; nothing is drawn if omitted. */
  label?: string;
  /** The card takes another card's place (no sideways slide): it rises a little and settles, so it can follow that card's fade-out. */
  swap?: boolean;
};

/** Card that springs in, holds, springs out. Draws nothing outside [at, at + dur). */
export const DidYouKnowCard: React.FC<DidYouKnowCardProps> = ({
  text, frame, at, dur, outTicks, level, left, top, width = 560, label, swap = false,
}) => {
  const f = frame - at;
  if (f < 0 || f >= dur) return null;
  const p = presence(frame, at, dur, outTicks);
  const accent = level ? colors.level[level] : colors.muted;
  return (
    <div style={{ position: 'absolute', left: px(left), top: px(top), opacity: Math.min(1, p), transform: swap ? `translateY(${(1 - p) * px(9)}px) scale(${0.985 + 0.015 * p})` : `translateX(${(1 - p) * px(27)}px) scale(${0.94 + 0.06 * p})` }}>
      <FrostCard level={level} width={width} padding={22} radius={radius.md}>
        {label !== undefined && (
          <div style={{ ...textStyle('caption'), color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
        )}
        <div style={{ ...textStyle('body'), marginTop: label !== undefined ? px(8) : 0, color: colors.ink }}>{text}</div>
      </FrostCard>
    </div>
  );
};
