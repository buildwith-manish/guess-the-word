/**
 * TimerLead: what the timer slot (left of the shape) shows BEFORE and AT the start of the clock.
 *
 *   listening   while the question clip plays: VoicePulse (a ring that breathes with the voice, bars inside)
 *   get ready   readyStart .. timerStart: the clock ring pops in full with a glow flash (the read-out is over, the
 *               clock is about to run)
 *   go          timerStart: a burst ring expands off the ring and the TimerRing takes over
 *
 * Without a question clip only the get-ready beat and the burst play. Everything is a pure function of the tick.
 */
import React from 'react';
import { bounceEase, cssEaseOut, prog } from '../../anim';
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
  accent: string;
  /** diameter in px */
  size: number;
}

/** ticks the burst ring takes */
const BURST = 14;

/** first plan tick this component draws anything (the slot is empty before) */
export const timerLeadStart = (voice: TimerLeadProps['voice'], readyStart: number): number => (voice ? voice.start - 6 : readyStart);

export const TimerLead: React.FC<TimerLeadProps> = ({ frame: f, voice, readyStart, timerStart, timerFrames, accent, size }) => {
  if (f < timerLeadStart(voice, readyStart)) return null;

  // listening: the voice ring, fading in just before the clip and handing over at readyStart
  if (f < readyStart) {
    if (!voice) return null;
    return (
      <div style={{ opacity: prog(f, voice.start - 6, 8, cssEaseOut) }}>
        <VoicePulse file={voice.file} tick={f - voice.start} accent={accent} size={size} />
      </div>
    );
  }

  // get ready: the full clock ring pops in (overshoot) and glows
  if (f < timerStart) {
    const beat = Math.max(1, timerStart - readyStart);
    const pop = prog(f, readyStart, beat * 0.7, bounceEase);
    const glow = 1 - prog(f, readyStart, beat, cssEaseOut);
    return (
      <div style={{ position: 'relative', opacity: prog(f, readyStart, 4, cssEaseOut), transform: `scale(${0.78 + 0.22 * pop})` }}>
        <div
          style={{
            position: 'absolute',
            left: -size * 0.12,
            top: -size * 0.12,
            width: size * 1.24,
            height: size * 1.24,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}00 52%, ${accent} 64%, ${accent}00 78%)`,
            opacity: 0.55 * glow,
          }}
        />
        <TimerRing from={timerStart} duration={timerFrames} accent={accent} size={size} frame={f} />
      </div>
    );
  }

  // go: the clock runs; a ring bursts outwards from it
  const b = prog(f, timerStart, BURST, cssEaseOut);
  return (
    <div style={{ position: 'relative' }}>
      <TimerRing from={timerStart} duration={timerFrames} accent={accent} size={size} frame={f} />
      {b < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: '50%',
            border: `${Math.max(2, size * 0.03)}px solid ${accent}`,
            boxSizing: 'border-box',
            opacity: 0.75 * (1 - b),
            transform: `scale(${1 + 0.55 * b})`,
          }}
        />
      ) : null}
    </div>
  );
};
