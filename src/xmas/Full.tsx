import React from 'react';
import { Sequence, staticFile } from 'remotion';
import { XmasAudio } from './Audio';
import { MUSIC_FILE } from './mix';
import { partRanges } from './timing';
import { Part1 } from './parts/Part1';
import { Part2 } from './parts/Part2';
import { Part3 } from './parts/Part3';

/** Master "XMAS-Full": Part1..Part3 as Sequences at the render offsets and lengths from timing.ts `partRanges`, plus the mix. */
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
    <XmasAudio musicSrc={MUSIC_FILE ? staticFile(MUSIC_FILE) : undefined} />
  </>
);
export default XmasFull;
