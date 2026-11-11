/**
 * timing.ts — settings.json + rounds.json -> an ordered, frame-accurate plan.
 * Pure arithmetic: no React, no GSAP, no DOM. Every scene in the video asks
 * this module where it is, which is what keeps the render deterministic.
 */
import settings from '../settings.json';
import rounds from './rounds.json';
import type { Hud, IrisVariant, LevelCfg, Question, Segment, Timeline } from './types';
import { buildBonusPuzzles, type BonusPuzzle } from './bonus-engine';
import voManifest from './voiceover-manifest.json';

/**
 * Native canvas: settings.json is the single source of truth - 2560x1440 at 60 fps, rendered 1:1
 * (no render scale). Layout units come from px() in style.ts (1280x720 reference x 2).
 * Motion timing: scene animations are written as durations in 1/30 s "ticks" (the unit of every
 * easing/duration constant in the scenes), which src/clock.ts samples at the full 60 fps - so each
 * animation is evaluated every 1/60 s with identical timing.
 */
export const WIDTH = settings.width;
export const HEIGHT = settings.height;
/** composition / output frame rate (settings.json) */
export const RENDER_FPS = settings.fps;
/** motion ticks per second used by the scene timing constants */
export const FPS = 30;
/** render frames per tick */
export const TIME_SCALE = RENDER_FPS / FPS;

/**
 * Voiceover. scripts/voiceover-scan.js measures every public/voiceover/qNN.* (and bonusNN.*) clip
 * into src/voiceover-manifest.json. A clip plays right after the reveal lands (offsetFrames), and
 * the reveal hold is stretched when needed so the clip always finishes (plus tailFrames) before
 * the card leaves. No clip = nothing changes.
 */
const VO = settings.voiceover;
export type VoClip = { file: string; frames: number };
export const voiceClip = (kind: 'q' | 'qq' | 'bonus' | 'bonusq', n: number): VoClip | undefined => {
  if (!VO.enabled) return undefined;
  const e = (voManifest as Record<string, Record<string, { file: string; seconds: number }>>)[kind]?.[String(n)];
  return e ? { file: e.file, frames: Math.ceil(e.seconds * FPS) } : undefined;
};

/** Single-clip voiceover (intro, outro): manifest stores it as a top-level object, not keyed by number. */
export const voiceClipNamed = (kind: 'intro' | 'outro'): VoClip | undefined => {
  if (!VO.enabled) return undefined;
  const e = (voManifest as Record<string, { file: string; seconds: string | number }>)[kind];
  return e ? { file: e.file, frames: Math.ceil(Number(e.seconds) * FPS) } : undefined;
};

/** Scoreboard clip by rank name (legend, expert, good, beginner, keepgoing) or 'intro'. */
export const voiceClipScoreboard = (rank: string): VoClip | undefined => {
  if (!VO.enabled) return undefined;
  const e = (voManifest as Record<string, Record<string, { file: string; seconds: string | number }>>).scoreboard?.[rank];
  return e ? { file: e.file, frames: Math.ceil(Number(e.seconds) * FPS) } : undefined;
};

export const LEVELS: LevelCfg[] = settings.levels as unknown as LevelCfg[];
const THEMES: string[][] = settings.levelThemes as string[][];

export const QUESTIONS: Question[] = (rounds as unknown as Question[]).map((q) => ({
  ...q,
  id: Number(q.id),
  level: String(q.level || 'EASY').toUpperCase(),
  // 0-based position of the SECOND free letter (the HTML's SPLIT digit); clamped into the word
  reveal: Math.max(
    0,
    Math.min(
      String(q.word).length - 1,
      Number.isFinite(Number(q.reveal)) ? Math.floor(Number(q.reveal)) : Math.floor(String(q.word).length / 2),
    ),
  ),
  fact: (q.fact || '').trim() || undefined,
}));

export const TOTAL = QUESTIONS.length;

export type QuestionPlan = {
  levelIndex: number;
  timerSeconds: number;
  /** a "fastest guess" question: much shorter clock + its own badge */
  fast: boolean;
  titleFrames: number;
  emojiStart: number;
  blanksStart: number;
  timerStart: number;
  timerFrames: number;
  /** free letters flipped while the clock runs (index in the word + frame), mirrors the HTML */
  free: { index: number; at: number }[];
  flips: number;
  stamp: number;
  hold: number;
  exit: number;
  duration: number;
  showFact: boolean;
  fact?: string;
  /** voiceover for the reveal, if a clip exists (start = frame inside the question) */
  vo?: { file: string; start: number; frames: number };
  /** voiceover for the question phase (plays while the timer runs), if a clip exists */
  vqQuestion?: { file: string; start: number; frames: number };
};

/** Colour pair behind question `index`: the HTML switches theme on EVERY question (LV[n % 5]). */
export const themeForQuestion = (index: number): [string, string] =>
  (THEMES[index % THEMES.length] ?? THEMES[0]) as [string, string];

/** Orange backdrop of every bonus round (the HTML's TGB). */
export const BONUS_THEME = settings.bonus.theme as [string, string];

const levelIndexOf = (q: Question) =>
  Math.max(0, LEVELS.findIndex((l) => l.name === q.level));

/**
 * Question rhythm in frames at 30fps (mirrors the reference HTML):
 *   title lockup (Q1 only) -> emoji + "+" + emoji -> letter blanks
 *   -> clock -> free letters flip at 2/3 and 1/3 of the time left (with the 💡
 *   bulbs) -> the rest flip when the clock ends -> answer stamps -> hold.
 * Every offset is derived, so editing settings.json re-flows the whole video.
 */
export const buildQuestionPlan = (
  q: Question,
  levelIndex: number,
  withTitle: boolean,
): QuestionPlan => {
  const t = settings.timing;
  const fast = (settings.fastest.questions as number[]).includes(q.id);
  const timerSeconds = fast ? settings.fastest.seconds : (LEVELS[levelIndex]?.time ?? 6);
  const timerFrames = Math.round(timerSeconds * FPS);

  const titleFrames = withTitle ? t.titleInFrames : 0;
  const emojiStart = titleFrames + t.questionAfterTitle;
  const emojiStagger = 8;
  const emojiEnd = emojiStart + 2 * emojiStagger + 28;

  const blanksStart = emojiEnd + t.blanksAfterEmojis;
  const blanksEnd = blanksStart + q.word.length * 2 + 20;

  // question-phase voiceover: plays immediately after the blanks settle,
  // then the timer starts the moment the clip ends (VO-first-then-timer).
  // When no qq clip exists the timer starts right away, same as before.
  const qqClip = voiceClip('qq', q.id);
  const qqStart = blanksEnd;
  const timerStart = blanksEnd + (qqClip && !fast ? qqClip.frames : 0);

  // Free letters, exactly like the HTML: the first letter at the first bulb, then
  // letter `reveal` at the second bulb (skipped when that is the first letter again).
  const [b1, b2] = settings.timer.bulbFractions;
  const free = [{ index: 0, at: timerStart + timerFrames * (1 - b1) }];
  if (q.reveal > 0) free.push({ index: q.reveal, at: timerStart + timerFrames * (1 - b2) });

  const flips = timerStart + timerFrames + t.answerFlipsAfterTimer;
  const stamp = flips + q.word.length * 2 + 16;

  const factWords = q.fact ? q.fact.split(/\s+/).length : 0;
  const showFact = q.id % t.factEvery === 0 && factWords > 0;
  const hold = showFact
    ? 22 + Math.round((factWords / t.voiceWordsPerSecond) * FPS) + 10
    : t.answerHold;

  // reveal voiceover: starts just after the answer stamps in; stretch hold to fit
  const clip = voiceClip('q', q.id);
  const voHold = clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0;
  const holdFinal = Math.max(hold, voHold);

  const exit = stamp + holdFinal;
  return {
    levelIndex,
    timerSeconds,
    fast,
    titleFrames,
    emojiStart,
    blanksStart,
    timerStart,
    timerFrames,
    free,
    flips,
    stamp,
    hold: holdFinal,
    exit,
    duration: exit + t.revealExit,
    showFact,
    fact: q.fact,
    vo: clip ? { file: clip.file, start: stamp + VO.offsetFrames, frames: clip.frames } : undefined,
    // qq clip fires right after blanks settle; timer is already delayed to start after it ends
    vqQuestion: qqClip && !fast
      ? { file: qqClip.file, start: qqStart, frames: qqClip.frames }
      : undefined,
  };
};

export const BONUS_CLOCK_START = (bonusIndex = 0) => {
  const base = settings.bonus.preRollFrames + settings.bonus.buildFrames + 10;
  // Stretch the pre-roll if the bonus question clip is longer than the base
  const clip = voiceClip('bonusq', bonusIndex + 1);
  if (!clip) return base;
  return Math.max(base, VO.offsetFrames + clip.frames + 10);
};

/** frames the bonus answer stays up after the clock ends (stretched to fit a voiceover clip) */
export const bonusRevealHold = (bonusIndex: number) => {
  const clip = voiceClip('bonus', bonusIndex + 1);
  return Math.max(
    settings.bonus.revealHoldFrames,
    clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0,
  );
};


/** voiceover for a bonus question-phase: plays right after the pre-roll banner exits */
export const bonusQuestionVoice = (bonusIndex: number) => {
  const clip = voiceClip('bonusq', bonusIndex + 1);
  return clip
    ? { file: clip.file, frames: clip.frames, start: VO.offsetFrames }
    : undefined;
};

/** voiceover for a bonus reveal: frame inside the bonus segment where it starts */
export const bonusVoice = (bonusIndex: number, seconds: number) => {
  const clip = voiceClip('bonus', bonusIndex + 1);
  return clip
    ? { file: clip.file, frames: clip.frames, start: BONUS_CLOCK_START(bonusIndex) + Math.round(seconds * FPS) + VO.offsetFrames }
    : undefined;
};

const bonusDuration = (p: BonusPuzzle, bonusIndex: number) =>
  BONUS_CLOCK_START(bonusIndex) + Math.round(p.seconds * FPS) + bonusRevealHold(bonusIndex);

/**
 * Scoreboard budget: kicker + title, then 5 rows at 22 frames each (bottom ->
 * top), the LEGEND glow and the footer, PLUS voiceover clips (intro + 5 ranks).
 * The base is 168 frames; if scoreboard voiceover clips exist, the segment
 * stretches to fit them all sequentially.
 */
const SCOREBOARD_BASE_FRAMES = 168;
const SCOREBOARD_ROW_BASE = 46;
const SCOREBOARD_ROW_STEP = 22;

const scoreboardFrames = (): number => {
  const rankKeys = ['intro', 'legend', 'expert', 'good', 'beginner', 'keepgoing'];
  const clips = rankKeys.map((k) => voiceClipScoreboard(k)).filter(Boolean) as VoClip[];
  if (clips.length === 0) return SCOREBOARD_BASE_FRAMES;
  // Clips play sequentially after the row animations
  const rowsEnd = SCOREBOARD_ROW_BASE + 5 * SCOREBOARD_ROW_STEP; // ~156 frames
  const clipsFrames = clips.reduce((sum, c) => sum + c.frames + 4, 0); // +4f gap between clips
  return Math.max(SCOREBOARD_BASE_FRAMES, rowsEnd + clipsFrames + 10);
};

const SCOREBOARD_FRAMES = scoreboardFrames();

/** Bonus puzzles are seed-generated: same seed -> same board -> same render. */
const PUZZLES: BonusPuzzle[] = buildBonusPuzzles(settings.bonus.after.length);

const buildTimeline = (puzzles: BonusPuzzle[] = PUZZLES): Timeline => {
  const segments: Segment[] = [];
  let cursor = 0;
  const push = <T extends Segment>(seg: T): T => {
    segments.push(seg);
    cursor += seg.duration;
    return seg;
  };

  /** colour wipe (HTML iris(): whoosh + circle of the next theme grows over the old one) */
  const pushIris = (
    fromTheme: [string, string],
    toTheme: [string, string],
    hud: Hud,
    watermark: boolean,
    title = false,
    variant: IrisVariant = 'circle',
  ) =>
    push({
      kind: 'iris',
      from: cursor,
      duration: settings.timing.irisFrames,
      fromTheme,
      toTheme,
      hud,
      watermark,
      title,
      variant,
    });

  push({ kind: 'hook', from: 0, duration: settings.timing.hookA + settings.timing.hookB });

  const seenLevels = new Set<number>();
  let withTitle = true;
  /** overlap frames for the NEXT question (only question -> question wipes) */
  let nextLead = 0;
  /** bonus rounds finished so far = the number on the BONUS ERASES badge */
  let erases = 0;

  QUESTIONS.forEach((q, i) => {
    const levelIndex = levelIndexOf(q);
    if (!seenLevels.has(levelIndex)) {
      seenLevels.add(levelIndex);
      nextLead = 0; // a level card sits between the wipe and this question: nothing to overlap with
      push({
        kind: 'levelCard',
        from: cursor,
        duration: settings.levelCardFrames,
        levelIndex,
      });
    }

    const plan = buildQuestionPlan(q, levelIndex, withTitle);
    // the page builds the title lockup once and animates it in again only after a bonus round
    withTitle = false;
    const lead = nextLead;
    nextLead = 0;
    push({ kind: 'question', from: cursor, duration: plan.duration - lead, index: i, erases, lead });

    const bonusIndex = settings.bonus.after.indexOf(i + 1);
    const puzzle = puzzles[bonusIndex];
    const isLast = i === QUESTIONS.length - 1;
    const qHud: Hud = { label: 'Q', number: i + 1, total: TOTAL, erases };
    // "Still counting? ❌" pop-up after Q10 / Q25 / Q40 (settings.reminder.after)
    if (settings.reminder.after.includes(i + 1)) {
      push({
        kind: 'reminder',
        from: cursor,
        duration: settings.reminder.frames,
        theme: themeForQuestion(i),
        hud: qHud,
        title: bonusIndex < 0,
      });
    }
    if (bonusIndex >= 0 && puzzle) {
      // question -> orange bonus backdrop -> (next question's theme, unless the video is over)
      pushIris(themeForQuestion(i), BONUS_THEME, qHud, true);
      push({ kind: 'bonus', from: cursor, duration: bonusDuration(puzzle, bonusIndex), index: bonusIndex, puzzle });
      withTitle = true; // titleOut() before the bonus -> titleIn() on the next question
      erases += 1; // the badge counts this round from its reveal onwards
      if (!isLast) {
        pushIris(
          BONUS_THEME,
          themeForQuestion(i + 1),
          { label: 'BONUS', number: bonusIndex + 1, total: settings.bonus.after.length, erases },
          false,
        );
      }
    } else if (!isLast) {
      // each level has its own wipe, chosen by the level the next question belongs to
      const wipes = settings.transitions.byLevel as IrisVariant[];
      const nextLevel = levelIndexOf(QUESTIONS[i + 1]);
      pushIris(themeForQuestion(i), themeForQuestion(i + 1), qHud, true, true, wipes[nextLevel] ?? 'circle');
      nextLead = Math.min(settings.timing.irisLead, settings.timing.irisFrames);
    }
  });

  push({ kind: 'scoreboard', from: cursor, duration: SCOREBOARD_FRAMES });

  // End screen: stretch if the outro clip is longer than the default
  const outroClip = voiceClipNamed('outro');
  const endScreenFrames = outroClip
    ? Math.max(settings.endScreen.frames, VO.offsetFrames + outroClip.frames + VO.tailFrames)
    : settings.endScreen.frames;
  push({ kind: 'endScreen', from: cursor, duration: endScreenFrames });

  return { segments, totalFrames: cursor };
};

export const TIMELINE = buildTimeline();

/** composition length in OUTPUT (60 fps) frames */
export const RENDER_TOTAL_FRAMES = Math.round(TIMELINE.totalFrames * TIME_SCALE);

export const locate = (segments: Segment[], frame: number) => {
  let idx = 0;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (frame >= segments[i].from) {
      idx = i;
      break;
    }
  }
  const seg = segments[Math.max(0, idx)] ?? segments[0];
  return { seg, local: Math.max(0, frame - (seg?.from ?? 0)), index: idx };
};
