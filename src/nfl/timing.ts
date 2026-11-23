/**
 * NFL Scouting Card Quiz timeline. Pattern copied from src/gta6/timing.ts (nothing imported from it).
 * Output is root settings.json (fps 60, 2560x1440). Scenes are authored in 30 fps "design frames" (ticks);
 * `TIME_SCALE` turns ticks into render frames. All `from` / `to` below are ticks, `to` exclusive.
 * Every duration in the video is a constant in this file or a measured clip length (timings.generated.ts).
 */
import { useCurrentFrame } from 'remotion';
import root from '../../settings.json';
import { cards, levels, ranks, type Card, type Level } from './data';
import { clipTimings, type ClipType } from './timings.generated';

/* ---------- clock ---------- */
export const WIDTH: number = root.width;
export const HEIGHT: number = root.height;
export const RENDER_FPS: number = root.fps;
export const FPS = 30;
export const TIME_SCALE = RENDER_FPS / FPS;

export const secToTicks = (sec: number): number => Math.round(sec * FPS);
export const ticksToSec = (ticks: number): number => ticks / FPS;
export const ticksToFrames = (ticks: number): number => Math.round(ticks * TIME_SCALE);
export const secToFrames = (sec: number): number => ticksToFrames(secToTicks(sec));
export const framesToSec = (frames: number): number => frames / RENDER_FPS;
/** Current design tick (render frame / TIME_SCALE). Call inside a Sequence for a local tick. */
export const useNflFrame = (): number => useCurrentFrame() / TIME_SCALE;

/** "m:ss" for a time in seconds. */
export const timecode = (sec: number): string => {
  const s = Math.floor(sec + 1e-9);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ---------- constants (seconds): the only place durations are written ---------- */
export const hookSec = 6;
export const clueBaseSec = 3.5; // minimum clue slot
export const clueTmwSec = 2.5; // minimum clue slot on a Two-Minute Warning card
export const silenceBeatSec = 0.5; // after clue 5, before the reveal
export const revealSec = 3.0; // minimum reveal
export const levelCardSec = 3.5; // Starter and Hall of Fame (Rookie has a banner over card 1, no card)
export const scoreCardSec = 5;
export const predictionsSec = 25;
export const scoreboardSec = 20;
export const finalLockSec = 1; // lock-screen replay at the start of card 30's segment (the shared piece is 1 s by design)
/** Wallet collection after card 30's reveal: seconds from the segment start. Cards land one by one, the pile holds, then fans out one by one and holds. Assumptions, not in the brief. */
export const collectionBeats = { stackAt: 0.3, stackStagger: 0.06, fanAt: 3.2, fanStagger: 0.02 } as const;
export const collectionSec = 6; // assumption
export const scoreboardRingsSec = 2; // scoreboard: the activity rings fill before the first rank lights
export const rankStepSec = 2.8; // scoreboard: minimum per rank step (the rank lights and its clip plays); 2 + 5 x 2.8 + 4 = 20 s
export const rankFinalHoldSec = 4; // scoreboard: the final card (all five tiers on one card) holds at least this long
export const outroSec = 30;
export const endScreenSec = 15; // the end screen is the last part of the outro
export const outroFadeSec = 1; // the outro goes to black over its last this-many seconds
export const outroLeadSec = 1; // outro: the first line starts this long after the outro does when no clips are measured
export const rookieGapSec = 0.1; // card 1: gap between the Rookie level clip (banner) and the "Card 1." clip
export const clipPadSec = 0.3; // added to a clip's length when it sets a slot
export const pillLastSec = 1; // points pill: the red edge glow builds over the last this-many seconds of clue 5
export const pillPulseSec = 1; // points pill: on the last clue it pulses once per this-many seconds
export const levelBannerSec = 2; // Rookie banner over card 1: slide in, hold, slide out ("about 2 s")
export const levelBannerInSec = 0.4; // slide in (spring)
export const levelBannerOutSec = 0.3; // slide out
/** Level card beats, seconds from the segment start: home screen in, icon press, launch zoom, title, subtitle stagger, iris wipe out, tail. */
export const levelCardBeats = { gridIn: 0.2, pressAt: 0.3, launchAt: 0.4, textAt: 0.7, textStagger: 0.12, exitLen: 0.5, tail: 0.1 } as const;
/** Score card beats, seconds from the segment start: rings start, rings fill, stagger between rings, text line in. */
export const scoreCardBeats = { ringsAt: 0.33, ringsLen: 1.2, ringStagger: 0.18, textAt: 0.47 } as const;
/** Hook beats (seconds from the hook start; hookSec is the whole hook). Assumptions to confirm: only lockSec (0:00-0:03) is from the brief. */
export const hookBeats = { lockSec: 3, notifyAt: 0, hudAt: 3.4, chipsAt: 4, voiceAt: 0.3 } as const;
/* Not given in the task; assumptions to confirm: */
export const cardIntroSec = 1.0; // "Card n." slot when no clip is measured
export const dykTailSec = 0.2; // the did-you-know chip stays this long after its clip ends
export const chipStaggerSec = 0.15; // rule chips on card 1: gap between one chip's pop-in and the next
export const dykSec = 2.8; // did-you-know after the reveal when no clip is measured (gta6 value)

/** Clip counts per type (structure, not seconds). */
export const PREDICTION_CLIPS = 4;
export const OUTRO_CLIPS = 5;

/** Target runtime, seconds (12 to 14 minutes), and the script's own estimate (about 13.3 minutes). */
export const targetSec = { min: 12 * 60, max: 14 * 60 };
export const scriptEstimateSec = 13.3 * 60;

/* ---------- segments ---------- */
export type Range = { from: number; to: number };
export type CardPhases = {
  /** Card 30 only: the lock-screen replay (`finalLockSec`), the first part of its segment, before "Card n.". */
  lock?: Range;
  /** "Card n." */
  intro: Range;
  /** Five clue slots, hardest first. The points pill drops at each `from`. */
  clues: Range[];
  /** Silence after clue 5. */
  beat: Range;
  /** Name (and reveal line); includes the did-you-know when there is one. */
  reveal: Range;
  /** Did-you-know, the tail of `reveal`. Only on cards that have one. */
  dyk?: Range;
};

export type Segment =
  | ({ kind: 'hook' } & Range)
  | ({ kind: 'levelCard'; level: Level } & Range)
  | ({ kind: 'card'; card: Card; phases: CardPhases } & Range)
  | ({ kind: 'scoreCard'; level: Level; after: Card } & Range)
  | ({ kind: 'collection' } & Range)
  | ({ kind: 'predictions' } & Range)
  | ({ kind: 'scoreboard' } & Range)
  | ({ kind: 'outro'; endScreenFrom: number } & Range);

/* ---------- clip durations (src/nfl/timings.generated.ts, written by the audio pipeline) ----------
 * If any clip the timeline needs is missing, every constant above stays in force (fallback mode). */
const rowKey = (type: ClipType, key: string): string => `${type}:${key}`;
const durOf = new Map(clipTimings.map((c) => [rowKey(c.type, c.key), c.durSec] as const));
/** Length in seconds of a measured clip, undefined without timings or for an unknown slot. */
export const clipSec = (type: ClipType, key = ''): number | undefined => durOf.get(rowKey(type, key));

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
const range0 = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const dykCards: Card[] = cards.filter((c) => c.didYouKnow);
const needed: [ClipType, string][] = [
  ['hook', ''],
  ...levels.map((l): [ClipType, string] => ['level', l]),
  ...levels.map((l): [ClipType, string] => ['scorecard', l]), // the Hall of Fame one is "That was card thirty" (opens the collection)
  ...cards.flatMap((c): [ClipType, string][] => [
    ['cardintro', String(c.n)],
    ...range(5).map((i): [ClipType, string] => ['clue', `${c.n}.${i}`]),
    ['reveal', String(c.n)],
  ]),
  ...dykCards.map((c): [ClipType, string] => ['dyk', String(c.n)]),
  ...range0(PREDICTION_CLIPS).map((i): [ClipType, string] => ['prediction', String(i)]), // '0' = intro, '1'..'3' = picks
  ...range(ranks.length).map((i): [ClipType, string] => ['rank', String(i)]),
  ...range(OUTRO_CLIPS).map((i): [ClipType, string] => ['outro', String(i)]),
];
/** True when every clip the timeline needs has a measured length, so slots are built from clips instead of the constants. */
export const useClipTimings: boolean = clipTimings.length > 0 && needed.every(([t, k]) => durOf.has(rowKey(t, k)));
const dur = (type: ClipType, key = ''): number => durOf.get(rowKey(type, key)) ?? 0;
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
/** A slot: the constant minimum, or the clip plus its pad once clips are measured, whichever is longer. */
const slotOf = (minSec: number, clipLenSec: number): number => (useClipTimings ? Math.max(minSec, clipLenSec + clipPadSec) : minSec);

/** Seconds per slot, in order. Prediction and outro lists are empty without clip timings. */
export const predictionSlotSec: number[] = useClipTimings ? range0(PREDICTION_CLIPS).map((i) => dur('prediction', String(i)) + clipPadSec) : [];
/** Per rank, in the order of `ranks` (best first); clip key is the position in `ranks` + 1 (best = '1'). */
export const rankSlotSec: number[] = ranks.map((_, i) => slotOf(rankStepSec, dur('rank', String(i + 1))));
export const outroSlotSec: number[] = useClipTimings ? range(OUTRO_CLIPS).map((i) => dur('outro', String(i)) + clipPadSec) : [];
export const predictionsLenSec: number = Math.max(predictionsSec, sum(predictionSlotSec));
/** Predictions: the intro slot (title) before the first pick, used when no clips are measured; picks then share the rest equally. */
export const predictionsIntroSec = 3;
/** Predictions plan in ticks from the segment start. Clip keys: '0' = intro, '1'..'3' = pick 1..3 (assumption for 5a's audio map). */
export type PredictionsPlan = { intro: Range; picks: Range[]; len: number };
const buildPredictions = (): PredictionsPlan => {
  const len = secToTicks(predictionsLenSec);
  const picksN = PREDICTION_CLIPS - 1;
  const bounds: number[] = [0];
  if (useClipTimings) {
    let cur = 0;
    predictionSlotSec.forEach((s) => bounds.push((cur += secToTicks(s))));
  } else {
    const intro = secToTicks(predictionsIntroSec);
    const each = Math.floor((len - intro) / picksN);
    bounds.push(...range0(picksN).map((i) => intro + each * i));
    bounds.push(len);
  }
  bounds[bounds.length - 1] = len; // any extra length goes to the last pick
  const slots = range0(PREDICTION_CLIPS).map((i): Range => ({ from: bounds[i], to: bounds[i + 1] }));
  return { intro: slots[0], picks: slots.slice(1), len };
};
export const predictionsPlan: PredictionsPlan = buildPredictions();
/** One rank step of the scoreboard: `rank` is the index in `ranks` (0 = best), `key` its clip key, `from` / `to` ticks from the scoreboard start. */
export type ScoreboardStep = { rank: number; key: string; from: number; to: number };
/**
 * Scoreboard plan in ticks from the segment start: the rings fill, the ranks light from the lowest to the highest (each with
 * its clip), then the final card holds with all five tiers lit. Never shorter than `scoreboardSec`; any extra goes to the hold.
 */
const buildScoreboard = () => {
  let cur = secToTicks(scoreboardRingsSec);
  const rings: Range = { from: 0, to: cur };
  const steps: ScoreboardStep[] = ranks
    .map((_, i) => i)
    .reverse()
    .map((i) => {
      const from = cur;
      cur += secToTicks(rankSlotSec[i]);
      return { rank: i, key: String(i + 1), from, to: cur };
    });
  const len = Math.max(secToTicks(scoreboardSec), cur + secToTicks(rankFinalHoldSec));
  const hold: Range = { from: cur, to: len };
  return { rings, steps, hold, len };
};
export const scoreboardPlan = buildScoreboard();
export const scoreboardLenSec: number = ticksToSec(scoreboardPlan.len);
/** Outro line starts in ticks from the outro start (clip keys '1'..'5'): back to back from the clips, else spread evenly before the end screen. */
export const outroLineStarts: number[] = (() => {
  if (useClipTimings) {
    let cur = 0;
    return outroSlotSec.map((s) => {
      const at = cur;
      cur += secToTicks(s);
      return at;
    });
  }
  const lead = secToTicks(outroLeadSec);
  const each = Math.floor((secToTicks(Math.max(outroSec, 0) - endScreenSec) - lead) / OUTRO_CLIPS);
  return range0(OUTRO_CLIPS).map((i) => lead + each * i);
})();
/** The end screen needs its last `endScreenSec`, so the outro never goes below `outroSec`. */
export const outroLenSec: number = Math.max(outroSec, sum(outroSlotSec));

const buildSegments = (): Segment[] => {
  const out: Segment[] = [];
  let cur = 0;
  const span = (sec: number): Range => {
    const r = { from: cur, to: cur + secToTicks(sec) };
    cur = r.to;
    return r;
  };

  out.push({ kind: 'hook', ...span(hookSec) });
  cards.forEach((card, idx) => {
    const prev = cards[idx - 1];
    const next = cards[idx + 1];
    if (!prev || prev.level !== card.level) {
      // Rookie has no level card: its banner sits over card 1
      if (card.level !== 'rookie') out.push({ kind: 'levelCard', level: card.level, ...span(slotOf(levelCardSec, dur('level', card.level))) });
    }
    const from = cur;
    // the final card opens with the lock-screen replay: it is the start of the card's own segment, so every offset from `from` stays valid
    const lock = card.final ? span(finalLockSec) : undefined;
    const n = String(card.n);
    const clueMin = card.twoMinuteWarning ? clueTmwSec : clueBaseSec;
    // card 1: the Rookie banner clip plays first (it starts as the banner settles), then "Card 1.", so the intro slot holds both
    const introSec =
      idx === 0 && useClipTimings
        ? Math.max(cardIntroSec, levelBannerInSec + dur('level', 'rookie') + rookieGapSec + dur('cardintro', n) + clipPadSec)
        : slotOf(cardIntroSec, dur('cardintro', n));
    const intro = span(introSec);
    const clues = range(5).map((i) => span(slotOf(clueMin, dur('clue', `${card.n}.${i}`))));
    const beat = span(silenceBeatSec);
    // reveal clip, then the did-you-know clip, then the pad
    const revealClip = useClipTimings ? dur('reveal', n) : revealSec;
    const dykClip = card.didYouKnow ? (useClipTimings ? dur('dyk', n) : dykSec) : 0;
    const reveal = span(useClipTimings ? Math.max(revealSec, revealClip + dykClip + clipPadSec) : revealSec + dykClip);
    const phases: CardPhases = { intro, clues, beat, reveal };
    if (lock) phases.lock = lock;
    if (card.didYouKnow) phases.dyk = { from: reveal.from + secToTicks(revealClip), to: reveal.to };
    out.push({ kind: 'card', card, from, to: cur, phases });
    // the 30 solved cards stack into the Wallet collection after the final reveal, then it cuts to the next scene
    if (card.final) out.push({ kind: 'collection', ...span(useClipTimings ? Math.max(collectionSec, collectionBeats.stackAt + dur('scorecard', 'hof') + clipPadSec) : collectionSec) });
    // score cards after card 10 and 20 only: the Hall of Fame has none and cuts on to the rest of the video
    if ((!next || next.level !== card.level) && card.level !== 'hof') {
      out.push({ kind: 'scoreCard', level: card.level, after: card, ...span(slotOf(scoreCardSec, dur('scorecard', card.level))) });
    }
  });
  out.push({ kind: 'predictions', ...span(predictionsLenSec) });
  out.push({ kind: 'scoreboard', ...span(scoreboardLenSec) });
  const outro = span(outroLenSec);
  out.push({ kind: 'outro', endScreenFrom: outro.to - secToTicks(endScreenSec), ...outro });
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

/** Which clue slot (0..4) is on screen at absolute tick `tick`, or -1 before clue 1 and after clue 5. */
export const clueIndexAt = (phases: CardPhases, tick: number): number => phases.clues.findIndex((r) => tick >= r.from && tick < r.to);

/* ---------- parts and chapters ---------- */
export type PartRange = Range & { name: string; frames: number; renderFrom: number; renderTo: number };

/** Part1 = hook + Rookie (through its score card), Part2 = Starter, Part3 = Hall of Fame + final card, Part4 = predictions + scoreboard + outro. */
const partOf = (s: Segment): number => {
  if (s.kind === 'hook') return 0;
  if (s.kind === 'collection') return 2; // final card staging belongs to Part 3
  const level: Level | undefined = s.kind === 'card' ? s.card.level : s.kind === 'levelCard' || s.kind === 'scoreCard' ? s.level : undefined;
  if (level) return level === 'rookie' ? 0 : level === 'starter' ? 1 : 2;
  return 3;
};

export const partRanges: PartRange[] = [0, 1, 2, 3].map((p) => {
  const idx = segments.map((s, i) => (partOf(s) === p ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0 || idx[idx.length - 1] - idx[0] + 1 !== idx.length) throw new Error(`nfl timing: Part${p + 1} is empty or not contiguous`);
  const from = segments[idx[0]].from;
  const to = segments[idx[idx.length - 1]].to;
  return { name: `Part${p + 1}`, from, to, frames: to - from, renderFrom: ticksToFrames(from), renderTo: ticksToFrames(to) };
});

/** Level names for chapter titles. */
export const levelNames: Record<Level, string> = { rookie: 'Rookie', starter: 'Starter', hof: 'Hall of Fame' };
export type Chapter = { sec: number; title: string };

const startOf = (kind: Segment['kind'], level?: Level): number => {
  const s = segments.find((x) => x.kind === kind && (!level || (x.kind === 'levelCard' && x.level === level)));
  if (!s) throw new Error(`nfl timing: no ${kind} segment`);
  return ticksToSec(s.from);
};

/** YouTube chapters: the first is at 0:00 and each runs at least 10 s (scripts/nfl_runtime.ts checks). Rookie has no level card, so its chapter starts the video. */
export const chapters: Chapter[] = [
  { sec: 0, title: `Level 1: ${levelNames.rookie}` },
  { sec: startOf('levelCard', 'starter'), title: `Level 2: ${levelNames.starter}` },
  { sec: startOf('levelCard', 'hof'), title: `Level 3: ${levelNames.hof}` },
  { sec: startOf('predictions'), title: 'Predictions' },
  { sec: startOf('scoreboard'), title: 'Your Rank' },
  { sec: startOf('outro'), title: 'Outro' },
];
/** "m:ss Title" lines for the description. */
export const chapterLines: string[] = chapters.map((c) => `${timecode(c.sec)} ${c.title}`);
