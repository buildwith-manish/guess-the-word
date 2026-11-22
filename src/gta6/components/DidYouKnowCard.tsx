import React from 'react';
import type { Level } from '../data';
import { colors, radius, textStyle, u } from '../system';
import { dykSec, secToTicks } from '../timing';
import { FrostCard } from './FrostCard';
import { presence } from './presence';

/** 3 s minus one tick. No longer applied to this card (it stays as long as its voice clip, the caller passes `dur`);
 *  still exported because `extras/shared.ts` uses it for the extras. */
export const DYK_MAX_TICKS = secToTicks(3) - 1;
const OUT = secToTicks(0.3);

export type DidYouKnowCardProps = {
  /** The didYouKnow text of the item. */
  text: string;
  /** Local design frame of the scene. */
  frame: number;
  /** Local frame the card springs in. */
  at: number;
  /** Ticks on screen including the spring-out (default dykSec). */
  dur?: number;
  /** Ticks the spring-out takes at the end of `dur` (default 0.3 s). */
  outTicks?: number;
  level?: Level;
  /** Position of the card's top-left corner, reference units (1920x1080). */
  left: number;
  top: number;
  width?: number;
  label?: string;
};

/** Card placed beside the answer: springs in, holds, springs out. Draws nothing outside [at, at + dur). */
export const DidYouKnowCard: React.FC<DidYouKnowCardProps> = ({
  text, frame, at, dur = secToTicks(dykSec), outTicks = OUT, level, left, top, width = 640, label = 'Did you know?',
}) => {
  const d = dur;
  const f = frame - at;
  if (f < 0 || f >= d) return null;
  const p = presence(frame, at, d, outTicks);
  const accent = level ? colors.level[level] : colors.muted;
  return (
    <div style={{ position: 'absolute', left: u(left), top: u(top), opacity: Math.min(1, p), transform: `translateX(${(1 - p) * u(40)}px) scale(${0.94 + 0.06 * p})` }}>
      <FrostCard level={level} width={width} padding={32} radius={radius.md}>
        <div style={{ ...textStyle('caption'), color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
        <div style={{ ...textStyle('body'), marginTop: u(12), color: colors.ink }}>{text}</div>
      </FrostCard>
    </div>
  );
};
