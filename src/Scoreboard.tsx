import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, S, px, glass } from './style';
import { prog, revealIn } from './anim';
import { backOut } from './gsap-helpers';
import { makeConfetti } from './util';
import { Background } from './Background';
import settings from '../settings.json';

const RANKS = settings.scoreboard.ranks as string[][];

/**
 * Final scoreboard: the five ranks fill in bottom -> top so LEGEND lands last,
 * exactly like the reference HTML. One row per 22 frames, rows are pure
 * functions of the frame so seeking backwards is safe.
 */
export const Scoreboard: React.FC<{ frame: number }> = ({ frame }) => {
  const kicker = revealIn(frame, 6, 14, 20);
  const title = revealIn(frame, 14, 16, 30);
  const rowBase = 46;
  const step = 22;
  const lastRowAt = rowBase + (RANKS.length - 1) * step;
  const legendAt = lastRowAt + 21;
  const footer = revealIn(frame, legendAt + 8, 16, 26);
  const confetti = makeConfetti(99, 110, { x: 960, y: 1040 });

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={['#6D5BFF', '#0B0A2E']} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: px(40),
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(22),
            letterSpacing: px(9),
            color: 'rgba(255,255,255,0.8)',
            opacity: kicker.opacity,
            transform: kicker.transform,
          }}
        >
          {settings.text.scoreboardKicker}
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: px(66),
            lineHeight: 1.1,
            letterSpacing: px(3),
            margin: `${px(4)}px 0 ${px(24)}px`,
            opacity: title.opacity,
            transform: title.transform,
            color: '#fff',
          }}
        >
          {settings.text.scoreboardTitleA} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{settings.text.scoreboardTitleB}</b>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: px(10) }}>
          {RANKS.map((r, i) => {
            const fromBottom = RANKS.length - 1 - i;
            const at = rowBase + fromBottom * step;
            const p = prog(frame, at, 20, backOut);
            const isTop = i === 0;
            return (
              <div
                key={r[0]}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: px(18),
                  width: S.scoreboardRowW,
                  height: S.scoreboardRowH,
                  padding: `0 ${px(28)}px`,
                  ...glass(px(18), isTop ? 0.16 : 0.08),
                  background: isTop
                    ? 'linear-gradient(90deg, rgba(255,201,60,0.28), rgba(255,201,60,0.08))'
                    : undefined,
                  borderLeft: `${px(10)}px solid ${r[3]}`,
                  opacity: p,
                  transform: `translate3d(${(1 - p) * -160}px, 0, 0) scale(${0.92 + 0.08 * p})`,
                  boxShadow:
                    isTop && frame >= legendAt
                      ? `0 0 ${px(20 + 44 * (0.5 + 0.5 * Math.sin((frame - legendAt) / 9)))}px rgba(255,201,60,0.6)`
                      : (glass(px(18)).boxShadow as string),
                }}
              >
                <span style={{ fontFamily: FONTS.emoji, fontSize: px(38), lineHeight: 1 }}>{r[1]}</span>
                <span
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: px(38),
                    letterSpacing: px(2),
                    flex: 1,
                    textAlign: 'left',
                    color: '#fff',
                  }}
                >
                  {r[0]}
                </span>
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontWeight: 800,
                    fontSize: px(20),
                    letterSpacing: px(2),
                    color: r[3],
                  }}
                >
                  {r[2]}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(22),
            letterSpacing: px(5),
            color: 'rgba(255,255,255,0.8)',
            marginTop: px(18),
            opacity: footer.opacity,
            transform: footer.transform,
          }}
        >
          {settings.text.scoreboardFooter}
        </div>
      </AbsoluteFill>

      {frame >= legendAt
        ? confetti.map((c) => {
            const start = legendAt + c.delay;
            if (frame < start) return null;
            const p = Math.min(1, (frame - start) / c.duration);
            return (
              <div
                key={c.id}
                style={{
                  position: 'absolute',
                  left: c.x,
                  top: c.y,
                  width: c.size,
                  height: c.size * 1.6,
                  background: c.color,
                  borderRadius: c.round ? '50%' : 2,
                  opacity: 1 - Math.max(0, (p - 0.45) / 0.55),
                  transform: `translate3d(${c.dx * p}px, ${c.dy * Math.min(1, p / 0.45) + 320 * Math.max(0, p - 0.45)}px, 0) rotate(${c.spin * p}deg)`,
                }}
              />
            );
          })
        : null}
    </AbsoluteFill>
  );
};
