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

/** XMAS-P1..P3: one part with the same mix as XMAS-Full for that part's frames (voice, sfx; music only if MUSIC_FILE is set). */
const withAudio = (i: 0 | 1 | 2): React.FC => {
  const Part = PARTS[i];
  const range = partRanges[i];
  const Audible: React.FC = () => (
    <>
      <Part />
      <XmasAudio musicSrc={MUSIC_FILE ? staticFile(MUSIC_FILE) : undefined} frames={{ from: range.renderFrom, to: range.renderFrom + range.renderFrames }} />
    </>
  );
  return Audible;
};
export const XmasPart1Audio = withAudio(0);
export const XmasPart2Audio = withAudio(1);
export const XmasPart3Audio = withAudio(2);
