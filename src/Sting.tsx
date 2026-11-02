import React from 'react';
import { COLORS, px } from './style';
import { ms, clamp01, keyframes, cssEaseOut, breathe } from './anim';

/**
 * The channel's signature reveal: the QUIZ MATRIX lightbulb monogram "stamps"
 * onto the corner of the answer card with a light ping and a burst of rays.
 * Same animation on every answer so viewers learn to recognise it.
 *
 * All values derive from `frame`, so renders are deterministic.
 */

const BULB = 'M50 6C76 6 92 26 92 48C92 64 82 74 74 84L70 98H30L26 84C18 74 8 64 8 48C8 26 24 6 50 6Z';
const BOLT = 'M57 20L33 55H48L41 82L68 45H53Z';

/** corner of the answer card on the 1280x720 grid (card = x 270..1010, y 62..434) */
const CX = 1004;
const CY = 70;

const RAYS = 14;
const DOTS = 9;

export const BulbSting: React.FC<{ frame: number; start: number; exit: number }> = ({ frame, start, exit }) => {
  const t0 = start + ms(240); // lands just after the card springs in
  const lt = frame - t0;
  if (lt < 0) return null;

  // ---- slam-in: scale 0 -> overshoot -> settle, with a twist ----
  const e = clamp01(lt / ms(640));
  const scale = keyframes(e, [0, 0.42, 0.72, 1], [0, 1.4, 0.92, 1]);
  const rot = keyframes(e, [0, 0.42, 0.72, 1], [-55, 10, -12, -8]);

  // ---- ping: expanding rings, rays and dots ----
  const pt = clamp01(lt / ms(900));
  const rt = clamp01(lt / ms(760));
  const ringE = cssEaseOut(pt);
  const rayE = cssEaseOut(rt);

  // ---- glow: peaks on impact, then breathes ----
  const impact = keyframes(clamp01(lt / ms(700)), [0, 0.35, 1], [0, 1, 0]);
  const idle = breathe(frame, ms(2200));
  const glow = Math.min(1, impact + 0.35 + 0.3 * idle);

  // ---- exit with the card ----
  const xe = clamp01((frame - exit) / ms(300));
  const opacity = 1 - xe;
  const outScale = 1 - 0.4 * xe;

  return (
    <div
      style={{
        position: 'absolute',
        left: px(CX),
        top: px(CY),
        width: 0,
        height: 0,
        zIndex: 6,
        pointerEvents: 'none',
        opacity,
        transform: `scale(${outScale})`,
      }}
    >
      {/* soft light behind the monogram */}
      <div
        style={{
          position: 'absolute',
          left: -px(110),
          top: -px(110),
          width: px(220),
          height: px(220),
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,214,102,${0.75 * glow}) 0%, rgba(255,201,60,0) 66%)`,
        }}
      />

      {/* two shock rings */}
      {[0, 0.18].map((d, i) => {
        const p = clamp01((pt - d) / (1 - d));
        const re = cssEaseOut(p);
        if (p <= 0 || p >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -px(70),
              top: -px(70),
              width: px(140),
              height: px(140),
              borderRadius: '50%',
              border: `${px(i === 0 ? 4 : 2.5)}px solid ${i === 0 ? COLORS.yellowSoft : COLORS.yellow}`,
              opacity: 0.85 * (1 - re),
              transform: `scale(${0.35 + 2.7 * re})`,
            }}
          />
        );
      })}

      {/* sparkle rays */}
      {Array.from({ length: RAYS }, (_, i) => {
        if (rt <= 0 || rt >= 1) return null;
        const long = i % 2 === 0;
        const ang = (i * 360) / RAYS + 8;
        const from = px(46);
        const dist = from + px((long ? 150 : 105) * rayE);
        const len = px((long ? 34 : 22) * (1 - rayE * 0.85));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: -px(2.5),
              width: len,
              height: px(5),
              borderRadius: px(3),
              background: long ? COLORS.yellowSoft : COLORS.yellow,
              boxShadow: `0 0 ${px(10)}px rgba(255,214,102,0.9)`,
              opacity: 1 - rayE * rayE,
              transform: `rotate(${ang}deg) translateX(${dist}px)`,
              transformOrigin: '0 50%',
            }}
          />
        );
      })}

      {/* confetti-like dots */}
      {Array.from({ length: DOTS }, (_, i) => {
        if (rt <= 0 || rt >= 1) return null;
        const ang = (i * 360) / DOTS + 22;
        const dist = px(60 + (i % 3) * 26 + 120 * rayE);
        const size = px(7 + (i % 3) * 3) * (1 - 0.6 * rayE);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -size / 2,
              top: -size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: i % 2 === 0 ? '#fff' : COLORS.yellow,
              opacity: 1 - rayE,
              transform: `rotate(${ang}deg) translateX(${dist}px)`,
            }}
          />
        );
      })}

      {/* the monogram itself */}
      <svg
        viewBox="0 0 100 126"
        style={{
          position: 'absolute',
          left: -px(34),
          top: -px(43),
          width: px(68),
          height: px(86),
          overflow: 'visible',
          transform: `scale(${scale}) rotate(${rot}deg)`,
          filter: `drop-shadow(0 ${px(6)}px ${px(8)}px rgba(0,0,0,0.5)) drop-shadow(0 0 ${px(8 + 22 * glow)}px rgba(255,200,60,${0.55 + 0.45 * glow}))`,
        }}
      >
        <defs>
          <linearGradient id="stinglg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3a6" />
            <stop offset="1" stopColor="#ffb81c" />
          </linearGradient>
        </defs>
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d={BULB} fill="none" stroke="#fff" strokeWidth="11" />
          <rect x="31" y="97" width="38" height="19" rx="7" fill="none" stroke="#fff" strokeWidth="11" />
          <rect x="39" y="113" width="22" height="10" rx="5" fill="none" stroke="#fff" strokeWidth="11" />
          <path d={BULB} fill="url(#stinglg)" stroke="#1b1b4d" strokeWidth="4" />
          <rect x="39" y="113" width="22" height="10" rx="5" fill="#7683c4" stroke="#1b1b4d" strokeWidth="4" />
          <rect x="31" y="97" width="38" height="19" rx="7" fill="#7683c4" stroke="#1b1b4d" strokeWidth="4" />
          <path d="M39 104H61M39 109H61" stroke="#1b1b4d" strokeWidth="3" />
          <path d={BOLT} fill="none" stroke="#fff" strokeWidth="8" />
          <path d={BOLT} fill="#ff3d7f" stroke="#1b1b4d" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
};
