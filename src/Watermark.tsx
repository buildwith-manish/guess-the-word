import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FONTS, px } from './style';
import { prog, breathe, htmlEase, cssEase, ms } from './anim';
import settings from '../settings.json';

const BULB = 'M50 6C76 6 92 26 92 48C92 64 82 74 74 84L70 98H30L26 84C18 74 8 64 8 48C8 26 24 6 50 6Z';
const BOLT = 'M57 20L33 55H48L41 82L68 45H53Z';

/**
 * QUIZ / MATRIX lockup with the lightbulb monogram, top-right (HTML #wm).
 * Like the page, it runs on the global clock: wmin entrance (0.7 s, 0.2 s delay),
 * wmglint every 6 s after 1.6 s, wmbreathe every 3.4 s. The `frame` prop is kept
 * for old call sites but ignored.
 */
export const Watermark: React.FC<{ frame?: number }> = () => {
  const frame = useCurrentFrame();
  const entry = prog(frame, ms(200), ms(700), htmlEase);

  // wmglint: 6 s loop, first start after 1.6 s; -130% -> 130% over the first 20% (ease), then parked
  const gt = frame - ms(1600);
  const gp = gt < 0 ? 0 : (gt % ms(6000)) / ms(6000);
  const glintX = gt < 0 ? -130 : gp < 0.2 ? -130 + 260 * cssEase(gp / 0.2) : 130;

  const glow = breathe(frame, ms(3400));

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 13,
        top: px(26),
        right: px(40),
        display: 'flex',
        alignItems: 'center',
        fontFamily: FONTS.mono,
        fontWeight: 700,
        fontSize: px(16.6),
        lineHeight: 1,
        letterSpacing: '0.2em',
        color: '#fff',
        opacity: 0.7,
        pointerEvents: 'none',
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
          background: 'linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
          border: `${px(1.44)}px solid rgba(255,255,255,0.22)`,
          backdropFilter: `blur(${px(10)}px)`,
          opacity: entry,
          transform: `translateY(${(1 - entry) * -12}px) scale(${0.92 + 0.08 * entry})`,
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
            {/* white outline pass */}
            <path d={BULB} fill="none" stroke="#fff" strokeWidth="11" />
            <rect x="31" y="97" width="38" height="19" rx="7" fill="none" stroke="#fff" strokeWidth="11" />
            <rect x="39" y="113" width="22" height="10" rx="5" fill="none" stroke="#fff" strokeWidth="11" />
            {/* bulb, caps and bolt */}
            <path d={BULB} fill="url(#wmlg)" stroke="#1b1b4d" strokeWidth="4" />
            <rect x="39" y="113" width="22" height="10" rx="5" fill="#7683c4" stroke="#1b1b4d" strokeWidth="4" />
            <rect x="31" y="97" width="38" height="19" rx="7" fill="#7683c4" stroke="#1b1b4d" strokeWidth="4" />
            <path d="M39 104H61M39 109H61" stroke="#1b1b4d" strokeWidth="3" />
            <path d={BOLT} fill="none" stroke="#fff" strokeWidth="8" />
            <path d={BOLT} fill="#ff3d7f" stroke="#1b1b4d" strokeWidth="3" />
          </g>
        </svg>
        <span style={{ display: 'flex', flexDirection: 'column', gap: px(6), lineHeight: 1 }}>
          <b style={{ display: 'block', color: '#fff' }}>{settings.brand.quiz}</b>
          <i style={{ display: 'block', fontStyle: 'normal', color: COLORS.yellow }}>{settings.brand.matrix}</i>
        </span>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.6) 50%, transparent 62%)',
            transform: `translateX(${glintX}%)`,
          }}
        />
      </div>
    </div>
  );
};
