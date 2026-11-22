import { useCurrentFrame } from 'remotion';
import root from '../../settings.json';
import { extraIds, items, levels } from './data';
import type { Item, Level } from './data';
import { clipTimings } from './timings.generated';
import { hookId, itemAudio, levelIds, outroIds, rankIds, scoreCardIds } from './audioMap';

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
export const holdSec = 0.3;
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
export const questionPadSec = 0.1;
/** Options are not read aloud, so viewers need time to read them: the question phase never goes below this. */
export const questionMinSec = 2.2;
/** The did-you-know clip starts this long after the reveal clip ends; its phase is lead + clip, nothing after. */
export const dykLeadSec = 0.1;
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

/* ---------- reveal beats (RevealEngine reads these; the hold is `holdSec`) ----------
 * The reveal clip starts when the hold ends, while the elimination plays. The correct option expands at the LATER of
 * the end of the elimination and `revealClipLeadSec` after the clip starts. */
export const revealGapSec = 0.15; // full: start-to-start gap between wrong options (their grey-outs overlap)
export const revealGreySec = 0.3; // full: one option's grey-out length
export const revealFadeSec = 0.5; // fast: all three wrong options together
export const revealExpandSec = 0.4; // the correct option's expand
export const revealClipLeadSec = 0.6; // the correct option expands no earlier than this after the reveal clip starts
/** Elimination length after the hold. */
export const eliminationFor = (full: boolean): number => (full ? 2 * revealGapSec + revealGreySec : revealFadeSec);
/** Seconds from the end of the hold (= the reveal clip start) until the correct option begins to expand. */
export const expandDelayFor = (full: boolean): number => Math.max(eliminationFor(full), revealClipLeadSec);
export const eliminationSec = (item: Item): number => eliminationFor(isFullReveal(item));

/* ---------- clip durations (src/gta6/timings.csv via timings.generated.ts; build with scripts/build_gta6_timings.py) ----------
 * Which clip belongs where comes from audioMap.ts (scripts/build_gta6_audio_map.ts). If any id is missing from the
 * measured clips, every constant above stays in force. */
const durOf = new Map(clipTimings.map((c) => [c.id, c.durSec] as const));
const fileOf = new Map(clipTimings.map((c) => [c.id, c.file] as const));
/** Length in seconds of a measured clip, undefined without timings or for an unknown id. */
export const clipSec = (id: string | undefined): number | undefined => (id ? durOf.get(id) : undefined);
/** `staticFile` path of a clip, e.g. "gta6/voiceover/clips/g6_002.wav". */
export const clipPath = (id: string): string => `gta6/voiceover/clips/${fileOf.get(id) ?? `${id}.wav`}`;
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);

const neededIds = (): string[] => [
  hookId,
  ...itemAudio.flatMap((a) => [a.questionId, a.revealId, ...(a.dykId ? [a.dykId] : [])]),
  ...Object.values(levelIds),
  ...Object.values(scoreCardIds),
  ...rankIds,
  ...outroIds,
];
/** True when every clip of audioMap.ts has a measured length, so phases are built from them instead of the constants. */
export const useClipTimings: boolean = clipTimings.length > 0 && itemAudio.length === items.length && neededIds().every((id) => durOf.has(id));
const dur = (id: string | undefined): number => durOf.get(id ?? '') ?? 0;

/** Slot per rank line (clip + cardPadSec) and per outro line, in seconds, in audioMap order. Empty without clip timings. */
export const rankSlotSec: number[] = useClipTimings ? rankIds.map((id) => dur(id) + cardPadSec) : [];
export const outroSlotSec: number[] = useClipTimings ? outroIds.map((id) => dur(id) + cardPadSec) : [];
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
  items.forEach((item, idx) => {
    const au = itemAudio[idx];
    if (item.level !== lastLevel) {
      // the first level (Easy) has no clip: it keeps levelCardSec
      const lid = levelIds[item.level];
      const sec = useClipTimings && lid ? dur(lid) + cardPadSec : levelCardSec;
      out.push({ kind: 'levelCard', level: item.level, ...span(sec) });
      lastLevel = item.level;
    }
    const from = cur;
    const phases = {} as ItemPhases;
    if (item.kind === 'bonus') phases.banner = span(bannerSec);
    phases.read = span(useClipTimings ? Math.max(questionMinSec, dur(au.questionId) + questionPadSec) : readSec);
    phases.timer = span(item.timerSec);
    phases.hold = span(holdSec);
    // the reveal clip starts when the hold ends and plays while the elimination runs: phase = the longer of the two
    phases.reveal = span(useClipTimings ? Math.max(eliminationSec(item), dur(au.revealId)) : isFullReveal(item) ? revealFullSec : revealFastSec);
    // did-you-know: dykLeadSec of silence after the reveal clip, then the clip, nothing after it
    if (item.didYouKnow) phases.dyk = span(useClipTimings ? dykLeadSec + dur(au.dykId) : dykSec);
    out.push({ kind: 'item', item, from, to: cur, phases });
    if (scoreCardLevel(item)) {
      out.push({ kind: 'scoreCard', level: item.level, after: item, ...span(useClipTimings ? dur(scoreCardIds[item.level]) + cardPadSec : scoreCardSec) });
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
