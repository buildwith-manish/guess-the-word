/**
 * Part 1 (NFL, task 4b): the hook, the Rookie cards 1 to 10 and the Rookie score card, in one composition ("NFL-P1").
 *
 * Everything here is placement. Which segments belong to the part, where each starts and how long it is come from
 * `segments` and `partRanges[0]` in timing.ts; the scenes bring their own text and beats.
 *
 *   hook            -> <Hook />
 *   card 1          -> <CardScene fromHook />   (the hook already showed the card, HUD and rule chips)
 *   Rookie banner   -> <LevelBanner /> in its own Sequence over card 1, starting at card 1's first tick
 *   cards 2 to 10   -> <CardScene />            (no level card between them; card 5 is wrapped in the Two-Minute
 *                                                Warning by CardScene itself, from card.twoMinuteWarning)
 *   Rookie score    -> <ScoreCard />
 *
 * Offsets are design ticks (30 fps) local to the part, i.e. `seg.from - partRanges[0].from`. Sequences sit at render
 * frames (ticksToFrames). Cues for the audio layer: `part1Cues` in src/nfl/sfxCues.ts.
 */
import React from 'react';
import { Sequence } from 'remotion';
import { cards } from '../data';
import { CardScene } from '../scenes/CardScene';
import { Hook } from '../scenes/Hook';
import { LevelBanner, levelBannerMarks } from '../scenes/LevelBanner';
import { ScoreCard } from '../scenes/ScoreCard';
import { partRanges, segments, ticksToFrames, useNflFrame, type Segment } from '../timing';

const range = partRanges[0];

export type Placed = {
  seg: Segment;
  /** Design tick, local to the part, where the segment starts. */
  at: number;
  /** Segment length in design ticks. */
  ticks: number;
};

const buildPlan = (): Placed[] =>
  segments
    .filter((s) => s.from >= range.from && s.to <= range.to)
    .map((seg) => ({ seg, at: seg.from - range.from, ticks: seg.to - seg.from }));

/** The part's segments in order, with their offsets inside the part. */
export const part1Plan: Placed[] = buildPlan();

/** Length of the part in design ticks and in render frames (equal to partRanges[0]). */
export const part1Ticks: number = range.to - range.from;
export const part1Frames: number = range.renderTo - range.renderFrom;

/** Tick, local to the part, where card 1 starts: the Rookie banner starts here too. */
export const part1BannerAt: number = (() => {
  const p = part1Plan.find((x) => x.seg.kind === 'card' && x.seg.card.n === cards[0].n);
  if (!p) throw new Error('Part1: card 1 has no segment');
  return p.at;
})();

/** Banner length in ticks, from LevelBanner / timing.ts. */
export const part1BannerTicks: number = levelBannerMarks().total;

/** LevelBanner draws on the clock of its Sequence, so it starts at 0 inside it. */
const Banner: React.FC = () => <LevelBanner frame={useNflFrame()} at={0} />;

const ScoreCardScene: React.FC<{ seg: Extract<Segment, { kind: 'scoreCard' }> }> = ({ seg }) => {
  if (seg.level === 'hof') throw new Error('Part1: the Hall of Fame has no score card');
  return <ScoreCard level={seg.level} after={seg.after} frame={useNflFrame()} />;
};

const sceneOf = (seg: Segment): React.ReactNode => {
  switch (seg.kind) {
    case 'hook':
      return <Hook />;
    case 'card':
      return <CardScene card={seg.card} fromHook={seg.card.n === cards[0].n} />;
    case 'scoreCard':
      return <ScoreCardScene seg={seg} />;
    default:
      throw new Error(`Part1: unexpected segment "${seg.kind}"`);
  }
};

const sequenceFrames = (at: number, ticks: number) => ({
  from: ticksToFrames(range.from + at) - range.renderFrom,
  durationInFrames: ticksToFrames(range.from + at + ticks) - ticksToFrames(range.from + at),
});

export const Part1: React.FC = () => (
  <>
    {part1Plan.map(({ seg, at, ticks }, i) => (
      <Sequence key={i} {...sequenceFrames(at, ticks)} layout="absolute-fill">
        {sceneOf(seg)}
      </Sequence>
    ))}
    {/* above card 1: mounted after the scenes, so it draws on top */}
    <Sequence {...sequenceFrames(part1BannerAt, part1BannerTicks)} layout="absolute-fill">
      <Banner />
    </Sequence>
  </>
);
