/**
 * Part 3 (NFL, task 4d): the Hall of Fame level card, cards 21 to 29, card 30 through FinalCard, then the Wallet
 * collection, in one composition ("NFL-P3"). Same pattern as Part1: placement only.
 *
 *   level card      -> <LevelCard level="hof" />
 *   cards 21 to 29  -> <CardScene />   (card 25 is wrapped in the Two-Minute Warning by CardScene, from card.twoMinuteWarning)
 *   card 30         -> <FinalCard />   (its segment opens with the 1 s lock replay, then \"Card 30.\")
 *   collection      -> <WalletCollection />
 *
 * There is no score card after the Hall of Fame and no fade at the end: the last frame of the collection is the last
 * frame of the part, and Part 4 starts on the next frame (a straight cut). The spoken line over the collection has no
 * clip slot in timing.ts yet; `part3Voice` gives where it starts (see sfxCues.ts for the cues).
 * Offsets are design ticks (30 fps) local to the part (`seg.from - partRanges[2].from`).
 */
import React from 'react';
import { Sequence } from 'remotion';
import { LevelCard } from '../scenes/LevelCard';
import { CardScene } from '../scenes/CardScene';
import { FinalCard } from '../scenes/FinalCard';
import { WalletCollection, collectionMarks } from '../scenes/WalletCollection';
import { partRanges, segments, ticksToFrames, useNflFrame, type Segment } from '../timing';

const range = partRanges[2];

export type Placed = { seg: Segment; at: number; ticks: number };

/** The part's segments in order, with their offsets inside the part. */
export const part3Plan: Placed[] = segments
  .filter((s) => s.from >= range.from && s.to <= range.to)
  .map((seg) => ({ seg, at: seg.from - range.from, ticks: seg.to - seg.from }));

/** Length of the part in design ticks and in render frames (equal to partRanges[2]). */
export const part3Ticks: number = range.to - range.from;
export const part3Frames: number = range.renderTo - range.renderFrom;

/** Where the line over the collection starts: as the first card lands. Ticks local to the part. */
export const part3Voice = () => {
  const p = part3Plan.find((x) => x.seg.kind === 'collection');
  if (!p) throw new Error('Part3: no collection segment');
  return { type: 'collection' as const, key: '', tick: p.at + collectionMarks().stackAt };
};

const LevelCardScene: React.FC<{ seg: Extract<Segment, { kind: 'levelCard' }>; ticks: number }> = ({ seg, ticks }) => {
  if (seg.level === 'rookie') throw new Error('Part3: Rookie has no level card');
  return <LevelCard level={seg.level} frame={useNflFrame()} ticks={ticks} />;
};

const sceneOf = (seg: Segment, ticks: number): React.ReactNode => {
  switch (seg.kind) {
    case 'levelCard':
      return <LevelCardScene seg={seg} ticks={ticks} />;
    case 'card':
      return seg.card.final ? <FinalCard /> : <CardScene card={seg.card} />;
    case 'collection':
      return <WalletCollection />;
    default:
      throw new Error(`Part3: unexpected segment "${seg.kind}"`);
  }
};

const sequenceFrames = (at: number, ticks: number) => ({
  from: ticksToFrames(range.from + at) - range.renderFrom,
  durationInFrames: ticksToFrames(range.from + at + ticks) - ticksToFrames(range.from + at),
});

export const Part3: React.FC = () => (
  <>
    {part3Plan.map(({ seg, at, ticks }, i) => (
      <Sequence key={i} {...sequenceFrames(at, ticks)} layout="absolute-fill">
        {sceneOf(seg, ticks)}
      </Sequence>
    ))}
  </>
);
