import React from 'react';
import { AbsoluteFill } from 'remotion';
import { MovieReveal } from '../components/MovieReveal';
import { slotAt } from '../data';
import type { MovieSlot } from '../data';
import { backgroundStyle } from '../system';

/** Preview of 2e. `start` is a design tick (render frame / 2). Use slotNumber 49 to see the longer pause. */
export type MovieRevealPreviewProps = { slotNumber: number; start: number };
export const MOVIE_REVEAL_PREVIEW_DEFAULTS: MovieRevealPreviewProps = { slotNumber: 1, start: 15 };
/** 160 ticks = 320 render frames: long enough for the slot with the longer pause */
export const MOVIE_REVEAL_PREVIEW_FRAMES = 320;

export const MovieRevealPreview: React.FC<MovieRevealPreviewProps> = ({ slotNumber, start }) => {
  const slot = slotAt(slotNumber) as MovieSlot;
  return (
    <AbsoluteFill style={backgroundStyle()}>
      <MovieReveal slot={slot} start={start} />
    </AbsoluteFill>
  );
};

export default MovieRevealPreview;
