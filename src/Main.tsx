import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
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
  const { seg, local, index } = locate(TIMELINE.segments, frame);

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

  // Motion blur: wrap question + bonus scenes during fast-motion windows
  const mb = settings.motionBlur || { mode: 'off', shutterAngle: 360, samples: 4 };
  const blurOn = mb.mode === 'always' || mb.mode === 'windows';
  const BlurWrap = ({ children }: { children: React.ReactNode }) =>
    blurOn ? (
      <CameraMotionBlur shutterAngle={mb.shutterAngle} samples={mb.samples}>
        {children}
      </CameraMotionBlur>
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
          <BlurWrap>
            <Round frame={local + (seg.lead ?? 0)} index={seg.index} erases={seg.erases} lead={seg.lead ?? 0} />
          </BlurWrap>
        </AbsoluteFill>
      );
    case 'bonus':
      return (
        <AbsoluteFill>
          <BlurWrap>
            {rig(<Bonus frame={local} puzzle={seg.puzzle} index={seg.index} />)}
          </BlurWrap>
        </AbsoluteFill>
      );
    case 'reminder':
      return (
        <AbsoluteFill>
          {rig(<Reminder frame={local} seg={seg} />)}
        </AbsoluteFill>
      );
    case 'iris': {
      // overlap: the next question's stage content springs in during the last `lead` frames of the wipe
      const next = TIMELINE.segments[index + 1];
      const lead = next && next.kind === 'question' ? (next.lead ?? 0) : 0;
      const rf = local - (seg.duration - lead);
      return (
        <AbsoluteFill>
          <Iris frame={local} seg={seg} />
          {next && next.kind === 'question' && lead > 0 && rf >= 0 ? (
            <Round frame={rf} index={next.index} erases={next.erases} lead={lead} overlay />
          ) : null}
        </AbsoluteFill>
      );
    }
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
