import React from 'react';
import { levels, levelText } from '../data';
import { cue, type SfxCue } from '../sfx';
import { clamp01 } from '../shared/levelTransition';
import { colors, easeOut, px, radius, springOver, textStyle, blurPx } from '../system';
import { levelBannerInSec, levelBannerOutSec, levelBannerSec, secToTicks } from '../timing';

/**
 * Rookie level banner: a notification-style banner that slides down over card 1, holds, and slides out. It has no card of
 * its own. Placement (1280x720 units): y 4 to 84, centred. The Wallet card starts at y 72 and its first clue field at
 * y 160 (WALLET_LAYOUT), so the banner clears the first clue by 76 units and only touches the top edge of the card header.
 * Text comes from data.ts, lengths from timing.ts. `frame` and `at` are design ticks (30 fps) on the same clock.
 */
export const LEVEL_BANNER_BOX = { top: 4, h: 80, w: 760 } as const;

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
        padding: `${px(8)}px ${px(14)}px`,
        display: 'flex',
        alignItems: 'center',
        gap: px(16),
        borderRadius: px(radius.lg),
        background: 'rgba(28,28,30,0.92)',
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
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ ...textStyle('body'), fontWeight: 700, lineHeight: 1.15, color: colors.ink, whiteSpace: 'nowrap' }}>{text.title}</div>
        <div style={{ ...textStyle('caption'), lineHeight: 1.15, color: colors.muted, whiteSpace: 'nowrap' }}>{text.subtitle}</div>
      </div>
    </div>
  );
};
