import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { EndScreen } from '../EndScreen';
import { PixelRound } from './PixelRound';
import { PixelIntro, PixelLevelCard } from './PixelScenes';
import { COUNTDOWN_SECONDS, FPS, PIXEL_TIMELINE, TIME_SCALE, T, locate, usePixelFrame } from './pixel-timing';

/**
 * Composition root for "Guess the Brand: Pixelated".
 * Like Main.tsx it only decides which scene is on screen; every scene reads its own
 * local frame, so any frame range can be rendered in any order.
 */
const Scenes: React.FC = () => {
  const frame = usePixelFrame();
  const { seg, local } = locate(frame);
  switch (seg.kind) {
    case 'intro':
      return <PixelIntro frame={local} />;
    case 'levelCard':
      return <PixelLevelCard frame={local} level={seg.level} />;
    case 'question':
      return <PixelRound frame={local} index={seg.index} />;
    case 'endScreen':
      return <EndScreen frame={local} />;
    default:
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};

type Cue = { frame: number; sfx: string; volume?: number };

/** Reuses the WAVs already in public/sounds. */
const buildCues = (): Cue[] => {
  const cues: Cue[] = [];
  PIXEL_TIMELINE.segments.forEach((seg) => {
    const f0 = seg.from;
    if (seg.kind === 'intro') {
      cues.push({ frame: f0 + 4, sfx: 'boom' }, { frame: f0 + 26, sfx: 'boom' }, { frame: f0 + 52, sfx: 'jingle-rules', volume: 0.7 });
    } else if (seg.kind === 'levelCard') {
      cues.push({ frame: f0 + 2, sfx: 'whoosh' }, { frame: f0 + 12, sfx: 'title' });
    } else if (seg.kind === 'question') {
      cues.push({ frame: f0 + 1, sfx: 'pop' });
      const start = f0 + T.lead;
      // a tick every second; the picture sharpens on each one
      for (let k = 1; k < COUNTDOWN_SECONDS; k++) {
        const left = COUNTDOWN_SECONDS - k;
        cues.push({ frame: start + k * FPS, sfx: left <= 2 ? 'thump' : 'tick' });
      }
      const reveal = start + T.countdown;
      cues.push({ frame: reveal - 20, sfx: 'riser', volume: 0.6 }, { frame: reveal, sfx: 'stamp' }, { frame: reveal + 6, sfx: 'ding' });
    } else if (seg.kind === 'endScreen') {
      cues.push({ frame: f0 + 2, sfx: 'jingle-cta' });
    }
  });
  return cues;
};
const CUES = buildCues();

const Sound: React.FC = () => (
  <>
    <Audio src={staticFile('sounds/music-base.wav')} loop volume={0.35} />
    {CUES.map((c, i) => (
      <Sequence key={i} from={Math.round(c.frame * TIME_SCALE)} durationInFrames={Math.round(2.5 * FPS * TIME_SCALE)} layout="none">
        <Audio src={staticFile(`sounds/${c.sfx}.wav`)} volume={c.volume ?? 1} />
      </Sequence>
    ))}
  </>
);

export const PixelMain: React.FC = () => (
  <>
    <Scenes />
    <Sound />
  </>
);
