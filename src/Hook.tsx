import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, px } from './style';
import { prog, slamIn } from './anim';
import { backOut, expoOut, linear } from './gsap-helpers';
import { glyphs } from './util';
import { QUESTIONS, TOTAL } from './timing';
import settings from '../settings.json';
import { Img } from 'remotion';
import { clueSrc } from './assets';

const H = settings.text.hook;
const A = settings.timing.hookA;

const Headline: React.FC<{
  text: string;
  frame: number;
  start: number;
  size: number;
  spacing?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, frame, start, size, spacing = px(5), color = '#fff', style }) => {
  const items = glyphs(text);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        fontFamily: FONTS.display,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: spacing,
        color,
        ...style,
      }}
    >
      {items.map((g, i) => {
        const p = prog(frame, start + i * 0.9, 16, expoOut);
        const isLetter = !g.space;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: g.accent ? COLORS.yellow : undefined,
              width: g.space ? size * 0.28 : undefined,
              opacity: isLetter ? p : 1,
              transform: `translateY(${(1 - p) * size * 0.55}px)`,
            }}
          >
            {g.space ? '\u00A0' : g.ch}
          </span>
        );
      })}
    </div>
  );
};

/** Scene A (3.7s): the challenge, with the three hardest emoji pairs cycling. */
const SceneA: React.FC<{ frame: number }> = ({ frame }) => {
  const hard = QUESTIONS.slice(-3);
  const zoomFrame = frame % 40;
  const slot = Math.min(2, Math.floor(frame / 40));
  const pair = hard[slot];
  const zoom = prog(frame, zoomFrame, 8, backOut);
  const exitP = prog(frame, A - 12, 12, linear);

  return (
    <div style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.07 * exitP})` }}>
      <Headline text={H.a1} frame={frame} start={2} size={px(78)} spacing={px(12)} style={{ color: 'rgba(255,255,255,0.87)' }} />
      <div style={{ marginTop: px(18), display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: px(20),
            fontFamily: FONTS.display,
            fontSize: px(150),
            lineHeight: 1,
            color: '#fff',
            opacity: Math.min(1, Math.max(0, prog(frame, 26, 16, backOut))),
            transform: `scale(${0.7 + 0.3 * prog(frame, 26, 16, backOut)})`,
            textShadow: `0 ${px(8)}px 0 rgba(0,0,0,0.53)`,
          }}
        >
          <span>{H.a2a}</span>
          <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{TOTAL}</b>
          <span>{H.a2b}</span>
        </span>
      </div>
      <div style={{ marginTop: px(22) }}>
        <Headline text={H.a3} frame={frame} start={48} size={px(88)} spacing={px(4)} />
      </div>
      <div
        style={{
          marginTop: px(10),
          height: px(230),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(24),
          fontFamily: FONTS.emoji,
          fontSize: px(130),
          lineHeight: 1,
          transform: `scale(${0.9 + 0.1 * zoom})`,
          filter: `drop-shadow(0 ${px(14)}px ${px(18)}px rgba(0,0,0,0.67))`,
        }}
      >
        <Img src={clueSrc(pair.clueA)} style={{ width: px(190), height: px(190), objectFit: 'contain' }} />
        <span style={{ fontFamily: FONTS.display, fontSize: px(76), color: 'rgba(255,255,255,0.9)' }}>+</span>
        <Img src={clueSrc(pair.clueB)} style={{ width: px(190), height: px(190), objectFit: 'contain' }} />
      </div>
    </div>
  );
};

/** Scene B (4.5s): the three scoring rules, each slamming in. */
const SceneB: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - A;
  const exitP = prog(lf, settings.timing.hookB - 12, 12, linear);
  const r1 = slamIn(lf, 4, 14);
  const r2 = prog(lf, 38, 20, backOut);
  const r3 = prog(lf, 84, 20, backOut);

  return (
    <div style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.07 * exitP})` }}>
      <Headline
        text={H.rulesEyebrow}
        frame={frame}
        start={A}
        size={px(32)}
        spacing={px(10)}
        style={{ color: 'rgba(255,255,255,0.8)', marginBottom: px(22) }}
      />
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: px(74),
          lineHeight: 1.05,
          letterSpacing: px(4),
          textAlign: 'center',
          opacity: r1.opacity,
          transform: r1.transform,
          filter: r1.filter,
        }}
      >
        {H.r1a} <span style={{ color: COLORS.redSoft }}>{H.r1b}</span> {H.r1c}
      </div>
      <div
        style={{
          marginTop: px(26),
          fontFamily: FONTS.display,
          fontSize: px(58),
          letterSpacing: px(4),
          textAlign: 'center',
          opacity: Math.min(1, Math.max(0, r2)),
          transform: `translate3d(0, ${(1 - r2) * 30}px, 0)`,
        }}
      >
        {H.r2a} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r2b}</b>
      </div>
      <div
        style={{
          marginTop: px(20),
          fontFamily: FONTS.display,
          fontSize: px(58),
          letterSpacing: px(4),
          textAlign: 'center',
          opacity: Math.min(1, Math.max(0, r3)),
          transform: `translate3d(0, ${(1 - r3) * 30}px, 0)`,
        }}
      >
        {H.r3a} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r3b}</b> {H.r3c}{' '}
        <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r3d}</b>
      </div>
    </div>
  );
};

export const Hook: React.FC<{ frame: number }> = ({ frame }) => {
  const inP = prog(frame, 0, 4, linear);
  return (
    <AbsoluteFill style={{ opacity: inP, color: '#fff' }}>
      <AbsoluteFill
        style={{
          background:
            frame < A
              ? 'radial-gradient(ellipse 75% 65% at 50% 45%, #3a0010, #000 82%)'
              : 'radial-gradient(ellipse 75% 65% at 50% 45%, #06214f, #000 82%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 2px, rgba(0,0,0,0) 2.5px)',
          backgroundSize: '44px 44px',
          backgroundPosition: `${((frame / (10 * 30)) % 1) * 44}px ${((frame / (10 * 30)) % 1) * 44}px`,
        }}
      />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          paddingTop: px(20),
        }}
      >
        {frame < A ? <SceneA frame={frame} /> : <SceneB frame={frame} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
