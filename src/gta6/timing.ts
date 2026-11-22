import { useCurrentFrame } from 'remotion';
import root from '../../settings.json';
import { extraIds, items, levels } from './data';
import type { Item, Level } from './data';

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
  for (const item of items) {
    if (item.level !== lastLevel) {
      out.push({ kind: 'levelCard', level: item.level, ...span(levelCardSec) });
      lastLevel = item.level;
    }
    const from = cur;
    const phases = {} as ItemPhases;
    if (item.kind === 'bonus') phases.banner = span(bannerSec);
    phases.read = span(readSec);
    phases.timer = span(item.timerSec);
    phases.hold = span(holdSec);
    phases.reveal = span(isFullReveal(item) ? revealFullSec : revealFastSec);
    if (item.didYouKnow) phases.dyk = span(dykSec);
    out.push({ kind: 'item', item, from, to: cur, phases });
    if (scoreCardLevel(item)) out.push({ kind: 'scoreCard', level: item.level, after: item, ...span(scoreCardSec) });
  }
  out.push({ kind: 'scoreboard', ...span(scoreboardSec) });
  out.push({ kind: 'outro', ...span(outroSec) });
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
