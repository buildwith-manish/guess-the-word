import React from 'react';
import { levels, levelText } from '../data';
import { cue, type SfxCue } from '../sfx';
import { clamp01 } from '../shared/levelTransition';
import { colors, easeOut, px, radius, springOver, textStyle, blurPx } from '../system';
import { levelBannerInSec, levelBannerOutSec, levelBannerSec, secToTicks } from '../timing';

/**
 * Rookie level banner: a notification-style banner that slides down over card 1, holds, and slides out. It has no card of
 * its own. Placement (1280x720 units, iOS-12): on the top row line, y 12 to 60 (48 high), centred, x 360 to 920. That is
 * clear of the top-left chip (ends near x 340), the top-right watermark (starts near x 1083) and the Wallet card (starts at
 * y 72), and it sits where the points pill is (the pill is hidden behind it while it is up). Title and subtitle share one line.
 * Text comes from data.ts, lengths from timing.ts. `frame` and `at` are design ticks (30 fps) on the same clock.
 */
export const LEVEL_BANNER_BOX = { top: 12, h: 48, w: 560 } as const;

export type LevelBannerProps = {
  frame: number;
  /** Tick the banner starts sliding in. Nothing is drawn before it. */
  at: number;
};

/** Banner marks in ticks from `at`. Exported so the frame list and the cues read the same numbers. */
export const levelBannerMarks = () => {
  const total = secToTicks(levelBannerSec);
  const inLen = secToTicks(levelBannerInSec);
  const outLen = secToTicks(levelBannerOutSec);
  return { total, inLen, outLen, outAt: total - outLen };
};

/** SFX cue: the level-rookie sound lands as the banner starts sliding in. */
export const levelBannerCues = (at: number): SfxCue[] => [cue('level-rookie', at)];

/** Where the Rookie level clip starts (the audio map supplies the clip): when the banner has settled. */
export const levelBannerVoice = (at: number) => ({ type: 'level' as const, key: 'rookie', tick: at + levelBannerMarks().inLen });

export const LevelBanner: React.FC<LevelBannerProps> = ({ frame, at }) => {
  const m = levelBannerMarks();
  const local = frame - at;
  if (local < 0 || local >= m.total) return null;

  const inP = springOver(Math.min(frame, at + m.inLen), at, m.inLen);
  const outP = easeOut(clamp01((local - m.outAt) / m.outLen));
  const hide = LEVEL_BANNER_BOX.top + LEVEL_BANNER_BOX.h + 8;
  const y = -hide * (1 - inP) - hide * outP;
  const text = levelText.rookie;
  const iconNumber = levels.indexOf('rookie') + 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: px(LEVEL_BANNER_BOX.top),
        width: px(LEVEL_BANNER_BOX.w),
        height: px(LEVEL_BANNER_BOX.h),
        marginLeft: -px(LEVEL_BANNER_BOX.w) / 2,
        boxSizing: 'border-box',
        padding: `${px(8)}px ${px(16)}px`,
        display: 'flex',
        alignItems: 'center',
        gap: px(12),
        borderRadius: px(radius.lg),
        background: 'rgb(28,28,30)',
        backdropFilter: `blur(${px(blurPx)}px)`,
        border: `${px(1)}px solid ${colors.hairline}`,
        boxShadow: `0 ${px(8)}px ${px(24)}px ${colors.shadow}`,
        opacity: 1 - outP,
        transform: `translateY(${px(y)}px)`,
      }}
    >
      <div
        style={{
          ...textStyle('body'),
          flex: 'none',
          width: px(LEVEL_BANNER_BOX.h - 16),
          height: px(LEVEL_BANNER_BOX.h - 16),
          borderRadius: px(radius.md),
          background: colors.level.rookie,
          color: colors.onAccent,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconNumber}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(12), minWidth: 0, whiteSpace: 'nowrap' }}>
        <div style={{ ...textStyle('body'), fontSize: px(28), fontWeight: 700, lineHeight: 1.1, color: colors.ink }}>{text.title}</div>
        <div style={{ ...textStyle('caption'), lineHeight: 1.1, color: colors.muted }}>{text.subtitle}</div>
      </div>
    </div>
  );
};
