/**
 * QuestionNumber + Gta6Watermark + QuestionTag.
 *
 * QuestionTag is the small cluster that sits next to the timer: the question number, and right beside it the
 * QUIZ MATRIX watermark. The watermark is the shared badge from the search-history / us-states branches
 * (src/ios/QuizMatrixBadge.tsx, still bulb on a glass disc); only the logo file was copied to public/gta6/.
 *
 * Note: ScoreHud's "n / total" is the same number as the question number (it climbs by item index). Show both only
 * if that repetition is wanted.
 *
 * Units and clock follow system.ts: sizes are 1920-reference literals scaled with u(); `frame` and `at` are design
 * ticks (30 fps). The watermark entrance needs the GLOBAL design frame (so it never restarts at a scene change);
 * pass that as `globalFrame` and the tick it first appears as `watermarkSince`. Text comes from props only.
 */
import React from 'react';
import { SAFE, blurPx, colors, radius, springAt, textStyle, u } from '../system';
import type { Level } from '../data';
import { QuizMatrixBadge } from '../../ios/QuizMatrixBadge';
import type { QuizMatrixLogo } from '../../ios/QuizMatrixBadge';
import { fadeWindow } from './fade';

/** Still bulb, one cell (same asset as the other videos, copied to public/gta6/). */
export const GTA6_WATERMARK_LOGO: QuizMatrixLogo = {
  file: 'gta6/quiz-matrix-bulb.png',
  cols: 1,
  rows: 1,
  frames: 1,
  fps: 30,
};

export type QuestionNumberProps = {
  /** The question number to show (from the item's order). */
  n: number;
  /** Small label before the number (supplied by the scene). */
  label: string;
  frame: number;
  /** Local start frame. */
  at: number;
  outAt?: number;
  level?: Level;
};

export const QuestionNumber: React.FC<QuestionNumberProps> = ({ n, label, frame, at, outAt, level }) => {
  const p = springAt(frame, at, 'snappy');
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: u(12),
        padding: `${u(12)}px ${u(30)}px`,
        borderRadius: u(radius.xl),
        background: colors.glass,
        border: `${u(1.5)}px solid ${level ? colors[level] : colors.hairline}`,
        backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${u(8)}px ${u(26)}px ${colors.shadow}`,
        opacity: fadeWindow(frame, at, outAt, 6, 8),
        transform: `translateY(${u(16) * (1 - p)}px) scale(${0.94 + 0.06 * p})`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ ...textStyle('caption'), fontSize: u(30), fontWeight: 700, letterSpacing: u(2), color: colors.muted }}>
        {label}
      </span>
      <span style={{ ...textStyle('number'), fontSize: u(56), lineHeight: 1, color: colors.ink }}>{n}</span>
    </div>
  );
};

export type Gta6WatermarkProps = {
  /** Global design frame of the whole video (not the scene-local one). */
  globalFrame: number;
  /** Global tick at which the badge first appears. */
  since?: number;
  /** Badge height in reference units. */
  height?: number;
  quiz: string;
  matrix: string;
};

export const Gta6Watermark: React.FC<Gta6WatermarkProps> = ({ globalFrame, since = 0, height = 76, quiz, matrix }) => (
  <QuizMatrixBadge
    frame={globalFrame}
    since={since}
    height={u(height)}
    logo={GTA6_WATERMARK_LOGO}
    quiz={quiz}
    matrix={matrix}
  />
);

export type QuestionTagProps = QuestionNumberProps & {
  globalFrame: number;
  watermarkSince?: number;
  quiz: string;
  matrix: string;
  /** Position of the cluster's top-left, in reference units. Defaults: left margin, band between question and options. */
  left?: number;
  top?: number;
};

export const QuestionTag: React.FC<QuestionTagProps> = ({
  globalFrame,
  watermarkSince,
  quiz,
  matrix,
  left = SAFE.x,
  top = 400,
  ...number
}) => (
  <div
    style={{
      position: 'absolute',
      left: u(left),
      top: u(top),
      display: 'flex',
      alignItems: 'center',
      gap: u(36),
    }}
  >
    <QuestionNumber {...number} />
    <Gta6Watermark globalFrame={globalFrame} since={watermarkSince} quiz={quiz} matrix={matrix} />
  </div>
);
