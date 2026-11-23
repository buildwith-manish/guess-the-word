/**
 * Part 2 (NFL, task 4c): the Starter level card, cards 11 to 20, the Starter score card ("NFL-P2"). Placement only, same
 * pattern as Part1 / Part3. Card 15 gets the Two-Minute Warning from CardScene (card.twoMinuteWarning).
 * Offsets are design ticks (30 fps) local to the part (`seg.from - partRanges[1].from`).
 */
import React from 'react';
import { Sequence } from 'remotion';
import { LevelCard } from '../scenes/LevelCard';
import { CardScene } from '../scenes/CardScene';
import { ScoreCard } from '../scenes/ScoreCard';
import { partRanges, segments, ticksToFrames, useNflFrame, type Segment } from '../timing';
import type { Placed } from './Part1';

const range = partRanges[1];

export const part2Plan: Placed[] = segments
  .filter((s) => s.from >= range.from && s.to <= range.to)
  .map((seg) => ({ seg, at: seg.from - range.from, ticks: seg.to - seg.from }));

export const part2Ticks: number = range.to - range.from;
export const part2Frames: number = range.renderTo - range.renderFrom;

const LevelCardScene: React.FC<{ seg: Extract<Segment, { kind: 'levelCard' }>; ticks: number }> = ({ seg, ticks }) => {
  if (seg.level === 'rookie') throw new Error('Part2: Rookie has no level card');
  return <LevelCard level={seg.level} frame={useNflFrame()} ticks={ticks} />;
};

const ScoreCardScene: React.FC<{ seg: Extract<Segment, { kind: 'scoreCard' }> }> = ({ seg }) => {
  if (seg.level === 'hof') throw new Error('Part2: the Hall of Fame has no score card');
  return <ScoreCard level={seg.level} after={seg.after} frame={useNflFrame()} />;
};

const sceneOf = (seg: Segment, ticks: number): React.ReactNode => {
  switch (seg.kind) {
    case 'levelCard':
      return <LevelCardScene seg={seg} ticks={ticks} />;
    case 'card':
      return <CardScene card={seg.card} />;
    case 'scoreCard':
      return <ScoreCardScene seg={seg} />;
    default:
      throw new Error(`Part2: unexpected segment "${seg.kind}"`);
  }
};

const sequenceFrames = (at: number, ticks: number) => ({
  from: ticksToFrames(range.from + at) - range.renderFrom,
  durationInFrames: ticksToFrames(range.from + at + ticks) - ticksToFrames(range.from + at),
});

export const Part2: React.FC = () => (
  <>
    {part2Plan.map(({ seg, at, ticks }, i) => (
      <Sequence key={i} {...sequenceFrames(at, ticks)} layout="absolute-fill">
        {sceneOf(seg, ticks)}
      </Sequence>
    ))}
  </>
);
