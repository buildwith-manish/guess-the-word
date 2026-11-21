import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { useDesignFrame } from '../clock';
import { CameraRig } from '../CameraRig';
import rootSettings from '../../settings.json';
import { locate, LEVELS, TIMELINE } from './search-timing';
import { SearchRound } from './scenes/SearchRound';
import { SearchScoreboard } from './scenes/SearchScoreboard';

/**
 * Search History composition root. Like src/Main.tsx it only decides WHICH scene is on
 * screen; each scene owns its motion and reads its scene-local tick, so any frame range
 * can be rendered in any order. No audio here (a later task).
 *
 * Scenes that do not exist yet (hook, levelCard, bonus, reminder, iris, endScreen) render
 * <Pending/>: a plain gradient from the segment's own theme, so the timeline can be
 * scrubbed end to end. Replace each case with its scene when that task lands.
 */

const Pending: React.FC<{ theme: [string, string] }> = ({ theme }) => (
  <AbsoluteFill style={{ background: `linear-gradient(135deg, ${theme[0]}, ${theme[1]})` }} />
);

const Scenes: React.FC = () => {
  const frame = useDesignFrame();
  const { seg, local, index } = locate(TIMELINE.segments, frame);
  if (!seg) return null;

  // card scenes get the shared slow breathing camera; rounds have their own camera
  const rig = (children: React.ReactNode) =>
    rootSettings.camera.cards ? (
      <CameraRig frame={local} duration={seg.duration}>
        {children}
      </CameraRig>
    ) : (
      <>{children}</>
    );

  // motion blur settings come from root settings.json (same as Main.tsx)
  const mb = rootSettings.motionBlur || { mode: 'off', shutterAngle: 360, samples: 4 };
  const blurOn = mb.mode === 'always' || mb.mode === 'windows';
  const BlurWrap = ({ children }: { children: React.ReactNode }) =>
    blurOn ? (
      <CameraMotionBlur shutterAngle={mb.shutterAngle} samples={mb.samples}>
        {children}
      </CameraMotionBlur>
    ) : (
      <>{children}</>
    );

  const firstTheme = LEVELS[0].theme;

  switch (seg.kind) {
    case 'hook':
      return <AbsoluteFill>{rig(<Pending theme={firstTheme} />)}</AbsoluteFill>;
    case 'levelCard':
      return <AbsoluteFill>{rig(<Pending theme={LEVELS[seg.levelIndex].theme} />)}</AbsoluteFill>;
    case 'round':
      return (
        <AbsoluteFill>
          <BlurWrap>
            <SearchRound frame={local + (seg.lead ?? 0)} index={seg.index} lead={seg.lead ?? 0} />
          </BlurWrap>
        </AbsoluteFill>
      );
    case 'bonus':
      return (
        <AbsoluteFill>
          <BlurWrap>{rig(<Pending theme={LEVELS[LEVELS.length - 1].theme} />)}</BlurWrap>
        </AbsoluteFill>
      );
    case 'reminder':
      return <AbsoluteFill>{rig(<Pending theme={seg.theme} />)}</AbsoluteFill>;
    case 'iris': {
      // overlap: the next round's content plays inside the last `lead` ticks of the wipe
      const next = TIMELINE.segments[index + 1];
      const lead = next && next.kind === 'round' ? (next.lead ?? 0) : 0;
      const rf = local - (seg.duration - lead);
      return (
        <AbsoluteFill>
          <Pending theme={seg.toTheme} />
          {next && next.kind === 'round' && lead > 0 && rf >= 0 ? (
            <SearchRound frame={rf} index={next.index} lead={lead} />
          ) : null}
        </AbsoluteFill>
      );
    }
    case 'scoreboard':
      return <AbsoluteFill>{rig(<SearchScoreboard frame={local} />)}</AbsoluteFill>;
    case 'endScreen':
      return <AbsoluteFill>{rig(<Pending theme={LEVELS[LEVELS.length - 1].theme} />)}</AbsoluteFill>;
    default:
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};

export const SearchMain: React.FC = () => <Scenes />;
