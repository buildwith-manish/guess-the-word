import React from 'react';
import { AbsoluteFill } from 'remotion';
import { movies } from '../data';
import type { MovieSlot } from '../data';
import { MovieReveal, revealCues } from '../components/MovieReveal';
import { timerCues, timerPropsOf } from '../components/TimerToPill';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import { BOKEH, LAYOUT, backgroundStyle, bokehStyle, colors, frameBorderStyle, glassSurface, px, textStyle, useXmasFonts, useXmasFrame } from '../system';
import { segmentOfSlot, ticksToFrames } from '../timing';
import { UI } from '../ui';

/**
 * MovieScene({ slot }): one movie question, from its own start (local tick 0 = the slot's first tick; place it in a Sequence).
 *   intro   the spoken quip; the two tiles spring in (green light behind the left tile, red behind the right, no plus sign),
 *           the caption fades in; the timer starts when the intro ends
 *   think   the segmented timer fills (8 segments, 10 for a star), the caption stays
 *   reveal  MovieReveal: the tiles glide up (the caption fades as they do), the bar morphs into the title pill, the tiles
 *           pulse once, the bulb lights, the chime plays. The slot with a longer pause (timing.ts) holds before the title.
 * Also drawn: dark background, the frame border, bokeh, and LightString (litUpTo = slot - 1, its counter shows the slot).
 * All times come from timing.ts (segmentOfSlot), all text from data.ts and ui.ts. Frame numbers are design ticks.
 */

/** Scene-local tick numbers of one movie slot. */
export type MovieBeats = {
  /** length of the whole slot */
  total: number;
  /** the tiles start to spring in */
  enterAt: number;
  /** the intro (quip) ends: the timer's first segment starts */
  timerFrom: number;
  /** the thinking time ends: the reveal starts */
  revealFrom: number;
};

/** Tiles and caption start this many ticks after the slot begins. */
export const ENTER_AT = 2;
/** The caption fades out over this many ticks from the start of the reveal. */
export const CAPTION_FADE_TICKS = 10;

export const movieBeats = (slot: MovieSlot): MovieBeats => {
  const seg = segmentOfSlot(slot.slot);
  return { total: seg.to - seg.from, enterAt: ENTER_AT, timerFrom: seg.phases.timer.from - seg.from, revealFrom: seg.phases.reveal.from - seg.from };
};

/** Length of the scene in render frames. */
export const movieSceneFrames = (slot: MovieSlot): number => ticksToFrames(movieBeats(slot).total);

/**
 * The movie scene for a play-order number. If `n` is a bonus slot, this returns the NEAREST movie (ties go to the earlier
 * movie, so bonus slot 5 shows slot 4). Used by the XMAS-Movie composition so any slot number can be previewed.
 */
export const nearestMovie = (n: number): MovieSlot =>
  movies.reduce((best, m) => (Math.abs(m.slot - n) < Math.abs(best.slot - n) ? m : best), movies[0]);

/** Sounds of a movie slot at absolute design tick `start` (the tick the slot begins at), sorted by tick. Voice lines are not here: they come with the audio map (not built yet). */
export const movieCues = (slot: MovieSlot, start: number): SfxCue[] => {
  const b = movieBeats(slot);
  const tp = timerPropsOf(slot);
  return [
    cue('tiles-in', start + b.enterAt),
    ...timerCues(start + b.timerFrom, tp.segments, tp.secondsPerSegment),
    ...revealCues(slot, start + b.revealFrom),
  ].sort((a, c) => a.frame - c.frame);
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const MovieScene: React.FC<{ slot: MovieSlot }> = ({ slot }) => {
  useXmasFonts();
  const t = useXmasFrame();
  const b = movieBeats(slot);
  const seconds = t / 30;
  const cap = LAYOUT.caption;
  const captionIn = springAt(t, b.enterAt, 'smooth');
  const captionOut = 1 - clamp01((t - b.revealFrom) / CAPTION_FADE_TICKS);

  return (
    <AbsoluteFill style={backgroundStyle()}>
      {BOKEH.map((d, i) => (
        <div key={i} style={bokehStyle(d, seconds)} />
      ))}
      <div style={frameBorderStyle()} />

      {/* caption pill, centred above the tiles; fades as the tiles glide up */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: px(1280),
          top: px(cap.cy - cap.box.h / 2),
          height: px(cap.box.h),
          display: 'flex',
          justifyContent: 'center',
          opacity: clamp01(captionIn * 2) * captionOut,
          transform: `translateY(${px(-8 * (1 - captionIn))}px)`,
        }}
      >
        <div
          style={{
            height: '100%',
            boxSizing: 'border-box',
            padding: `0 ${px(26)}px`,
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            ...glassSurface(cap.box.h / 2, { edge: 0.6, depth: 0.45, base: colors.glassBase }),
          }}
        >
          <span style={textStyle('caption')}>{UI.caption}</span>
        </div>
      </div>

      {/* tiles, timer, title pill, light string */}
      <MovieReveal slot={slot} start={b.revealFrom} enterFrame={b.enterAt} />
    </AbsoluteFill>
  );
};

/** Composition wrapper: any play-order slot number; a bonus slot shows the nearest movie (see nearestMovie). */
export const MovieSceneById: React.FC<{ slot: number }> = ({ slot }) => <MovieScene slot={nearestMovie(slot)} />;
export const movieSceneFramesById = (slot: number): number => movieSceneFrames(nearestMovie(slot));

export default MovieScene;
