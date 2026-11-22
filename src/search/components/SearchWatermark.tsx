/**
 * SearchWatermark: the QUIZ MATRIX badge, top right, for the Search History video. The drawing and the entrance live in
 * the shared src/ios/QuizMatrixBadge.tsx (same component as the States video); this file only places it and says where
 * the logo sprite is.
 *
 * It mirrors the HUD pill: same top, same height, right edge on SAFE_X. No pill of its own: the logo comes in alone,
 * then QUIZ over MATRIX slide out of it.
 *
 * It is mounted ONCE in SearchMain, outside the per-scene Sequences, so useDesignFrame() is the frame of the whole video:
 * the logo loop never restarts at a scene change and the entrance plays once (from `since`).
 * Logo: public/search/quiz-matrix-logo.webp, a sprite sheet of the transparent loop (82 frames at 30 fps, 9 x 10 cells
 * of 128 px), one cell per design tick.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { px } from '../../style';
import settings from '../../../settings.json';
import { HUD_H, SAFE_X } from '../../ios';
import { QuizMatrixBadge, type QuizMatrixLogo } from '../../ios/QuizMatrixBadge';
import { SLOTS } from './SearchStage';

const LOGO: QuizMatrixLogo = { file: 'search/quiz-matrix-logo.webp', cols: 9, rows: 10, frames: 82, fps: 30 };

export interface SearchWatermarkProps {
  /** design tick the badge first appears (the entrance plays from here); default 0 */
  since?: number;
}

export const SearchWatermark: React.FC<SearchWatermarkProps> = ({ since = 0 }) => {
  const frame = useDesignFrame();
  const H = px(HUD_H);
  return (
    <div style={{ position: 'absolute', zIndex: 13, top: px(SLOTS.hud.y), right: px(SAFE_X), height: H, pointerEvents: 'none' }}>
      <QuizMatrixBadge frame={frame} since={since} height={H} logo={LOGO} quiz={settings.brand.quiz} matrix={settings.brand.matrix} />
    </div>
  );
};
