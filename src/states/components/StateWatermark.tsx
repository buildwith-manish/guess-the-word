/**
 * StateWatermark (round two, Step 1): the States-only QUIZ MATRIX badge. The shared src/Watermark.tsx is untouched (the
 * word quiz and the pixel video still use it). Same corner and the same entrance (global frame, 0.7 s after a 0.2 s
 * delay), but in the iOS look: Inter, label colour, 0.14em tracking, a thin neutral bulb outline and a glass pill.
 * No gold, no mono font, no glint and no glow loop (calm). Pure function of the global frame.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { px, K } from '../../style';
import { prog, htmlEase, ms } from '../../anim';
import settings from '../../../settings.json';
import { BADGE, COLOR, FONT, RADIUS, TRACKING, WEIGHT, glassPanel } from '../look';

/** A thin, rounded SF-Symbols-style bulb: outline only, round caps and joins. */
const BulbGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" style={{ height: px(BADGE.iconHeight), width: px(BADGE.iconHeight), display: 'block' }}>
    <g fill="none" stroke={COLOR.text.primary} strokeWidth={BADGE.iconStroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
      <path d="M9.8 18.5h4.4M10.6 21h2.8" />
    </g>
  </svg>
);

export const StateWatermark: React.FC = () => {
  const frame = useDesignFrame();
  const entry = prog(frame, ms(200), ms(700), htmlEase);
  return (
    <div style={{ position: 'absolute', zIndex: 13, top: px(BADGE.top), right: px(BADGE.right), pointerEvents: 'none' }}>
      <div
        style={{
          ...glassPanel(RADIUS.pill, undefined, BADGE.depth),
          display: 'flex',
          alignItems: 'center',
          gap: px(BADGE.gap),
          padding: `${px(BADGE.padY)}px ${px(BADGE.padX)}px ${px(BADGE.padY)}px ${px(BADGE.padX - 6)}px`,
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.strong,
          fontSize: px(BADGE.fontSize),
          lineHeight: 1,
          letterSpacing: TRACKING.label,
          color: COLOR.text.label,
          opacity: entry,
          transform: `translateY(${(1 - entry) * -12 * K}px) scale(${0.92 + 0.08 * entry})`,
        }}
      >
        <BulbGlyph />
        <span>
          {settings.brand.quiz} {settings.brand.matrix}
        </span>
      </div>
    </div>
  );
};
