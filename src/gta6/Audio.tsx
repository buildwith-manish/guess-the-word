import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { DUCK_KEYS, DUCK_SIGNATURE } from './duckEnvelope.generated';
import { sfxFrames, sfxSrc } from './sfx';
import { MIX, clipFrames, sfxEvents, sfxGain, totalFrames, voiceEvents, voiceSignature } from './voiceTimeline';
import { clipPath, ticksToFrames } from './timing';

/**
 * Mix of GTA6-Full: voice clips, SFX cues and the music bed. Mount once, at frame 0 of the Full composition.
 *
 *   voice  one <Audio> per clip of audioMap.ts at its tick (voiceTimeline.ts): hook, question and bonus at the question
 *          start, reveal at `revealClipTick`, dyk after it, level / score card clips at their segment start, rank and
 *          outro lines in their slots. Clips are cut where their container ends. No single voiceover file.
 *   sfx    each part's cue list at the part's offset, `MIX.sfxUnderVoiceDb` (7 dB) under the voice. An SFX that would start
 *          on the same frame as a voice clip is moved 0.2 s after it (see voiceTimeline.ts).
 *   music  one bed, looped, ducked by the envelope baked by scripts/build_gta6_duck.ts (src/gta6/duckEnvelope.generated.ts).
 *
 * Props: `musicSrc` (staticFile path, default the repo's generated bed public/sounds/music-base.wav; pass another file or null
 * for no music). `voice` / `sfx` / `music` switch a layer off for listening tests.
 */
export type Gta6AudioProps = { musicSrc?: string | null; voice?: boolean; sfx?: boolean; music?: boolean };

export const DEFAULT_MUSIC = 'sounds/music-base.wav';

const duckAt = (frame: number): number => {
  const k = DUCK_KEYS;
  if (frame <= k[0][0]) return k[0][1];
  let lo = 0;
  let hi = k.length - 1;
  if (frame >= k[hi][0]) return k[hi][1];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (k[mid][0] <= frame) lo = mid;
    else hi = mid;
  }
  const [f0, g0] = k[lo];
  const [f1, g1] = k[hi];
  return g0 + ((g1 - g0) * (frame - f0)) / (f1 - f0);
};

const fps = 60;
const musicGain = (frame: number): number => {
  const fadeIn = Math.min(1, frame / (MIX.musicFadeInSec * fps));
  const fadeOut = Math.min(1, (totalFrames - frame) / (MIX.musicFadeOutSec * fps));
  return MIX.musicBase * duckAt(frame) * Math.max(0, Math.min(fadeIn, fadeOut));
};

export const Gta6Audio: React.FC<Gta6AudioProps> = ({ musicSrc, voice = true, sfx = true, music = true }) => {
  if (DUCK_SIGNATURE !== voiceSignature()) {
    throw new Error(`duckEnvelope.generated.ts is stale (baked ${DUCK_SIGNATURE}, timeline ${voiceSignature()}): run npx tsx scripts/build_gta6_duck.ts`);
  }
  const src = musicSrc === undefined ? DEFAULT_MUSIC : musicSrc;
  return (
    <>
      {music && src ? (
        <Sequence from={0} durationInFrames={totalFrames} layout="none" name="music">
          <Audio src={staticFile(src)} loop loopVolumeCurveBehavior="extend" volume={musicGain} />
        </Sequence>
      ) : null}
      {voice
        ? voiceEvents.map((e) => {
            const from = ticksToFrames(e.tick);
            const len = Math.min(clipFrames(e.sec), ticksToFrames(e.endTick) - from);
            return (
              <Sequence key={`${e.id}-${e.tick}`} from={from} durationInFrames={len} layout="none" name={`${e.id} ${e.what}`}>
                <Audio src={staticFile(clipPath(e.id))} volume={MIX.voice} />
              </Sequence>
            );
          })
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

export default Gta6Audio;
