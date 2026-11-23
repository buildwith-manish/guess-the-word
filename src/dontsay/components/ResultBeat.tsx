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
import { Audio, Sequence, staticFile } from 'remotion';
import { resultLineFor } from '../data';
import type { Round } from '../data';
import { colours, fontHeadline, glassSurface, springAt, SYSTEM } from '../system';
import { sfxSrc } from '../sfx';
import { TIME_SCALE, WIDTH, clipPath, clipSec, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

/** UI copy owned by this component. */
export const CHIP_COLLISION = 'Same answer';
export const CHIP_SAFE = 'Different? Safe';

export type ResultOutcome = 'collision' | 'safe';

/** Spoken line for this round and outcome (data.ts). */
export const resultLineOf = (round: Round, outcome: ResultOutcome): string => resultLineFor(round.n, outcome === 'safe');
export const resultClipId = (n: number): string => `r${String(n).padStart(2, '0')}_result`;

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
  const id = resultClipId(round.n);
  const lineLen = clipSec(id);
  const line = lineLen !== undefined ? (
    <Sequence from={Math.round((at + 4) * TIME_SCALE)} layout="none">
      <Audio src={staticFile(clipPath(id))} />
    </Sequence>
  ) : null;

  // Skip the chip and its sfx on pace-skip rounds; the spoken line may still play.
  if (round.skipResultLine) return <>{line}</>;

  const safe = outcome === 'safe';
  const tone = safe ? colours.safe : colours.collision;
  const p = springAt(t, at, 'pop');
  const fade = Math.min(1, Math.max(0, (t - at) / 4));

  return (
    <>
      <Sequence from={Math.round(at * TIME_SCALE)} layout="none">
        <Audio src={sfxSrc(safe ? 'safe-pulse' : 'collision')} volume={safe ? 0.8 : 0.55} />
      </Sequence>
      {line}
      <div
        style={{
          position: 'absolute',
          left: px(anchor.x),
          top: px(anchor.y + 150),
          transform: `translate(-50%, 0) translateY(${(1 - p) * px(14)}px) scale(${0.8 + 0.2 * p})`,
          opacity: fade,
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
