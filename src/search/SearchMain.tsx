import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { useDesignFrame } from '../clock';
import { TIME_SCALE } from '../timing';
import { CameraRig } from '../CameraRig';
import rootSettings from '../../settings.json';
import searchSettings from './search-settings.json';
import { locate, TIMELINE } from './search-timing';
import { SearchRound } from './scenes/SearchRound';
import { SearchScoreboard } from './scenes/SearchScoreboard';
import { SearchBonus } from './scenes/SearchBonus';
import { SearchEndScreen } from './scenes/SearchEndScreen';
import { SearchHook } from './scenes/SearchHook';
import { SearchLevelCard } from './scenes/SearchLevelCard';
import { SearchReminder } from './scenes/SearchReminder';
import { SearchIris } from './scenes/SearchIris';
import { SearchWatermark } from './components/SearchWatermark';
import { SearchSoundtrack } from './SearchSoundtrack';

/**
 * Search History composition root. Like src/Main.tsx it only decides WHICH scene is on
 * screen; each scene owns its motion and reads its scene-local tick, so any frame range
 * can be rendered in any order. Audio: <SearchSoundtrack/>.
 *
 * Camera: the iOS look is calm, so by default there is no breathing camera and no motion blur.
 * search-settings.json "camera" turns either back on (cards: CameraRig on card scenes; motionBlur: root settings).
 */

const Scenes: React.FC = () => {
  const frame = useDesignFrame();
  const { seg, local, index } = locate(TIMELINE.segments, frame);
  if (!seg) return null;

  // card scenes get the shared slow breathing camera; rounds have their own camera
  const rig = (children: React.ReactNode) =>
    rootSettings.camera.cards && searchSettings.camera.cards ? (
      <CameraRig frame={local} duration={seg.duration}>
        {children}
      </CameraRig>
    ) : (
      <>{children}</>
    );

  // motion blur settings come from root settings.json (same as Main.tsx)
  const mb = rootSettings.motionBlur || { mode: 'off', shutterAngle: 360, samples: 4 };
  const blurOn = searchSettings.camera.motionBlur && (mb.mode === 'always' || mb.mode === 'windows');
  const BlurWrap = ({ children }: { children: React.ReactNode }) =>
    blurOn ? (
      <CameraMotionBlur shutterAngle={mb.shutterAngle} samples={mb.samples}>
        {children}
      </CameraMotionBlur>
    ) : (
      <>{children}</>
    );

  const scene = (): React.ReactNode => {
    switch (seg.kind) {
      case 'hook':
        return <AbsoluteFill>{rig(<SearchHook frame={local} duration={seg.duration} />)}</AbsoluteFill>;
      case 'levelCard':
        return <AbsoluteFill>{rig(<SearchLevelCard frame={local} levelIndex={seg.levelIndex} duration={seg.duration} />)}</AbsoluteFill>;
      case 'round':
        return (
          <AbsoluteFill>
            <BlurWrap>
              <SearchRound frame={local} index={seg.index} lead={seg.lead ?? 0} />
            </BlurWrap>
          </AbsoluteFill>
        );
      case 'bonus':
        return (
          <AbsoluteFill>
            <BlurWrap>{rig(<SearchBonus frame={local} index={seg.index} />)}</BlurWrap>
          </AbsoluteFill>
        );
      case 'reminder':
        return <AbsoluteFill>{rig(<SearchReminder frame={local} seg={seg} />)}</AbsoluteFill>;
      case 'iris': {
        // overlap: the next round's content plays inside the last `lead` ticks of the transition
        const next = TIMELINE.segments[index + 1];
        const nextRound = next && next.kind === 'round' ? { index: next.index, lead: next.lead ?? 0 } : undefined;
        return (
          <AbsoluteFill>
            <SearchIris frame={local} seg={seg} next={nextRound} />
          </AbsoluteFill>
        );
      }
      case 'scoreboard':
        return <AbsoluteFill>{rig(<SearchScoreboard frame={local} />)}</AbsoluteFill>;
      case 'endScreen':
        return <AbsoluteFill>{rig(<SearchEndScreen frame={local} />)}</AbsoluteFill>;
      default:
        return <AbsoluteFill style={{ background: '#000' }} />;
    }
  };

  // Every scene is planned in ticks counted from its own start, and the components inside it (timer, search bar,
  // hint pair, answer) read the Remotion clock themselves. So each scene sits in a Sequence that starts where it
  // does; without it they read the clock of the whole video and drew every round already finished (timer at 0,
  // all searches typed). ceil = the first frame locate() puts in this scene.
  // The QUIZ MATRIX watermark sits outside the Sequence on purpose: it reads the clock of the whole video, so its logo
  // loop and its entrance never restart at a scene change. Shown on the stage scenes (round, reminder, wipes), not on
  // the hook, cards, bonus, scoreboard or end screen.
  const showWatermark = seg.kind === 'round' || seg.kind === 'reminder' || seg.kind === 'iris';
  const watermarkSince = TIMELINE.segments.find((s) => s.kind === 'round' || s.kind === 'reminder' || s.kind === 'iris')?.from ?? 0;

  return (
    <>
      <Sequence key={index} from={Math.ceil(seg.from * TIME_SCALE)} layout="none">
        {scene()}
      </Sequence>
      {showWatermark ? <SearchWatermark since={watermarkSince} /> : null}
    </>
  );
};

/** Scenes + the audio plan (src/search/search-sound.ts). */
export const SearchMain: React.FC = () => (
  <>
    <Scenes />
    <SearchSoundtrack />
  </>
);
