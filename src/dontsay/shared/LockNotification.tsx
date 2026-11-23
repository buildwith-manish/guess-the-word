/**
 * LockNotification.tsx — a lock-screen style notification banner over a blurred
 * card. Adapted from src/gta6/components/LockNotification.tsx.
 *
 * Simplified: the gta6 version shows a blurred 4-option answer grid behind the
 * banner. DontSay has no answer grid, so the blurred background is a single
 * frosted card (the round's card, passed as children or rendered as a blank).
 *
 * One-shot animation of exactly 30 ticks (1 s on the 30 fps design clock),
 * driven only by `frame - at`, so it replays identically wherever the scene
 * sets `at` (the Hook at 0:00, and Round 45's callback staging).
 *
 * Beats (ticks from `at`), also exported as LOCK_BEATS so the scene can place
 * the notification SFX:
 *   0..6   blurred card fades in
 *   4..    banner springs down from above the safe area
 *   24..30 banner slides up and everything fades out
 */
import React from 'react';
import { SAFE, FRAME, blurPx, colours, levelBackground, radius, springAt, textStyle, u } from '../system';
import type { Level } from '../data';
import { clamp01 } from './fade';

export const LOCK_NOTIFICATION_TICKS = 30;
export const LOCK_BEATS = { gridIn: 0, bannerIn: 4, bannerOut: 24, end: LOCK_NOTIFICATION_TICKS } as const;

/** Local frame at which the animation ends, for a given start frame. */
export const lockNotificationEnd = (at: number): number => at + LOCK_NOTIFICATION_TICKS;

export type LockNotificationProps = {
  frame: number;
  /** Local start frame. */
  at: number;
  /** Small-caps app line, e.g. the show name. */
  appName: string;
  /** Notification title line (bold). */
  title: string;
  /** Notification body line. */
  body: string;
  /** Right-aligned time label, e.g. "now". */
  timeLabel: string;
  level: Level;
  /** Optional blurred content behind the banner (defaults to a blank frosted card). */
  children?: React.ReactNode;
};

export const LockNotification: React.FC<LockNotificationProps> = ({
  frame, at, appName, title, body, timeLabel, level, children,
}) => {
  const t = frame - at;
  if (t < 0 || t > LOCK_NOTIFICATION_TICKS) return null;

  const gridIn = clamp01((t - LOCK_BEATS.gridIn) / 6);
  const out = clamp01((LOCK_BEATS.end - t) / (LOCK_BEATS.end - LOCK_BEATS.bannerOut));
  const rise = springAt(frame, at + LOCK_BEATS.bannerIn, 'bouncy');
  const slideOut = 1 - clamp01((LOCK_BEATS.end - t) / (LOCK_BEATS.end - LOCK_BEATS.bannerOut));
  const bannerW = 1180;

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[level], opacity: Math.min(gridIn, out) }}>
      {/* Blurred card behind the banner */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: u(FRAME.h * 0.34),
          width: u(bannerW),
          height: u(280),
          marginLeft: -u(bannerW) / 2,
          borderRadius: u(radius.xl),
          background: colours.glassStrong,
          border: `${u(1.5)}px solid ${colours.hairline}`,
          filter: `blur(${u(blurPx * 0.9)}px) brightness(0.8)`,
        }}
      >
        {children}
      </div>

      {/* Banner */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: u(SAFE.top + 40),
          width: u(bannerW),
          marginLeft: -u(bannerW) / 2,
          display: 'flex',
          alignItems: 'center',
          gap: u(28),
          padding: u(28),
          borderRadius: u(radius.xl),
          background: colours.glassStrong,
          border: `${u(1.5)}px solid ${colours.hairline}`,
          backdropFilter: `blur(${u(blurPx)}px) saturate(1.5)`,
          WebkitBackdropFilter: `blur(${u(blurPx)}px) saturate(1.5)`,
          boxShadow: `0 ${u(20)}px ${u(60)}px ${colours.shadow}`,
          transform: `translateY(${-u(300) * (1 - rise) - u(300) * slideOut}px)`,
        }}
      >
        <div
          style={{
            width: u(104),
            height: u(104),
            flex: 'none',
            borderRadius: u(radius.md),
            background: colours.level[level],
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...textStyle('caption'), fontSize: u(26), fontWeight: 600, letterSpacing: u(2), color: colours.muted }}>
              {appName}
            </span>
            <span style={{ ...textStyle('caption'), fontSize: u(26), color: colours.muted }}>{timeLabel}</span>
          </div>
          <div style={{ ...textStyle('body'), fontSize: u(44), fontWeight: 700, color: colours.ink, marginTop: u(6) }}>{title}</div>
          <div style={{ ...textStyle('body'), fontSize: u(36), color: colours.muted, marginTop: u(4) }}>{body}</div>
        </div>
      </div>
    </div>
  );
};
