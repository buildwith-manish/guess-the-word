/**
 * ResultBeat: the 1.8 s after the reveal (timing.ts resultSec). A small chip on the InkBubble:
 * red "Same answer" on a collision (muted low thud + short red blip = the `collision` sfx),
 * green "Different? Safe" on a safe (the `safe-pulse` sfx). Skipped entirely on rounds with
 * skipResultLine. The rotating spoken line (data.ts resultLineFor) is exposed through
 * `resultLineOf`; its clip id is `rNN_result` (a guess for the voice pipeline) and plays only
 * once a measured clip with that id exists in timings.generated.ts.
 * It NEVER animates a heart: no heart is drawn, jiggled, popped or counted here.
 * Sizes in 1280x720 reference units through px(). Our own drawn icons.
 */
import React from 'react';
import { Audio, Sequence } from 'remotion';
import { resultLineFor } from '../data';
import type { Round } from '../data';
import { colours, easeOut, fontHeadline, glassSurface, SYSTEM } from '../system';
import { sfxSrc } from '../sfx';
import { resultSecFor, secToTicks, TIME_SCALE, WIDTH, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Chip motion, ticks (30 fps) and reference units. Exit is shorter than the entrance. */
const RISE_TICKS = 8;
const RISE_UNITS = 12;
const FADE_IN_TICKS = 6;
const EXIT_TICKS = 6;
const EXIT_DROP_UNITS = 6;
/** The exit ends this many ticks before the result slot ends. */
const EXIT_MARGIN_TICKS = 3;

/** UI copy owned by this component. */
export const CHIP_COLLISION = 'Same answer';
export const CHIP_SAFE = 'Different? Safe';

export type ResultOutcome = 'collision' | 'safe';

/** Spoken line for this round and outcome (data.ts). */
export const resultLineOf = (round: Round, outcome: ResultOutcome): string => resultLineFor(round.n, outcome === 'safe');

const Icon: React.FC<{ safe: boolean; size: number }> = ({ safe, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <circle cx="12" cy="12" r="11" fill={safe ? SYSTEM.green : SYSTEM.red} />
    {safe ? (
      <path d="M7 12.5 L10.5 16 L17 8.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ) : (
      <path d="M8 8 L16 16 M16 8 L8 16" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    )}
  </svg>
);

export type ResultBeatProps = {
  round: Round;
  outcome: ResultOutcome;
  /** Local design tick (30 fps) where the result phase starts (phases.result.from minus the round start). */
  at: number;
  /** Centre of the InkBubble in reference units; the chip sits just under it. */
  anchor?: { x: number; y: number };
  /** Local design tick; defaults to the current clock. */
  frame?: number;
};

export const ResultBeat: React.FC<ResultBeatProps> = ({ round, outcome, at, anchor = { x: 640, y: 360 }, frame }) => {
  const clock = useDontSayFrame();
  const t = frame ?? clock;
  // Skip the chip and its sfx on pace-skip rounds (the spoken line is played by VoiceLayer either way).
  if (round.skipResultLine) return null;

  const safe = outcome === 'safe';
  const tone = safe ? colours.safe : colours.collision;
  // short rise + fade in, hold still, quiet fade-out near the end of the result slot (timing.ts resultSecFor)
  const rise = easeOut((t - at) / RISE_TICKS);
  const fadeIn = easeOut((t - at) / FADE_IN_TICKS);
  const exitFrom = at + secToTicks(resultSecFor(round)) - EXIT_MARGIN_TICKS - EXIT_TICKS;
  const out = easeOut((t - exitFrom) / EXIT_TICKS);

  return (
    <>
      <Sequence from={Math.round(at * TIME_SCALE)} layout="none">
        <Audio src={sfxSrc(safe ? 'safe-pulse' : 'collision')} volume={safe ? 0.8 : 0.55} />
      </Sequence>
      <div
        style={{
          position: 'absolute',
          left: px(anchor.x),
          top: px(anchor.y + 150),
          transform: `translate(-50%, 0) translateY(${(1 - rise) * px(RISE_UNITS) + out * px(EXIT_DROP_UNITS)}px)`,
          opacity: fadeIn * (1 - out),
          display: 'flex',
          alignItems: 'center',
          gap: px(10),
          padding: `${px(10)}px ${px(22)}px ${px(10)}px ${px(12)}px`,
          ...glassSurface(40, { tint: tone, alpha: 0.14 }),
          borderRadius: px(32),
          color: colours.ink,
          fontFamily: fontHeadline,
          fontWeight: 700,
          fontSize: px(30),
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon safe={safe} size={px(34)} />
        <span>{safe ? CHIP_SAFE : CHIP_COLLISION}</span>
      </div>
    </>
  );
};
