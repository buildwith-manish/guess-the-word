import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, px, glass, K } from '../../style';
import { prog, slamIn, revealIn } from '../../anim';
import { elasticOut } from '../../gsap-helpers';
import { Background } from '../../Background';
import { Confetti } from '../../Fx';
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

/** Layout of the top-half copy, 1280x720 reference units (top edge of each block). */
const LINE1_TOP = 60;
const LINE2_TOP = 168;
const SUBSCRIBE_TOP = 244;
const POINTER_TOP = 336;
/** Confetti seed, piece count and origin. Motion constants. */
const CONFETTI = { seed: 2024, count: 30, origin: { x: 640, y: 150 } };

const box = (r: SlotRect): React.CSSProperties => ({
  position: 'absolute',
  left: px(r.x),
  top: px(r.y),
  width: px(r.w),
  height: px(r.h),
});

export const SearchEndScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const l1 = slamIn(frame, LINE1_AT, 16);
  const l2 = revealIn(frame, LINE2_AT, 15, 24);
  const sub = revealIn(frame, SUBSCRIBE_AT, 15, 24);
  const slots = prog(frame, SLOTS_AT, 22, elasticOut);
  const pointer = revealIn(frame, POINTER_AT, 14, 18);
  const pulse = 0.5 + 0.5 * Math.sin((frame - SLOTS_AT) / 12);

  const slotStyle = (r: SlotRect, radius: number): React.CSSProperties => ({
    ...box(r),
    ...glass(radius, 0.06),
    border: `${px(3)}px solid ${ACCENT}`,
    boxShadow: `0 0 ${px(40 + 30 * pulse)}px ${ACCENT}77`,
    opacity: Math.min(1, slots * 1.2),
    transform: `translateY(${(1 - slots) * 60 * K}px) scale(${0.7 + 0.3 * slots})`,
  });

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={THEME} />

      {/* comment prompt */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(LINE1_TOP),
          textAlign: 'center',
          fontFamily: FONTS.display,
          fontSize: px(80),
          lineHeight: 1.05,
          letterSpacing: px(3),
          color: COLORS.ink,
          opacity: l1.opacity,
          transform: l1.transform,
          filter: l1.filter,
        }}
      >
        {SCORE_LINE}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(LINE2_TOP),
          textAlign: 'center',
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(38),
          letterSpacing: px(2),
          color: ACCENT,
          opacity: l2.opacity,
          transform: l2.transform,
        }}
      >
        {CHARACTER_LINE}
      </div>

      {/* subscribe prompt */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: px(SUBSCRIBE_TOP), display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            padding: `${px(12)}px ${px(30)}px`,
            borderRadius: px(40),
            background: ACCENT,
            color: COLORS.inkDark,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(24),
            letterSpacing: px(4),
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
          <div style={{ fontFamily: FONTS.display, fontSize: px(28), letterSpacing: px(6), color: ACCENT }}>{E.nextLabel}</div>
          {NEXT.title.trim() !== '' ? (
            <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(20), letterSpacing: px(2), color: COLORS.ink, marginTop: px(4) }}>{NEXT.title}</div>
          ) : null}
          {NEXT.linkText.trim() !== '' ? (
            <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(16), letterSpacing: px(3), color: 'rgba(255,255,255,0.8)', marginTop: px(2) }}>{NEXT.linkText}</div>
          ) : null}
        </div>
      ) : null}

      {/* YouTube end-screen slots: frames only, nothing else is drawn inside them */}
      <div style={slotStyle(END_SLOTS.videoLeft, px(24))} />
      <div style={slotStyle(END_SLOTS.videoRight, px(24))} />
      <div style={slotStyle(END_SLOTS.subscribe, px(END_SLOTS.subscribe.w / 2))} />

      <Confetti frame={frame} start={LINE1_AT} count={CONFETTI.count} seed={CONFETTI.seed} origin={CONFETTI.origin} />
    </AbsoluteFill>
  );
};
