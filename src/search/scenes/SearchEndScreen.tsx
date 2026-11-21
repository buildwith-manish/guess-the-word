import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE_X, SAFE_Y, SCALE, px } from '../../style';
import { IOS, IosBackground, iosSurface, spring } from '../../ios';
import rootSettings from '../../../settings.json';
import cfg from '../search-settings.json';
import { BONUS_THEME } from '../search-timing';
import { MAX_SCORE, RANKS } from './searchScoreboardCues';
import { END_SLOTS, LINE1_AT, LINE2_AT, POINTER_AT, SLOTS_AT, SUBSCRIBE_AT, type SlotRect } from './searchEndScreenCues';

/**
 * End screen of the search video (task 5b).
 *
 * Props:
 *  - frame: scene-local tick (design frames, 30 per second; the caller passes `local` from locate()).
 *
 * Top half: comment prompt (score line, character line), subscribe prompt, pointer to the next video.
 * Bottom half: three frames where YouTube's end-screen elements go (END_SLOTS in searchEndScreenCues.ts):
 * video left, video right, subscribe circle between them. Keep those areas free of any other drawing.
 * Copy: subscribe words and "watch next" label from the shared root settings endScreen block, next-video
 * title and link text from search-settings.json nextVideo (pointer hidden when both are empty).
 * No images, no logo, no brand names.
 */

/** Comment prompt. TODO(settings): the wording was given in the task, not in search-settings.json; move it there. */
export const SCORE_LINE = `Your score out of ${MAX_SCORE}`;
export const CHARACTER_LINE = 'Which character should I do next?';

const E = rootSettings.endScreen;
const NEXT = cfg.nextVideo as { title: string; linkText: string };
const hasPointer = NEXT.title.trim() !== '' || NEXT.linkText.trim() !== '';

/** Accent: the best rank's colour from settings. Backdrop: the bonus theme from settings. */
const ACCENT = RANKS[0].accent;
const THEME = BONUS_THEME;

/**
 * Layout of the top-half copy, 1280x720 reference units. One column that keeps SAFE_X at the sides and
 * starts SAFE_Y + 24 from the top; the gaps are the same as before (24 and 30). It ends above y 300, well
 * clear of the pointer (y 336) and the slot frames (y 400).
 * Hierarchy: score line (largest, white) > character line (white, quieter) > subscribe pill (the one accent fill).
 * The accent is used for the pill and the slot frames only.
 */
const COPY_TOP = SAFE_Y / SCALE + 24; // 60 reference units
const GAP_LINE1_LINE2 = 24;
const GAP_LINE2_SUBSCRIBE = 30;
const POINTER_TOP = 336;
/** Motion: entrances use the shared spring (same as the level card and the reminder). */
const SLOT_TICKS = 18;
/** Confetti seed, piece count and origin. Fewer pieces than before so the copy stays clear. */
const CONFETTI = { seed: 2024, count: 18, origin: { x: 640, y: 150 } };

const box = (r: SlotRect): React.CSSProperties => ({
  position: 'absolute',
  left: px(r.x),
  top: px(r.y),
  width: px(r.w),
  height: px(r.h),
});

export const SearchEndScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const rise = (at: number, ticks: number, dist: number) => {
    const k = spring((frame - at) / ticks);
    return { opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * px(dist)}px)` };
  };
  const l1 = rise(LINE1_AT, 16, 18);
  const l2 = rise(LINE2_AT, 14, 14);
  const sub = rise(SUBSCRIBE_AT, 14, 14);
  const slots = spring((frame - SLOTS_AT) / SLOT_TICKS);
  const pointer = rise(POINTER_AT, 14, 14);

  const slotStyle = (r: SlotRect, radius: number): React.CSSProperties => ({
    ...box(r),
    ...iosSurface(radius, 0.6),
    opacity: Math.min(1, slots * 1.4),
    transform: `scale(${0.96 + 0.04 * slots})`,
  });

  return (
    <AbsoluteFill>
      <IosBackground accent={ACCENT} />

      {/* top copy: one centred column inside the safe margins */}
      <div
        style={{
          position: 'absolute',
          left: SAFE_X,
          right: SAFE_X,
          top: px(COPY_TOP),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* comment prompt */}
        <div
          style={{
            fontFamily: IOS.font,
            fontWeight: IOS.weight.bold,
            fontSize: px(76),
            lineHeight: 1.05,
            letterSpacing: -px(76) * 0.03,
            color: IOS.color.label,
            opacity: l1.opacity,
            transform: l1.transform,
          }}
        >
          {SCORE_LINE}
        </div>
        <div
          style={{
            marginTop: px(GAP_LINE1_LINE2),
            fontFamily: IOS.font,
            fontWeight: IOS.weight.medium,
            fontSize: px(36),
            color: IOS.color.secondary,
            opacity: l2.opacity,
            transform: l2.transform,
          }}
        >
          {CHARACTER_LINE}
        </div>

        {/* subscribe prompt: the one accent fill */}
        <div
          style={{
            marginTop: px(GAP_LINE2_SUBSCRIBE),
            padding: `${px(12)}px ${px(30)}px`,
            borderRadius: px(40),
            background: IOS.color.blue,
            color: IOS.color.label,
            fontFamily: IOS.font,
            fontWeight: IOS.weight.semibold,
            fontSize: px(24),
            opacity: sub.opacity,
            transform: sub.transform,
          }}
        >
          {E.subscribe} · {E.subscribeSub}
        </div>
      </div>

      {/* pointer to the next video, centred over the right video slot; hidden while settings.nextVideo is empty */}
      {hasPointer ? (
        <div
          style={{
            position: 'absolute',
            left: px(END_SLOTS.videoRight.x),
            width: px(END_SLOTS.videoRight.w),
            top: px(POINTER_TOP),
            textAlign: 'center',
            opacity: pointer.opacity,
            transform: pointer.transform,
          }}
        >
          <div style={{ fontFamily: IOS.font, fontWeight: IOS.weight.semibold, fontSize: px(26), color: IOS.color.secondary }}>{E.nextLabel}</div>
          {NEXT.title.trim() !== '' ? (
            <div style={{ fontFamily: IOS.font, fontWeight: IOS.weight.semibold, fontSize: px(22), color: IOS.color.label, marginTop: px(4) }}>{NEXT.title}</div>
          ) : null}
          {NEXT.linkText.trim() !== '' ? (
            <div style={{ fontFamily: IOS.font, fontWeight: IOS.weight.medium, fontSize: px(17), color: IOS.color.secondary, marginTop: px(2) }}>{NEXT.linkText}</div>
          ) : null}
        </div>
      ) : null}

      {/* YouTube end-screen slots: frames only, nothing else is drawn inside them */}
      <div style={slotStyle(END_SLOTS.videoLeft, px(24))} />
      <div style={slotStyle(END_SLOTS.videoRight, px(24))} />
      <div style={slotStyle(END_SLOTS.subscribe, px(END_SLOTS.subscribe.w / 2))} />

    </AbsoluteFill>
  );
};
