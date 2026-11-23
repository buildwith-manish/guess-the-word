import React from 'react';
import { Sequence } from 'remotion';
import { movies } from './data';
import { MovieSceneById, MovieScene, movieBeats, movieSceneFramesById } from './scenes/MovieScene';
import { ticksToFrames } from './timing';

/**
 * Dev previews of the Christmas quiz (not part of the final video).
 *   XMAS-Movie       one movie scene, prop `slot` (default 1). A bonus slot number shows the nearest movie.
 *   XMAS-Movies-All  all 40 movie slots back to back, no bonus rounds, for a fast scrub.
 */
export const MOVIE_PREVIEW_DEFAULTS = { slot: 1 };
export const movieDurationFor = movieSceneFramesById;

/** Start tick of each movie in XMAS-Movies-All (cumulative, bonuses skipped), and the total. */
const placed = (() => {
  let at = 0;
  return movies.map((slot) => {
    const from = at;
    at += movieBeats(slot).total;
    return { slot, from, to: at };
  });
})();
export const MOVIES_ALL_FRAMES: number = ticksToFrames(placed[placed.length - 1].to);

export const XmasMovie: React.FC<{ slot: number }> = MovieSceneById;

export const XmasMoviesAll: React.FC = () => (
  <>
    {placed.map(({ slot, from, to }) => (
      <Sequence key={slot.slot} from={ticksToFrames(from)} durationInFrames={ticksToFrames(to) - ticksToFrames(from)} name={`${slot.slot}`}>
        <MovieScene slot={slot} />
      </Sequence>
    ))}
  </>
);
