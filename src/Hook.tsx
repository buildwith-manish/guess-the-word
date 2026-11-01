import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, px, glass } from './style';
import { Background } from './Background';
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
          marginTop: px(26),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(26),
          transform: `scale(${0.92 + 0.08 * zoom})`,
        }}
      >
        {[pair.clueA, pair.clueB].map((file, i) => (
          <React.Fragment key={i}>
            {i === 1 ? (
              <svg width={px(40)} height={px(40)} viewBox="0 0 30 30">
                <rect x="12" y="2" width="6" height="26" rx="3" fill={COLORS.yellow} />
                <rect x="2" y="12" width="26" height="6" rx="3" fill={COLORS.yellow} />
              </svg>
            ) : null}
            <div
              style={{
                ...glass(px(34), 0.09),
                width: px(200),
                height: px(200),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Img
                src={clueSrc(file)}
                style={{ width: px(150), height: px(150), objectFit: 'contain', filter: `drop-shadow(0 ${px(10)}px ${px(14)}px rgba(0,0,0,0.55))` }}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/** Scene B (4.5s): the three scoring rules as numbered glass cards. */
const SceneB: React.FC<{ frame: number }> = ({ frame }) => {
  const lf = frame - A;
  const exitP = prog(lf, settings.timing.hookB - 12, 12, linear);
  const rules: { at: number; node: React.ReactNode }[] = [
    {
      at: 4,
      node: (
        <>
          {H.r1a} <span style={{ color: COLORS.redSoft }}>{H.r1b}</span> {H.r1c}
        </>
      ),
    },
    {
      at: 38,
      node: (
        <>
          {H.r2a} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r2b}</b>
        </>
      ),
    },
    {
      at: 84,
      node: (
        <>
          {H.r3a} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r3b}</b> {H.r3c}{' '}
          <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r3d}</b>
        </>
      ),
    },
  ];

  return (
    <div style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.07 * exitP})`, width: '100%' }}>
      <Headline
        text={H.rulesEyebrow}
        frame={frame}
        start={A}
        size={px(34)}
        spacing={px(14)}
        style={{ color: COLORS.muted, marginBottom: px(30) }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(20) }}>
        {rules.map((r, i) => {
          const e = prog(lf, r.at, 20, backOut);
          return (
            <div
              key={i}
              style={{
                ...glass(px(30), 0.09),
                display: 'flex',
                alignItems: 'center',
                gap: px(26),
                width: px(980),
                padding: `${px(16)}px ${px(30)}px`,
                opacity: Math.min(1, Math.max(0, e)),
                transform: `translate3d(0, ${(1 - e) * 40}px, 0)`,
              }}
            >
              <div
                style={{
                  width: px(66),
                  height: px(66),
                  borderRadius: '50%',
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow})`,
                  color: COLORS.inkDark,
                  fontFamily: FONTS.display,
                  fontSize: px(40),
                  boxShadow: `0 0 ${px(26)}px rgba(255,201,60,0.5)`,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize: px(i === 0 ? 58 : 52),
                  letterSpacing: px(4),
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                {r.node}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Hook: React.FC<{ frame: number }> = ({ frame }) => {
  const inP = prog(frame, 0, 4, linear);
  return (
    <AbsoluteFill style={{ opacity: inP, color: '#fff' }}>
      <Background frame={frame} theme={frame < A ? ['#6D5BFF', '#0B0A2E'] : ['#00B8D9', '#04202B']} />
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
