import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useDesignFrame } from './clock';
import { locate, TIMELINE } from './timing';
import { Round } from './Round';
import { Hook } from './Hook';
import { LevelCard } from './LevelCard';
import { Bonus } from './BonusRound';
import { Iris } from './Iris';
import { Reminder } from './Reminder';
import { Scoreboard } from './Scoreboard';
import { EndScreen } from './EndScreen';
import { Soundtrack } from './Soundtrack';
import { CameraRig } from './CameraRig';
import settings from '../settings.json';

/**
 * Composition root: it only decides WHICH scene is on screen.
 * Each scene owns all of its own motion, and every scene reads the absolute
 * frame (useCurrentFrame) plus its own segment offset, so nothing depends on
 * being mounted for a particular number of frames — Remotion can therefore
 * render any frame range in any order (see scripts/render-batches.js).
 */
const Scenes: React.FC = () => {
  const frame = useDesignFrame();
  const { seg, local } = locate(TIMELINE.segments, frame);

  if (!seg) return null;

  // card scenes get a slow breathing camera (see CameraRig); questions have their own camera in Round
  const rig = (children: React.ReactNode) =>
    settings.camera.cards ? (
      <CameraRig frame={local} duration={seg.duration}>
        {children}
      </CameraRig>
    ) : (
      <>{children}</>
    );

  switch (seg.kind) {
    case 'hook':
      return (
        <AbsoluteFill>
          {rig(<Hook frame={local} />)}
        </AbsoluteFill>
      );
    case 'levelCard':
      return (
        <AbsoluteFill>
          {rig(<LevelCard frame={local} levelIndex={seg.levelIndex} />)}
        </AbsoluteFill>
      );
    case 'question':
      return (
        <AbsoluteFill>
          <Round frame={local} index={seg.index} erases={seg.erases} />
        </AbsoluteFill>
      );
    case 'bonus':
      return (
        <AbsoluteFill>
          {rig(<Bonus frame={local} puzzle={seg.puzzle} index={seg.index} />)}
        </AbsoluteFill>
      );
    case 'reminder':
      return (
        <AbsoluteFill>
          {rig(<Reminder frame={local} seg={seg} />)}
        </AbsoluteFill>
      );
    case 'iris':
      return (
        <AbsoluteFill>
          <Iris frame={local} seg={seg} />
        </AbsoluteFill>
      );
    case 'scoreboard':
      return (
        <AbsoluteFill>
          {rig(<Scoreboard frame={local} />)}
        </AbsoluteFill>
      );
    case 'endScreen':
      return (
        <AbsoluteFill>
          {rig(<EndScreen frame={local} />)}
        </AbsoluteFill>
      );
    default:
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};

/** Scenes + the audio plan (src/sound.ts). Sound is mixed from files in public/sounds. */
export const Main: React.FC = () => (
  <>
    <Scenes />
    <Soundtrack />
  </>
);
