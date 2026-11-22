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
import { buildBonusScene } from './bonus-engine';
import type { BonusScenePlan } from './bonus-engine';
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
  /** round id -> the three clue clips (clue 1 hardest ... clue 3 easiest) */
  clue?: Record<string, VoEntry[]>;
  reveal: Record<string, VoEntry>;
  /** round id -> the spoken hint (played when the hint appears; must fit the think window) */
  hint?: Record<string, VoEntry>;
  bonus: Record<string, VoEntry>;
  /** bonus number -> the bonus intro line (played from the start of the bonus scene) */
  bonusIntro?: Record<string, VoEntry>;
  scoreboard: Record<string, VoEntry>;
  outro: VoEntry;
};
/** frames a hold must last so the clip finishes (plus tail) before the card leaves */
const needFor = (clip?: VoClip) => (clip ? VO.offsetFrames + clip.frames + VO.tailFrames : 0);

export const voiceIntro = () => clipOf(vo.intro);
export const voiceOutro = () => clipOf(vo.outro);
export const voiceLevel = (levelIndex: number) => clipOf(vo.level[String(levelIndex + 1)]);
/** clue `clueIndex` (0-3) of round id (1-30): the clip that is read while that search types */
export const voiceClue = (roundId: number, clueIndex: number) => clipOf(vo.clue?.[String(roundId)]?.[clueIndex]);
/** round id (1-30) */
export const voiceReveal = (roundId: number) => clipOf(vo.reveal[String(roundId)]);
/** round id (1-30): the spoken hint */
export const voiceHint = (roundId: number) => clipOf(vo.hint?.[String(roundId)]);
/** bonus number (1-3): the answer */
export const voiceBonus = (bonusNumber: number) => clipOf(vo.bonus[String(bonusNumber)]);
/** bonus number (1-3): the intro line */
export const voiceBonusIntro = (bonusNumber: number) => clipOf(vo.bonusIntro?.[String(bonusNumber)]);
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

/** Hold after a typed search, in characters' worth of ticks. Mirror of HOLD_CHARS in components/SearchBar.tsx
 *  (taken from settings, which check-search.js ties to HOLD_CHARS). This file must not import the component:
 *  it pulls in the font loader, and the node scripts bundle this file without it. */
export const HOLD_CHARS = cfg.bonus.searchHoldChars;
/** Slide-into-the-list length, in characters' worth of ticks. Mirror of SLIDE_CHARS in components/SearchBar.tsx
 *  (search-qa.js checks that the two agree). */
export const SLIDE_CHARS = 8;
/** How many finished searches the "Recent searches" list shows at once (settings recent.visible, at least 1). */
export const RECENT_VISIBLE = Math.max(1, Math.round(cfg.recent.visible));
/** Ticks kept free between the end of the last search's slot and the reveal. Existing constant: the beat between timer end and answer flip. */
const LAST_SLOT_MARGIN = T.answerFlipsAfterTimer;

/** Typed-character units one search needs: its characters, the hold, and the slide. */
export const searchUnits = (length: number) => length + HOLD_CHARS + SLIDE_CHARS;

/** Ticks per character for a search of `length` characters in a slot of `slot` ticks: the settings speed,
 *  sped up to fit the slot, never faster than typing.fastestTicksPerChar. The result may still not fit
 *  (searchUnits(length) * result > slot); search-qa.js reports those. */
export const fitTypeTicks = (length: number, slot: number) =>
  Math.max(cfg.typing.fastestTicksPerChar, Math.min(cfg.typing.ticksPerChar, slot / searchUnits(length)));

/** Think phase: after the last clue has been read, a countdown of think.seconds (always the same, whatever the level).
 *  Layout of one round (absolute ticks from the start of the round scene):
 *  - voiced (all three clue clips are in the manifest): each clue starts typing when its clip starts, spread over
 *    voiceClue.typeShare of the clip; the next clue starts once this one has landed (and its clip is over) plus
 *    voiceClue.pauseTicks. thinkStart = end of the last clip + think.beatTicks.
 *  - fixed (no clips): the clues use the first think.fallbackClueSeconds of the round (searchAt are fractions of it),
 *    thinkStart is the end of that part.
 *  revealAt = thinkStart + think.seconds in both. The level time is not used. */
type RoundLayout = { thinkStart: number; starts: number[]; slots: number[]; typeTicks?: number[] };
const thinkTicks = () => toTicks(cfg.think.seconds);

/** Slots: the gap to the next search's start; the last search's slot ends LAST_SLOT_MARGIN before the reveal. */
const slotsOf = (starts: number[], revealAt: number) =>
  starts.map((st, i) => (i + 1 < starts.length ? starts[i + 1] : revealAt - LAST_SLOT_MARGIN) - st);

const voiceClueLayout = (index: number): RoundLayout | undefined => {
  const round = ROUNDS[index];
  const clips = round.searches.map((_, i) => voiceClue(round.id, i));
  if (clips.some((c) => !c)) return undefined;
  const vc = cfg.voiceClue;
  let at = T.titleInFrames + cfg.think.firstClueTicks;
  const starts: number[] = [];
  const typeTicks: number[] = [];
  round.searches.forEach((text, i) => {
    const clip = clips[i] as VoClip;
    const tt = Math.max(cfg.typing.fastestTicksPerChar, (clip.frames * vc.typeShare) / Math.max(1, text.length));
    starts.push(at);
    typeTicks.push(tt);
    at += Math.round(Math.max(searchUnits(text.length) * tt, clip.frames)) + vc.pauseTicks;
  });
  const lastClip = clips[clips.length - 1] as VoClip;
  const thinkStart = starts[starts.length - 1] + lastClip.frames + cfg.think.beatTicks;
  return { thinkStart, starts, slots: slotsOf(starts, thinkStart + thinkTicks()), typeTicks };
};

const fixedLayout = (index: number): RoundLayout => {
  const clockStart = T.titleInFrames;
  const cluePhase = toTicks(cfg.think.fallbackClueSeconds);
  const starts = cfg.searchAt.map((f) => clockStart + Math.round(f * cluePhase));
  const thinkStart = clockStart + cluePhase;
  void index;
  return { thinkStart, starts, slots: slotsOf(starts, thinkStart + thinkTicks()) };
};

const roundLayout = (index: number): RoundLayout => voiceClueLayout(index) ?? fixedLayout(index);

/** Slot of each search of round `index`, in ticks (see slotsOf). */
export const searchSlots = (index: number): number[] => roundLayout(index).slots;

/** All offsets are design frames from the start of the round scene (lead frames not removed). */
export type RoundPlan = {
  index: number;
  level: LevelCfg;
  levelIndex: number;
  /** frames before the search bar is up (it slides in over this window); the first clue starts after it */
  clockStart: number;
  /** start frame of each of the 3 searches (clue 1 hardest ... clue 3 easiest) */
  searchAt: [number, number, number];
  /** ticks per typed character of each search (same order as searchAt), sped up to fit the search's slot */
  typeTicks: number[];
  /** the last clue has been read: the countdown starts and the hint appears */
  thinkStart: number;
  /** countdown length (think.seconds) */
  thinkFrames: number;
  /** the hint appears (= thinkStart) */
  hintAt: number;
  /** the answer is revealed (= thinkStart + thinkFrames) */
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
  const layout = roundLayout(index);
  const thinkFrames = thinkTicks();
  const revealAt = layout.thinkStart + thinkFrames;
  const clip = voiceReveal(ROUNDS[index].id);
  const holdFrames = Math.max(toTicks(cfg.reveal.minHoldSeconds), needFor(clip));
  const exitFrames = T.revealExit;
  const last = layout.starts.length - 1;
  // Fixed layout: speed fitted to each slot; the last clue must also finish TYPING before the countdown starts.
  const typeTicks =
    layout.typeTicks ??
    ROUNDS[index].searches.map((t, i) => {
      const fit = fitTypeTicks(t.length, layout.slots[i]);
      return i === last ? Math.min(fit, Math.max(cfg.typing.fastestTicksPerChar, (layout.thinkStart - layout.starts[i]) / Math.max(1, t.length))) : fit;
    });
  return {
    index,
    level,
    levelIndex,
    clockStart: T.titleInFrames,
    searchAt: layout.starts as RoundPlan['searchAt'],
    typeTicks,
    thinkStart: layout.thinkStart,
    thinkFrames,
    hintAt: layout.thinkStart,
    revealAt,
    holdFrames,
    exitFrames,
    duration: revealAt + holdFrames + exitFrames,
    vo: clip,
  };
};

export type BonusPlan = BonusScenePlan & {
  holdFrames: number;
  exitFrames: number;
  duration: number;
  vo?: VoClip;
};

export const buildBonusPlan = (index: number): BonusPlan => {
  const scene = buildBonusScene(index, { startTick: rootSettings.bonus.preRollFrames, fps: FPS });
  const clip = voiceBonus(index + 1);
  const holdFrames = Math.max(cfg.bonus.answerHoldTicks, needFor(clip));
  const exitFrames = T.revealExit;
  return {
    ...scene,
    holdFrames,
    exitFrames,
    duration: scene.revealAt + holdFrames + exitFrames,
    vo: clip,
  };
};

const hookFrames = () => Math.max(T.hookA + T.hookB, needFor(voiceIntro()));
const levelCardFrames = (levelIndex: number) => Math.max(cfg.levelCardFrames, needFor(voiceLevel(levelIndex)));
/** The scoreboard reads its intro line and then one line per rank (best first), back to back, starting after the rows
 *  have landed (scenes/searchScoreboardCues.ts scoreboardVoice). That file imports this one, so its constants are
 *  mirrored here; the QA check "every clip starts and ends inside its own scene" fails if they drift apart. */
const SB_ROW_BASE = 46; // DOTS_AT + DOTS_SPAN + DOTS_TO_ROWS
const SB_ROW_STEP = 22;
const SB_VO_AFTER_ROWS = 10;
const SB_VO_GAP = 4;
const scoreboardVoiceEndTick = () => {
  const keys = ['intro', ...cfg.ranks.map((r) => r.name.replace(/\s+/g, '').toLowerCase())];
  const clips = keys.map((k) => voiceScoreboard(k)).filter((c): c is VoClip => Boolean(c));
  if (!clips.length) return 0;
  const start = SB_ROW_BASE + (cfg.ranks.length - 1) * SB_ROW_STEP + SB_ROW_STEP + SB_VO_AFTER_ROWS;
  return start + clips.reduce((sum, c) => sum + c.frames, 0) + SB_VO_GAP * (clips.length - 1);
};
/** The scene runs until the whole sequence of lines has been read (plus the usual tail). */
const scoreboardFrames = () =>
  Math.max(rootSettings.scoreboard.frames, scoreboardVoiceEndTick() ? scoreboardVoiceEndTick() + VO.tailFrames : 0);
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
