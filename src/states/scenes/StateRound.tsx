/**
 * StateRound (tasks 3a + 3b): one question of "Guess the US State from Its Shape".
 *
 * Phases, all from buildQuestionPlan (ticks of the question's own plan, 30 per second):
 *   stage-in   plan.drawStart .. +drawFrames   the neon outline draws in (StateShape progress 0 -> 1)
 *   clock      plan.timerStart .. +timerFrames the TimerRing runs for the level time
 *   hints      plan.hintAt[0] / [1]            fractions of the clock from states-settings.json (hints.fractions)
 *   answer     plan.revealStart .. plan.exit   hold (see TODO 3c)
 * Sound for these phases is in ./stateRoundCues.ts (same plan ticks).
 *
 * Tier by level (states-data.ts / state-timing QUESTIONS carry the per-state values):
 *   EASY    plain neon outline (StateShape)
 *   MEDIUM  the same, inside a CropMask hiding the half named by the state's cropSide
 *   HARD    StateShape and EmojiFill rotated by the state's rotation
 *   EXPERT  PixelReveal: 12 -> 24 -> 48 cells with the clock, cross-fade to the outline at plan.revealStart
 * Hints (every tier): emoji grid (EmojiFill) at plan.hintAt[0]; Census-region glow on the MiniMap at plan.hintAt[1].
 * The MiniMap shows the states answered so far (video order before `index`). It deliberately gets no
 * `current` state: that pulsing outline would mark the answer.
 *
 * Mount inside a <Sequence from={seg.from}>: `frame` is the local design tick of that sequence
 * (useDesignFrame() there). The question starts `lead` ticks earlier (it overlaps the previous colour
 * wipe), so plan tick = frame + lead.
 *
 * TODO(3c): reveal. Slots: `slots.card` (AnswerCard at plan.stamp), `slots.overlay` / `slots.miniMap` (FlyIn),
 *           fill/glow build from plan.revealStart, CropMask `reveal` 0 -> 1 (MEDIUM), the answered list gains this
 *           state, and decide there whether the ring stays after the clock ends.
 */
import React from 'react';
import { prog, cssEaseInOut } from '../../anim';
import { buildQuestionPlan, LEVELS, QUESTIONS } from '../state-timing';
import { STATES, getState } from '../states-data';
import { STAGE_LAYOUT, StateStage } from '../components/StateStage';
import { StateShape } from '../components/StateShape';
import { TimerRing } from '../components/TimerRing';
import { EmojiFill } from '../components/EmojiFill';
import { CropMask } from '../components/CropMask';
import { PixelReveal } from '../components/PixelReveal';
import { MiniMap } from '../components/MiniMap';

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

const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 };

export const StateRound: React.FC<StateRoundProps> = ({ frame, index, lead = 0, withTitle = false }) => {
  const plan = buildQuestionPlan(index, withTitle);
  const level = LEVELS[plan.levelIndex];
  const q = QUESTIONS[index];
  const info = getState(plan.key);
  const f = frame + lead; // plan tick
  const L = STAGE_LAYOUT;
  const size = L.shape.w;

  // stage-in: the outline draws and its glow comes up with it
  const draw = prog(f, plan.drawStart, plan.drawFrames, cssEaseInOut);
  // clock progress 0 -> 1 (EXPERT grid resolution)
  const clock = prog(f, plan.timerStart, plan.timerFrames);

  if (q.level === 'MEDIUM' && q.cropSide === undefined) throw new Error(`${q.key}: MEDIUM state without cropSide`);
  if (q.level === 'HARD' && q.rotation === undefined) throw new Error(`${q.key}: HARD state without rotation`);
  const rotation = q.level === 'HARD' ? (q.rotation as number) : 0;

  // hints: emoji at hintAt[0], region glow at hintAt[1]
  const region = f >= plan.hintAt[1] ? info.region : undefined;
  const emoji = (
    <div style={fill}>
      <EmojiFill stateKey={plan.key} size={size} at={plan.hintAt[0]} rotation={rotation} frame={f} />
    </div>
  );

  let shapeSlot: React.ReactNode;
  if (q.level === 'EXPERT') {
    shapeSlot = (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ ...fill, opacity: draw }}>
          <PixelReveal
            stateKey={plan.key}
            size={size}
            progress={clock}
            accent={level.accent}
            at={plan.revealStart}
            dur={plan.stamp - plan.revealStart}
            frame={f}
          />
        </div>
        {emoji}
      </div>
    );
  } else {
    const layers = (
      <>
        <div style={fill}>
          <StateShape
            stateKey={plan.key}
            size={size}
            progress={draw}
            glow={draw}
            rotation={rotation}
            accent={level.accent}
          />
        </div>
        {emoji}
      </>
    );
    shapeSlot =
      q.level === 'MEDIUM' ? (
        // TODO(3c): reveal 0 -> 1 at the reveal
        <CropMask side={q.cropSide as NonNullable<typeof q.cropSide>} reveal={0} size={size}>
          {layers}
        </CropMask>
      ) : (
        <div style={{ position: 'relative', width: size, height: size }}>{layers}</div>
      );
  }

  return (
    <StateStage
      level={level.name}
      number={plan.id}
      frame={f}
      slots={{
        shape: { children: shapeSlot },
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
        miniMap: {
          children: (rect) => (
            <MiniMap
              answered={STATES.slice(0, index).map((s) => s.key)}
              highlightRegion={region}
              size={rect.w}
              frame={f}
            />
          ),
        },
        // TODO(3c): card: AnswerCard at plan.stamp; overlay: FlyIn
      }}
    />
  );
};
