/**
 * Full.tsx: master "DontSay-Full" (task 4o). Part1 to Part6 as Sequences, each at the render-frame
 * offset and length that timing.ts gives in `partRanges`. Nothing is timed here.
 *
 * Parts are back to back: hard cuts, no fades, no overlap. Each part mounts its own scene audio and its
 * own voice layer (VoiceLayer). The music beds (task MU2) are mounted once here by `MusicBeds`, across part
 * boundaries, so a bed can run through a hard cut and crossfade only where the music changes (plan: music.ts).
 * The wavs are generated, not in git: run scripts/make_dontsay_music.py before rendering.
 */
import React from 'react';
import { Sequence } from 'remotion';
import { RENDER_TOTAL_FRAMES, partRanges, useDontSayFrame } from './timing';
import { DontSayWatermark } from './components/Watermark';
import { Part1 } from './parts/Part1';
import { Part2 } from './parts/Part2';
import { Part3 } from './parts/Part3';
import { Part4 } from './parts/Part4';
import { Part5 } from './parts/Part5';
import { Part6 } from './parts/Part6';
import { MusicBeds } from './components/MusicBeds';

const PARTS: readonly React.FC[] = [Part1, Part2, Part3, Part4, Part5, Part6];

if (PARTS.length !== partRanges.length) {
  throw new Error(`DontSayFull: ${PARTS.length} part components but timing.ts has ${partRanges.length} parts`);
}

/** Composition length: the whole video, from timing.ts. */
export const dontSayFullFrames = RENDER_TOTAL_FRAMES;

export const DontSayFull: React.FC = () => {
  // outside every Sequence: the global design tick, so the watermark entrance plays once for the whole video
  const globalFrame = useDontSayFrame();
  return (
  <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
    {partRanges.map((range, i) => {
      const Part = PARTS[i];
      return (
        <Sequence key={range.name} name={range.name} from={range.renderFrom} durationInFrames={range.frames}>
          <Part />
        </Sequence>
      );
    })}
    <DontSayWatermark globalFrame={globalFrame} since={0} />
    <MusicBeds />
  </div>
  );
};
