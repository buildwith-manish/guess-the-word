/**
 * HeartCheckIn.tsx: the 2 s card between rounds 23 and 24 (mid-Level 3) (task 4a).
 *
 * Voice only: "Check your hearts. On your last one? Careful." (heartCheckIn.voice). The hearts pill is
 * STATIC: it is mounted with no `at`, so it never springs, enlarges or changes (decision 14; no heart
 * is ever lost on screen). A short rising tone (check-in-tone) plays and the music bed lifts slightly,
 * then the card ends and round 24 starts straight away: the lift drops back at the cut, no fade tail.
 * No answer, no score. Round numbers, voice and length come from data.ts / timing.ts.
 */
import React from 'react';
import { heartCheckIn, rounds } from '../data';
import { WIDTH, checkInSecFor, secToTicks, useDontSayFrame } from '../timing';
import { colours, fontHeadline, levelBackground, springAt } from '../system';
import { clamp01 } from '../shared/fade';
import { HeartsPill } from '../components/HeartsPill';
import type { SfxId } from '../sfx';
import '../shared/fonts';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Level of the round the card leads into (the wallpaper follows LEVEL). */
const levelOf = (): 1 | 2 | 3 | 4 | 5 =>
  (rounds.find((r) => r.n === heartCheckIn.beforeRound) ?? rounds[0]).level;

/** First sentence of the narration, shown as a quiet caption: "Check your hearts." */
const caption = (): string => `${heartCheckIn.voice.split('.')[0].trim()}.`;

export type HeartCheckInCue = { name: string; id: SfxId; tick: number; volume: number };
/** The rising tone at the start of the card. The file is loud next to the rest: volume kept low. */
export const heartCheckInCues = (): HeartCheckInCue[] => [{ name: 'tone', id: 'check-in-tone', tick: 0, volume: 0.5 }];

/** Music bed gain multiplier across the card: a slight lift (guess 1.12x), ramped in, hard stop at the cut. */
export const MUSIC_LIFT = { to: 1.12, rampTicks: 18 } as const;
export const heartCheckInMusicGain = (tick: number): number => {
  if (tick < 0 || tick >= secToTicks(checkInSecFor())) return 1;
  return 1 + (MUSIC_LIFT.to - 1) * clamp01(tick / MUSIC_LIFT.rampTicks);
};

export type HeartCheckInProps = {
  /** Local design tick; defaults to the clock of the enclosing Sequence. */
  frame?: number;
  /** Show the first sentence as a caption. Default true. */
  showCaption?: boolean;
};

export const HeartCheckIn: React.FC<HeartCheckInProps> = ({ frame: frameProp, showCaption = true }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const a = springAt(frame, 4, 'smooth');
  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[levelOf()] }}>
      {/* static pill: no `at`, so it is settled from the first frame and never animates */}
      <HeartsPill />
      {showCaption ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: px(960), textAlign: 'center', opacity: a, transform: `translateY(${(1 - a) * px(24)}px)`,
            fontFamily: fontHeadline, fontWeight: 800, fontSize: px(84), lineHeight: 1.05, letterSpacing: '-0.03em', color: colours.ink }}>
            {caption()}
          </div>
        </div>
      ) : null}
    </div>
  );
};
