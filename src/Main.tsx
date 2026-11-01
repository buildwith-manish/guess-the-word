import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { locate, TIMELINE } from './timing';
import { Round } from './Round';
import { Hook } from './Hook';
import { LevelCard } from './LevelCard';
import { Bonus } from './Bonus';
import { Scoreboard } from './Scoreboard';
import { EndScreen } from './EndScreen';

/**
 * Composition root: it only decides WHICH scene is on screen.
 * Each scene owns all of its own motion, and every scene reads the absolute
 * frame (useCurrentFrame) plus its own segment offset, so nothing depends on
 * being mounted for a particular number of frames — Remotion can therefore
 * render any frame range in any order (see scripts/render-batches.js).
 */
export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const { seg, local } = locate(TIMELINE.segments, frame);

  if (!seg) return null;

  switch (seg.kind) {
    case 'hook':
      return (
        <AbsoluteFill>
          <Hook frame={local} />
        </AbsoluteFill>
      );
    case 'levelCard':
      return (
        <AbsoluteFill>
          <LevelCard frame={local} levelIndex={seg.levelIndex} />
        </AbsoluteFill>
      );
    case 'question':
      return (
        <AbsoluteFill>
          <Round frame={local} index={seg.index} />
        </AbsoluteFill>
      );
    case 'bonus':
      return (
        <AbsoluteFill>
          <Bonus frame={local} puzzle={seg.puzzle} index={seg.index} />
        </AbsoluteFill>
      );
    case 'scoreboard':
      return (
        <AbsoluteFill>
          <Scoreboard frame={local} />
        </AbsoluteFill>
      );
    case 'endScreen':
      return (
        <AbsoluteFill>
          <EndScreen frame={local} />
        </AbsoluteFill>
      );
    default:
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};
