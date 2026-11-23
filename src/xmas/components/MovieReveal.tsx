import React from 'react';
import { slotAt } from '../data';
import type { MovieSlot, Slot } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { LAYOUT, lightZoneStyle, px, useXmasFonts, useXmasFrame } from '../system';
import { pauseTicksOf, playSecOf, secToTicks } from '../timing';
import { GLASS_TILE, GlassTile, glassTileState } from './GlassTile';
import { bulbCues, LightString } from './LightString';
import { TIMER, TimerToPill, timerPropsOf } from './TimerToPill';

/**
 * MovieReveal: the answer choreography of a movie slot. It draws the two tiles, the timer bar / title pill and the
 * light string, and runs these beats from `start`:
 *   1. start                 both tiles glide up and shrink slightly; the full timer bar flashes (TimerToPill)
 *   2. morph                 the bar morphs into the title pill; the title (data.ts `answer`) appears
 *   3. morph + chime ticks   reveal chime
 *   4. pulse                 both tiles pulse once, and at the same tick the slot's bulb lights (bulb-on)
 * The only slot-specific number is pauseTicksOf(slot) from timing.ts: slot 49 gets its longer pause, which sits between
 * the end of the bar's flash and the morph, so the glided tiles and the full, flashed bar hold still before the title.
 *
 * TIME UNIT: `start` and every beat are DESIGN TICKS (30 per second) on the clock of the scene this is mounted in
 * (see TimerToPill). `start` is the tick the reveal slot begins, i.e. the end of the thinking time: the timer bar is
 * drawn as having filled over playSecOf(slot) seconds up to `start`, so mounting this component earlier than `start`
 * (for example for the whole slot) shows the bar filling. Earlier slots' bulbs (1..slot-1) are drawn lit.
 */
export const MOVIE_REVEAL = {
  /** ticks from the morph start to the chime */
  chimeAfterMorph: 4,
  /** ticks from the morph start to the tile pulse and the bulb */
  pulseAfterMorph: 8,
} as const;

export type RevealBeats = {
  glide: number;
  /** the timer bar is full here (its flash starts) */
  full: number;
  /** the pause before the title, in ticks (0 except on the slot that has one) */
  pause: number;
  morph: { from: number; to: number };
  chime: number;
  pulse: number;
  bulb: number;
  /** tick the last beat (tile pulse) ends */
  end: number;
};

const asMovie = (slot: Slot | number): MovieSlot => {
  const s = typeof slot === 'number' ? slotAt(slot) : slot;
  if (s.kind !== 'movie') throw new Error(`MovieReveal: slot ${s.slot} is a bonus round`);
  return s;
};

/** All beat ticks of the reveal of `slot` that starts at design tick `start`. */
export const revealBeats = (slot: Slot | number, start: number): RevealBeats => {
  const s = asMovie(slot);
  const pause = pauseTicksOf(s);
  // the flash plays out completely before the title morphs; the slot's pause (if any) is added after it
  const morphFrom = start + TIMER.flashTicks + pause;
  const pulse = morphFrom + MOVIE_REVEAL.pulseAfterMorph;
  return {
    glide: start,
    full: start,
    pause,
    morph: { from: morphFrom, to: morphFrom + TIMER.morphTicks },
    chime: morphFrom + MOVIE_REVEAL.chimeAfterMorph,
    pulse,
    bulb: pulse,
    end: pulse + GLASS_TILE.pulse.ticks,
  };
};

/** Sound cues of the reveal (design ticks, absolute): the reveal chime and the slot's bulb sound. The timer-full sound belongs to timerCues. */
export const revealCues = (slot: Slot | number, start: number): SfxCue[] => {
  const s = asMovie(slot);
  const b = revealBeats(s, start);
  return [cue('reveal-chime', b.chime), ...bulbCues(s.slot, b.bulb)];
};

export type MovieRevealProps = {
  /** The movie slot (from data.ts). */
  slot: MovieSlot;
  /** Design tick at which the reveal begins (the end of the thinking time). */
  start: number;
  /** Optional: tick at which the tiles spring in, when this component also covers the intro. Omit when the tiles are already there. */
  enterFrame?: number;
};

export const MovieReveal: React.FC<MovieRevealProps> = ({ slot, start, enterFrame }) => {
  useXmasFonts();
  const t = useXmasFrame();
  const b = revealBeats(slot, start);
  const timer = timerPropsOf(slot);
  const timerStart = start - secToTicks(playSecOf(slot));

  // ambient light zones (system.ts): green behind the left tile, red behind the right one, drawn under BOTH tiles so a
  // zone never paints over the neighbouring tile. They fade in with the tiles and swell with the pulse.
  const tile = glassTileState(t, enterFrame, undefined, b.pulse);
  const zoneStrength = tile.opacity * (1 + GLASS_TILE.pulse.zoneBoost * tile.bump);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(1280), height: px(720) }}>
      <div style={lightZoneStyle('left', zoneStrength)} />
      <div style={lightZoneStyle('right', zoneStrength)} />
      {(
        [
          ['left', slot.clue1.id, LAYOUT.tile.left],
          ['right', slot.clue2.id, LAYOUT.tile.right],
        ] as const
      ).map(([side, id, r]) => (
        <div key={side} style={{ position: 'absolute', left: px(r.x), top: px(r.y) }}>
          <GlassTile imageId={id} side={side} enterFrame={enterFrame} glideFrame={b.glide} pulseFrame={b.pulse} light={false} />
        </div>
      ))}
      <TimerToPill {...timer} startFrame={timerStart} morphFrame={b.morph.from} title={slot.answer} />
      <LightString litUpTo={slot.slot - 1} pulseSlot={slot.slot} pulseFrame={t - b.bulb} counter={slot.slot} />
    </div>
  );
};

export default MovieReveal;
