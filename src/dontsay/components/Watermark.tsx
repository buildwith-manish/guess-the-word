/**
 * DontSayWatermark: the QUIZ MATRIX watermark, top-right corner (same badge as the GTA 6, us-states and
 * search-history videos). The badge component is src/ios/QuizMatrixBadge.tsx (allowed import); the logo file is
 * our own copy in public/dontsay/ so nothing points at public/gta6/.
 *
 * Mounted once, in Full.tsx, above every part. The entrance (logo alone, then QUIZ, then MATRIX) plays once from `since`.
 * Sizes are 1280x720 reference units through px(). The badge takes its height in screen px.
 * Words are brand labels owned by this component (not prompts, answers or rules).
 */
import React from 'react';
import { WIDTH } from '../timing';
import { QuizMatrixBadge } from '../../ios/QuizMatrixBadge';
import type { QuizMatrixLogo } from '../../ios/QuizMatrixBadge';

const px = (v: number): number => (v * WIDTH) / 1280;

export const WATERMARK_LOGO: QuizMatrixLogo = { file: 'dontsay/quiz-matrix-bulb.png', cols: 1, rows: 1, frames: 1, fps: 30 };
export const WATERMARK_WORDS = { quiz: 'QUIZ', matrix: 'MATRIX' } as const;
/** Top-right corner, reference units. Level with the hearts pill (top 48, height 44). */
export const WATERMARK_BOX = { right: 64, top: 42, height: 56 } as const;

export type DontSayWatermarkProps = {
  /** Global design tick (30 fps) of the whole video. */
  globalFrame: number;
  /** Tick the badge first appears. A large negative number = already settled. */
  since?: number;
};

export const DontSayWatermark: React.FC<DontSayWatermarkProps> = ({ globalFrame, since = 0 }) => (
  <div style={{ position: 'absolute', right: px(WATERMARK_BOX.right), top: px(WATERMARK_BOX.top) }}>
    <QuizMatrixBadge
      frame={globalFrame}
      since={since}
      height={px(WATERMARK_BOX.height)}
      logo={WATERMARK_LOGO}
      quiz={WATERMARK_WORDS.quiz}
      matrix={WATERMARK_WORDS.matrix}
    />
  </div>
);
