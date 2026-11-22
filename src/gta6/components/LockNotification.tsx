/**
 * LockNotification: a lock-screen style notification banner over a blurred answer grid.
 * One-shot animation of exactly LOCK_NOTIFICATION_TICKS (30 ticks = 1 s on the 30 fps design clock),
 * driven only by `frame - at`, so it replays identically wherever the scene sets `at` (e.g. Q42).
 * Outside [at, at + 30] it renders nothing.
 *
 * Beats (ticks from `at`), also exported as LOCK_BEATS so the scene can place the notification SFX:
 *   0..6   blurred grid fades in
 *   4..    banner springs down from above the safe area
 *   24..30 banner slides up and everything fades out
 * All text (app name, title, body, answer options) comes from props.
 */
import React from 'react';
import { SAFE, FRAME, blurPx, colors, levelBackground, radius, springAt, textStyle, u } from '../system';
import type { Level } from '../data';
import { ChoiceChip } from './ChoiceChip';
import { clamp01 } from './fade';

export const LOCK_NOTIFICATION_TICKS = 30;
export const LOCK_BEATS = { gridIn: 0, bannerIn: 4, bannerOut: 24, end: LOCK_NOTIFICATION_TICKS } as const;

/** Local frame at which the animation ends, for a given start frame. */
export const lockNotificationEnd = (at: number): number => at + LOCK_NOTIFICATION_TICKS;

export type LockNotificationProps = {
  frame: number;
  /** Local start frame. */
  at: number;
  /** Small caps app line, e.g. the show name. */
  appName: string;
  /** Notification title line (bold). */
  title: string;
  /** Notification body line. */
  body: string;
  /** Right-aligned time label, e.g. "now". */
  timeLabel: string;
  /** The four answer options shown (blurred) behind the banner. */
  options: readonly string[];
  level: Level;
};

export const LockNotification: React.FC<LockNotificationProps> = ({
  frame,
  at,
  appName,
  title,
  body,
  timeLabel,
  options,
  level,
}) => {
  const t = frame - at;
  if (t < 0 || t > LOCK_NOTIFICATION_TICKS) return null;

  const gridIn = clamp01((t - LOCK_BEATS.gridIn) / 6);
  const out = clamp01((LOCK_BEATS.end - t) / (LOCK_BEATS.end - LOCK_BEATS.bannerOut));
  const rise = springAt(frame, at + LOCK_BEATS.bannerIn, 'bouncy');
  const slideOut = 1 - clamp01((LOCK_BEATS.end - t) / (LOCK_BEATS.end - LOCK_BEATS.bannerOut));
  const bannerW = 1180;
  const chipW = 760;

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[level], opacity: Math.min(gridIn, out) }}>
      {/* Blurred answer grid */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: u(FRAME.h * 0.34),
          width: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(2, ${u(chipW)}px)`,
          gap: u(28),
          justifyContent: 'center',
          filter: `blur(${u(blurPx * 0.9)}px) brightness(0.8)`,
        }}
      >
        {options.map((text, i) => (
          <ChoiceChip key={i} index={i} text={text} state="idle" frame={frame} at={at} level={level} width={chipW} />
        ))}
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
          background: colors.glassStrong,
          border: `${u(1.5)}px solid ${colors.hairline}`,
          backdropFilter: `blur(${u(blurPx)}px) saturate(1.5)`,
          boxShadow: `0 ${u(20)}px ${u(60)}px ${colors.shadow}`,
          transform: `translateY(${-u(300) * (1 - rise) - u(300) * slideOut}px)`,
        }}
      >
        <div
          style={{
            width: u(104),
            height: u(104),
            flex: 'none',
            borderRadius: u(radius.md),
            background: colors[level],
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...textStyle('caption'), fontSize: u(26), fontWeight: 600, letterSpacing: u(2), color: colors.muted }}>
              {appName}
            </span>
            <span style={{ ...textStyle('caption'), fontSize: u(26), color: colors.muted }}>{timeLabel}</span>
          </div>
          <div style={{ ...textStyle('body'), fontSize: u(44), fontWeight: 700, color: colors.ink, marginTop: u(6) }}>{title}</div>
          <div style={{ ...textStyle('body'), fontSize: u(36), color: colors.muted, marginTop: u(4) }}>{body}</div>
        </div>
      </div>
    </div>
  );
};
