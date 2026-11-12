/**
 * pixel-timing.ts — frame-accurate plan for the pixelated quiz.
 * Same rules as timing.ts: pure arithmetic, everything derived from constants,
 * authored in 30 fps "design frames" and sampled at the composition's real fps.
 *
 * Flow: intro (title + scoring rules) -> level card -> questions ... -> colour wipe ->
 * BONUS round (erases 1 wrong) -> wipe -> next level ... -> scoreboard -> end screen.
 */
import { useCurrentFrame } from 'remotion';
import settings from '../../settings.json';
import { BRANDS, PIXEL_LEVELS } from './brands';
import voManifest from './pixel-voiceover-manifest.json';
import type { BonusKind, BonusPuzzle } from '../bonus-engine';
import { BRAND_BONUS_ORDER, buildBrandBonusPuzzles } from './brand-bonus';
import type { Hud, Segment } from '../types';
import type { HudPlan } from '../Hud';

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

/**
 * "Fastest guess" questions: a much shorter clock that starts at the coarsest 8x8 grid
 * and never gets finer than 16x16, so only real fans get it. The badge reuses the main
 * video's label (settings.fastest.label). Spread across the four levels, kept clear of
 * the questions right before a bonus round.
 */
export const PIXEL_FASTEST = {
  questions: [4, 16, 29, 36, 40], // brand ids (1..46)
  seconds: settings.fastest.seconds as number, // 3
  steps: [8, 10, 16], // one grid per second
  label: settings.fastest.label as string,
};
export const isFastest = (brandId: number) => PIXEL_FASTEST.questions.includes(brandId);

/**
 * Voiceover for the pixel quiz. Same rules as timing.ts, but its own clips and manifest so the
 * brand numbers never collide with the main video's q01..q50:
 *   public/voiceover/pxqq01.mp3   question line of brand 1 (the clock starts AFTER it ends)
 *   public/voiceover/pxq01.mp3    answer line of brand 1 (plays just after the reveal; hold stretches to fit)
 *   public/voiceover/pxbonusq01.mp3 / pxbonus01.mp3   the same pair for bonus round 1..4
 * scripts/voiceover-scan.js measures them into src/pixel/pixel-voiceover-manifest.json.
 * A missing clip changes nothing. Fastest-guess questions never use a question line (the badge and
 * the 3 s clock already create the urgency).
 */
const VO = settings.voiceover;
export type VoClip = { file: string; frames: number };
export type PixelVoiceKind = 'q' | 'qq' | 'bonus' | 'bonusq';
export const pixelClip = (kind: PixelVoiceKind, n: number): VoClip | undefined => {
  if (!VO.enabled) return undefined;
  const e = (voManifest as Record<string, Record<string, { file: string; seconds: number }>>)[kind]?.[String(n)];
  return e && Number.isFinite(e.seconds) && e.seconds > 0 ? { file: e.file, frames: Math.ceil(e.seconds * FPS) } : undefined;
};

/** per-question clock + voiceover plan: seconds, grid ladder and frame counts (design frames) */
export const questionClock = (brandId: number) => {
  const fast = isFastest(brandId);
  const seconds = fast ? PIXEL_FASTEST.seconds : COUNTDOWN_SECONDS;
  const countdown = seconds * FPS;

  // question line: plays once the picture has popped in, the clock starts when it ends
  const qq = fast ? undefined : pixelClip('qq', brandId);
  const timerStart = T.lead + (qq ? qq.frames : 0);
  const reveal = timerStart + countdown;

  // answer line: starts just after the reveal lands; the hold stretches so it always finishes
  const clip = pixelClip('q', brandId);
  const hold = Math.max(T.hold, clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0);

  return {
    fast,
    seconds,
    steps: fast ? PIXEL_FASTEST.steps : PIXEL_STEPS,
    countdown,
    timerStart,
    hold,
    questionVoice: qq ? { file: qq.file, frames: qq.frames, start: T.lead } : undefined,
    answerVoice: clip ? { file: clip.file, frames: clip.frames, start: reveal + VO.offsetFrames } : undefined,
    frames: timerStart + countdown + hold + T.exit,
  };
};

/** bonus rounds: pre-roll is stretched for the question line, the answer hold for the answer line */
export const pixelBonusClockStart = (bonusIndex: number) => {
  const base = settings.bonus.preRollFrames + settings.bonus.buildFrames + 10;
  const clip = pixelClip('bonusq', bonusIndex + 1);
  return clip ? Math.max(base, VO.offsetFrames + clip.frames + 10) : base;
};
export const pixelBonusRevealHold = (bonusIndex: number) => {
  const clip = pixelClip('bonus', bonusIndex + 1);
  return Math.max(settings.bonus.revealHoldFrames, clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0);
};
export const pixelBonusVoices = (bonusIndex: number, seconds: number) => {
  const q = pixelClip('bonusq', bonusIndex + 1);
  const a = pixelClip('bonus', bonusIndex + 1);
  return {
    question: q ? { file: q.file, frames: q.frames, start: VO.offsetFrames } : undefined,
    answer: a ? { file: a.file, frames: a.frames, start: pixelBonusClockStart(bonusIndex) + Math.round(seconds * FPS) + VO.offsetFrames } : undefined,
  };
};

/* ------------------------------------------------------------ scoring / bonus */

/** a bonus round (erases 1 wrong) plays after these question numbers: the end of each level */
export const PIXEL_BONUS_AFTER = [12, 25, 38, 46];
/**
 * Bonus round types, easy -> hard. Brand-photo rounds built from public/pixel-brands (no new
 * images): colour match, memory flash, extreme zoom, odd brand out. See brand-bonus.ts.
 */
export const PIXEL_BONUS_ORDER: BonusKind[] = BRAND_BONUS_ORDER;
/** "Still counting? ❌" pop-ups (kept clear of the bonus rounds) */
export const PIXEL_REMINDER_AFTER = [6, 19, 32];

export const T = {
  introA: 90, // title
  introB: settings.timing.hookB, // the three scoring rules
  levelCard: 60,
  lead: 14, // picture pops in, then the clock starts
  countdown: COUNTDOWN_SECONDS * FPS,
  sharpen: 10, // pixels resolve into the full picture
  hold: 70, // answer stays up
  exit: 8,
};
export const INTRO_FRAMES = T.introA + T.introB;

type IrisSeg = Extract<Segment, { kind: 'iris' }>;
type ReminderSeg = Extract<Segment, { kind: 'reminder' }>;

export type PixelSegment =
  | { kind: 'intro'; from: number; duration: number }
  | { kind: 'levelCard'; from: number; duration: number; level: number }
  | { kind: 'question'; from: number; duration: number; index: number; erases: number }
  | { kind: 'bonus'; from: number; duration: number; index: number; puzzle: BonusPuzzle }
  | IrisSeg
  | ReminderSeg
  | { kind: 'scoreboard'; from: number; duration: number }
  | { kind: 'endScreen'; from: number; duration: number };

export const themeForBrand = (index: number): [string, string] => {
  const lv = PIXEL_LEVELS[BRANDS[index].level];
  return [lv.accent, lv.bg];
};

/** orange backdrop of every bonus round (settings.bonus.theme) */
export const PIXEL_BONUS_THEME = settings.bonus.theme as [string, string];

const PUZZLES: BonusPuzzle[] = buildBrandBonusPuzzles();

const bonusDuration = (p: BonusPuzzle, bonusIndex: number) =>
  pixelBonusClockStart(bonusIndex) + Math.round(p.seconds * FPS) + pixelBonusRevealHold(bonusIndex);

const build = () => {
  const segments: PixelSegment[] = [];
  let cursor = 0;
  const push = (seg: PixelSegment) => {
    segments.push(seg);
    cursor += seg.duration;
  };
  const pushIris = (fromTheme: [string, string], toTheme: [string, string], hud: Hud, watermark: boolean) =>
    push({ kind: 'iris', from: cursor, duration: settings.timing.irisFrames, fromTheme, toTheme, hud, watermark, title: false, variant: 'circle' });

  push({ kind: 'intro', from: 0, duration: INTRO_FRAMES });

  let lastLevel = -1;
  let erases = 0; // bonus rounds finished so far = the "BONUS ERASES" badge
  BRANDS.forEach((b, index) => {
    if (b.level !== lastLevel) {
      lastLevel = b.level;
      push({ kind: 'levelCard', from: cursor, duration: T.levelCard, level: b.level });
    }
    push({ kind: 'question', from: cursor, duration: questionClock(b.id).frames, index, erases });

    const qHud: Hud = { label: 'Q', number: index + 1, total: BRANDS.length, erases };
    if (PIXEL_REMINDER_AFTER.includes(index + 1)) {
      push({ kind: 'reminder', from: cursor, duration: settings.reminder.frames, theme: themeForBrand(index), hud: qHud, title: false });
    }

    const bonusIndex = PIXEL_BONUS_AFTER.indexOf(index + 1);
    if (bonusIndex >= 0) {
      const puzzle = PUZZLES[bonusIndex];
      const isLast = index === BRANDS.length - 1;
      pushIris(themeForBrand(index), PIXEL_BONUS_THEME, qHud, true);
      push({ kind: 'bonus', from: cursor, duration: bonusDuration(puzzle, bonusIndex), index: bonusIndex, puzzle });
      erases += 1;
      if (!isLast) {
        pushIris(PIXEL_BONUS_THEME, themeForBrand(index + 1), { label: 'BONUS', number: bonusIndex + 1, total: PIXEL_BONUS_AFTER.length, erases }, false);
      }
    }
  });

  push({ kind: 'scoreboard', from: cursor, duration: settings.scoreboard.frames });
  push({ kind: 'endScreen', from: cursor, duration: settings.endScreen.frames });
  return { segments, totalFrames: cursor };
};

export const PIXEL_TIMELINE = build();
export const PIXEL_TOTAL_FRAMES = Math.round(PIXEL_TIMELINE.totalFrames * TIME_SCALE);
export const PIXEL_TOTAL = BRANDS.length;
export const levelCount = (level: number) => BRANDS.filter((b) => b.level === level).length;
export const LEVEL_COUNT = PIXEL_LEVELS.length;

/** progress-bar layout for the shared HUD (level blocks, bonus diamonds) */
export const PIXEL_HUD_PLAN: HudPlan = {
  total: PIXEL_TOTAL,
  bonusAfter: PIXEL_BONUS_AFTER,
  levels: PIXEL_LEVELS.map((l, i) => ({ name: l.name, accent: l.accent, count: levelCount(i) })),
};

/** first frame of the scoreboard (the music stops there, like the main video) */
export const PIXEL_MUSIC_END = (PIXEL_TIMELINE.segments.find((s) => s.kind === 'scoreboard') ?? { from: PIXEL_TIMELINE.totalFrames }).from;

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
