/** search-timing.ts: the frame plan for the search-history video.
 *
 *  Same pattern as src/timing.ts (cursor + push, locate), but it reads
 *  search-data.ts and search-settings.json. Everything here is in 30 fps
 *  design frames ("ticks"); RENDER_TOTAL_FRAMES is the 60 fps composition length.
 *
 *  Lengths that search-settings.json has no key for (hook, colour wipe, level
 *  title-in, scoreboard, end screen, exit, bonus pre-roll) are read from the
 *  shared root settings.json, never hard-coded here.
 *
 *  Voiceover (optional): search-voiceover-manifest.json. An empty manifest
 *  changes nothing. A clip longer than its hold stretches that hold. */
import rootSettings from '../../settings.json';
import cfg from './search-settings.json';
import voManifest from './search-voiceover-manifest.json';
import { BONUS, ROUNDS } from './search-data';
import type { BonusSegment, Hud, IrisVariant, LevelCfg, Segment, Timeline } from './types';

export const WIDTH = rootSettings.width;
export const HEIGHT = rootSettings.height;
export const RENDER_FPS = rootSettings.fps;
export const FPS = 30; // design frames per second
export const TIME_SCALE = RENDER_FPS / FPS;

export const TOTAL = ROUNDS.length;
export const LEVELS: LevelCfg[] = cfg.levels as unknown as LevelCfg[];
export const BONUS_THEME = cfg.bonus.theme as [string, string];

const T = rootSettings.timing;
const VO = rootSettings.voiceover;
const toTicks = (seconds: number) => Math.round(seconds * FPS);

// ---------------------------------------------------------------- voiceover

export type VoClip = { file: string; frames: number };
type VoEntry = { file: string; seconds: number | string } | null | undefined;

const clipOf = (e: VoEntry): VoClip | undefined => {
  if (!VO.enabled || !e) return undefined;
  const secs = Number(e.seconds);
  return Number.isFinite(secs) && secs > 0 ? { file: e.file, frames: Math.ceil(secs * FPS) } : undefined;
};
const vo = voManifest as unknown as {
  intro: VoEntry;
  level: Record<string, VoEntry>;
  reveal: Record<string, VoEntry>;
  bonus: Record<string, VoEntry>;
  scoreboard: Record<string, VoEntry>;
  outro: VoEntry;
};
/** frames a hold must last so the clip finishes (plus tail) before the card leaves */
const needFor = (clip?: VoClip) => (clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0);

export const voiceIntro = () => clipOf(vo.intro);
export const voiceOutro = () => clipOf(vo.outro);
export const voiceLevel = (levelIndex: number) => clipOf(vo.level[String(levelIndex + 1)]);
/** round id (1-30) */
export const voiceReveal = (roundId: number) => clipOf(vo.reveal[String(roundId)]);
/** bonus number (1-3) */
export const voiceBonus = (bonusNumber: number) => clipOf(vo.bonus[String(bonusNumber)]);
/** rank key: legend, expert, good, beginner, keepgoing */
export const voiceScoreboard = (rank: string) => clipOf(vo.scoreboard[rank]);

// ------------------------------------------------------------------- levels

const levelIndexOfRound = (index: number) => {
  const i = LEVELS.findIndex((l) => l.name === ROUNDS[index].level);
  if (i < 0) throw new Error(`round ${index + 1}: unknown level ${ROUNDS[index].level}`);
  return i;
};
export const themeForRound = (index: number): [string, string] => LEVELS[levelIndexOfRound(index)].theme;
const wipeFor = (levelIndex: number): IrisVariant =>
  ((rootSettings.transitions.byLevel as IrisVariant[])[levelIndex] ?? 'circle');

// -------------------------------------------------------------------- plans

/** All offsets are design frames from the start of the round scene (lead frames not removed). */
export type RoundPlan = {
  index: number;
  level: LevelCfg;
  levelIndex: number;
  /** frames before the clock starts (search bar builds in) */
  clockStart: number;
  /** clock length */
  clockFrames: number;
  /** start frame of each of the 4 searches (clue 1 hardest ... clue 4 easiest) */
  searchAt: [number, number, number, number];
  hintAt: number;
  /** the answer is revealed (= clockStart + clockFrames) */
  revealAt: number;
  /** frames the answer stays up (min hold, stretched by a longer voiceover clip) */
  holdFrames: number;
  /** frames to leave the screen after the hold */
  exitFrames: number;
  duration: number;
  vo?: VoClip;
};

export const buildRoundPlan = (index: number): RoundPlan => {
  const levelIndex = levelIndexOfRound(index);
  const level = LEVELS[levelIndex];
  const clockStart = T.titleInFrames;
  const clockFrames = toTicks(level.time);
  const at = (f: number) => clockStart + Math.round(f * clockFrames);
  const clip = voiceReveal(ROUNDS[index].id);
  const holdFrames = Math.max(toTicks(cfg.reveal.minHoldSeconds), needFor(clip));
  const exitFrames = T.revealExit;
  return {
    index,
    level,
    levelIndex,
    clockStart,
    clockFrames,
    searchAt: cfg.searchAt.map(at) as RoundPlan['searchAt'],
    hintAt: at(cfg.hintAt),
    revealAt: clockStart + clockFrames,
    holdFrames,
    exitFrames,
    duration: clockStart + clockFrames + holdFrames + exitFrames,
    vo: clip,
  };
};

export type BonusPlan = {
  index: number;
  clockStart: number;
  clockFrames: number;
  revealAt: number;
  holdFrames: number;
  exitFrames: number;
  duration: number;
  vo?: VoClip;
};

export const buildBonusPlan = (index: number): BonusPlan => {
  if (!BONUS[index]) throw new Error(`no bonus puzzle ${index + 1}`);
  const clockStart = rootSettings.bonus.preRollFrames;
  const clockFrames = toTicks(cfg.bonus.clockSeconds);
  const clip = voiceBonus(index + 1);
  const holdFrames = Math.max(cfg.bonus.answerHoldTicks, needFor(clip));
  const exitFrames = T.revealExit;
  return {
    index,
    clockStart,
    clockFrames,
    revealAt: clockStart + clockFrames,
    holdFrames,
    exitFrames,
    duration: clockStart + clockFrames + holdFrames + exitFrames,
    vo: clip,
  };
};

const hookFrames = () => Math.max(T.hookA + T.hookB, needFor(voiceIntro()));
const levelCardFrames = (levelIndex: number) => Math.max(cfg.levelCardFrames, needFor(voiceLevel(levelIndex)));
const scoreboardFrames = () =>
  Math.max(
    rootSettings.scoreboard.frames,
    ...cfg.ranks.map((r) => needFor(voiceScoreboard(r.name.replace(/\s+/g, '').toLowerCase()))),
  );
const endScreenFrames = () => Math.max(rootSettings.endScreen.frames, needFor(voiceOutro()));

// ----------------------------------------------------------------- timeline

const buildTimeline = (): Timeline => {
  const segments: Segment[] = [];
  let cursor = 0;
  const push = <S extends Segment>(seg: S): S => {
    segments.push(seg);
    cursor += seg.duration;
    return seg;
  };
  const pushIris = (fromTheme: [string, string], toTheme: [string, string], hud: Hud, variant: IrisVariant) =>
    push({ kind: 'iris', from: cursor, duration: T.irisFrames, fromTheme, toTheme, hud, variant });

  push({ kind: 'hook', from: 0, duration: hookFrames() });

  const seenLevels = new Set<number>();
  /** frames of the next round that already play inside the previous wipe */
  let nextLead = 0;

  ROUNDS.forEach((_, i) => {
    const levelIndex = levelIndexOfRound(i);
    if (!seenLevels.has(levelIndex)) {
      seenLevels.add(levelIndex);
      nextLead = 0; // a level card sits between the wipe and this round
      push({ kind: 'levelCard', from: cursor, duration: levelCardFrames(levelIndex), levelIndex });
    }

    const plan = buildRoundPlan(i);
    const lead = nextLead;
    nextLead = 0;
    push({ kind: 'round', from: cursor, duration: plan.duration - lead, index: i, levelIndex, lead });

    const isLast = i === ROUNDS.length - 1;
    const hud: Hud = { label: plan.level.name, number: i + 1, total: TOTAL };

    if (cfg.reminder.after.includes(i + 1)) {
      push({ kind: 'reminder', from: cursor, duration: cfg.reminder.ticks, theme: themeForRound(i), hud });
    }

    const bonusIndex = cfg.bonus.after.indexOf(i + 1);
    if (bonusIndex >= 0 && BONUS[bonusIndex]) {
      pushIris(themeForRound(i), BONUS_THEME, hud, 'circle');
      const b: BonusSegment = {
        kind: 'bonus',
        from: cursor,
        duration: buildBonusPlan(bonusIndex).duration,
        index: bonusIndex,
      };
      push(b);
      if (!isLast) {
        pushIris(
          BONUS_THEME,
          themeForRound(i + 1),
          { label: 'BONUS', number: bonusIndex + 1, total: cfg.bonus.after.length },
          wipeFor(levelIndexOfRound(i + 1)),
        );
      }
    } else if (!isLast) {
      pushIris(themeForRound(i), themeForRound(i + 1), hud, wipeFor(levelIndexOfRound(i + 1)));
      nextLead = Math.min(T.irisLead, T.irisFrames);
    }
  });

  push({ kind: 'scoreboard', from: cursor, duration: scoreboardFrames() });
  push({ kind: 'endScreen', from: cursor, duration: endScreenFrames() });
  return { segments, totalFrames: cursor };
};

export const TIMELINE = buildTimeline();

/** composition length in OUTPUT (60 fps) frames */
export const RENDER_TOTAL_FRAMES = Math.round(TIMELINE.totalFrames * TIME_SCALE);

/** The segment on screen at `frame` (design frames, fractions allowed). `local` = frame inside it. */
export const locate = (segments: Segment[], frame: number) => {
  let index = 0;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (frame >= segments[i].from) {
      index = i;
      break;
    }
  }
  const seg = segments[index];
  return { seg, local: frame - seg.from, index };
};
