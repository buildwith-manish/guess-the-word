/**
 * NotificationBanner.tsx — a small iOS-style toast that peeks in at the top
 * between rounds (e.g. "Next: Round 24" or "Level 2: Banned list").
 *
 * Adapted from src/gta6/components/NotificationBanner.tsx (pattern only —
 * simplified to a single-line toast that slides down, holds, and slides back
 * up over `dur` ticks).
 */
import React from 'react';
import { SAFE, blurPx, colours, radius, springAt, textStyle, u } from '../system';
import type { Level } from '../data';

export type NotificationBannerProps = {
  frame: number;
  /** Local start frame. */
  at: number;
  /** Total duration in ticks. The banner holds in the middle third. */
  dur: number;
  /** Text to show. */
  text: string;
  /** Optional subtitle (smaller, muted). */
  subtitle?: string;
  /** Level colour for the accent dot. */
  level?: Level;
};

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  frame, at, dur, text, subtitle, level,
}) => {
  const t = frame - at;
  if (t < 0 || t > dur) return null;

  const inEnd = Math.floor(dur * 0.2);   // first 20% ramps in
  const outStart = Math.floor(dur * 0.8); // last 20% ramps out
  const rise = springAt(frame, at, 'snappy');
  const fall = springAt(frame, at + outStart, 'snappy');
  const y = (1 - rise) * -u(120) + fall * -u(120);
  const opacity = Math.min(rise, 1 - fall);

  const accent = level ? colours.level[level] : colours.ink;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: u(SAFE.top),
        transform: `translate(-50%, ${y}px)`,
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: u(18),
        padding: `${u(16)}px ${u(32)}px`,
        borderRadius: u(radius.xl),
        background: colours.glassStrong,
        border: `${u(1)}px solid ${colours.hairline}`,
        backdropFilter: `blur(${u(blurPx)}px) saturate(1.5)`,
        WebkitBackdropFilter: `blur(${u(blurPx)}px) saturate(1.5)`,
        boxShadow: `0 ${u(12)}px ${u(36)}px ${colours.shadow}`,
      }}
    >
      <div style={{ width: u(12), height: u(12), borderRadius: '50%', background: accent, flex: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...textStyle('body'), fontSize: u(34), fontWeight: 700, color: colours.ink, whiteSpace: 'nowrap' }}>
          {text}
        </div>
        {subtitle && (
          <div style={{ ...textStyle('caption'), fontSize: u(26), color: colours.muted, marginTop: u(2), whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
