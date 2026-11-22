import React from 'react';
import { Sequence } from 'remotion';
import { partRanges } from './timing';
import { Part1 } from './parts/Part1';
import { Part2 } from './parts/Part2';
import { Part3 } from './parts/Part3';
import { Part4 } from './parts/Part4';
import { Gta6Audio } from './Audio';
import { ShellVoiceContext } from './voiceContext';

/** Master "GTA6-Full": Part1..Part4 as Sequences at the render offsets and lengths from `partRanges` (timing.ts).
 *  Note: Part1 renders shorter and Part3 longer than their timing.ts range (see docs/gta6-progress.md, 7a). */
const PARTS = [Part1, Part2, Part3, Part4] as const;

export const Gta6Full: React.FC<{ musicSrc?: string | null }> = ({ musicSrc }) => (
  <>
    {/* voice is placed by Gta6Audio, so the item scenes must not play their own clips */}
    <ShellVoiceContext.Provider value={false}>
    {partRanges.map((range, i) => {
      const Part = PARTS[i];
      return (
        <Sequence key={range.name} name={range.name} from={range.renderFrom} durationInFrames={range.renderTo - range.renderFrom}>
          <Part />
        </Sequence>
      );
    })}
    </ShellVoiceContext.Provider>
    <Gta6Audio musicSrc={musicSrc} />
  </>
);
