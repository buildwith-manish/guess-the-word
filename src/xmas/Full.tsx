import React from 'react';
import { Sequence } from 'remotion';
import { partRanges } from './timing';
import { Part1 } from './parts/Part1';
import { Part2 } from './parts/Part2';
import { Part3 } from './parts/Part3';

/** Master "XMAS-Full": Part1..Part3 as Sequences at the render offsets and lengths from timing.ts `partRanges`. */
const PARTS = [Part1, Part2, Part3] as const;

export const XmasFull: React.FC = () => (
  <>
    {partRanges.map((range, i) => {
      const Part = PARTS[i];
      return (
        <Sequence key={range.name} name={range.name} from={range.renderFrom} durationInFrames={range.renderFrames}>
          <Part />
        </Sequence>
      );
    })}
  </>
);
export default XmasFull;
