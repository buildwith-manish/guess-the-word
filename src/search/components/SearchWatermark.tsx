/**
 * SearchWatermark: the QUIZ MATRIX badge with the animated bulb logo, top right, for the Search History video.
 * Same idea as the States video's StateWatermark (same logo sprite), in this video's iOS look: it mirrors the HUD pill
 * (same top, same height, right edge on SAFE_X), Inter semibold, secondary label colour, a frosted iosSurface pill.
 *
 * It is mounted ONCE in SearchMain, outside the per-scene Sequences, so useDesignFrame() is the frame of the whole video:
 * the logo loop never restarts at a scene change and the entrance plays once (from `since`, 0.2 s delay, 0.7 s).
 * Logo: public/search/quiz-matrix-logo.webp, a sprite sheet of the transparent loop (82 frames at 30 fps, 9 x 10 cells
 * of 128 px), one cell per design tick. Remotion's <Img> holds the render until the sheet has loaded.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { useDesignFrame } from '../../clock';
import { px, K } from '../../style';
import { prog, htmlEase, ms } from '../../anim';
import settings from '../../../settings.json';
import { IOS, iosSurface, HUD_H, SAFE_X } from '../../ios';
import { SLOTS } from './SearchStage';

/** Knobs (fractions of the pill height unless noted). */
const BADGE = {
  file: 'search/quiz-matrix-logo.webp',
  cols: 9,
  rows: 10,
  frames: 82,
  fps: 30,
  /** logo box and how far it stands above / below the pill, as a fraction of the pill height */
  logo: 1.1,
  overhang: 0.28,
  /** label size and tracking */
  font: 0.34,
  tracking: '0.14em',
  /** shadow depth of the surface (the HUD pill uses 0.6) */
  shadow: 0.6,
};

const Logo: React.FC<{ frame: number; size: number }> = ({ frame, size }) => {
  const i = Math.floor((frame * BADGE.fps) / 30) % BADGE.frames;
  const col = i % BADGE.cols;
  const row = Math.floor(i / BADGE.cols);
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: `${-size * BADGE.overhang * 0.5}px 0`, flex: 'none', overflow: 'hidden' }}>
      <Img
        src={staticFile(BADGE.file)}
        style={{ position: 'absolute', left: -col * size, top: -row * size, width: size * BADGE.cols, height: size * BADGE.rows, maxWidth: 'none' }}
      />
    </div>
  );
};

export interface SearchWatermarkProps {
  /** design tick the badge first appears (the entrance plays from here); default 0 */
  since?: number;
}

export const SearchWatermark: React.FC<SearchWatermarkProps> = ({ since = 0 }) => {
  const frame = useDesignFrame();
  const entry = prog(frame, since + ms(200), ms(700), htmlEase);
  const H = px(HUD_H);
  return (
    <div style={{ position: 'absolute', zIndex: 13, top: px(SLOTS.hud.y), right: px(SAFE_X), height: H, pointerEvents: 'none' }}>
      <div
        style={{
          ...iosSurface(H / 2, BADGE.shadow),
          height: H,
          padding: `0 ${H * 0.45}px 0 ${H * 0.18}px`,
          display: 'flex',
          alignItems: 'center',
          gap: H * 0.16,
          fontFamily: IOS.font,
          fontWeight: IOS.weight.semibold,
          fontSize: H * BADGE.font,
          lineHeight: 1,
          letterSpacing: BADGE.tracking,
          color: IOS.color.secondary,
          whiteSpace: 'pre',
          opacity: entry,
          transform: `translateY(${(1 - entry) * -12 * K}px) scale(${0.92 + 0.08 * entry})`,
        }}
      >
        <Logo frame={frame} size={H * BADGE.logo} />
        <span>
          {settings.brand.quiz} {settings.brand.matrix}
        </span>
      </div>
    </div>
  );
};
