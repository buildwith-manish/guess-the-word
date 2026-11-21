/**
 * StateRound (task 3a, skeleton): one question of "Guess the US State from Its Shape".
 *
 * Phases, all from buildQuestionPlan (ticks of the question's own plan, 30 per second):
 *   stage-in   plan.drawStart .. +drawFrames   the neon outline draws in (StateShape progress 0 -> 1)
 *   clock      plan.timerStart .. +timerFrames the TimerRing runs for the level time
 *   answer     plan.revealStart .. plan.exit   hold (nothing drawn yet, see TODO 3c)
 * Sound for these phases is in ./stateRoundCues.ts (same plan ticks).
 *
 * Mount inside a <Sequence from={seg.from}>: `frame` is the local design tick of that sequence
 * (useDesignFrame() there). The question starts `lead` ticks earlier (it overlaps the previous colour
 * wipe), so plan tick = frame + lead.
 *
 * TODO(3b): hints. Slot: StateStage `slots.title` (and tier effects on the shape slot) at plan.hintAt[0], plan.hintAt[1].
 * TODO(3c): reveal. Slots: `slots.card` (AnswerCard at plan.stamp), `slots.overlay` / `slots.miniMap` (FlyIn),
 *           fill/glow build from plan.revealStart. Decide there whether the ring stays after the clock ends.
 * No tiers (rotation, crop, pixels) and no hints here: the shape is a plain outline for every level.
 */
import React from 'react';
import { prog, cssEaseInOut } from '../../anim';
import { buildQuestionPlan, LEVELS } from '../state-timing';
import { STAGE_LAYOUT, StateStage } from '../components/StateStage';
import { StateShape } from '../components/StateShape';
import { TimerRing } from '../components/TimerRing';

export interface StateRoundProps {
  /** local design tick of the enclosing Sequence */
  frame: number;
  /** 0-based question index (video order) */
  index: number;
  /** ticks of this question already played inside the previous wipe (segment.lead), default 0 */
  lead?: number;
  /** must match what the timeline used for this question (buildQuestionPlan's second argument), default false */
  withTitle?: boolean;
}

export const StateRound: React.FC<StateRoundProps> = ({ frame, index, lead = 0, withTitle = false }) => {
  const plan = buildQuestionPlan(index, withTitle);
  const level = LEVELS[plan.levelIndex];
  const f = frame + lead; // plan tick
  const L = STAGE_LAYOUT;

  // stage-in: the outline draws and its glow comes up with it
  const draw = prog(f, plan.drawStart, plan.drawFrames, cssEaseInOut);

  return (
    <StateStage
      level={level.name}
      number={plan.id}
      frame={f}
      slots={{
        shape: {
          children: <StateShape stateKey={plan.key} size={L.shape.w} progress={draw} glow={draw} accent={level.accent} />,
        },
        ring: {
          at: plan.timerStart,
          children: (
            <TimerRing
              from={plan.timerStart}
              duration={plan.timerFrames}
              accent={level.accent}
              size={L.ring.w}
              frame={f}
            />
          ),
        },
        // TODO(3b): title: hint text at plan.hintAt
        // TODO(3c): card: AnswerCard at plan.stamp; overlay: FlyIn; miniMap: MiniMap
      }}
    />
  );
};
