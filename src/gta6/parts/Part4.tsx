import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Outro } from '../scenes/Outro';
import { Scoreboard } from '../scenes/Scoreboard';
import { partRanges, segments, ticksToFrames, useGta6Frame } from '../timing';
import type { Placed } from './Part1';

/**
 * GTA6-P4: Scoreboard, then Outro (straight cut; Part 3 ends on a score card with no exit, the outro fades to black at
 * its end). Segments of `partRanges[3]` laid end to end from tick 0, every length from timing.ts.
 */
const range = partRanges[3];

const buildPlan = (): { placed: Placed[]; total: number } => {
  const placed: Placed[] = [];
  let cur = 0;
  for (const seg of segments) {
    if (seg.from < range.from || seg.to > range.to) continue;
    const ticks = seg.to - seg.from;
    placed.push({ seg, at: cur, ticks });
    cur += ticks;
  }
  return { placed, total: cur };
};
const plan = buildPlan();

export const part4Plan: Placed[] = plan.placed;
export const part4Ticks: number = plan.total;
export const part4Frames: number = ticksToFrames(plan.total);

const ScoreboardAt: React.FC = () => <Scoreboard frame={useGta6Frame()} />;
const OutroAt: React.FC = () => <Outro frame={useGta6Frame()} />;

export const Part4: React.FC = () => (
  <AbsoluteFill>
    {plan.placed.map((p) => {
      const { seg } = p;
      if (seg.kind !== 'scoreboard' && seg.kind !== 'outro') return null;
      return (
        <Sequence key={`${seg.kind}-${seg.from}`} from={ticksToFrames(p.at)} durationInFrames={ticksToFrames(p.ticks)} layout="absolute-fill">
          {seg.kind === 'scoreboard' ? <ScoreboardAt /> : <OutroAt />}
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

export default Part4;
