import { ranks, slots } from './data';
import type { Slot } from './data';
import { clipTimings } from './timings.generated';

/* ---------- clock ----------
 * Frame size, fps, TIME_SCALE and the tick helpers live in shared/clock.ts (one place for this video); re-exported here.
 * Scenes author in 30 fps design ticks; all `from` / `to` below are ticks, `to` exclusive. Sizes are 1280x720
 * reference units through px() in system.ts. */
import { FPS, HEIGHT, RENDER_FPS, TIME_SCALE, WIDTH, secToTicks, ticksToFrames, useXmasFrame } from './shared/clock';
export { FPS, HEIGHT, RENDER_FPS, TIME_SCALE, WIDTH, secToTicks, ticksToFrames, useXmasFrame };

/* ---------- durations in seconds: the only place they are written ---------- */
export const hookSec = 6;
/** Movie: the spoken quip; the tiles spring in during it and the timer starts when it ends. */
export const movieIntroSec = 1.0;
export const movieThinkSec = 8;
export const starThinkSec = 10;
export const movieRevealSec = 3.0;
/** Added before the title in the reveal of `extraPauseSlot` only. */
export const slot49ExtraPauseSec = 1.0;
export const extraPauseSlot = 49;
export const bonusIntroSec = 1.5;
export const bonusPlaySec = 8;
export const bonusRevealSec = 3.0;
export const scoreSec = 20;
/** The rank card holds at least this long inside the score segment. */
export const rankCardMinSec = 4;
/** Score segment beats, seconds from its start. Estimates until the voice clips are measured (task 6b fits them). */
export const scoreLeadSec = 0.6;
/** "That was all fifty..." slot: the lead, the line and a breath. The rank card appears at the lead. */
export const scoreEndLineSec = 3.4;
/** One rank band: its spoken line and a short hold. Bands light from the lowest to the highest. */
export const rankBandSec = 2.4;
/** The band's voice starts this long after the band lights. */
export const rankVoiceLeadSec = 0.3;
export const outroSec = 25;
/** The end screen is the last part of the outro. */
export const endScreenSec = 15;
/** Outro asks: the first appears this long after the outro starts; the asks stop this long before the end screen. */
export const outroAskLeadSec = 0.4;
export const outroAskTailSec = 0.6;
/** The voice of an ask starts this long after its text appears (the pop sound lands first). */
export const outroVoiceLagSec = 0.2;
/** The asks fade out over this long when the end screen starts. */
export const outroAskExitSec = 0.4;
/** End screen: seconds after it starts that each element comes in. */
export const endScreenInSec = { slot: 0.3, subscribe: 1.0, rankCard: 1.7 } as const;
/** The subscribe button presses once, this long after the end screen starts. */
export const subscribePressSec = 3.0;
/** Last seconds of the video: the final fade to black. */
export const outroFadeSec = 1;
/** Padding added to a measured clip: intro slot = max(base, clip + flexPadIntro), reveal slot = max(base, clip + flexPadReveal). */
export const flexPadIntro = 0.2;
export const flexPadReveal = 0.3;
/** Timer: movie = one segment per second of thinking; bonus = this many segments spread evenly over bonusPlaySec. */
export const movieSegmentSec = 1;
export const bonusTimerSegments = 6;
/** Planning assumption for the runtime script: a bonus slot once real voice intros exist (fallback is 12.5 s). */
export const assumedBonusSlotSec = 16;
/** Target runtime: 12:00, accepted within +-tolerance. */
export const targetSec = { target: 12 * 60, tolerance: 30 } as const;

/* ---------- frame helpers ---------- */
/** Like secToTicks but never rounds down: slots built from a clip must not cut it. */
const secToTicksUp = (sec: number): number => Math.ceil(sec * FPS - 1e-9);
export const ticksToSec = (ticks: number): number => ticks / FPS;
export const secToFrames = (sec: number): number => ticksToFrames(secToTicks(sec));
export const framesToSec = (frames: number): number => frames / RENDER_FPS;

/** "m:ss" for a time in seconds. */
export const timecode = (sec: number): string => {
  const s = Math.floor(sec + 1e-9);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ---------- clip durations (src/xmas/timings.generated.ts) ---------- */
const clipKey = (slot: number, part: 'intro' | 'reveal'): string => `${slot}:${part}`;
const durOf = new Map(clipTimings.map((c) => [clipKey(c.slot, c.part), c.durSec] as const));
/** Length in seconds of a measured intro or reveal clip, undefined without timings. */
export const clipSec = (slot: number, part: 'intro' | 'reveal'): number | undefined => durOf.get(clipKey(slot, part));
/** True when every slot has both clips measured. */
export const useClipTimings: boolean = slots.every((s) => durOf.has(clipKey(s.slot, 'intro')) && durOf.has(clipKey(s.slot, 'reveal')));

const baseIntroSec = (s: Slot): number => (s.kind === 'movie' ? movieIntroSec : bonusIntroSec);
const baseRevealSec = (s: Slot): number => (s.kind === 'movie' ? movieRevealSec : bonusRevealSec);
/** Thinking / playing time: never changed by clips. */
export const playSecOf = (s: Slot): number => (s.kind === 'movie' ? (s.star ? starThinkSec : movieThinkSec) : bonusPlaySec);

/** Intro slot in ticks: max(base, intro clip + flexPadIntro). Without a clip, the base. */
export const introTicksOf = (s: Slot): number => {
  const clip = clipSec(s.slot, 'intro');
  return Math.max(secToTicks(baseIntroSec(s)), clip === undefined ? 0 : secToTicksUp(clip + flexPadIntro));
};
/** Reveal slot in ticks, without the slot-49 pause: max(base, reveal clip + flexPadReveal). */
const revealCoreTicksOf = (s: Slot): number => {
  const clip = clipSec(s.slot, 'reveal');
  return Math.max(secToTicks(baseRevealSec(s)), clip === undefined ? 0 : secToTicksUp(clip + flexPadReveal));
};
export const pauseTicksOf = (s: Slot): number => (s.slot === extraPauseSlot ? secToTicks(slot49ExtraPauseSec) : 0);

/** Timer segments, derived: movie one per `movieSegmentSec` of thinking, bonus `bonusTimerSegments` spread evenly over the play time. */
export const timerSegmentCount = (s: Slot): number => (s.kind === 'movie' ? Math.round(playSecOf(s) / movieSegmentSec) : bonusTimerSegments);

/* ---------- segments ---------- */
export type Range = { from: number; to: number };
export type TimeRange = { startSec: number; endSec: number };
export type SlotPhases = {
  /** Spoken quip (movie) or intro (bonus). The timer starts when it ends. */
  intro: Range;
  /** Thinking (movie) or playing (bonus). Length never changes with clips. */
  timer: Range;
  /** The timer's segments, absolute ticks, end to end over `timer`. */
  timerSegments: Range[];
  /** Pause before the title (slot 49 only), the first part of the reveal. */
  pause?: Range;
  /** Reveal, including `pause`. */
  reveal: Range;
};

export type Segment =
  | ({ kind: 'hook' } & Range & TimeRange)
  | ({ kind: 'slot'; slot: Slot; phases: SlotPhases } & Range & TimeRange)
  | ({ kind: 'score'; rankCard: Range } & Range & TimeRange)
  | ({ kind: 'outro'; asks: Range; endScreen: Range } & Range & TimeRange);

const withSec = (r: Range): Range & TimeRange => ({ ...r, startSec: ticksToSec(r.from), endSec: ticksToSec(r.to) });

const evenSplit = (r: Range, n: number): Range[] =>
  Array.from({ length: n }, (_, i) => ({ from: r.from + Math.round(((r.to - r.from) * i) / n), to: r.from + Math.round(((r.to - r.from) * (i + 1)) / n) }));

/**
 * Beats of the score segment in LOCAL ticks (0 = the segment's first tick):
 *   endLine  the "all fifty" line; its voice starts at `endVoiceFrom`; the rank card appears at `cardFrom`
 *   bands    one per rank in data order (lowest first), each lights at `band.from`; its voice starts at `voiceFrom`
 *   hold     the final rank card with all tiers lit, from the end of the last band to the end of the segment
 * Throws when the hold would be shorter than `rankCardMinSec`.
 */
export type ScoreBeats = {
  total: number;
  cardFrom: number;
  endVoiceFrom: number;
  endLine: Range;
  bands: { band: Range; voiceFrom: number }[];
  hold: Range;
};
export const scoreBeats = (): ScoreBeats => {
  const total = secToTicks(scoreSec);
  const endLine = { from: 0, to: secToTicks(scoreEndLineSec) };
  const bands = ranks.map((_, i) => {
    const from = endLine.to + i * secToTicks(rankBandSec);
    return { band: { from, to: from + secToTicks(rankBandSec) }, voiceFrom: from + secToTicks(rankVoiceLeadSec) };
  });
  const hold = { from: bands.length ? bands[bands.length - 1].band.to : endLine.to, to: total };
  if (hold.to - hold.from < secToTicks(rankCardMinSec)) throw new Error(`score segment: the rank card holds only ${ticksToSec(hold.to - hold.from)} s (min ${rankCardMinSec} s)`);
  return { total, cardFrom: secToTicks(scoreLeadSec), endVoiceFrom: secToTicks(scoreLeadSec), endLine, bands, hold };
};

const buildSegments = (): Segment[] => {
  const out: Segment[] = [];
  let cur = 0;
  const span = (ticks: number): Range => {
    const r = { from: cur, to: cur + ticks };
    cur = r.to;
    return r;
  };

  out.push({ kind: 'hook', ...withSec(span(secToTicks(hookSec))) });
  for (const slot of slots) {
    const from = cur;
    const intro = span(introTicksOf(slot));
    const timer = span(secToTicks(playSecOf(slot)));
    const pauseTicks = pauseTicksOf(slot);
    const revealFrom = cur;
    const pause = pauseTicks > 0 ? span(pauseTicks) : undefined;
    span(revealCoreTicksOf(slot));
    const reveal = { from: revealFrom, to: cur };
    out.push({ kind: 'slot', slot, from, to: cur, startSec: ticksToSec(from), endSec: ticksToSec(cur), phases: { intro, timer, timerSegments: evenSplit(timer, timerSegmentCount(slot)), pause, reveal } });
  }
  const scoreFrom = cur;
  const score = span(secToTicks(scoreSec));
  const beats = scoreBeats();
  out.push({ kind: 'score', rankCard: { from: scoreFrom + beats.hold.from, to: scoreFrom + beats.hold.to }, ...withSec(score) });
  const outro = span(secToTicks(outroSec));
  out.push({ kind: 'outro', asks: { from: outro.from, to: outro.to - secToTicks(endScreenSec) }, endScreen: { from: outro.to - secToTicks(endScreenSec), to: outro.to }, ...withSec(outro) });
  return out;
};

export const segments: Segment[] = buildSegments();
export const TOTAL_TICKS = segments[segments.length - 1].to;
export const TOTAL_SEC = ticksToSec(TOTAL_TICKS);
/** Composition length at the render rate. */
export const RENDER_TOTAL_FRAMES = ticksToFrames(TOTAL_TICKS);

export type SlotSegment = Extract<Segment, { kind: 'slot' }>;
const slotSegments = segments.filter((s): s is SlotSegment => s.kind === 'slot');
/** The segment of play-order slot `n` (1-based). Throws for a number outside the video. */
export const segmentOfSlot = (n: number): SlotSegment => {
  const s = slotSegments[n - 1];
  if (!s || s.slot.slot !== n) throw new Error(`no segment for slot ${n}`);
  return s;
};

/** The segment on screen at design tick `tick`, with the tick local to it. */
export const locate = (tick: number): { seg: Segment; local: number; index: number } => {
  for (let i = segments.length - 1; i >= 0; i--) if (tick >= segments[i].from) return { seg: segments[i], local: tick - segments[i].from, index: i };
  return { seg: segments[0], local: 0, index: 0 };
};

/* ---------- parts and chapters ---------- */
export type PartRange = Range &
  TimeRange & { name: string; ticks: number; renderFrom: number; renderTo: number; renderFrames: number; segments: Segment[] };

const partRange = (name: string, segs: Segment[]): PartRange => {
  const from = segs[0].from;
  const to = segs[segs.length - 1].to;
  return { name, from, to, startSec: ticksToSec(from), endSec: ticksToSec(to), ticks: to - from, renderFrom: ticksToFrames(from), renderTo: ticksToFrames(to), renderFrames: ticksToFrames(to) - ticksToFrames(from), segments: segs };
};
const slotsIn = (first: number, last: number): Segment[] => slotSegments.filter((s) => s.slot.slot >= first && s.slot.slot <= last);
const tail = segments.filter((s) => s.kind === 'score' || s.kind === 'outro');

/** Part1 = hook + slots 1 to 20, Part2 = slots 21 to 40, Part3 = slots 41 to 50 + score + outro. */
export const partRanges: PartRange[] = [
  partRange('Part1', [segments[0], ...slotsIn(1, 20)]),
  partRange('Part2', slotsIn(21, 40)),
  partRange('Part3', [...slotsIn(41, 50), ...tail]),
];

/** YouTube chapter lines, "m:ss Title". The 6 s intro is merged into the first chapter (YouTube ignores chapters under 10 s). */
export const chapters: string[] = [
  `${timecode(0)} Intro and questions 1-10`,
  ...[11, 21, 31, 41].map((n) => `${timecode(segmentOfSlot(n).startSec)} Questions ${n}-${n + 9}`),
  `${timecode(segments.find((s) => s.kind === 'score')!.startSec)} Your score`,
];
/** Start second of each chapter, in the same order, for validation. */
export const chapterStartsSec: number[] = [0, ...[11, 21, 31, 41].map((n) => segmentOfSlot(n).startSec), segments.find((s) => s.kind === 'score')!.startSec];
