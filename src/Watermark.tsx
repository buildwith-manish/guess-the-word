import React from 'react';
import { COLORS, FONTS, px } from './style';
import { prog, breathe } from './anim';
import { backOut } from './gsap-helpers';
import settings from '../settings.json';

/** QUIZ / MATRIX lockup with the lightbulb monogram, top-right. */
export const Watermark: React.FC<{ frame: number }> = ({ frame }) => {
  const entry = prog(frame, 18, 21, backOut);
  const glint = ((frame - 48) / (6 * 30)) % 1;
  const glow = breathe(frame, 102);

  return (
    <div
      style={{
        position: 'absolute',
        top: px(60),
        right: px(56),
        display: 'flex',
        alignItems: 'center',
        fontFamily: FONTS.mono,
        fontWeight: 700,
        fontSize: px(16.6),
        letterSpacing: '0.2em',
        color: '#fff',
        opacity: 0.7 * entry,
        transform: `translateY(${(1 - entry) * -12}px) scale(${0.92 + 0.08 * entry})`,
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: px(11.5),
          padding: `${px(7.2)}px ${px(17.3)}px ${px(7.2)}px ${px(10)}px`,
          borderRadius: px(28.8),
          background: 'rgba(14,8,60,0.42)',
          border: `${px(1.44)}px solid rgba(255,255,255,0.4)`,
        }}
      >
        <svg
          viewBox="0 0 100 126"
          style={{
            height: px(38.9),
            width: 'auto',
            display: 'block',
            filter: `drop-shadow(0 0 ${px(4 + 8 * glow)}px rgba(255,200,60,${0.5 + 0.5 * glow}))`,
          }}
        >
          <defs>
            <linearGradient id="wmlg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff3a6" />
              <stop offset="1" stopColor="#ffb81c" />
            </linearGradient>
          </defs>
          <g strokeLinejoin="round" strokeLinecap="round">
            <path
              d="M50 6C76 6 92 26 92 48C92 64 82 74 74 84L70 98H30L26 84C18 74 8 64 8 48C8 26 24 6 50 6Z"
              fill="url(#wmlg)"
              stroke="#1b1b4d"
              strokeWidth="4"
            />
            <rect x="31" y="97" width="38" height="19" rx="7" fill="#7683c4" stroke="#1b1b4d" strokeWidth="4" />
            <rect x="39" y="113" width="22" height="10" rx="5" fill="#7683c4" stroke="#1b1b4d" strokeWidth="4" />
            <path d="M39 104H61M39 109H61" stroke="#1b1b4d" strokeWidth="3" />
            <path d="M57 20L33 55H48L41 82L68 45H53Z" fill="#ff3d7f" stroke="#1b1b4d" strokeWidth="3" />
          </g>
        </svg>
        <span style={{ display: 'flex', flexDirection: 'column', gap: px(6), lineHeight: 1 }}>
          <b style={{ color: '#fff' }}>{settings.brand.quiz}</b>
          <i style={{ fontStyle: 'normal', color: COLORS.yellow }}>{settings.brand.matrix}</i>
        </span>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.6) 50%, transparent 62%)',
            transform: `translateX(${glint < 0.2 ? -130 + (glint / 0.2) * 260 : 130}%)`,
          }}
        />
      </div>
    </div>
  );
};
