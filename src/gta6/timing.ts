import { useCurrentFrame } from 'remotion';
import root from '../../settings.json';
import { extraIds, items, levels } from './data';
import type { Item, Level } from './data';
import { clipTimings } from './timings.generated';

/* ---------- clock (same convention as the other videos) ----------
 * Output is root settings.json (fps 60, 2560x1440). Scenes are authored in 30 fps "design frames"
 * (ticks); `TIME_SCALE` turns ticks into render frames. All `from` / `to` below are ticks, `to` exclusive. */
export const WIDTH: number = root.width;
export const HEIGHT: number = root.height;
export const RENDER_FPS: number = root.fps;
export const FPS = 30;
export const TIME_SCALE = RENDER_FPS / FPS;

/* ---------- durations in seconds: the only place they are written ---------- */
export const hookSec = 6;
/** Voiceover reads the question and the four options before the timer starts. */
export const readSec = 5.5;
export const holdSec = 0.5;
/** Full elimination reveal, used for hard items and "fastest" items. */
export const revealFullSec = 2.5;
export const revealFastSec = 1.5;
export const dykSec = 2.8;
/** Bonus banner shown before a bonus item. */
export const bannerSec = 0.6;
export const levelCardSec = 3.5;
export const scoreCardSec = 5;
export const scoreboardSec = 25;
export const outroSec = 20;
/** Script value for the Easy score card line "If you got N or more, you're a real fan". Not derivable from data.ts. */
export const easyPassMark = 12;
/** Voiceover-driven timing (used when timings.csv has been built, see below): padding after a clip, in seconds. */
export const questionPadSec = 0.3;
/** Options are not read aloud, so viewers need time to read them: the question phase never goes below this. */
export const questionMinSec = 2.2;
export const dykPadSec = 0.3;
/** Level cards, score cards, rank cards and outro lines last their clip plus this. */
export const cardPadSec = 0.5;
/** Target runtime in seconds (11:30 to 12:30). */
export const targetSec = { min: 11 * 60 + 30, max: 12 * 60 + 30 } as const;

/* ---------- frame helpers ---------- */
export const secToTicks = (sec: number): number => Math.round(sec * FPS);
export const ticksToSec = (ticks: number): number => ticks / FPS;
/** Design ticks -> render frames (60 fps). */
export const ticksToFrames = (ticks: number): number => Math.round(ticks * TIME_SCALE);
export const secToFrames = (sec: number): number => ticksToFrames(secToTicks(sec));
/** Current time in design ticks (fractional), like useDesignFrame in src/clock.ts. */
export const useGta6Frame = (): number => useCurrentFrame() / TIME_SCALE;

/** "m:ss" for a time in seconds. */
export const timecode = (sec: number): string => {
  const s = Math.floor(sec + 1e-9);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ---------- segments ---------- */
export type Range = { from: number; to: number };
export type ItemPhases = { banner?: Range; read: Range; timer: Range; hold: Range; reveal: Range; dyk?: Range };

export type Segment =
  | ({ kind: 'hook' } & Range)
  | ({ kind: 'levelCard'; level: Level } & Range)
  | ({ kind: 'item'; item: Item; phases: ItemPhases } & Range)
  | ({ kind: 'scoreCard'; level: Level; after: Item } & Range)
  | ({ kind: 'scoreboard' } & Range)
  | ({ kind: 'outro' } & Range);

/** Hard items and "fastest" items get the full elimination reveal. */
export const isFullReveal = (item: Item): boolean => item.level === 'hard' || item.fastest;
/** A score card follows any item whose extra ids contain one ending in "ScoreCard" (easyScoreCard, ...). */
export const scoreCardLevel = (item: Item): Level | undefined =>
  extraIds(item).some((id) => id.endsWith('ScoreCard')) ? item.level : undefined;

/* ---------- clip durations (src/gta6/timings.csv via timings.generated.ts; build with scripts/build_gta6_timings.py) ----------
 * Clips are matched by order within their type: question + bonus clips -> items in order, reveal clips -> items in order,
 * dyk clips -> items with didYouKnow in order, level clips -> Medium, Hard, scorecard clips -> score cards in order,
 * rank clips -> scoreboard, outro clips -> outro. If anything does not line up, every constant below stays in force. */
const clipsOf = (...types: string[]): number[] => clipTimings.filter((c) => types.includes(c.type)).map((c) => c.durSec);
const itemClips = clipsOf('question', 'bonus');
const revealClips = clipsOf('reveal');
const dykClips = clipsOf('dyk');
const levelClips = clipsOf('level');
const scoreCardClips = clipsOf('scorecard');
const rankClips = clipsOf('rank');
const outroClips = clipsOf('outro');
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);

/** True when the measured clips cover this video, so phases are built from them instead of the constants. */
export const useClipTimings: boolean =
  clipTimings.length > 0 &&
  itemClips.length === items.length &&
  revealClips.length === items.length &&
  dykClips.length === items.filter((i) => i.didYouKnow).length &&
  levelClips.length === levels.length - 1 &&
  scoreCardClips.length === items.filter((i) => scoreCardLevel(i)).length &&
  rankClips.length > 0 &&
  outroClips.length > 0;

/** Slot per rank line (clip + cardPadSec) and per outro line, in seconds, in clips order. Empty without clip timings. */
export const rankSlotSec: number[] = useClipTimings ? rankClips.map((d) => d + cardPadSec) : [];
export const outroSlotSec: number[] = useClipTimings ? outroClips.map((d) => d + cardPadSec) : [];
/** Scoreboard length: rank lines back to back. */
export const scoreboardLenSec: number = useClipTimings ? sum(rankSlotSec) : scoreboardSec;
/** Outro length: the end screen needs its 15 s, so the outro never goes below `outroSec` even when the three lines are shorter. */
export const outroLenSec: number = useClipTimings ? Math.max(outroSec, sum(outroSlotSec)) : outroSec;

const buildSegments = (): Segment[] => {
  const out: Segment[] = [];
  let cur = 0;
  const span = (sec: number): Range => {
    const r = { from: cur, to: cur + secToTicks(sec) };
    cur = r.to;
    return r;
  };

  out.push({ kind: 'hook', ...span(hookSec) });
  let lastLevel: Level | undefined;
  let dykIndex = 0;
  let scoreCardIndex = 0;
  items.forEach((item, idx) => {
    if (item.level !== lastLevel) {
      const li = levels.indexOf(item.level);
      // the first level (Easy) has no clip: it keeps levelCardSec
      const sec = useClipTimings && li > 0 ? levelClips[li - 1] + cardPadSec : levelCardSec;
      out.push({ kind: 'levelCard', level: item.level, ...span(sec) });
      lastLevel = item.level;
    }
    const from = cur;
    const phases = {} as ItemPhases;
    if (item.kind === 'bonus') phases.banner = span(bannerSec);
    phases.read = span(useClipTimings ? Math.max(questionMinSec, itemClips[idx] + questionPadSec) : readSec);
    phases.timer = span(item.timerSec);
    phases.hold = span(holdSec);
    // elimination, then the reveal clip
    phases.reveal = span((isFullReveal(item) ? revealFullSec : revealFastSec) + (useClipTimings ? revealClips[idx] : 0));
    if (item.didYouKnow) {
      phases.dyk = span(useClipTimings ? dykClips[dykIndex] + dykPadSec : dykSec);
      dykIndex++;
    }
    out.push({ kind: 'item', item, from, to: cur, phases });
    if (scoreCardLevel(item)) {
      out.push({ kind: 'scoreCard', level: item.level, after: item, ...span(useClipTimings ? scoreCardClips[scoreCardIndex] + cardPadSec : scoreCardSec) });
      scoreCardIndex++;
    }
  });
  out.push({ kind: 'scoreboard', ...span(scoreboardLenSec) });
  out.push({ kind: 'outro', ...span(outroLenSec) });
  return out;
};

export const segments: Segment[] = buildSegments();
export const TOTAL_TICKS = segments[segments.length - 1].to;
export const TOTAL_SEC = ticksToSec(TOTAL_TICKS);
/** Composition length at the render rate. */
export const RENDER_TOTAL_FRAMES = ticksToFrames(TOTAL_TICKS);

/** The segment on screen at design tick `tick`, with the tick local to it. */
export const locate = (tick: number): { seg: Segment; local: number; index: number } => {
  for (let i = segments.length - 1; i >= 0; i--) if (tick >= segments[i].from) return { seg: segments[i], local: tick - segments[i].from, index: i };
  return { seg: segments[0], local: 0, index: 0 };
};

/* ---------- parts and chapters ---------- */
export type PartRange = Range & { name: string; frames: number; renderFrom: number; renderTo: number };

const partRange = (name: string, segs: Segment[]): PartRange => {
  const from = segs[0].from;
  const to = segs[segs.length - 1].to;
  return { name, from, to, frames: to - from, renderFrom: ticksToFrames(from), renderTo: ticksToFrames(to) };
};
const lastOf = (level: Level) => segments.filter((s) => s.kind === 'scoreCard' && s.level === level).pop();
const levelSegs = (level: Level): Segment[] => {
  const start = segments.findIndex((s) => s.kind === 'levelCard' && s.level === level);
  const end = segments.indexOf(lastOf(level)!);
  return segments.slice(start, end + 1);
};

/** Part1 = hook + Easy (through its score card), Part2 = Medium, Part3 = Hard, Part4 = scoreboard + outro. */
export const partRanges: PartRange[] = [
  partRange('Part1', [segments[0], ...levelSegs(levels[0])]),
  partRange('Part2', levelSegs(levels[1])),
  partRange('Part3', levelSegs(levels[2])),
  partRange('Part4', segments.filter((s) => s.kind === 'scoreboard' || s.kind === 'outro')),
];

const upper = (s: string) => s.toUpperCase();
/** YouTube chapter lines, "m:ss Title". */
export const chapters: string[] = [
  `${timecode(0)} Intro`,
  ...levels.map((l) => `${timecode(ticksToSec(segments.find((s) => s.kind === 'levelCard' && s.level === l)!.from))} ${upper(l)}`),
  `${timecode(ticksToSec(segments.find((s) => s.kind === 'scoreboard')!.from))} Scoreboard`,
  `${timecode(ticksToSec(segments.find((s) => s.kind === 'outro')!.from))} Outro`,
];
