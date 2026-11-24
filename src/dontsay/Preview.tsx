/**
 * Preview compositions for the round scene (task 3a).
 *   DontSay-Round      one round, prop n (default 1)
 *   DontSay-Round-All  all rounds back to back: no hook, level cards, settings card, check-in or bonuses
 * Lengths and order come from timing.ts and data.ts.
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { rounds } from './data';
import { RoundScene, roundFrames } from './scenes/RoundScene';
import { VoiceLayer, findSegment } from './components/VoiceLayer';

export type RoundPreviewProps = { n: number };
export const ROUND_PREVIEW_DEFAULTS: RoundPreviewProps = { n: rounds[0].n };

const roundOf = (n: number) => {
  const r = rounds.find((x) => x.n === n);
  if (!r) throw new Error(`DontSay-Round: no round ${n}`);
  return r;
};

export const roundPreviewFrames = (n: number): number => roundFrames(roundOf(n).n);

export const RoundPreview: React.FC<RoundPreviewProps> = ({ n }) => (
  <>
    <RoundScene round={roundOf(n)} />
    <VoiceLayer segment={findSegment({ kind: 'round', n })} />
  </>
);

/** Start frame of each round in the back-to-back preview. */
const starts: number[] = [];
let acc = 0;
rounds.forEach((r) => {
  starts.push(acc);
  acc += roundFrames(r.n);
});
export const ROUND_ALL_FRAMES = acc;
/** Render-frame start of round n in DontSay-Round-All (for scrubbing). */
export const roundAllStart = (n: number): number => starts[rounds.findIndex((r) => r.n === n)];

export const RoundPreviewAll: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {rounds.map((r, i) => (
      <Sequence key={r.n} from={starts[i]} durationInFrames={roundFrames(r.n)}>
        <RoundScene round={r} />
        <VoiceLayer segment={findSegment({ kind: 'round', n: r.n })} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
