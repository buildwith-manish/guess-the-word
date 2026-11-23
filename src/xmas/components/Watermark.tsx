/**
 * Watermark: the QUIZ MATRIX badge (src/ios/QuizMatrixBadge.tsx: still bulb on a glass disc, no pulse, no glow), the same
 * badge the NFL and GTA6 videos use. Words come from ui.ts; the logo is a copy of the shared bulb in public/xmas/.
 * Size and position are 1280x720 reference units through px().
 *
 * Position: top-right corner of the safe box (right edge on SAFE.right, centre 80% of the frame). It sits below the light
 * string (bulbs end at y 77), right of the caption box (ends x 920) and above the right tile (starts y 138).
 *
 * Mounting: PartScenes draws ONE overlay per part, above all its Sequences, with `offsetTick` = the part's first tick,
 * so XMAS-Full (which plays the parts) and XMAS-P1..P3 show it identically and it is never drawn twice.
 * Entrance: once, right after the hook (`hookSec`); nothing is drawn before. Fades with the outro's final fade.
 */
import React from 'react';
import { QuizMatrixBadge } from '../../ios/QuizMatrixBadge';
import type { QuizMatrixLogo } from '../../ios/QuizMatrixBadge';
import { REF, px } from '../shared/px';
import { SAFE } from '../system';
import { hookSec, outroFadeSec, secToTicks, segments, useXmasFrame } from '../timing';
import { UI } from '../ui';

export const XMAS_WATERMARK_LOGO: QuizMatrixLogo = { file: 'xmas/quiz-matrix-bulb.png', cols: 1, rows: 1, frames: 1, fps: 30 };

/** Reference units. `top` is the badge box top; the logo overhangs it by 0.14 x height. */
export const WATERMARK = { height: 40, right: REF.w - SAFE.right, top: 88 } as const;

const outro = segments.find((s) => s.kind === 'outro');
const FADE_START = outro ? outro.to - secToTicks(outroFadeSec) : Infinity;
const FADE_END = outro ? outro.to : Infinity;

/** `offsetTick`: absolute design tick of this composition's frame 0 (the part's first tick). */
export const WatermarkOverlay: React.FC<{ offsetTick?: number }> = ({ offsetTick = 0 }) => {
  const tick = useXmasFrame() + offsetTick;
  const since = secToTicks(hookSec);
  if (tick < since) return null;
  const fade = tick <= FADE_START ? 1 : Math.max(0, 1 - (tick - FADE_START) / (FADE_END - FADE_START));
  if (fade <= 0) return null;
  return (
    <div style={{ position: 'absolute', right: px(WATERMARK.right), top: px(WATERMARK.top), opacity: fade, pointerEvents: 'none' }}>
      <QuizMatrixBadge frame={tick} since={since} height={px(WATERMARK.height)} logo={XMAS_WATERMARK_LOGO} quiz={UI.watermark.quiz} matrix={UI.watermark.matrix} />
    </div>
  );
};

export default WatermarkOverlay;
