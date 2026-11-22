import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { NotificationBanner } from '../components';
import type { Item, Level } from '../data';
import { LevelCard } from '../scenes/LevelCard';
import { QuestionScene } from '../scenes/QuestionScene';
import { ScoreCard } from '../scenes/ScoreCard';
import { FRAME, SAFE, colors, textStyle, u } from '../system';
import { partRanges, segments, ticksToFrames, useGta6Frame } from '../timing';
import { bannerStart, nextRound, roundLabel } from './Part1';
import type { Placed } from './Part1';

/**
 * GTA6-P2: Medium level card, items 16 to 30 with Bonus 2 and Bonus 3 where timing.ts puts them, Medium score card.
 * Same pattern as Part1: segments of `partRanges[1]` laid end to end from tick 0, every length from timing.ts, a blurred
 * NotificationBanner on the last `bannerSec` of each item naming the next round (none before the score card).
 *
 * `showVerifyTags` (default false): QA renders draw the item's `verify` note as a small corner tag on bonus items
 * (Bonus 3 is the only bonus in this part with a note). Off for the final render.
 */
const range = partRanges[1];

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

export const part2Plan: Placed[] = plan.placed;
export const part2Ticks: number = plan.total;
export const part2Frames: number = ticksToFrames(plan.total);

const LevelCardAt: React.FC<{ level: Level }> = ({ level }) => <LevelCard level={level} frame={useGta6Frame()} />;
const ScoreCardAt: React.FC<{ level: Level; after: Item }> = ({ level, after }) => <ScoreCard level={level} after={after} frame={useGta6Frame()} />;
const BannerAt: React.FC<{ title: string; level: Level }> = ({ title, level }) => <NotificationBanner title={title} frame={useGta6Frame()} at={0} level={level} />;

/** Small QA tag, bottom-left inside the safe margin. */
const VerifyTag: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: 'absolute', left: u(SAFE.x), bottom: u(SAFE.bottom), maxWidth: u(FRAME.w * 0.4),
      padding: `${u(8)}px ${u(16)}px`, borderRadius: u(12), background: 'rgba(0,0,0,0.72)',
      border: `${u(1.5)}px solid ${colors.mutedStrong}`, color: colors.ink,
      ...textStyle('caption'), fontSize: u(20),
    }}
  >
    {text}
  </div>
);

export const Part2: React.FC<{ showVerifyTags?: boolean }> = ({ showVerifyTags = false }) => (
  <AbsoluteFill>
    {plan.placed.map((p) => {
      const { seg } = p;
      const key = `${seg.kind}-${seg.from}`;
      switch (seg.kind) {
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
              {showVerifyTags && seg.item.kind === 'bonus' && seg.item.verify && (
                <Sequence from={ticksToFrames(p.at)} durationInFrames={end - ticksToFrames(p.at)} layout="absolute-fill">
                  <VerifyTag text={seg.item.verify} />
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

export default Part2;
