import React from 'react';
import { useVideoConfig } from 'remotion';
import { TIME_SCALE, useXmasFrame } from '../shared/clock';

/**
 * SlotTransition: the move from one question to the next. It wraps a whole slot scene (mounted in that slot's Sequence,
 * so the clock is the slot's own). The scene fades in over the first `inTicks` and, over its last `outTicks`, fades out
 * while it settles back a little (scale `outScale`). The next scene's tiles spring in on their own right after, so the
 * two overlap into one soft handover. It never changes a slot's length: the exit sits inside the reveal's hold.
 * The sound `transition` is placed by sfxCues at `transitionCueTick`. Units: design ticks (30 per second).
 */
export const TRANSITION = { inTicks: 4, outTicks: 8, outScale: 0.985 } as const;

/** Slot-local tick at which the exit (and its sound) starts, for a slot `totalTicks` long. */
export const transitionCueTick = (totalTicks: number): number => totalTicks - TRANSITION.outTicks;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (k: number) => k * k * (3 - 2 * k);

export const SlotTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useXmasFrame();
  const { durationInFrames } = useVideoConfig();
  const total = durationInFrames / TIME_SCALE;
  const fadeIn = ease(clamp01(t / TRANSITION.inTicks));
  const out = ease(clamp01((t - transitionCueTick(total)) / TRANSITION.outTicks));
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: fadeIn * (1 - out),
        transform: `scale(${1 - (1 - TRANSITION.outScale) * out})`,
        transformOrigin: '50% 50%',
      }}
    >
      {children}
    </div>
  );
};

export default SlotTransition;
