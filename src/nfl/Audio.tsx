import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { sfxFrames, sfxSrc } from './sfx';
import { MIX, clipFrames, sfxEvents, sfxGain, totalFrames, voiceEvents } from './voiceTimeline';
import { ticksToFrames } from './timing';

/**
 * Mix of NFL-Full: voice clips, SFX cues and a music bed. Mount once at frame 0 of the Full composition.
 *   voice  one <Audio> per clip at its tick (voiceTimeline.ts), cut where its container ends.
 *   sfx    every cue of fullCues (sfxCues.ts), MIX.sfxUnderVoiceDb under the voice; a cue that lands on a voice start moves 0.2 s after it.
 *   music  one bed, looped, ducked to MIX.musicDuck while a voice clip plays (computed here from voiceEvents; nothing baked).
 * Props: `musicSrc` (staticFile path, default public/sounds/music-base.wav; null = no music); `voice` / `sfx` / `music` switch a layer off.
 */
export type NflAudioProps = { musicSrc?: string | null; voice?: boolean; sfx?: boolean; music?: boolean };
export const DEFAULT_MUSIC = 'sounds/music-base.wav';

const FPS = 60;
const atk = MIX.duckAttackSec * FPS;
const rel = MIX.duckReleaseSec * FPS;
const spans = voiceEvents.map((e) => {
  const from = ticksToFrames(e.tick);
  return { from, to: from + Math.min(clipFrames(e.sec), ticksToFrames(e.endTick) - from) };
});

const duck = (frame: number): number => {
  let env = 0;
  for (const s of spans) {
    if (frame < s.from - atk) break; // sorted by start
    if (frame > s.to + rel) continue;
    const e = Math.min(1, (frame - (s.from - atk)) / atk, (s.to + rel - frame) / rel);
    if (e > env) env = e;
  }
  return 1 - (1 - MIX.musicDuck) * env;
};

const musicGain = (frame: number): number => {
  const fadeIn = Math.min(1, frame / (MIX.musicFadeInSec * FPS));
  const fadeOut = Math.min(1, (totalFrames - frame) / (MIX.musicFadeOutSec * FPS));
  return MIX.musicBase * duck(frame) * Math.max(0, Math.min(fadeIn, fadeOut));
};

export const NflAudio: React.FC<NflAudioProps> = ({ musicSrc, voice = true, sfx = true, music = true }) => {
  const src = musicSrc === undefined ? DEFAULT_MUSIC : musicSrc;
  return (
    <>
      {music && src ? (
        <Sequence from={0} durationInFrames={totalFrames} layout="none" name="music">
          <Audio src={staticFile(src)} loop loopVolumeCurveBehavior="extend" volume={musicGain} />
        </Sequence>
      ) : null}
      {voice
        ? voiceEvents.map((e, i) => (
            <Sequence key={`${e.id}-${e.tick}`} from={spans[i].from} durationInFrames={spans[i].to - spans[i].from} layout="none" name={`${e.id} ${e.what}`}>
              <Audio src={staticFile(`nfl/voiceover/clips/${e.id}.wav`)} volume={MIX.voice} />
            </Sequence>
          ))
        : null}
      {sfx
        ? sfxEvents.map(({ cue, tick }) => {
            const from = ticksToFrames(tick);
            if (from >= totalFrames) return null;
            return (
              <Sequence key={`${cue.sfx}-${tick}`} from={from} durationInFrames={ticksToFrames(sfxFrames(cue.sfx)) + 2} layout="none" name={`sfx ${cue.sfx}`}>
                <Audio src={sfxSrc(cue.sfx)} volume={sfxGain * (cue.volume ?? 1)} playbackRate={cue.rate ?? 1} />
              </Sequence>
            );
          })
        : null}
    </>
  );
};

export default NflAudio;
