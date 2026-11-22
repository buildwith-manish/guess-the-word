import React from 'react';
import type { Level } from '../data';
import { colors, radius, textStyle, u } from '../system';
import { parseDate } from './dateText';
import { extraWindow } from './shared';

export type DateCardProps = {
  /** One date string, e.g. cut from `item.reveal` with `dateFromText`: "Month D, YYYY", "Month YYYY" or "YYYY". */
  date: string;
  /** Local design frame of the scene. */
  frame: number;
  /** Local frame of the answer reveal: the card springs in here. */
  at: number;
  /** Ticks on screen including the spring-out (default dykSec, capped under 3 s). */
  dur?: number;
  level?: Level;
  /** Top-left corner, reference units (1920x1080). */
  left: number;
  top: number;
  width?: number;
};

/** Calendar page: month band, large day, year. A bare year shows only the year. Draws nothing outside [at, at + dur). */
export const DateCard: React.FC<DateCardProps> = ({ date, frame, at, dur, level, left, top, width = 360 }) => {
  const w = extraWindow(frame, at, dur);
  if (!w.visible) return null;
  const { month, day, year } = parseDate(date);
  const accent = level ? colors.level[level] : colors.ink;
  const bandH = month ? 92 : 0;
  const height = month ? width * 1.1 : width * 0.62;
  return (
    <div
      style={{
        position: 'absolute',
        left: u(left),
        top: u(top),
        width: u(width),
        height: u(height),
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: u(radius.lg),
        background: `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
        border: `${u(1.5)}px solid ${accent}55`,
        backdropFilter: `blur(${u(22)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${u(22)}px) saturate(1.4)`,
        boxShadow: `0 ${u(18)}px ${u(48)}px ${colors.shadow}`,
        opacity: Math.min(1, w.p),
        transform: `translateY(${(1 - w.p) * u(32)}px) scale(${0.82 + 0.18 * Math.min(1.04, w.pop)})`,
        transformOrigin: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {month && (
        <div style={{ ...textStyle('body'), height: u(bandH), flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent, color: colors.onAccent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {month}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.ink }}>
        {day ? (
          <>
            <div style={{ ...textStyle('number'), fontSize: u(150) }}>{day}</div>
            <div style={{ ...textStyle('body'), color: colors.muted }}>{year}</div>
          </>
        ) : (
          <div style={{ ...textStyle('number'), fontSize: u(year && month ? 96 : 130) }}>{year}</div>
        )}
      </div>
    </div>
  );
};
