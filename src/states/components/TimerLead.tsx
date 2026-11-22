/**
 * TimerLead: what the timer slot (left of the shape) shows BEFORE and AT the start of the clock.
 *
 *   listening   while the question clip plays: VoicePulse (a ring that breathes with the voice, bars inside)
 *   get ready   readyStart .. timerStart: the timer springs in (0.9 -> 1, fade, 14 px rise); disc, digit, ring stagger in and the arc sweeps round
 *   go          timerStart: the TimerRing simply runs (no burst ring)
 *
 * Without a question clip only the get-ready beat and the burst play. Everything is a pure function of the tick.
 */
import React from 'react';
import { DUR, enter, settle } from '../motion';
import { TimerRing } from './TimerRing';
import { VoicePulse } from './VoiceBars';

export interface TimerLeadProps {
  /** plan tick of the enclosing round */
  frame: number;
  /** the question clip (plan ticks) when there is one */
  voice?: { file: string; start: number; frames: number };
  readyStart: number;
  timerStart: number;
  timerFrames: number;
  /** plan.revealStart: the timer is gone by then */
  revealStart: number;
  accent: string;
  /** diameter in px */
  size: number;
}

/** first plan tick this component draws anything (the slot is empty before) */
export const timerLeadStart = (voice: TimerLeadProps['voice'], readyStart: number): number => (voice ? voice.start - 6 : readyStart);

export const TimerLead: React.FC<TimerLeadProps> = ({ frame: f, voice, readyStart, timerStart, timerFrames, revealStart, accent, size }) => {
  if (f < timerLeadStart(voice, readyStart)) return null;

  // listening: the voice ring, fading in just before the clip and handing over at readyStart
  if (f < readyStart) {
    if (!voice) return null;
    return (
      <div style={{ opacity: enter(f, voice.start - 6, 'quick', 10).opacity }}>
        <VoicePulse file={voice.file} tick={f - voice.start} accent={accent} size={size} />
      </div>
    );
  }

  // get ready: the timer springs in (scale 0.9 -> 1, fade, 14 px rise, quick spring); inside it the glass disc comes first, then the
  // digit, then the ring (stagger), and the arc sweeps round in one smooth move that is full before timerStart (TimerRing `ready`)
  if (f < timerStart) {
    const e = enter(f, readyStart, 'quick', 14, 0.9);
    // the one very small settle allowed on the get-ready ring (peak 1.015, at most SETTLE.maxPeak), inside the beat
    const pop = settle(f, readyStart, DUR.ui, 1.015);
    return (
      <div style={{ opacity: e.opacity, transform: e.transform, transformOrigin: 'center' }}>
        <div style={{ transform: pop === 1 ? undefined : `scale(${pop})` }}>
          <TimerRing from={timerStart} duration={timerFrames} accent={accent} size={size} frame={f} ready={readyStart} after={revealStart - timerStart - timerFrames} />
        </div>
      </div>
    );
  }

  // go: the clock runs
  return <TimerRing from={timerStart} duration={timerFrames} accent={accent} size={size} frame={f} ready={readyStart} after={revealStart - timerStart - timerFrames} />;
};
