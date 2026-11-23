/**
 * Part 4 (NFL, task 4g): predictions, scoreboard, outro ("NFL-P4"). Straight cuts between the three; the outro fades to
 * black at its end. Offsets are design ticks local to the part (`seg.from - partRanges[3].from`).
 */
import React from 'react';
import { Sequence } from 'remotion';
import { Predictions } from '../scenes/Predictions';
import { Scoreboard } from '../scenes/Scoreboard';
import { Outro } from '../scenes/Outro';
import { partRanges, segments, ticksToFrames, useNflFrame, type Segment } from '../timing';
import type { Placed } from './Part1';

const range = partRanges[3];

export const part4Plan: Placed[] = segments
  .filter((s) => s.from >= range.from && s.to <= range.to)
  .map((seg) => ({ seg, at: seg.from - range.from, ticks: seg.to - seg.from }));

export const part4Ticks: number = range.to - range.from;
export const part4Frames: number = range.renderTo - range.renderFrom;

const ScoreboardAt: React.FC = () => <Scoreboard frame={useNflFrame()} />;
const OutroAt: React.FC = () => <Outro frame={useNflFrame()} />;

const sceneOf = (seg: Segment): React.ReactNode => {
  switch (seg.kind) {
    case 'predictions':
      return <Predictions />;
    case 'scoreboard':
      return <ScoreboardAt />;
    case 'outro':
      return <OutroAt />;
    default:
      throw new Error(`Part4: unexpected segment "${seg.kind}"`);
  }
};

const sequenceFrames = (at: number, ticks: number) => ({
  from: ticksToFrames(range.from + at) - range.renderFrom,
  durationInFrames: ticksToFrames(range.from + at + ticks) - ticksToFrames(range.from + at),
});

export const Part4: React.FC = () => (
  <>
    {part4Plan.map(({ seg, at, ticks }, i) => (
      <Sequence key={i} {...sequenceFrames(at, ticks)} layout="absolute-fill">
        {sceneOf(seg)}
      </Sequence>
    ))}
  </>
);
