import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { NotificationBanner } from '../components';
import { items } from '../data';
import type { Item, Level } from '../data';
import { Hook } from '../scenes/Hook';
import { LevelCard } from '../scenes/LevelCard';
import { QuestionScene } from '../scenes/QuestionScene';
import { ScoreCard } from '../scenes/ScoreCard';
import { bannerSec, partRanges, scoreCardLevel, secToTicks, segments, ticksToFrames, useGta6Frame } from '../timing';
import type { Segment } from '../timing';

/**
 * GTA6-P1: hook (includes Q1), Easy level card, items 2 to 10, Bonus 1, items 11 to 15, Easy score card.
 *
 * Every length comes from timing.ts (`segments`, in the range of `partRanges[0]`). Segments are laid end to end from tick 0,
 * so Part1 starts at 0 whatever the video offset is. The first item (order 1) is played inside Hook, so its own segment
 * (the full Q1 after the level card in timing.ts) is NOT placed here; the cursor skips it. Because of that Part1 is shorter
 * than `partRanges[0].frames` by exactly that segment (see `part1Skipped`).
 * UPDATE (voice overlap fix): the full Q1 segment is NOW placed after the level card, so Part1 matches `partRanges[0]` and `part1Skipped` is 0.
 * The hook still shows Q1 as a silent teaser (the hook line plays over it).
 *
 * Banner: on the last `bannerSec` of each item a NotificationBanner names the next round (blurred title). No banner
 * when the next thing is not a round (the score card).
 */

export type Placed = { seg: Segment; at: number; ticks: number };

const range = partRanges[0];

/** Segments of Part1 in order, each with its start in Part1 ticks. */
const buildPlan = (): { placed: Placed[]; skipped: number; total: number } => {
  const placed: Placed[] = [];
  let cur = 0;
  let skipped = 0;
  for (const seg of segments) {
    if (seg.from < range.from || seg.to > range.to) continue;
    const ticks = seg.to - seg.from;
    placed.push({ seg, at: cur, ticks });
    cur += ticks;
  }
  return { placed, skipped, total: cur };
};
const plan = buildPlan();

export const part1Plan: Placed[] = plan.placed;
/** Ticks of the full-Q1 segment that Part1 leaves out (Q1 plays inside the hook). */
export const part1Skipped: number = plan.skipped;
export const part1Ticks: number = plan.total;
export const part1Frames: number = ticksToFrames(plan.total);

/** Where the banner starts inside an item placed at `p.at`. */
export const bannerStart = (p: Placed): number => p.at + p.ticks - secToTicks(bannerSec);

const NUMBER_PREFIX = /^B/;
/** Label of the next round: "Question 3", "Bonus 1". Only the two words are written here. */
export const roundLabel = (item: Item): string => (item.kind === 'bonus' ? `Bonus ${item.n.replace(NUMBER_PREFIX, '')}` : `Question ${item.n}`);

/** The round that follows `item` in this part, or undefined (a score card follows, or the part ends). */
export const nextRound = (item: Item): Item | undefined => (scoreCardLevel(item) ? undefined : items.find((i) => i.order === item.order + 1));

const LevelCardAt: React.FC<{ level: Level }> = ({ level }) => {
  const f = useGta6Frame();
  return <LevelCard level={level} frame={f} />;
};
const ScoreCardAt: React.FC<{ level: Level; after: Item }> = ({ level, after }) => {
  const f = useGta6Frame();
  return <ScoreCard level={level} after={after} frame={f} />;
};
const BannerAt: React.FC<{ title: string; level: Level }> = ({ title, level }) => {
  const f = useGta6Frame();
  return <NotificationBanner title={title} frame={f} at={0} level={level} />;
};

export const Part1: React.FC = () => (
  <AbsoluteFill>
    {plan.placed.map((p) => {
      const { seg } = p;
      const key = `${seg.kind}-${seg.from}`;
      switch (seg.kind) {
        case 'hook':
          return <Hook key={key} at={p.at} />;
        case 'levelCard':
          return (
            <Sequence key={key} from={ticksToFrames(p.at)} durationInFrames={ticksToFrames(p.ticks)} layout="absolute-fill">
              <LevelCardAt level={seg.level} />
            </Sequence>
          );
        case 'item': {
          const next = nextRound(seg.item);
          const from = ticksToFrames(bannerStart(p));
          const end = ticksToFrames(p.at + p.ticks);
          return (
            <React.Fragment key={key}>
              <QuestionScene item={seg.item} at={p.at} />
              {next && (
                <Sequence from={from} durationInFrames={end - from} layout="absolute-fill">
                  <BannerAt title={roundLabel(next)} level={next.level} />
                </Sequence>
              )}
            </React.Fragment>
          );
        }
        case 'scoreCard':
          return (
            <Sequence key={key} from={ticksToFrames(p.at)} durationInFrames={ticksToFrames(p.ticks)} layout="absolute-fill">
              <ScoreCardAt level={seg.level} after={seg.after} />
            </Sequence>
          );
        default:
          return null;
      }
    })}
  </AbsoluteFill>
);

export default Part1;
