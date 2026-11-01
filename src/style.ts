/**
 * style.ts — design tokens. One dark, cinematic base with jewel-tone accents,
 * glass surfaces and a single gold highlight colour.
 * Layout is authored on a 1280x720 grid and scaled 1.5x to 1920x1080 by px().
 */
export const SCALE = 1.5;
export const px = (v: number) => Math.round(v * SCALE * 100) / 100;

export const COLORS = {
  ink: '#F5F7FF',
  base: '#060814',
  yellow: '#FFC93C', // gold highlight
  yellowSoft: '#FFE9A8',
  yellowDeep: '#FF9F1C',
  red: '#FF4D6A',
  redSoft: '#FF7A90',
  green: '#34D399',
  cyan: '#38E1FF',
  inkDark: '#1A1205',
  glass: 'rgba(255,255,255,0.07)',
  glassStrong: 'rgba(10,12,32,0.62)',
  stroke: 'rgba(255,255,255,0.16)',
  muted: 'rgba(245,247,255,0.62)',
};

export const FONTS = {
  display: '"Anton", Impact, "Arial Narrow", "Noto Color Emoji", sans-serif',
  body: '"Poppins", "Segoe UI", system-ui, "Noto Color Emoji", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
  emoji: '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
};

/** Frosted-glass surface used by every pill / card. */
export const glass = (radius: number, alpha = 0.07): Record<string, string | number> => ({
  background: `linear-gradient(160deg, rgba(255,255,255,${alpha + 0.05}), rgba(255,255,255,${alpha * 0.4}))`,
  border: `${px(1.5)}px solid rgba(255,255,255,0.16)`,
  borderRadius: radius,
  backdropFilter: `blur(${px(10)}px)`,
  boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)`,
});

export const S = {
  /** letterbox removed: the full 1080p frame is used */
  bar: 0,
  hudTop: px(26),
  hudLeft: px(40),
  titleTop: px(24),
  titleLetter: px(38),
  titleSpacing: px(7),
  emojiTop: px(96),
  emojiGlyph: px(230),
  emojiPlus: px(54),
  resultTop: px(62),
  resultW: px(800),
  resultH: px(372),
  resultImageW: px(740),
  blanksTop: px(500),
  blankW: px(60),
  blankH: px(78),
  blankGap: px(10),
  blankFont: px(50),
  timerLeft: px(140),
  timerBottom: px(54),
  timerWidth: px(1000),
  timerTrackH: px(14),
  chipBottom: px(70),
  chipW: px(560),
  commentTop: px(504),
  factTop: px(580),
  bonusBoardTop: px(168),
  bonusBoardH: px(340),
  bonusTile: px(170),
  bonusTileSm: px(140),
  bonusLetterW: px(96),
  bonusLetterH: px(122),
  bonusCell: px(92),
  scoreboardRowW: px(800),
  scoreboardRowH: px(56),
  endScreenLeft: px(520),
  endScreenRight: px(440),
};
