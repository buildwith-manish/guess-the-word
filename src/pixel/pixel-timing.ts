/**
 * pixel-timing.ts — frame-accurate plan for the pixelated quiz.
 * Same rules as timing.ts: pure arithmetic, everything derived from constants,
 * authored in 30 fps "design frames" and sampled at the composition's real fps.
 */
import { useCurrentFrame } from 'remotion';
import settings from '../../settings.json';
import { BRANDS, PIXEL_LEVELS } from './brands';

export const WIDTH = settings.width;
export const HEIGHT = settings.height;
export const RENDER_FPS = settings.fps;
export const FPS = 30;
export const TIME_SCALE = RENDER_FPS / FPS;

/** current time in design frames (fractional) */
export const usePixelFrame = () => useCurrentFrame() / TIME_SCALE;

/** seconds of guessing per question */
export const COUNTDOWN_SECONDS = 5;

/**
 * The difficulty ladder: cells across the (square) picture for each second of the
 * countdown. 0-1 s is the 8x8 "only hardcore fans" frame; 3-4 s is 32x32.
 * At the end of second 5 the image snaps to full resolution (the reveal).
 */
export const PIXEL_STEPS = [8, 12, 20, 32, 48];

export const T = {
  intro: 90,
  levelCard: 60,
  lead: 14, // picture pops in, then the clock starts
  countdown: COUNTDOWN_SECONDS * FPS,
  sharpen: 10, // pixels resolve into the full picture
  hold: 70, // answer stays up
  exit: 8,
};
export const QUESTION_FRAMES = T.lead + T.countdown + T.hold + T.exit;

export type PixelSegment =
  | { kind: 'intro'; from: number; duration: number }
  | { kind: 'levelCard'; from: number; duration: number; level: number }
  | { kind: 'question'; from: number; duration: number; index: number }
  | { kind: 'endScreen'; from: number; duration: number };

const build = () => {
  const segments: PixelSegment[] = [];
  let cursor = 0;
  const push = (seg: PixelSegment) => {
    segments.push(seg);
    cursor += seg.duration;
  };
  push({ kind: 'intro', from: 0, duration: T.intro });
  let lastLevel = -1;
  BRANDS.forEach((b, index) => {
    if (b.level !== lastLevel) {
      lastLevel = b.level;
      push({ kind: 'levelCard', from: cursor, duration: T.levelCard, level: b.level });
    }
    push({ kind: 'question', from: cursor, duration: QUESTION_FRAMES, index });
  });
  push({ kind: 'endScreen', from: cursor, duration: settings.endScreen.frames });
  return { segments, totalFrames: cursor };
};

export const PIXEL_TIMELINE = build();
export const PIXEL_TOTAL_FRAMES = Math.round(PIXEL_TIMELINE.totalFrames * TIME_SCALE);
export const PIXEL_TOTAL = BRANDS.length;
export const levelCount = (level: number) => BRANDS.filter((b) => b.level === level).length;
export const LEVEL_COUNT = PIXEL_LEVELS.length;

export const locate = (frame: number) => {
  const segs = PIXEL_TIMELINE.segments;
  let idx = 0;
  for (let i = segs.length - 1; i >= 0; i--) {
    if (frame >= segs[i].from) {
      idx = i;
      break;
    }
  }
  return { seg: segs[idx], local: Math.max(0, frame - segs[idx].from), index: idx };
};
