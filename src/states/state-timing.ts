/**
 * state-timing.ts: the Video 4 timeline. The only place that turns states-settings.json, the
 * root settings.json (fps, size, wipe / hook / end-screen frames, voiceover offsets) and the voiceover
 * manifest into segments. All scene timing is in 30 fps "design ticks"; render frames = ticks * TIME_SCALE
 * (src/clock.ts useDesignFrame does that at 60 fps). Seconds are converted with FPS = 30.
 */
import rootSettings from '../../settings.json';
import settingsJson from './states-settings.json';
import voManifestJson from './states-voiceover-manifest.json';
import voAnalysisJson from './states-voice-analysis.json';
import { STATES } from './states-data';
import { buildBonusPuzzles } from './bonus-engine';
import type { BonusPuzzle } from './bonus-engine';
import type { BonusKind, Hud, IrisVariant, LevelCfg, Segment, StateQuestion, StatesSettings, Timeline } from './types';

const settings: StatesSettings = settingsJson;
const root = rootSettings;

export const WIDTH: number = root.width;
export const HEIGHT: number = root.height;
export const RENDER_FPS: number = root.fps;
/** design tick rate */
export const FPS = 30;
export const TIME_SCALE = RENDER_FPS / FPS;

export const LEVELS = settings.levels as unknown as LevelCfg[];
export const QUESTIONS: StateQuestion[] = STATES.map((s) => ({
  id: s.id,
  key: s.key,
  level: s.level,
  rotation: s.rotation,
  cropSide: s.cropSide,
  fact: s.fact || undefined,
}));
export const TOTAL = QUESTIONS.length;

export const levelIndexOf = (q: StateQuestion): number => LEVELS.findIndex((l) => l.name === q.level);

/** wipe colour pair for a question (its level's theme) */
export const themeForQuestion = (index: number): [string, string] =>
  LEVELS[levelIndexOf(QUESTIONS[index])].theme;

/** colour pair of the bonus backdrop (shared with the word quiz) */
export const BONUS_THEME = root.bonus.theme as [string, string];

/**
 * Question phases in ticks. These are authored here (not in a settings file); everything else a
 * question needs comes from settings. Order: [title] -> shape draws -> beat -> clock -> reveal -> hold -> exit.
 */
export const PHASE = {
  /** outline draw (StateShape progress 0 -> 1) */
  draw: 36,
  /** the "get ready" beat between the finished outline and the clock starting (the timer ring pops in and flashes) */
  beatBeforeClock: 14,
  /** fill + name build before the answer lands */
  revealBuild: 36,
};

/**
 * Bonus rounds (task 4a). The puzzles come from bonus-engine.ts (seeded, from the data); a bonus segment is
 *   preRoll (banner) + build (options appear) + clock + answer hold,
 * with preRoll, build and the answer hold from the root settings.json `bonus` block (shared with the word quiz)
 * and the clock = `seconds` of the puzzle = the clock of the level the bonus follows (states-settings levels[].time).
 * The clock starts after preRoll + build. Voiceover clips can still stretch the segment (fitClip below).
 */
export const BONUS_PUZZLES: BonusPuzzle[] = buildBonusPuzzles();
export const BONUS_PHASE = {
  preRoll: root.bonus.preRollFrames,
  build: root.bonus.buildFrames,
  answerHold: root.bonus.revealHoldFrames,
};
/** earliest tick (from the start of the bonus segment) the clock starts, with no voiceover */
export const BONUS_CLOCK_START = BONUS_PHASE.preRoll + BONUS_PHASE.build;
/** length of the clock of bonus slot `slot` (0-based), in ticks */
export const bonusClockFrames = (slot: number): number => BONUS_PUZZLES[slot].seconds * FPS;
/**
 * Tick (from the start of the bonus segment) the clock of bonus slot `slot` (0-based) starts: the usual
 * preRoll + build, or later when the bonus question clip (voiceover offset + clip + tail) is still playing, so the
 * question is always read out BEFORE the clock starts.
 */
export const bonusClockStart = (slot: number): number => {
  const clip = voiceBonusQuestion(slot + 1);
  return clip ? Math.max(BONUS_CLOCK_START, VO.offsetFrames + clip.frames + VO.tailFrames) : BONUS_CLOCK_START;
};
/** segment length of bonus slot `slot` (0-based) before any voiceover stretch, in ticks */
export const bonusBaseFrames = (slot: number): number => bonusClockStart(slot) + bonusClockFrames(slot) + BONUS_PHASE.answerHold;
/**
 * Segment length with the answer clip: the answer lands when the clock ends and the clip starts `offsetFrames` after
 * that (reveal first, then voice); a clip longer than the answer hold stretches the segment.
 */
export const bonusSegmentFrames = (slot: number): number => {
  const answer = voiceBonus(slot + 1);
  const voEnd = answer ? bonusClockStart(slot) + bonusClockFrames(slot) + VO.offsetFrames + answer.frames + VO.tailFrames : 0;
  return Math.max(bonusBaseFrames(slot), voEnd);
};

// ---------------------------------------------------------------- voiceover
const VO = root.voiceover;
export type VoClip = { file: string; frames: number };
type VoEntry = { file: string; seconds: number | string } | null | undefined;
type VoManifest = {
  intro: VoEntry;
  level: Record<string, VoEntry>;
  /** question-phase clip, played as the outline draws; the clock waits for it (key = question id) */
  question?: Record<string, VoEntry>;
  reveal: Record<string, VoEntry>;
  bonus: Record<string, VoEntry>;
  bonusq: Record<string, VoEntry>;
  scoreboard: Record<string, VoEntry>;
  outro: VoEntry;
};
const manifest = voManifestJson as unknown as VoManifest;

const clipOf = (e: VoEntry): VoClip | undefined => {
  if (!VO.enabled || !e) return undefined;
  const secs = Number(e.seconds);
  return Number.isFinite(secs) && secs > 0 ? { file: e.file, frames: Math.ceil(secs * FPS) } : undefined;
};
export const voiceIntro = () => clipOf(manifest.intro);
export const voiceOutro = () => clipOf(manifest.outro);
export const voiceLevel = (levelName: string) => clipOf(manifest.level[levelName]);
/** Analysis of a clip (scripts/states-voiceover-scan.js): voice level per tick, speech start / end, reveal split. */
export type VoAnalysis = { env: number[]; start: number; end: number; split?: number };
const analysisOf = (file: string): VoAnalysis | undefined => (voAnalysisJson as unknown as Record<string, VoAnalysis>)[file];
/** voice level 0..1 of clip `file` at tick `t` (since the clip started), 0 outside it or without analysis */
export const voiceLevelAt = (file: string, t: number): number => {
  const env = analysisOf(file)?.env;
  if (!env || t < 0 || t >= env.length) return 0;
  const i = Math.floor(t);
  const a = env[i] ?? 0;
  const b = env[Math.min(env.length - 1, i + 1)] ?? a;
  return (a + (b - a) * (t - i)) / 100;
};
export const voiceQuestion = (questionId: number) => clipOf(manifest.question?.[String(questionId)]);
export const voiceReveal = (questionId: number) => clipOf(manifest.reveal[String(questionId)]);
export const voiceBonus = (slot: number) => clipOf(manifest.bonus[String(slot)]);
export const voiceBonusQuestion = (slot: number) => clipOf(manifest.bonusq[String(slot)]);
export const voiceScoreboard = (rankId: string) => clipOf(manifest.scoreboard[rankId.toLowerCase()]);

/** a clip starts offsetFrames into its segment and the segment waits tailFrames after it */
const fitClip = (base: number, clip: VoClip | undefined) =>
  clip ? Math.max(base, VO.offsetFrames + clip.frames + VO.tailFrames) : base;

// ---------------------------------------------------------------- question plan
export type StateQuestionPlan = {
  index: number;
  id: number;
  key: string;
  level: string;
  levelIndex: number;
  /** seconds on the clock (the fastest-guess seconds when `fast`) */
  timerSeconds: number;
  fast: boolean;
  titleFrames: number;
  /** outline starts drawing */
  drawStart: number;
  drawFrames: number;
  /** the outline is finished and the "get ready" beat starts (the clock starts at timerStart) */
  readyStart: number;
  timerStart: number;
  timerFrames: number;
  /** tick of each hint (1/3 and 2/3 of the clock) */
  hintAt: number[];
  /** fill + name begin to build */
  revealStart: number;
  /** answer lands */
  stamp: number;
  /** frames the answer stays up (min hold, stretched for a reveal clip) */
  hold: number;
  exit: number;
  duration: number;
  /** tick the state name is shown on the answer card (when it is spoken; the stamp without a clip) */
  nameAt: number;
  /** tick the capital is shown on the answer card (when it is spoken; the stamp without a clip) */
  capitalAt: number;
  /** reveal clip: starts offsetFrames after the stamp (reveal first, then voice) */
  vo?: { file: string; start: number; frames: number };
  /** question clip: starts offsetFrames after the outline starts drawing; the clock starts after it */
  questionVo?: { file: string; start: number; frames: number };
};

export const buildQuestionPlan = (index: number, withTitle = false): StateQuestionPlan => {
  const q = QUESTIONS[index];
  const levelIndex = levelIndexOf(q);
  const t = root.timing;
  const fast = (settings.fastest.questions as number[]).includes(q.id);
  const timerSeconds = fast ? settings.fastest.seconds : LEVELS[levelIndex].time;
  const timerFrames = Math.round(timerSeconds * FPS);

  const titleFrames = withTitle ? t.titleInFrames : 0;
  const drawStart = titleFrames + t.questionAfterTitle;
  // the question clip plays first and the outline draws for exactly as long as it is heard (never shorter than
  // PHASE.draw); then the "get ready" beat, then the clock
  const qClip = voiceQuestion(q.id);
  const questionVoStart = drawStart + VO.offsetFrames;
  const drawFrames = qClip ? Math.max(PHASE.draw, VO.offsetFrames + qClip.frames) : PHASE.draw;
  const readyStart = drawStart + drawFrames;
  const timerStart = readyStart + Math.max(PHASE.beatBeforeClock, qClip ? VO.tailFrames : 0);
  const hintAt = settings.hints.fractions.map((f) => timerStart + timerFrames * f);

  const revealStart = timerStart + timerFrames + t.answerFlipsAfterTimer;
  const stamp = revealStart + PHASE.revealBuild;

  // the answer stays up at least reveal.minHoldSeconds; a longer reveal clip stretches it
  const minHold = Math.round(settings.reveal.minHoldSeconds * FPS);
  const clip = voiceReveal(q.id);
  const voHold = clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0;
  // the answer card shows the name when it is spoken and the capital when it is spoken (both at the stamp without a clip)
  const an = clip ? analysisOf(clip.file) : undefined;
  const voiceAt = (tick: number | undefined) => stamp + VO.offsetFrames + Math.max(0, tick ?? 0);
  const nameAt = clip ? Math.max(stamp, voiceAt(an?.start)) : stamp;
  const capitalAt = clip ? Math.min(stamp + Math.max(minHold, voHold) - 1, Math.max(nameAt, voiceAt(an?.split ?? an?.start))) : stamp;
  const hold = Math.max(minHold, voHold);

  const exit = stamp + hold;
  return {
    index,
    id: q.id,
    key: q.key,
    level: q.level,
    levelIndex,
    timerSeconds,
    fast,
    titleFrames,
    drawStart,
    drawFrames,
    readyStart,
    timerStart,
    timerFrames,
    hintAt,
    revealStart,
    stamp,
    nameAt,
    capitalAt,
    hold,
    exit,
    duration: exit + t.revealExit,
    vo: clip ? { file: clip.file, start: stamp + VO.offsetFrames, frames: clip.frames } : undefined,
    questionVo: qClip ? { file: qClip.file, start: questionVoStart, frames: qClip.frames } : undefined,
  };
};

// ---------------------------------------------------------------- scoreboard / end screen
const scoreboardFrames = (): number => {
  const ids = ['intro', ...settings.ranks.map((r) => r.id.toLowerCase())];
  const clips = ids.map((k) => voiceScoreboard(k)).filter(Boolean) as VoClip[];
  const base = root.scoreboard.frames;
  if (clips.length === 0) return base;
  const rowsEnd = 46 + settings.ranks.length * 22; // row build, same layout as the word quiz
  return Math.max(base, rowsEnd + clips.reduce((sum, c) => sum + c.frames + 4, 0) + 10);
};

// ---------------------------------------------------------------- timeline
const buildTimeline = (): Timeline => {
  const segments: Segment[] = [];
  let cursor = 0;
  const push = <T extends Segment>(seg: T): T => {
    segments.push(seg);
    cursor += seg.duration;
    return seg;
  };
  const pushIris = (
    fromTheme: [string, string],
    toTheme: [string, string],
    hud: Hud,
    watermark: boolean,
    title = false,
    variant: IrisVariant = 'circle',
  ) =>
    push({ kind: 'iris', from: cursor, duration: root.timing.irisFrames, fromTheme, toTheme, hud, watermark, title, variant });

  push({ kind: 'hook', from: 0, duration: fitClip(root.timing.hookA + root.timing.hookB, voiceIntro()) });

  const seenLevels = new Set<number>();
  let withTitle = true;
  let nextLead = 0;
  let erases = 0;
  const slots = settings.bonus.after;
  const kinds = settings.bonus.kinds as BonusKind[];
  const wipes = root.transitions.byLevel as IrisVariant[];

  QUESTIONS.forEach((q, i) => {
    const levelIndex = levelIndexOf(q);
    if (!seenLevels.has(levelIndex)) {
      seenLevels.add(levelIndex);
      nextLead = 0;
      push({
        kind: 'levelCard',
        from: cursor,
        duration: fitClip(settings.levelCardFrames, voiceLevel(q.level)),
        levelIndex,
      });
    }

    const plan = buildQuestionPlan(i, withTitle);
    withTitle = false;
    const lead = nextLead;
    nextLead = 0;
    push({ kind: 'question', from: cursor, duration: plan.duration - lead, index: i, erases, lead });

    const slot = slots.indexOf(i + 1);
    const isLast = i === QUESTIONS.length - 1;
    const qHud: Hud = { label: 'Q', number: i + 1, total: TOTAL, erases };

    if (settings.reminder.after.includes(i + 1)) {
      push({ kind: 'reminder', from: cursor, duration: settings.reminder.frames, theme: themeForQuestion(i), hud: qHud, title: slot < 0 });
    }
    if (slot >= 0) {
      pushIris(themeForQuestion(i), BONUS_THEME, qHud, true);
      const bonusFrames = bonusSegmentFrames(slot);
      push({ kind: 'bonus', from: cursor, duration: bonusFrames, index: slot, bonusKind: kinds[slot] });
      withTitle = true;
      erases += 1;
      if (!isLast) {
        pushIris(BONUS_THEME, themeForQuestion(i + 1), { label: 'BONUS', number: slot + 1, total: slots.length, erases }, false);
      }
    } else if (!isLast) {
      const next = Math.min(levelIndexOf(QUESTIONS[i + 1]), wipes.length - 1);
      pushIris(themeForQuestion(i), themeForQuestion(i + 1), qHud, true, true, wipes[next] ?? 'circle');
      nextLead = Math.min(root.timing.irisLead, root.timing.irisFrames);
    }
  });

  push({ kind: 'scoreboard', from: cursor, duration: scoreboardFrames() });
  push({ kind: 'endScreen', from: cursor, duration: fitClip(root.endScreen.frames, voiceOutro()) });

  return { segments, totalFrames: cursor };
};

export const TIMELINE = buildTimeline();

/** composition length in OUTPUT (RENDER_FPS) frames */
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
