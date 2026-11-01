import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, S, px, glass } from './style';
import { prog, slamIn, revealIn } from './anim';
import { elasticOut } from './gsap-helpers';
import { makeConfetti } from './util';
import { Background } from './Background';
import settings from '../settings.json';

const E = settings.endScreen;

/**
 * End screen. The two frames sit where YouTube puts end-screen elements:
 * left column = copy, right column = "watch next" video slot + subscribe ring.
 * Everything stays above the bottom 12% so nothing is covered by the player.
 */
export const EndScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const e1 = revealIn(frame, 3, 15, 24);
  const e2 = slamIn(frame, 9, 16);
  const e3 = revealIn(frame, 52, 15, 24);
  const e4 = revealIn(frame, 104, 15, 24);
  const e5 = revealIn(frame, 136, 14, 18);
  const vslot = prog(frame, 140, 22, elasticOut);
  const srow = revealIn(frame, 196, 15, 24);
  const ringPulse = 0.5 + 0.5 * Math.sin((frame - 140) / 12);
  const confetti = makeConfetti(2024, 30, { x: 560, y: 460 });

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={['#FF4D8D', '#2A0720']} />
      <AbsoluteFill
        style={{
          flexDirection: 'row',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(60),
          padding: `${px(10)}px 0 ${px(50)}px`,
        }}
      >
        {/* left: the challenge */}
        <div
          style={{
            width: S.endScreenLeft,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            gap: px(14),
          }}
        >
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(22),
              letterSpacing: px(9),
              color: 'rgba(255,255,255,0.8)',
              opacity: e1.opacity,
              transform: e1.transform,
            }}
          >
            {E.eyebrow}
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(88),
              lineHeight: 1.02,
              letterSpacing: px(3),
              color: '#fff',
              opacity: e2.opacity,
              transform: e2.transform,
              filter: e2.filter,
            }}
          >
            {E.headlineA}
            <br />
            {E.headlineB}
            <br />
            <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{E.headlineC}</b>
          </div>
          <div
            style={{
              padding: `${px(11)}px ${px(28)}px`,
              borderRadius: px(40),
              background: COLORS.yellow,
              color: '#2a1d00',
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(21),
              letterSpacing: px(3),
              opacity: e3.opacity,
              transform: e3.transform,
            }}
          >
            {E.cta}
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(21),
              letterSpacing: px(5),
              color: 'rgba(255,255,255,0.8)',
              opacity: e4.opacity,
              transform: e4.transform,
            }}
          >
            {E.tagline}
          </div>
        </div>

        {/* right: watch-next + subscribe slots for YouTube end-screen elements */}
        <div
          style={{
            width: S.endScreenRight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: px(16),
          }}
        >
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(38),
              letterSpacing: px(7),
              color: COLORS.yellow,
              opacity: e5.opacity,
              transform: e5.transform,
            }}
          >
            {E.nextLabel}
          </div>
          <div
            style={{
              width: px(440),
              height: px(248),
              ...glass(px(24), 0.1),
              border: `${px(3)}px solid ${COLORS.yellow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONTS.emoji,
              fontSize: px(84),
              color: 'rgba(255,255,255,0.6)',
              boxShadow: `0 0 ${px(50 + 30 * ringPulse)}px rgba(255,201,60,0.47)`,
              opacity: Math.min(1, vslot * 1.2),
              transform: `translateY(${(1 - vslot) * 60}px) scale(${0.7 + 0.3 * vslot})`,
            }}
          >
            ▶
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: px(22),
              opacity: srow.opacity,
              transform: srow.transform,
            }}
          >
            <div
              style={{
                width: px(112),
                height: px(112),
                borderRadius: '50%',
                ...glass(px(56), 0.1),
                border: `${px(3)}px solid ${COLORS.yellow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.emoji,
                fontSize: px(44),
                boxShadow: `0 0 ${px(40 * (0.6 + 0.4 * ringPulse))}px rgba(255,214,10,0.4)`,
              }}
            >
              🔔
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: px(34),
                lineHeight: 1.1,
                letterSpacing: px(4),
                textAlign: 'left',
                color: '#fff',
              }}
            >
              {E.subscribe}
              <small
                style={{
                  display: 'block',
                  fontFamily: FONTS.body,
                  fontWeight: 800,
                  fontSize: px(16),
                  letterSpacing: px(4),
                  color: 'rgba(255,255,255,0.8)',
                  marginTop: px(4),
                }}
              >
                {E.subscribeSub}
              </small>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {frame >= 9
        ? confetti.map((c) => {
            const start = 9 + c.delay;
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
