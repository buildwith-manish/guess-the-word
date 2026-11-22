import React from 'react';
import type { Level } from '../data';
import { colors, radius, textStyle, u } from '../system';
import { secToTicks } from '../timing';
import { FrostCard } from './FrostCard';
import { presence } from './presence';

const OUT = secToTicks(0.3);

export type ReminderCardProps = {
  frame: number;
  at: number;
  /** Ticks on screen including the spring-out. timing.ts has no reminder length, so the scene passes it. */
  dur: number;
  level?: Level;
  /** Centre-x and top, reference units (1920x1080). */
  x: number;
  top: number;
  width?: number;
  text?: string;
};

/** "Still counting?" pill: springs in, holds, springs out. */
export const ReminderCard: React.FC<ReminderCardProps> = ({ frame, at, dur, level, x, top, width = 520, text = 'Still counting?' }) => {
  const f = frame - at;
  if (f < 0 || f >= dur) return null;
  const p = presence(frame, at, dur, OUT);
  const accent = level ? colors.level[level] : colors.lowPower;
  return (
    <div style={{ position: 'absolute', left: u(x - width / 2), top: u(top), opacity: Math.min(1, p), transform: `scale(${0.9 + 0.1 * p})` }}>
      <FrostCard width={width} height={104} padding={0} radius={radius.xl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(20) }}>
        <span style={{ width: u(16), height: u(16), borderRadius: '50%', background: accent }} />
        <span style={{ ...textStyle('body'), fontWeight: 600, color: colors.ink }}>{text}</span>
      </FrostCard>
    </div>
  );
};
