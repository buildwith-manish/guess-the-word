import React from 'react';
import { Sequence } from 'remotion';
import { NflAudio } from './Audio';
import { FinishLayer } from './components/FinishLayer';
import { WatermarkOverlay } from './components/Watermark';
import { Part1 } from './parts/Part1';
import { Part2 } from './parts/Part2';
import { Part3 } from './parts/Part3';
import { Part4 } from './parts/Part4';
import { RENDER_TOTAL_FRAMES, partRanges } from './timing';

/** NFL-Full: Part1..Part4 one after another at the render offsets from `partRanges` (timing.ts), plus the audio layer. */
const PARTS = [Part1, Part2, Part3, Part4] as const;
export const nflFullFrames: number = RENDER_TOTAL_FRAMES;

/** `finish`: finish-layer strength override for A/B stills (`--props='{"finish":0}'`). Undefined = `finishStrength` in system.ts. */
export const NflFull: React.FC<{ musicSrc?: string | null; finish?: number }> = ({ musicSrc, finish }) => (
  <>
    {partRanges.map((range, i) => {
      const Part = PARTS[i];
      return (
        <Sequence key={range.name} name={range.name} from={range.renderFrom} durationInFrames={range.renderTo - range.renderFrom}>
          <Part />
        </Sequence>
      );
    })}
    {/* finish layer: above the parts, below the watermark (never over it), off for the end-screen slot */}
    <FinishLayer strength={finish} />
    {/* one watermark, above every Sequence */}
    <WatermarkOverlay />
    <NflAudio musicSrc={musicSrc} />
  </>
);
