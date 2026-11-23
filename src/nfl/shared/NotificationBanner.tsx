import React from 'react';
import type { Level } from '../data';
import { FRAME, SAFE, colors, radius, springOver, textStyle, px } from '../system';
import { FrostCard } from './FrostCard';

export type NotificationBannerProps = {
  /** Banner title; it stays blurred. */
  title: string;
  frame: number;
  at: number;
  /** Ticks to slide in (from timing.ts). */
  dur: number;
  level?: Level;
  width?: number;
  height?: number;
  /** Blur radius of the title, reference units. */
  blur?: number;
};

/** iOS-style banner: slides down from above the top edge over `dur` ticks to the safe margin, then stays until unmounted. */
export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  title, frame, at, dur, level, width = 560, height = 88, blur = 6,
}) => {
  if (frame < at) return null;
  const p = springOver(frame, at, dur);
  const accent = level ? colors.level[level] : colors.ink;
  return (
    <div style={{ position: 'absolute', left: px((FRAME.w - width) / 2), top: px(SAFE.top), transform: `translateY(${-(1 - p) * px(SAFE.top + height + 16)}px)` }}>
      <FrostCard width={width} height={height} padding={0} radius={radius.lg} style={{ display: 'flex', alignItems: 'center', gap: px(16), paddingLeft: px(20) }}>
        <div style={{ width: px(48), height: px(48), borderRadius: px(radius.md), background: accent, flex: 'none' }} />
        <div style={{ ...textStyle('body'), fontWeight: 600, color: colors.ink, filter: `blur(${px(blur)}px)` }}>{title}</div>
      </FrostCard>
    </div>
  );
};
