import React from 'react';
import { Sequence } from 'remotion';
import { XmasAudio } from './Audio';
import { bonuses, movies } from './data';
import { Hook } from './scenes/Hook';
import { BonusSceneById } from './scenes/BonusScene';
import { MovieScene, MovieSceneById, movieBeats, nearestMovie } from './scenes/MovieScene';
import { Outro } from './scenes/Outro';
import { ScoreScene } from './scenes/ScoreScene';
import { segmentOfSlot, segments, ticksToFrames } from './timing';
import type { Segment } from './timing';

/**
 * Audio for the single-scene Studio previews (XMAS-Hook, XMAS-Movie, XMAS-Movies-All, XMAS-Bonus, Xmas-Score, XMAS-Outro).
 * Before this file only XMAS-Full and XMAS-P1..P3 carried audio, so these previews were silent.
 * Each preview plays the voice and sfx of its own segment of the full timeline, placed from the preview's frame 0
 * (a preview starts at the first tick of its segment). Music is left out of previews.
 */
const frameRange = (seg: Pick<Segment, 'from' | 'to'>): { from: number; to: number } => ({ from: ticksToFrames(seg.from), to: ticksToFrames(seg.to) });
const segmentOfKind = (kind: 'hook' | 'score' | 'outro'): Segment => {
  const s = segments.find((x) => x.kind === kind);
  if (!s) throw new Error(`PreviewAudio: timing.ts has no ${kind} segment`);
  return s;
};

export const AudibleHook: React.FC = () => (
  <>
    <Hook />
    <XmasAudio frames={frameRange(segmentOfKind('hook'))} />
  </>
);

export const AudibleScore: React.FC = () => (
  <>
    <ScoreScene />
    <XmasAudio frames={frameRange(segmentOfKind('score'))} />
  </>
);

export const AudibleOutro: React.FC = () => (
  <>
    <Outro />
    <XmasAudio frames={frameRange(segmentOfKind('outro'))} />
  </>
);

/** XMAS-Movie: prop `slot` (a bonus slot number shows, and sounds like, the nearest movie, as the picture does). */
export const AudibleMovie: React.FC<{ slot: number }> = ({ slot }) => (
  <>
    <MovieSceneById slot={slot} />
    <XmasAudio frames={frameRange(segmentOfSlot(nearestMovie(slot).slot))} />
  </>
);

/** XMAS-Bonus: prop `bonus` (1..10). */
export const AudibleBonus: React.FC<{ bonus: number }> = ({ bonus }) => {
  const slot = bonuses[bonus - 1];
  return (
    <>
      <BonusSceneById bonus={bonus} />
      {slot ? <XmasAudio frames={frameRange(segmentOfSlot(slot.slot))} /> : null}
    </>
  );
};

/** XMAS-Movies-All: the 40 movies back to back (bonus rounds skipped), each with its own slot's voice and sfx at its own start. */
const placed = (() => {
  let at = 0;
  return movies.map((slot) => {
    const from = at;
    at += movieBeats(slot).total;
    return { slot, from, to: at };
  });
})();

export const AudibleMoviesAll: React.FC = () => (
  <>
    {placed.map(({ slot, from, to }) => (
      <Sequence key={slot.slot} from={ticksToFrames(from)} durationInFrames={ticksToFrames(to) - ticksToFrames(from)} name={`${slot.slot}`}>
        <MovieScene slot={slot} />
      </Sequence>
    ))}
    {placed.map(({ slot, from }) => (
      <Sequence key={`audio-${slot.slot}`} from={ticksToFrames(from)} layout="none" name={`audio ${slot.slot}`}>
        <XmasAudio frames={frameRange(segmentOfSlot(slot.slot))} />
      </Sequence>
    ))}
  </>
);
