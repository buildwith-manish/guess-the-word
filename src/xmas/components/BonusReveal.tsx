import { withoutBackdrop } from './TimerToPill';
import React from 'react';
import type { BonusSlot } from '../data';
import { springAt } from '../shared/springs';
import { LAYOUT, colors, glassSurface, px, REF, textStyle, useXmasFonts, useXmasFrame } from '../system';
import { TITLE_FIT, fitTitle } from '../titleFit';
import { PLAY_AREA } from '../bonus/registry';

/**
 * BonusReveal: the answers of a bonus round as gold glass pills. One answer = one pill where the timer was (centre line
 * of the timer capsule); two to four answers = a stack centred in the play area, entering one after the other.
 * Text comes only from slot.answers (data.ts); size from titleFit.ts (one line, never below its minimum).
 * `startFrame` and `frame` are design ticks, like every frame number in src/xmas.
 */
export const BONUS_REVEAL = { staggerTicks: 4, gap: 12, enterSpring: 'pop' } as const;

export type PillRect = { cx: number; cy: number; w: number; h: number; fontSize: number; fits: boolean };

/** Pill geometry for a list of answers (reference units), top to bottom. Pure, so a check can run it. */
export const revealLayout = (answers: readonly string[]): PillRect[] => {
  const fits = answers.map((a) => fitTitle(a));
  const h = TITLE_FIT.pillHeight;
  const n = answers.length;
  const cap = LAYOUT.timer.capsule;
  const centre = n === 1 ? cap.y + cap.h / 2 : PLAY_AREA.y + PLAY_AREA.h / 2;
  const total = n * h + (n - 1) * BONUS_REVEAL.gap;
  return fits.map((f, i) => ({
    cx: REF.w / 2,
    cy: centre - total / 2 + h / 2 + i * (h + BONUS_REVEAL.gap),
    w: f.pillWidth,
    h,
    fontSize: f.fontSize,
    fits: f.fits,
  }));
};

export type BonusRevealProps = { slot: BonusSlot; startFrame: number; frame?: number };

export const BonusReveal: React.FC<BonusRevealProps> = ({ slot, startFrame, frame }) => {
  useXmasFonts();
  const live = useXmasFrame();
  const t = frame ?? live;
  const rects = revealLayout(slot.answers);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(REF.w), height: px(REF.h), pointerEvents: 'none' }}>
      {slot.answers.map((answer, i) => {
        const r = rects[i];
        const k = springAt(t, startFrame + i * BONUS_REVEAL.staggerTicks, BONUS_REVEAL.enterSpring);
        if (k <= 0.001) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px(r.cx - r.w / 2),
              top: px(r.cy - r.h / 2),
              width: px(r.w),
              height: px(r.h),
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...withoutBackdrop(glassSurface(r.h / 2, { edge: 0.6, depth: 0.45, base: colors.glassBase, tint: colors.gold, tintPercent: 16 })),
              opacity: Math.min(1, k * 2),
              transform: `translateY(${px(14 * (1 - k))}px) scale(${0.92 + 0.08 * k})`,
            }}
          >
            <span style={{ ...textStyle('title'), fontSize: px(r.fontSize), whiteSpace: 'nowrap' }}>{answer}</span>
          </div>
        );
      })}
    </div>
  );
};

export default BonusReveal;
