import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Hook } from '../scenes/Hook';
import { BonusScene } from '../scenes/BonusScene';
import { MovieScene } from '../scenes/MovieScene';
import { Outro } from '../scenes/Outro';
import { ScoreScene } from '../scenes/ScoreScene';
import { WatermarkOverlay } from '../components/Watermark';
import { SlotTransition } from '../components/SlotTransition';
import { ticksToFrames } from '../timing';
import type { PartRange, Segment } from '../timing';

/**
 * PartScenes: one Part of the video as a stack of Sequences, one per timing.ts segment, placed at the segment's offset
 * from the start of the part (so a part started alone begins at its first segment, local frame 0).
 *   every slot is wrapped in SlotTransition (soft fade/settle in and out; sound `transition` from sfxCues)
 *   hook -> Hook, slot -> MovieScene (movie) or BonusScene (bonus, by `slot.kind`, not by the slot number), score -> ScoreScene,
 *   outro -> Outro.
 * Each scene reads everything from its own slot and its own local clock (the light string from the slot number, the bokeh
 * from the scene's own time), so no frame depends on an earlier frame and any part renders the same alone or in a full cut.
 * The QUIZ MATRIX watermark is drawn once per part above all Sequences (components/Watermark.tsx).
 * Nothing is typed here: segment lengths and offsets come from timing.ts.
 */
const SceneOf: React.FC<{ seg: Segment }> = ({ seg }) => {
  switch (seg.kind) {
    case 'hook':
      return <Hook />;
    case 'slot':
      return <SlotTransition>{seg.slot.kind === 'bonus' ? <BonusScene slot={seg.slot} /> : <MovieScene slot={seg.slot} />}</SlotTransition>;
    case 'score':
      return <ScoreScene />;
    case 'outro':
      return <Outro />;
  }
};

const nameOf = (seg: Segment): string => (seg.kind === 'slot' ? `slot ${seg.slot.slot}` : seg.kind);

export const PartScenes: React.FC<{ part: PartRange }> = ({ part }) => (
  <AbsoluteFill style={{ backgroundColor: '#04050A' }}>
    {part.segments.map((seg) => (
      <Sequence key={`${seg.kind}-${seg.from}`} name={nameOf(seg)} from={ticksToFrames(seg.from) - ticksToFrames(part.from)} durationInFrames={ticksToFrames(seg.to) - ticksToFrames(seg.from)}>
        <SceneOf seg={seg} />
      </Sequence>
    ))}
    <WatermarkOverlay offsetTick={part.from} />
  </AbsoluteFill>
);

export default PartScenes;
