/**
 * Gta6Watermark: the QUIZ MATRIX watermark (still bulb on a glass disc), the same badge the search-history and
 * us-states videos use (src/ios/QuizMatrixBadge.tsx; only the logo file was copied, to public/gta6/).
 *
 * `Gta6WatermarkCorner` puts it in the top-right corner, in the slot the score counter used to have
 * (right edge on SAFE.x, top on SAFE.top). Units follow system.ts (1920 reference, u()); the entrance needs a clock
 * that never restarts, so pass `since` far in the past to show it already settled. Text comes from props.
 */
import React from 'react';
import { SAFE, u } from '../system';
import { QuizMatrixBadge } from '../../ios/QuizMatrixBadge';
import type { QuizMatrixLogo } from '../../ios/QuizMatrixBadge';

/** Still bulb, one cell (same asset as the other videos, copied to public/gta6/). */
export const GTA6_WATERMARK_LOGO: QuizMatrixLogo = {
  file: 'gta6/quiz-matrix-bulb.png',
  cols: 1,
  rows: 1,
  frames: 1,
  fps: 30,
};

export type Gta6WatermarkProps = {
  /** Design frame used for the entrance (global if you want one entrance per video). */
  globalFrame: number;
  /** Tick at which the badge first appears; a large negative number = already settled. */
  since?: number;
  /** Badge height in reference units. */
  height?: number;
  quiz: string;
  matrix: string;
};

export const Gta6Watermark: React.FC<Gta6WatermarkProps> = ({ globalFrame, since = 0, height = 96, quiz, matrix }) => (
  <QuizMatrixBadge frame={globalFrame} since={since} height={u(height)} logo={GTA6_WATERMARK_LOGO} quiz={quiz} matrix={matrix} />
);

export const Gta6WatermarkCorner: React.FC<Gta6WatermarkProps> = (props) => (
  <div style={{ position: 'absolute', right: u(SAFE.x), top: u(SAFE.top) }}>
    <Gta6Watermark {...props} />
  </div>
);
