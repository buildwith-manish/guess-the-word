/**
 * Watermark (NFL): the QUIZ MATRIX badge (src/ios/QuizMatrixBadge.tsx; still bulb on a glass disc, no pulse, no glow).
 * Size in 1280x720 reference units through px().
 *
 * Position: the top band, on the left edge of the safe box (x = SAFE.x). The top-right of the safe area is taken on every
 * card by the card header ("n / 30") below y 72 and by the ScoreHud (right edge, y 4 to about 80), so the badge is moved
 * to the left end of the same band, clear of the centred points pill (x 540 to 740), the Rookie banner (x 260 to 1020)
 * and the ScoreHud. The rectangles it was checked against are in scripts/nfl_watermark_check.ts.
 *
 * Mounting: ONE overlay in NFL-Full above all Sequences (`WatermarkOverlay`, offsetTick 0) and, for the part
 * compositions, `withWatermark(Part, i)`, which adds the same overlay with the part's start as `offsetTick`. The Part
 * components themselves never include it, so NFL-Full does not draw it twice.
 * One entrance, right after the hook (`hookSec`); before that nothing is drawn. It fades with the outro's final fade.
 */
import React from 'react';
import { QuizMatrixBadge } from '../../ios/QuizMatrixBadge';
import type { QuizMatrixLogo } from '../../ios/QuizMatrixBadge';
import { watermarkText } from '../data';
import { SAFE, px } from '../system';
import { hookSec, outroFadeSec, partRanges, secToTicks, segments, useNflFrame } from '../timing';

export const NFL_WATERMARK_LOGO: QuizMatrixLogo = { file: 'nfl/quiz-matrix-bulb.png', cols: 1, rows: 1, frames: 1, fps: 30 };

/** Reference units. `top` puts the badge on the middle line of the ScoreHud (HUD top 4). */
export const WATERMARK = { height: 48, left: SAFE.x, top: 12 } as const; // iOS-6: same height and centre line (y 36) as the points pill and the ring chip

const outro = segments.find((s) => s.kind === 'outro');
const FADE_START = outro ? outro.to - secToTicks(outroFadeSec) : Infinity;
const FADE_END = outro ? outro.to : Infinity;

/** `offsetTick`: absolute design tick of this composition's frame 0 (0 for NFL-Full, partRanges[i].from for a part). */
export const WatermarkOverlay: React.FC<{ offsetTick?: number }> = ({ offsetTick = 0 }) => {
  const tick = useNflFrame() + offsetTick;
  const since = secToTicks(hookSec);
  if (tick < since) return null;
  const fade = tick <= FADE_START ? 1 : Math.max(0, 1 - (tick - FADE_START) / (FADE_END - FADE_START));
  if (fade <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: px(WATERMARK.left), top: px(WATERMARK.top), opacity: fade, pointerEvents: 'none' }}>
      <QuizMatrixBadge frame={tick} since={since} height={px(WATERMARK.height)} logo={NFL_WATERMARK_LOGO} quiz={watermarkText.quiz} matrix={watermarkText.matrix} />
    </div>
  );
};

/** A part composition that keeps the watermark: the part plus the overlay at the part's start. */
export const withWatermark = (Part: React.FC, partIndex: number): React.FC => {
  const Wrapped: React.FC = () => (
    <>
      <Part />
      <WatermarkOverlay offsetTick={partRanges[partIndex].from} />
    </>
  );
  return Wrapped;
};
