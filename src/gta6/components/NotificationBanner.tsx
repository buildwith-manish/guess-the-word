import React from 'react';
import type { Level } from '../data';
import { FRAME, SAFE, colors, radius, springAt, textStyle, u } from '../system';
import { bannerSec, secToTicks } from '../timing';
import { FrostCard } from './FrostCard';

export type NotificationBannerProps = {
  /** Next round's name; it stays blurred. */
  title: string;
  frame: number;
  at: number;
  /** Ticks to slide in (default bannerSec = 0.6 s). */
  dur?: number;
  level?: Level;
  width?: number;
  height?: number;
  /** Blur radius of the name, reference units. */
  blur?: number;
};

/** iOS-style banner: slides down from above the top edge over `dur` ticks to the safe margin, then stays until unmounted. */
export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  title, frame, at, dur = secToTicks(bannerSec), level, width = 760, height = 120, blur = 9,
}) => {
  if (frame < at) return null;
  // spring settles within dur: sample it at progress over `dur`, so slide-in takes about 0.6 s
  const p = springAt((frame - at) * (secToTicks(0.6) / dur), 0, 'snappy');
  const accent = level ? colors.level[level] : colors.ink;
  return (
    <div style={{ position: 'absolute', left: u((FRAME.w - width) / 2), top: u(SAFE.top), transform: `translateY(${-(1 - p) * u(SAFE.top + height + 24)}px)` }}>
      <FrostCard width={width} height={height} padding={0} radius={radius.lg} style={{ display: 'flex', alignItems: 'center', gap: u(24), paddingLeft: u(28) }}>
        <div style={{ width: u(68), height: u(68), borderRadius: u(radius.md), background: accent, flex: 'none' }} />
        <div style={{ ...textStyle('body'), fontWeight: 600, color: colors.ink, filter: `blur(${u(blur)}px)` }}>{title}</div>
      </FrostCard>
    </div>
  );
};
