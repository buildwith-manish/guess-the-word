import React from 'react';
import { COLORS, FONTS, S, px, glass, K } from './style';
import { prog, htmlEase, bounceEase, clamp01, ms, keyframes } from './anim';
import { LEVELS, QUESTIONS, TOTAL } from './timing';
import settings from '../settings.json';

const BONUS_COLOR = '#FF8A3D';
const BAR_W = px(1152); // 1280 - 2 * 64: stays inside the 5% safe area
const BAR_GAP = px(4);
const BAR_H = px(6);
const BAR_BOTTOM = px(40);

/** how many questions each level has, in level order (drives the width of each bar segment) */
const LEVEL_COUNTS = LEVELS.map((l) => QUESTIONS.filter((q) => q.level === l.name).length);
const SEG_SPACE = BAR_W - BAR_GAP * (LEVELS.length - 1);
const SEGMENTS = (() => {
  let q0 = 0;
  let x0 = 0;
  return LEVELS.map((lv, i) => {
    const w = (SEG_SPACE * LEVEL_COUNTS[i]) / Math.max(1, TOTAL);
    const seg = { name: lv.name, accent: lv.accent, q0, q1: q0 + LEVEL_COUNTS[i], x0, w };
    q0 += LEVEL_COUNTS[i];
    x0 += w + BAR_GAP;
    return seg;
  });
})();

/** x position (inside the bar) of "p questions finished", p = 0..TOTAL */
const xAt = (p: number) => {
  const seg = SEGMENTS.find((s) => p <= s.q1) ?? SEGMENTS[SEGMENTS.length - 1];
  const t = clamp01((p - seg.q0) / Math.max(1, seg.q1 - seg.q0));
  return seg.x0 + seg.w * t;
};

/**
 * Whole-video progress: one segment per level (level accent colours), a gold head on the current
 * question, and an orange diamond at each bonus round. During a bonus round its diamond pulses.
 */
const ProgressBar: React.FC<{ label: string; number: number | string; frame: number }> = ({ label, number, frame }) => {
  const isBonus = label === 'BONUS';
  const n = typeof number === 'number' ? number : 0;
  const bonusAfter = settings.bonus.after as number[];
  // questions finished (or in progress) at this moment
  const target = isBonus ? bonusAfter[Math.max(0, n - 1)] ?? TOTAL : Math.min(TOTAL, n);
  const from = isBonus ? target : Math.max(0, target - 1);
  const filled = from + (target - from) * htmlEase(clamp01(frame / ms(500)));
  const headX = xAt(filled);
  const curLevel = SEGMENTS.find((s) => filled <= s.q1 && filled > s.q0) ?? SEGMENTS[0];
  const pulse = 0.5 + 0.5 * Math.sin((frame / 30) * Math.PI * 2 * 1.4);

  return (
    <div style={{ position: 'absolute', left: (px(1280) - BAR_W) / 2, bottom: BAR_BOTTOM, width: BAR_W, height: BAR_H }}>
      {SEGMENTS.map((s) => {
        const done = clamp01((filled - s.q0) / Math.max(1, s.q1 - s.q0));
        return (
          <React.Fragment key={s.name}>
            <div
              style={{
                position: 'absolute',
                left: s.x0,
                top: 0,
                width: s.w,
                height: BAR_H,
                borderRadius: BAR_H,
                background: 'rgba(255,255,255,0.14)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${done * 100}%`,
                  height: '100%',
                  borderRadius: BAR_H,
                  background: `linear-gradient(90deg, ${s.accent}, ${COLORS.ink})`,
                  opacity: 0.95,
                }}
              />
            </div>
          </React.Fragment>
        );
      })}

      {/* current level name, right-aligned above the bar end (clear of the countdown bar) */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: BAR_H + px(8),
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(11),
          letterSpacing: px(2.6),
          color: isBonus ? BONUS_COLOR : curLevel.accent,
          textShadow: `0 0 ${px(10)}px ${isBonus ? BONUS_COLOR : curLevel.accent}`,
        }}
      >
        {isBonus ? 'BONUS ROUND' : curLevel.name}
      </div>

      {/* bonus-round diamonds */}
      {bonusAfter.map((pos, j) => {
        const reached = filled >= pos - 1e-6;
        const live = isBonus && j === n - 1;
        const size = px(11) * (live ? 1.25 + 0.2 * pulse : 1);
        return (
          <div
            key={`b${j}`}
            style={{
              position: 'absolute',
              left: xAt(pos) - size / 2,
              top: BAR_H / 2 - size / 2,
              width: size,
              height: size,
              transform: 'rotate(45deg)',
              borderRadius: px(2),
              background: reached ? BONUS_COLOR : 'rgba(6,8,20,0.9)',
              border: `${px(1.5)}px solid ${BONUS_COLOR}`,
              boxShadow: live ? `0 0 ${px(14 + 8 * pulse)}px ${BONUS_COLOR}` : 'none',
            }}
          />
        );
      })}

      {/* head of the bar */}
      <div
        style={{
          position: 'absolute',
          left: headX - px(6),
          top: BAR_H / 2 - px(6),
          width: px(12),
          height: px(12),
          borderRadius: '50%',
          background: COLORS.yellow,
          boxShadow: `0 0 ${px(14)}px rgba(255,201,60,0.9)`,
          opacity: isBonus ? 0.55 : 1,
        }}
      />
    </div>
  );
};

/** Question counter pill (top-left) with a thin progress rail, plus the BONUS ERASES badge. */
export const Hud: React.FC<{
  label: string;
  number: number | string;
  total: number;
  /** bonus rounds finished so far; the badge is hidden at 0 */
  erases: number;
  eraseAt?: number;
  frame: number;
  /** frame at which this question's answer lands (streak ticks up then); omit = already landed */
  landedAt?: number;
  /** frame used for the progress-bar slide (Round passes frame - lead so it plays after the wipe) */
  barFrame?: number;
}> = ({ label, number, total, erases, eraseAt, frame, landedAt, barFrame }) => {
  const pop = prog(frame, 0, 18, bounceEase);
  const numN = typeof number === 'number' ? number : 0;
  const isBonusHud = label === 'BONUS';
  const bonusAfterH = settings.bonus.after as number[];
  const landed = landedAt === undefined || frame >= landedAt;
  // perfect streak: answers landed so far (the most a viewer can have in a row)
  const streak = isBonusHud ? bonusAfterH[Math.max(0, numN - 1)] ?? 0 : Math.max(0, numN - (landed ? 0 : 1));
  const bump =
    landedAt !== undefined && frame >= landedAt
      ? keyframes(clamp01((frame - landedAt) / ms(450)), [0, 0.4, 1], [1, 1.35, 1])
      : 1;
  const eraseIn = eraseAt === undefined || frame < eraseAt ? 1 : prog(frame, eraseAt, 15, htmlEase);

  return (
    <>
      <ProgressBar label={label} number={number} frame={barFrame ?? frame} />
      <div style={{ position: 'absolute', left: S.hudLeft, top: S.hudTop }}>
        <div
          style={{
            ...glass(px(40)),
            display: 'flex',
            alignItems: 'center',
            gap: px(10),
            padding: `${px(5)}px ${px(22)}px ${px(5)}px ${px(18)}px`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            color: COLORS.ink,
          }}
        >
          <span style={{ fontSize: px(15), letterSpacing: px(3), color: COLORS.muted }}>{label}</span>
          <b
            style={{
              display: 'inline-block',
              minWidth: px(26),
              textAlign: 'center',
              fontFamily: FONTS.display,
              fontWeight: 400,
              fontSize: px(40),
              lineHeight: 1,
              color: COLORS.yellow,
              textShadow: `0 0 ${px(22)}px rgba(255,201,60,0.55)`,
              transform: `translateY(${(1 - pop) * 70}%) scale(${0.5 + 0.5 * pop})`,
              opacity: Math.min(1, Math.max(0, pop)),
            }}
          >
            {number}
          </b>
          <small style={{ fontWeight: 800, fontSize: px(17), letterSpacing: px(1), color: COLORS.muted }}>/{total}</small>
        </div>
      </div>

      {streak > 0 ? (
        <div
          style={{
            ...glass(px(30)),
            position: 'absolute',
            left: S.hudLeft,
            top: px(104),
            display: 'flex',
            alignItems: 'center',
            gap: px(8),
            padding: `${px(4)}px ${px(16)}px ${px(5)}px ${px(12)}px`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            color: COLORS.ink,
          }}
        >
          <span style={{ fontFamily: FONTS.emoji, fontSize: px(17), lineHeight: 1 }}>🔥</span>
          <span style={{ fontSize: px(13), letterSpacing: px(2.4), color: COLORS.muted }}>STREAK</span>
          <b
            style={{
              display: 'inline-block',
              minWidth: px(22),
              textAlign: 'center',
              fontFamily: FONTS.display,
              fontWeight: 400,
              fontSize: px(28),
              lineHeight: 1,
              color: COLORS.yellow,
              textShadow: '0 0 ' + px(16) + 'px rgba(255,201,60,0.55)',
              transform: `scale(${bump})`,
            }}
          >
            {streak}
          </b>
        </div>
      ) : null}

      {erases > 0 ? (
        <div
          style={{
            ...glass(px(30)),
            position: 'absolute',
            left: S.hudLeft,
            top: px(148),
            padding: `${px(5)}px ${px(16)}px ${px(6)}px`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(14),
            letterSpacing: px(2),
            color: COLORS.green,
            opacity: eraseIn,
            transform: `translateX(${(1 - eraseIn) * -30 * K}px)`,
          }}
        >
          BONUS ERASES · {erases}
        </div>
      ) : null}
    </>
  );
};
