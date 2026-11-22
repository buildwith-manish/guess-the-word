/**
 * StateWatermark (round two, Step 1): the States-only QUIZ MATRIX badge. The shared src/Watermark.tsx is untouched (the
 * word quiz and the pixel video still use it). Same corner and the same entrance (global frame, 0.7 s after a 0.2 s
 * delay), but in the iOS look: Inter, label colour, 0.14em tracking and a glass pill, with the animated QUIZ MATRIX bulb
 * logo (sprite sheet) in place of the old outline glyph. Pure function of the global frame.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { useDesignFrame } from '../../clock';
import { px, K } from '../../style';
import { prog, htmlEase, ms } from '../../anim';
import settings from '../../../settings.json';
import { BADGE, COLOR, FONT, RADIUS, TRACKING, WEIGHT, glassPanel } from '../look';

/**
 * The logo: one cell of the sprite sheet per design tick (82 frames at 30 fps, looping). Remotion's <Img> holds the render
 * until the sheet has loaded, so the first frame is never empty. A pure function of the frame, so it renders the same in
 * any order.
 */
const Logo: React.FC<{ frame: number }> = ({ frame }) => {
  const L = BADGE.logo;
  const size = px(L.size);
  const i = Math.floor((frame * L.fps) / 30) % L.frames;
  const col = i % L.cols;
  const row = Math.floor(i / L.cols);
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: `${-px(L.overhang)}px 0`, flex: 'none', overflow: 'hidden' }}>
      <Img
        src={staticFile(L.file)}
        style={{ position: 'absolute', left: -col * size, top: -row * size, width: size * L.cols, height: size * L.rows, maxWidth: 'none' }}
      />
    </div>
  );
};

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
        <Logo frame={frame} />
        <span>
          {settings.brand.quiz} {settings.brand.matrix}
        </span>
      </div>
    </div>
  );
};
