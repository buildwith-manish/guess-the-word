/**
 * LockNotification: a lock-screen style notification banner over a blurred backdrop.
 * One-shot animation of exactly LOCK_NOTIFICATION_TICKS (ticks on the 30 fps design clock),
 * driven only by `frame - at`, so it replays identically wherever the scene sets `at`.
 * Outside [at, at + LOCK_NOTIFICATION_TICKS] it renders nothing.
 *
 * Beats (ticks from `at`), also exported as LOCK_BEATS so the scene can place the notification SFX:
 *   0..6   blurred backdrop fades in
 *   4..    banner springs down from above the safe area
 *   24..30 banner slides up and everything fades out
 * All text (app name, title, body, time label) comes from props.
 *
 * Changed from the source: the source blurred a 2x2 answer grid (ChoiceChip). NFL has no answer grid, so the
 * blurred layer is `children` (the scene passes the card there).
 */
import React from 'react';
import type { Level } from '../data';
import { SAFE, blurPx, colors, levelBackground, radius, springAt, textStyle, px } from '../system';
import { clamp01 } from './fade';

export const LOCK_NOTIFICATION_TICKS = 30;
export const LOCK_BEATS = { gridIn: 0, bannerIn: 4, bannerOut: 24, end: LOCK_NOTIFICATION_TICKS } as const;

/** Local frame at which the animation ends, for a given start frame. */
export const lockNotificationEnd = (at: number): number => at + LOCK_NOTIFICATION_TICKS;

export type LockNotificationProps = {
  frame: number;
  /** Local start frame. */
  at: number;
  /** Small caps app line. */
  appName: string;
  /** Notification title line (bold). */
  title: string;
  /** Notification body line. */
  body: string;
  /** Right-aligned time label. */
  timeLabel: string;
  level: Level;
  /** What sits blurred behind the banner (the first card). */
  children?: React.ReactNode;
};

export const LockNotification: React.FC<LockNotificationProps> = ({
  frame,
  at,
  appName,
  title,
  body,
  timeLabel,
  level,
  children,
}) => {
  const t = frame - at;
  if (t < 0 || t > LOCK_NOTIFICATION_TICKS) return null;

  const gridIn = clamp01((t - LOCK_BEATS.gridIn) / 6);
  const out = clamp01((LOCK_BEATS.end - t) / (LOCK_BEATS.end - LOCK_BEATS.bannerOut));
  const rise = springAt(frame, at + LOCK_BEATS.bannerIn, 'gentle');
  const slideOut = 1 - out;
  const bannerW = 784; // inside the centre 80% (1024)

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[level], opacity: Math.min(gridIn, out) }}>
      {/* Blurred backdrop */}
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${px(blurPx * 0.6)}px) brightness(0.8)` }}>{children}</div>

      {/* Banner */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(SAFE.top),
          width: px(bannerW),
          marginLeft: -px(bannerW) / 2,
          display: 'flex',
          alignItems: 'center',
          gap: px(19),
          padding: px(19),
          boxSizing: 'border-box',
          borderRadius: px(radius.xl),
          background: colors.glassStrong,
          border: `${px(1)}px solid ${colors.hairline}`,
          backdropFilter: `blur(${px(blurPx)}px) saturate(1.5)`,
          boxShadow: `0 ${px(13)}px ${px(40)}px ${colors.shadow}`,
          transform: `translateY(${-px(200) * (1 - rise) - px(200) * slideOut}px)`,
        }}
      >
        <div
          style={{
            width: px(70),
            height: px(70),
            flex: 'none',
            borderRadius: px(radius.md),
            background: colors.level[level],
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...textStyle('caption'), fontWeight: 600, letterSpacing: px(1.5), color: colors.muted }}>{appName}</span>
            <span style={{ ...textStyle('caption'), color: colors.muted }}>{timeLabel}</span>
          </div>
          <div style={{ ...textStyle('body'), fontSize: px(32), fontWeight: 700, color: colors.ink, marginTop: px(4) }}>{title}</div>
          <div style={{ ...textStyle('body'), color: colors.muted, marginTop: px(3) }}>{body}</div>
        </div>
      </div>
    </div>
  );
};
