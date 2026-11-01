/**
 * timing.ts — settings.json + rounds.json -> an ordered, frame-accurate plan.
 * Pure arithmetic: no React, no GSAP, no DOM. Every scene in the video asks
 * this module where it is, which is what keeps the render deterministic.
 */
import settings from '../settings.json';
import rounds from './rounds.json';
import type { LevelCfg, Question, Segment, Timeline } from './types';
import { buildBonusPuzzles, type BonusPuzzle } from './bonus-engine';

export const FPS = settings.fps;
export const WIDTH = settings.width;
export const HEIGHT = settings.height;

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
  const timerFrames = Math.round((LEVELS[levelIndex]?.time ?? 6) * FPS);

  const titleFrames = withTitle ? t.titleInFrames : 0;
  const emojiStart = titleFrames + t.questionAfterTitle;
  const emojiStagger = 8;
  const emojiEnd = emojiStart + 2 * emojiStagger + 28;

  const blanksStart = emojiEnd + t.blanksAfterEmojis;
  const timerStart = blanksStart + q.word.length * 2 + 20;
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
    ? 22 + Math.round((factWords / t.voiceWordsPerSecond) * 30) + 10
    : t.answerHold;

  const exit = stamp + hold;
  return {
    levelIndex,
    timerSeconds: LEVELS[levelIndex]?.time ?? 6,
    titleFrames,
    emojiStart,
    blanksStart,
    timerStart,
    timerFrames,
    free,
    flips,
    stamp,
    hold,
    exit,
    duration: exit + t.revealExit,
    showFact,
    fact: q.fact,
  };
};

export const BONUS_CLOCK_START = () => settings.bonus.preRollFrames + settings.bonus.buildFrames + 10;

const bonusDuration = (p: BonusPuzzle) =>
  BONUS_CLOCK_START() + Math.round(p.seconds * FPS) + settings.bonus.revealHoldFrames;

/**
 * Scoreboard budget: kicker + title, then 5 rows at 22 frames each (bottom ->
 * top), the LEGEND glow and the footer. Keep in sync with Scoreboard.tsx.
 */
const SCOREBOARD_FRAMES = 168;

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
    hud: { label: string; number: number; total: number },
    watermark: boolean,
  ) =>
    push({
      kind: 'iris',
      from: cursor,
      duration: settings.timing.irisFrames,
      fromTheme,
      toTheme,
      hud,
      watermark,
    });

  push({ kind: 'hook', from: 0, duration: settings.timing.hookA + settings.timing.hookB });

  const seenLevels = new Set<number>();
  let withTitle = true;

  QUESTIONS.forEach((q, i) => {
    const levelIndex = levelIndexOf(q);
    if (!seenLevels.has(levelIndex)) {
      seenLevels.add(levelIndex);
      push({
        kind: 'levelCard',
        from: cursor,
        duration: settings.levelCardFrames,
        levelIndex,
      });
    }

    const plan = buildQuestionPlan(q, levelIndex, withTitle);
    withTitle = false;
    push({ kind: 'question', from: cursor, duration: plan.duration, index: i });

    const bonusIndex = settings.bonus.after.indexOf(i + 1);
    const puzzle = puzzles[bonusIndex];
    const isLast = i === QUESTIONS.length - 1;
    const qHud = { label: 'Q', number: i + 1, total: TOTAL };
    if (bonusIndex >= 0 && puzzle) {
      // question -> orange bonus backdrop -> (next question's theme, unless the video is over)
      pushIris(themeForQuestion(i), BONUS_THEME, qHud, true);
      push({ kind: 'bonus', from: cursor, duration: bonusDuration(puzzle), index: bonusIndex, puzzle });
      if (!isLast) {
        pushIris(
          BONUS_THEME,
          themeForQuestion(i + 1),
          { label: 'BONUS', number: bonusIndex + 1, total: settings.bonus.after.length },
          false,
        );
      }
    } else if (!isLast) {
      pushIris(themeForQuestion(i), themeForQuestion(i + 1), qHud, true);
    }
  });

  push({ kind: 'scoreboard', from: cursor, duration: SCOREBOARD_FRAMES });
  push({ kind: 'endScreen', from: cursor, duration: settings.endScreen.frames });

  return { segments, totalFrames: cursor };
};

export const TIMELINE = buildTimeline();

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
