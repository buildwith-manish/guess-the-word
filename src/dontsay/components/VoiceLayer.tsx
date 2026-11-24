/**
 * VoiceLayer.tsx: plays the recorded voice clips of ONE segment (task 5c).
 *
 * The only source of when a clip starts is `voiceCues(segment)` in timing.ts; the only source of ids is
 * audioMap.ts. Mount this once per segment in Part1..Part6 (and once in a standalone composition), never inside
 * a scene: scenes draw, this layer talks. A clip is mounted from its start tick for its own length only.
 *
 * `at` is the tick (30 fps) where the segment starts in the enclosing clock; leave it 0 when the layer is
 * mounted inside the segment's own Sequence.
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { clipPath, clipSec, segments, ticksToFrames, voiceCues, type Segment } from '../timing';

export const VoiceLayer: React.FC<{ segment: Segment; at?: number }> = ({ segment, at = 0 }) => (
  <>
    {voiceCues(segment).map((c) => {
      const len = clipSec(c.id);
      return (
        <Sequence
          key={`${c.id}-${c.tick}`}
          from={ticksToFrames(at + c.tick)}
          durationInFrames={len === undefined ? undefined : Math.ceil(len * 60) + 2}
          layout="none"
        >
          <Audio src={staticFile(clipPath(c.id))} />
        </Sequence>
      );
    })}
  </>
);

/* ---------- standalone compositions: pick the segment a preview shows ---------- */
export type SegmentPick =
  | { kind: 'hook' | 'settingsCard' | 'heartCheckIn' | 'rankCard' | 'outro' }
  | { kind: 'levelCard'; level: number }
  | { kind: 'round'; n: number }
  | { kind: 'bonus'; n: number };

export const findSegment = (pick: SegmentPick): Segment => {
  const seg = segments.find((s) => {
    if (s.kind !== pick.kind) return false;
    if (pick.kind === 'levelCard' && s.kind === 'levelCard') return s.level === pick.level;
    if (pick.kind === 'round' && s.kind === 'round') return s.round.n === pick.n;
    if (pick.kind === 'bonus' && s.kind === 'bonus') return s.bonus.n === pick.n;
    return true;
  });
  if (!seg) throw new Error(`VoiceLayer: no segment for ${JSON.stringify(pick)}`);
  return seg;
};

/** Wrap a standalone scene so its composition also plays that segment's voice. Used by Root.tsx only. */
export const withVoice =
  <P extends object>(Scene: React.ComponentType<P>, pick: (props: P) => SegmentPick): React.FC<P> =>
  (props: P) => (
    <>
      <Scene {...props} />
      <VoiceLayer segment={findSegment(pick(props))} />
    </>
  );
