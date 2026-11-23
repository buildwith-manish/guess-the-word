import React from 'react';
import { Audio, Sequence, interpolate, staticFile } from 'remotion';
import { DUCK_KEYS, DUCK_SIGNATURE } from './duckEnvelope.generated';
import { MIX, sfxGainFor } from './mix';
import { MUSIC_LICENSE_TEXT } from './musicLicense.generated';
import { sfxEntry, sfxSrc } from './sfx';
import { part1Cues, part2Cues, part3Cues } from './sfxCues';
import { RENDER_FPS, RENDER_TOTAL_FRAMES, partRanges, ticksToFrames } from './timing';
import { voiceEvents, voiceSignature, voiceStartFrame } from './voiceTimeline';

/**
 * XmasAudio: the whole mix of XMAS-Full, placed at render frames of the master composition.
 *   voice   every clip of public/xmas/voiceover/clips_master (mastered by scripts/master_xmas_voice.py) at the start
 *           frame from voiceTimeline.ts (hook, quips, reveals, end line, rank lines, outro asks), full level
 *   sfx     the per-part cue lists of sfxCues.ts moved to the full timeline; each sound is scaled so its plain RMS sits
 *           MIX.sfxUnderVoiceDb (7 dB) under the voice. In movie thinking time only the timer ticks play.
 *   music   one bed through `musicSrc`, ducked under the voice by the envelope baked by scripts/build_xmas_duck.ts
 * Nothing is placed by hand: ids, starts and cue frames all come from audioMap.ts, timing.ts and the scenes.
 *
 * A build with `musicSrc` set is refused when docs/xmas/music-license.md has no licence text (copied into
 * musicLicense.generated.ts by scripts/build_xmas_duck.ts) or when the baked duck envelope is stale.
 * `voice`, `sfx` and `music` switch a layer off, for listening to one layer alone in Studio.
 */
export type XmasAudioProps = {
  /** Resolved URL of the music bed (staticFile). Omit for no music. */
  musicSrc?: string;
  voice?: boolean;
  sfx?: boolean;
  music?: boolean;
};

const voiceSrc = (id: string): string => staticFile(`xmas/voiceover/clips_master/${id}.wav`);

/** Every sound effect of the video at its render frame of the full timeline. */
const sfxEvents = [part1Cues, part2Cues, part3Cues].flatMap((cues, i) =>
  cues.map((c) => ({ cue: c, frame: ticksToFrames(c.frame + partRanges[i].from) })),
);

const duckFrames = DUCK_KEYS.map((k) => k[0]);
const duckGains = DUCK_KEYS.map((k) => k[1]);
const fadeInFrames = Math.max(1, Math.round(MIX.musicFadeInSec * RENDER_FPS));
const fadeOutFrames = Math.max(1, Math.round(MIX.musicFadeOutSec * RENDER_FPS));

/** Music gain at a frame of the master composition: bed level, voice duck, fade in and fade out. */
const musicVolume = (frame: number): number => {
  const duck = interpolate(frame, duckFrames, duckGains, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fade = Math.max(0, Math.min(1, frame / fadeInFrames, (RENDER_TOTAL_FRAMES - frame) / fadeOutFrames));
  return Math.min(1, MIX.musicGain * duck * fade);
};

const assertMusicAllowed = (): void => {
  if (!MUSIC_LICENSE_TEXT.trim()) {
    throw new Error(
      'XmasAudio: a music file is set but docs/xmas/music-license.md has no licence text. Paste the licence between the marker lines, then run `npx tsx scripts/build_xmas_duck.ts`. No unlicensed music.',
    );
  }
  if (DUCK_SIGNATURE !== voiceSignature()) {
    throw new Error(
      `XmasAudio: the baked music duck envelope (${DUCK_SIGNATURE}) is out of date (voice timeline ${voiceSignature()}). Run \`npx tsx scripts/build_xmas_duck.ts\`.`,
    );
  }
};

export const XmasAudio: React.FC<XmasAudioProps> = ({ musicSrc, voice = true, sfx = true, music = true }) => {
  if (musicSrc) assertMusicAllowed();
  return (
    <>
      {voice &&
        voiceEvents.map((e) => (
          <Sequence key={e.id} name={`voice ${e.what}`} from={voiceStartFrame(e)} layout="none">
            <Audio src={voiceSrc(e.id)} volume={MIX.voice} />
          </Sequence>
        ))}
      {sfx &&
        sfxEvents.map(({ cue, frame }, i) => {
          const entry = sfxEntry(cue.sfx);
          const rate = cue.rate ?? 1;
          return (
            <Sequence
              key={`${i}-${cue.sfx}`}
              name={`sfx ${cue.sfx}`}
              from={frame}
              durationInFrames={Math.ceil((entry.length / rate) * RENDER_FPS) + 2}
              layout="none"
            >
              <Audio src={sfxSrc(cue.sfx)} volume={Math.min(1, sfxGainFor(entry.rmsDb) * (cue.volume ?? 1))} playbackRate={rate} />
            </Sequence>
          );
        })}
      {music && musicSrc ? <Audio src={musicSrc} loop loopVolumeCurveBehavior="extend" volume={musicVolume} /> : null}
    </>
  );
};
export default XmasAudio;
