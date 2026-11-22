/**
 * StateSoundtrack (task 6b): every sound of Video 4 as <Sequence><Audio/></Sequence> pairs, from the plan in
 * state-sound.ts. Adapted from src/Soundtrack.tsx: sequences (not a running clock) place each clip, so any frame
 * range renders in any order. The music is three phase-locked layers looped in 256-tick repeats; a repeat only
 * mounts if its layer is audible there, and its volume is read from the precomputed per-tick envelope (level
 * beds + ducking), interpolated to the 60 fps output. Returns null when root settings sound.enabled is false.
 * Not listened to.
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import root from '../../settings.json';
import { TIME_SCALE } from './state-timing';
import {
  MUSIC_END,
  MUSIC_LOOP_FRAMES,
  STATE_CUES,
  STATE_MUSIC_ENVELOPES,
  STATE_SOUND_ENABLED,
  STATE_VOICE,
  VOICE_DIR,
  clipFrames,
  cueGain,
  edgeGain,
  layerAudible,
} from './state-sound';

const MUSIC_FILES = ['music-base.wav', 'music-l1.wav', 'music-l2.wav'];

export const StateSoundtrack: React.FC = () => {
  if (!STATE_SOUND_ENABLED) return null;

  const repeats = Math.ceil((MUSIC_END + 12) / MUSIC_LOOP_FRAMES);

  return (
    <>
      {MUSIC_FILES.map((file, layer) =>
        Array.from({ length: repeats }, (_, k) => {
          const from = k * MUSIC_LOOP_FRAMES;
          if (!layerAudible(layer, from, from + MUSIC_LOOP_FRAMES)) return null;
          const env = STATE_MUSIC_ENVELOPES[layer];
          // `f` is an OUTPUT (60 fps) frame inside the sequence; the envelope is per design tick (30 fps),
          // so convert and interpolate for a smooth 60 fps volume curve.
          const at = (i: number) => env[Math.max(0, Math.min(env.length - 1, i))] ?? 0;
          return (
            <Sequence key={`m${layer}-${k}`} from={from * TIME_SCALE} durationInFrames={MUSIC_LOOP_FRAMES * TIME_SCALE} layout="none">
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

      {STATE_CUES.map((c, i) => {
        const dur = clipFrames(c.sfx, c.rate ?? 1) * TIME_SCALE;
        const gain = cueGain(c);
        return (
          <Sequence key={`s${i}`} from={c.frame * TIME_SCALE} durationInFrames={dur} layout="none">
            <Audio src={staticFile(`sounds/${c.sfx}.wav`)} playbackRate={c.rate ?? 1} volume={(f) => gain * edgeGain(f, dur)} />
          </Sequence>
        );
      })}

      {STATE_VOICE.map((v, i) => {
        const dur = (v.frames + 2) * TIME_SCALE;
        return (
          <Sequence key={`v${i}`} from={v.frame * TIME_SCALE} durationInFrames={dur} layout="none">
            <Audio src={staticFile(`${VOICE_DIR}/${v.file}`)} volume={(f) => root.voiceover.volume * edgeGain(f, dur)} />
          </Sequence>
        );
      })}
    </>
  );
};
