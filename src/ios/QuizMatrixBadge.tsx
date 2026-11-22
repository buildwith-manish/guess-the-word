/**
 * QuizMatrixBadge: the QUIZ MATRIX watermark, one component for both videos (States and Search History).
 *
 * iOS look, no pill: the animated bulb logo on the left, the two words stacked on its right, QUIZ above MATRIX
 * (QUIZ in the label colour, semibold; MATRIX in the secondary colour, medium), Inter, wide tracking, slightly
 * transparent so it never competes with the question. The logo is the same sprite sheet as before (82 frames at 30 fps,
 * looping), unchanged.
 *
 * Entrance (badge-motion.ts): the logo appears ALONE first, then QUIZ slides out of it, then MATRIX. The space for the
 * words is reserved from the first frame, so the logo never shifts when they arrive.
 *
 * It does not position itself. The caller wraps it in an absolutely placed box of height `height` (screen px) and passes
 * the global design frame (`useDesignFrame()` outside any Sequence) so the logo loop and the entrance never restart.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { px } from '../style';
import { IOS } from './tokens';
import { badgeMotion, BADGE_SLIDE } from './badge-motion';

export type QuizMatrixLogo = {
  /** public/ path of the sprite sheet */
  file: string;
  cols: number;
  rows: number;
  frames: number;
  fps: number;
};

/** Look knobs (fractions of `height` unless noted). */
const LOOK = {
  /** logo box; it stands out of the box a little above and below, like the bulb in the old pill did */
  logo: 1.1,
  overhang: 0.14,
  /** space between the logo and the words */
  gap: 0.14,
  /** type */
  font: 0.32,
  line: 1.12,
  tracking: '0.18em',
  /** the whole badge is a watermark: a little see-through */
  opacity: 0.92,
};

export interface QuizMatrixBadgeProps {
  /** design frame of the whole video (30 ticks per second) */
  frame: number;
  /** design tick at which the badge first appears (the entrance plays from here) */
  since?: number;
  /** badge height in screen px (use the HUD pill's height so the two line up) */
  height: number;
  logo: QuizMatrixLogo;
  quiz: string;
  matrix: string;
}

const Logo: React.FC<{ frame: number; size: number; logo: QuizMatrixLogo; opacity: number; scale: number }> = ({ frame, size, logo, opacity, scale }) => {
  const i = Math.floor((frame * logo.fps) / 30) % logo.frames;
  const col = i % logo.cols;
  const row = Math.floor(i / logo.cols);
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: `${-size * LOOK.overhang}px 0`,
        flex: 'none',
        overflow: 'hidden',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <Img
        src={staticFile(logo.file)}
        style={{ position: 'absolute', left: -col * size, top: -row * size, width: size * logo.cols, height: size * logo.rows, maxWidth: 'none' }}
      />
    </div>
  );
};

export const QuizMatrixBadge: React.FC<QuizMatrixBadgeProps> = ({ frame, since = 0, height, logo, quiz, matrix }) => {
  const m = badgeMotion(frame, since, 2);
  const slide = px(BADGE_SLIDE);
  const word = (text: string, i: number, weight: number, color: string) => (
    <span
      style={{
        display: 'block',
        fontWeight: weight,
        color,
        opacity: m.words[i].opacity,
        transform: `translateX(${-m.words[i].offset * slide}px)`,
      }}
    >
      {text}
    </span>
  );
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        gap: height * LOOK.gap,
        opacity: LOOK.opacity,
        fontFamily: IOS.font,
        fontSize: height * LOOK.font,
        lineHeight: LOOK.line,
        letterSpacing: LOOK.tracking,
        whiteSpace: 'pre',
        pointerEvents: 'none',
      }}
    >
      <Logo frame={frame} size={height * LOOK.logo} logo={logo} opacity={m.logo.opacity} scale={m.logo.scale} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {word(quiz, 0, IOS.weight.semibold, IOS.color.label)}
        {word(matrix, 1, IOS.weight.medium, IOS.color.secondary)}
      </div>
    </div>
  );
};
