/**
 * StateMain (task 6a): the composition root of Video 4, "GuessTheState". Same pattern as src/Main.tsx: it only
 * decides WHICH scene is on screen from `locate(TIMELINE.segments, frame)`; every scene owns its own motion and
 * reads its segment-local design tick, so any frame range renders in any order.
 *
 *   hook       StateHook            (camera rig)
 *   levelCard  StateLevelCard       (camera rig)
 *   question   StateRound           (motion-blur wrapper; its own camera)
 *   bonus      StateBonus           (motion-blur wrapper, camera rig)
 *   reminder   StateReminder        (camera rig)
 *   iris       StateIris + the next question springing in during the last `lead` ticks (stateIrisOverlap)
 *   scoreboard StateScoreboard      (camera rig)
 *   endScreen  StateEndScreen       (camera rig)
 * StateAtmosphere (step 6: parallax glow, vignette, film grain) is mounted once above all scenes on the global frame.
 *
 * Motion blur and the card camera come from root settings.json (motionBlur, camera.cards), like the word quiz.
 * Audio: StateSoundtrack (task 6b) is mounted next to the scenes; the plan is src/states/state-sound.ts.
 * Time: `useDesignFrame()` = design ticks (30 per second); the composition is RENDER_FPS (60).
 * Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { useDesignFrame } from '../clock';
import { CameraRig } from '../CameraRig';
import rootSettings from '../../settings.json';
import { BONUS_PUZZLES, TIMELINE, locate } from './state-timing';
import { StateHook } from './scenes/StateHook';
import { StateLevelCard } from './scenes/StateLevelCard';
import { StateRound } from './scenes/StateRound';
import { StateBonus } from './scenes/StateBonus';
import { StateReminder } from './scenes/StateReminder';
import { StateIris, stateIrisOverlap } from './scenes/StateIris';
import { StateScoreboard } from './scenes/StateScoreboard';
import { StateEndScreen } from './scenes/StateEndScreen';
import { STAGE_LAYOUT } from './components/StateStage';
import { MiniMap } from './components/MiniMap';
import { STATES } from './states-data';
import { StateSoundtrack } from './StateSoundtrack';
import { questionHasTitle } from './state-sound';
import { COLOR } from './look';
import { StateAtmosphere } from './StateAtmosphere';

const Scenes: React.FC = () => {
  const frame = useDesignFrame();
  const { seg, local, index } = locate(TIMELINE.segments, frame);

  if (!seg) return null;

  // card scenes get a slow breathing camera (see CameraRig); questions have their own camera in StateRound
  const rig = (children: React.ReactNode) =>
    rootSettings.camera.cards ? (
      <CameraRig frame={local} duration={seg.duration}>
        {children}
      </CameraRig>
    ) : (
      <>{children}</>
    );

  // Motion blur: wrap question + bonus scenes (root settings.motionBlur)
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

  switch (seg.kind) {
    case 'hook':
      return <AbsoluteFill>{rig(<StateHook frame={local} />)}</AbsoluteFill>;
    case 'levelCard':
      return <AbsoluteFill>{rig(<StateLevelCard frame={local} levelIndex={seg.levelIndex} duration={seg.duration} />)}</AbsoluteFill>;
    case 'question':
      return (
        <AbsoluteFill>
          <BlurWrap>
            <StateRound frame={local + (seg.lead ?? 0)} index={seg.index} lead={seg.lead ?? 0} withTitle={questionHasTitle(seg.index)} />
          </BlurWrap>
        </AbsoluteFill>
      );
    case 'bonus':
      return (
        <AbsoluteFill>
          <BlurWrap>{rig(<StateBonus frame={local} puzzle={BONUS_PUZZLES[seg.index]} duration={seg.duration} />)}</BlurWrap>
        </AbsoluteFill>
      );
    case 'reminder':
      return <AbsoluteFill>{rig(<StateReminder frame={local} seg={seg} />)}</AbsoluteFill>;
    case 'iris': {
      // overlap: the next question's stage content springs in during the last `lead` ticks of the wipe
      const next = TIMELINE.segments[index + 1];
      const { lead, startsAt } = stateIrisOverlap(seg, next);
      const rf = local - startsAt;
      // Before the next round mounts on top (its first `lead` ticks play inside the wipe) the wipe alone would show
      // an empty stage for a few frames, a visible blink. So the corner map stays on screen all through the wipe, in
      // the rect and with the answered states the next round draws, and the round simply takes it over.
      const L = STAGE_LAYOUT;
      return (
        <AbsoluteFill>
          <StateIris frame={local} seg={seg} />
          {next && next.kind === 'question' && rf < 0 ? (
            <div style={{ position: 'absolute', left: L.miniMap.x, top: L.miniMap.y, width: L.miniMap.w, height: L.miniMap.h }}>
              <MiniMap answered={STATES.slice(0, next.index).map((st) => st.key)} size={L.miniMap.w} frame={local} />
            </div>
          ) : null}
          {next && next.kind === 'question' && lead > 0 && rf >= 0 ? (
            <StateRound frame={rf} index={next.index} lead={lead} withTitle={questionHasTitle(next.index)} />
          ) : null}
        </AbsoluteFill>
      );
    }
    case 'scoreboard':
      return <AbsoluteFill>{rig(<StateScoreboard frame={local} />)}</AbsoluteFill>;
    case 'endScreen':
      return <AbsoluteFill>{rig(<StateEndScreen frame={local} />)}</AbsoluteFill>;
    default:
      return <AbsoluteFill style={{ background: COLOR.black }} />;
  }
};

/** Video 4 composition: scenes + the audio plan (src/states/state-sound.ts). */
export const StateMain: React.FC = () => (
  <>
    <Scenes />
    <StateAtmosphere />
    <StateSoundtrack />
  </>
);
