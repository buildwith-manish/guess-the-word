import React from 'react';
import { Sequence } from 'remotion';
import { NflAudio } from './Audio';
import { Captions } from './components/Captions';
import { WatermarkOverlay } from './components/Watermark';
import { Part1 } from './parts/Part1';
import { Part2 } from './parts/Part2';
import { Part3 } from './parts/Part3';
import { Part4 } from './parts/Part4';
import { RENDER_TOTAL_FRAMES, partRanges } from './timing';

/** NFL-Full: Part1..Part4 one after another at the render offsets from `partRanges` (timing.ts), plus the audio layer. */
const PARTS = [Part1, Part2, Part3, Part4] as const;
export const nflFullFrames: number = RENDER_TOTAL_FRAMES;

export const NflFull: React.FC<{ musicSrc?: string | null }> = ({ musicSrc }) => (
  <>
    {partRanges.map((range, i) => {
      const Part = PARTS[i];
      return (
        <Sequence key={range.name} name={range.name} from={range.renderFrom} durationInFrames={range.renderTo - range.renderFrom}>
          <Part />
        </Sequence>
      );
    })}
    {/* word-timed captions for the clips not shown as text; in the strip below the card */}
    <Captions />
    {/* one watermark, above every Sequence */}
    <WatermarkOverlay />
    <NflAudio musicSrc={musicSrc} />
  </>
);
