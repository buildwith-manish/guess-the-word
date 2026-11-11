import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import {
  CUES,
  VOICE,
  VOICE_DIR,
  MUSIC_ENVELOPES,
  MUSIC_LOOP_FRAMES,
  MUSIC_END,
  SOUND_ENABLED,
  clipFrames,
  layerAudible,
} from './sound';
import { TIME_SCALE } from './timing';
import settings from '../settings.json';

const MUSIC_FILES = ['music-base.wav', 'music-l1.wav', 'music-l2.wav'];

/**
 * Every sound in the video, as <Sequence><Audio/></Sequence> pairs.
 *
 * Sequences (not a running clock) place each clip, so Remotion can render any
 * frame range in any order — see scripts/render-batches.js. The music is three
 * phase-locked layers looped in 256-frame repeats; each repeat only mounts if
 * its layer is audible there, and its volume is read from a precomputed
 * per-frame envelope (layer fades + ducking under every SFX, like the HTML).
 */
export const Soundtrack: React.FC = () => {
  if (!SOUND_ENABLED) return null;

  const repeats = Math.ceil((MUSIC_END + 12) / MUSIC_LOOP_FRAMES);

  return (
    <>
      {MUSIC_FILES.map((file, layer) =>
        Array.from({ length: repeats }, (_, k) => {
          const from = k * MUSIC_LOOP_FRAMES;
          if (!layerAudible(layer, from, from + MUSIC_LOOP_FRAMES)) return null;
          const env = MUSIC_ENVELOPES[layer];
          // `f` is an OUTPUT (60 fps) frame inside the sequence; the envelope is per design frame
          // (30 fps), so convert and interpolate for a smooth 60 fps volume curve.
          const at = (i: number) => env[Math.max(0, Math.min(env.length - 1, i))] ?? 0;
          return (
            <Sequence
              key={`m${layer}-${k}`}
              from={from * TIME_SCALE}
              durationInFrames={MUSIC_LOOP_FRAMES * TIME_SCALE}
              layout="none"
            >
              <Audio
                src={staticFile(`sounds/${file}`)}
                volume={(f) => {
                  const d = from + f / TIME_SCALE;
                  const i = Math.floor(d);
                  return at(i) + (at(i + 1) - at(i)) * (d - i);
                }}
              />
            </Sequence>
          );
        }),
      )}

      {CUES.map((c, i) => (
        <Sequence
          key={`s${i}`}
          from={c.frame * TIME_SCALE}
          durationInFrames={clipFrames(c.sfx, c.rate ?? 1) * TIME_SCALE}
          layout="none"
        >
          <Audio
            src={staticFile(`sounds/${c.sfx}.wav`)}
            playbackRate={c.rate ?? 1}
            volume={c.volume ?? 1}
          />
        </Sequence>
      ))}

      {VOICE.map((v, i) => (
        <Sequence
          key={`v${i}`}
          from={v.frame * TIME_SCALE}
          durationInFrames={(v.frames + 2) * TIME_SCALE}
          layout="none"
        >
          <Audio src={staticFile(`${VOICE_DIR}/${v.file}`)} volume={settings.voiceover.volume} />
        </Sequence>
      ))}
    </>
  );
};
