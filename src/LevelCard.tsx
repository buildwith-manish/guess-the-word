import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONTS, px } from './style';
import { Background } from './Background';
import { prog, slamIn, revealIn } from './anim';
import { backOut, linear } from './gsap-helpers';
import { LEVELS, QUESTIONS } from './timing';
import settings from '../settings.json';

/** "LEVEL 1 / 3 — EASY — 20 QUESTIONS · 6 SECONDS EACH" between level blocks. */
export const LevelCard: React.FC<{ frame: number; levelIndex: number }> = ({ frame, levelIndex }) => {
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const dur = settings.levelCardFrames;
  const exitP = prog(frame, dur - 12, 12, linear);

  const eyebrow = revealIn(frame, 2, 14, 18);
  const title = slamIn(frame, 12, 16);
  const meta = revealIn(frame, 34, 16, 22);
  const pop = prog(frame, 10, 18, backOut);

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={[level.accent, level.bg]} />
      <AbsoluteFill
      style={{
        opacity: 1 - exitP,
        transform: `scale(${1 - 0.06 * exitP})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(24),
          letterSpacing: px(10),
          color: 'rgba(255,255,255,0.87)',
          opacity: eyebrow.opacity,
          transform: eyebrow.transform,
        }}
      >
        LEVEL {levelIndex + 1} / {LEVELS.length}
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: px(210),
          lineHeight: 1,
          letterSpacing: px(6),
          color: level.accent,
          opacity: title.opacity,
          transform: title.transform,
          filter: `${title.filter} drop-shadow(0 ${px(10)}px ${px(40)}px ${level.accent}66)`,
          margin: `${px(6)}px 0 ${px(18)}px`,
        }}
      >
        {level.name}
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: px(54),
          letterSpacing: px(3),
          color: '#fff',
          opacity: meta.opacity,
          transform: meta.transform,
        }}
      >
        <b style={{ color: level.accent, fontWeight: 400 }}>{countFor(level.name)}</b> QUESTIONS ·{' '}
        <b style={{ color: level.accent, fontWeight: 400 }}>{level.time}</b> SECONDS EACH
      </div>
      <div
        style={{
          marginTop: px(26),
          height: px(4),
          width: px(560) * pop,
          borderRadius: px(4),
          background: `linear-gradient(90deg, transparent, ${level.accent}, transparent)`,
        }}
      />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const countFor = (name: string) => QUESTIONS.filter((q) => q.level === name).length;
