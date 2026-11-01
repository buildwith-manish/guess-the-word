/**
 * style.ts — design tokens lifted 1:1 from the reference HTML.
 * The reference stage was 1280x720; the video is 1920x1080, so px() bakes in
 * the 1.5x scale and ms() converts the HTML's millisecond timings to frames.
 */
import type { CSSProperties } from 'react';

export const SCALE = 1.5;
export const px = (v: number) => Math.round(v * SCALE * 100) / 100;
export const ms = (v: number) => Math.round((v / 1000) * 30);

export const COLORS = {
  page: '#0b0b0f',
  ink: '#ffffff',
  yellow: '#ffd60a',
  yellowSoft: '#fff3a0',
  yellowDeep: '#ffb800',
  red: '#ff1744',
  redSoft: '#ff3b4f',
  green: '#30d158',
  orange: '#ff9f0a',
  blue: '#4d9bff',
  purple: '#9b4dff',
  inkDark: '#2a0000',
};

export const FONTS = {
  display: '"Anton", Impact, "Arial Narrow", "Noto Color Emoji", sans-serif',
  body: '"Poppins", "Segoe UI", system-ui, "Noto Color Emoji", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
  /** colour emoji, bundled so renders never depend on the machine's fonts */
  emoji: '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
};

export const S = {
  /** black letterbox bars (40px at 720p) */
  bar: px(40),
  hudTop: px(60),
  hudLeft: px(48),
  pillNumber: px(40),
  titleTop: px(52),
  titleLetter: px(38),
  titleSpacing: px(7),
  emojiTop: px(110),
  emojiBox: px(340),
  emojiGlyph: px(230),
  emojiPlus: px(54),
  emojiGap: px(20),
  resultTop: px(52),
  resultW: px(800),
  resultH: px(410),
  resultImageW: px(728),
  blanksTop: px(476),
  blankW: px(56),
  blankH: px(72),
  blankGap: px(9),
  blankFont: px(48),
  timerLeft: px(140),
  timerBottom: px(90),
  timerWidth: px(1000),
  timerTrackH: px(18),
  chipBottom: px(96),
  chipW: px(560),
  commentTop: px(504),
  factTop: px(554),
  bonusBoardTop: px(168),
  bonusBoardH: px(340),
  bonusTile: px(170),
  bonusTileSm: px(140),
  bonusLetterW: px(96),
  bonusLetterH: px(122),
  bonusCell: px(92),
  bonusAnswerTop: px(700),
  scoreboardRowW: px(800),
  scoreboardRowH: px(56),
  endScreenLeft: px(520),
  endScreenRight: px(440),
  endScreenVideoH: px(248),
};

export const abs = (style: CSSProperties): CSSProperties => ({
  position: 'absolute',
  ...style,
});

/** Glowing yellow text used across the whole video. */
export const glow = (color = COLORS.yellow, radius = 22) => ({
  color,
  textShadow: `0 0 ${px(radius)}px ${color}cc`,
});
