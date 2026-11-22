import React from 'react';
import type { Item, Level } from '../data';
import { springAt, u } from '../system';
import { FPS, holdSec, revealExpandSec, revealFadeSec, revealGapSec, revealGreySec, secToTicks } from '../timing';
import { ChoiceChip } from './ChoiceChip';
import type { ChipState } from './ChoiceChip';

/**
 * Reveal engine. Frames are local design ticks (30 per second), measured from the START of the reveal,
 * which is the start of the item's `hold` phase (timing.ts `phases.hold.from`): the hold is part of the engine.
 *
 *   hold   holdSec (timing.ts), options frozen: all idle, no motion, no sound
 *   full   wrong options grey out one at a time, `gapSec` apart, then the correct one expands
 *   fast   the three wrong options fade together over `fadeSec`, then the correct one expands
 *
 * Rendering is ChoiceChip. A chip's `greyed` state switches at once, so while an option is still going grey the
 * wrapper dims it continuously (same end values as the chip: opacity 0.35, saturate 0.2) and hands over to `greyed`
 * when it has finished.
 */
export type RevealMode = 'full' | 'fast';

/** Seconds. The beat lengths come from timing.ts (it needs them to place the reveal clip); the look constants are here. */
export const REVEAL = {
  gapSec: revealGapSec, // full: start-to-start gap between wrong options
  greySec: revealGreySec, // full: one option's grey-out length (equal to the gap: eliminations run back to back)
  fadeSec: revealFadeSec, // fast: all three wrong options together
  expandSec: revealExpandSec, // the correct option's expand
  expandScale: 0.06, // mirrors CORRECT_SCALE in ChoiceChip
  greyedOpacity: 0.35, // mirrors ChoiceChip `greyed`
  greyedSaturate: 0.2, // mirrors ChoiceChip `greyed`
} as const;

export type OptionPhase = 'hold' | 'idle' | 'eliminating' | 'eliminated' | 'expanding' | 'correct';

export type OptionState = {
  index: number;
  text: string;
  correct: boolean;
  phase: OptionPhase;
  /** State to give the ChoiceChip. */
  chipState: ChipState;
  /** Tick (from the reveal start) the chip's current state began; pass as ChoiceChip `stateAt` (offset by the reveal start). */
  stateAt: number;
  /** 0..1 elimination progress of a wrong option (continuous). */
  elim: number;
  opacity: number;
  saturate: number;
  /** 1 = normal size. */
  scale: number;
  /** 0..1 expand progress of the correct option (same spring as the chip). */
  expand: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const EPS = 1e-9; // tick/second rounding noise at phase boundaries
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const elimSec = (mode: RevealMode) => (mode === 'full' ? 2 * REVEAL.gapSec + REVEAL.greySec : REVEAL.fadeSec);
/** Seconds from the reveal start until the correct option begins to expand. */
export const expandStartSec = (mode: RevealMode): number => holdSec + elimSec(mode);
/** Seconds from the reveal start until the correct option has finished expanding. */
export const revealEndSec = (mode: RevealMode): number => expandStartSec(mode) + REVEAL.expandSec;
export const revealEndTicks = (mode: RevealMode): number => secToTicks(revealEndSec(mode));
/** Local tick at which the correct option begins to expand, given the tick the hold starts (`phases.hold.from`).
 *  The reveal voice clip starts exactly here; timing.ts (`eliminationSec`) sizes the reveal phase to match. */
export const expandStartTick = (holdFrom: number, mode: RevealMode): number => holdFrom + secToTicks(expandStartSec(mode));

/** Per-option state at `frame` ticks after the reveal start (negative frames count as 0). Pure. */
export const optionStateAt = (item: Item, frame: number, mode: RevealMode): OptionState[] => {
  const t = Math.max(0, frame) / FPS;
  const wrong = item.options.map((_, i) => i).filter((i) => i !== item.answer);
  const expandStartTick = secToTicks(expandStartSec(mode));
  const { greyedOpacity, greyedSaturate } = REVEAL;

  return item.options.map((text, index) => {
    const correct = index === item.answer;
    const idle = { index, text, correct, chipState: 'idle' as ChipState, stateAt: 0, elim: 0, opacity: 1, saturate: 1, scale: 1, expand: 0 };
    if (t < holdSec) return { ...idle, phase: 'hold' };

    if (correct) {
      const p = (t - expandStartSec(mode)) / REVEAL.expandSec;
      if (p <= 0) return { ...idle, phase: 'idle' };
      const expand = springAt(frame, expandStartTick, 'bouncy');
      return {
        ...idle,
        phase: p < 1 - EPS ? 'expanding' : 'correct',
        chipState: 'correct',
        stateAt: expandStartTick,
        expand,
        scale: 1 + REVEAL.expandScale * expand,
      };
    }

    const k = wrong.indexOf(index);
    const startSec = mode === 'full' ? holdSec + k * REVEAL.gapSec : holdSec;
    const len = mode === 'full' ? REVEAL.greySec : REVEAL.fadeSec;
    const raw = (t - startSec) / len;
    if (raw <= 0) return { ...idle, phase: 'idle' };
    const elim = easeOut(raw);
    const done = raw >= 1 - EPS;
    return {
      ...idle,
      phase: done ? 'eliminated' : 'eliminating',
      chipState: done ? 'greyed' : 'idle',
      stateAt: done ? secToTicks(startSec + len) : 0,
      elim,
      opacity: 1 - (1 - greyedOpacity) * elim,
      saturate: 1 - (1 - greyedSaturate) * elim,
    };
  });
};

export type RevealEngineProps = {
  item: Item;
  /** Local design frame of the scene. */
  frame: number;
  /** Local frame the reveal starts (the start of the hold phase). */
  from: number;
  mode: RevealMode;
  level?: Level;
  /** Local frame the chips entered (default 0: scene starts with the item). */
  enterAt?: number;
  /** Reference units (1920x1080), as ChoiceChip. */
  width?: number;
  height?: number;
  gap?: number;
  /** Optional custom renderer for the four states. */
  children?: (states: OptionState[]) => React.ReactNode;
};

/** Height of the default option list, reference units. */
export const optionListHeight = (height = 132, gap = 20): number => 4 * height + 3 * gap;

export const RevealEngine: React.FC<RevealEngineProps> = ({
  item, frame, from, mode, level, enterAt = 0, width = 1100, height = 132, gap = 20, children,
}) => {
  const states = optionStateAt(item, frame - from, mode);
  if (children) return <>{children(states)}</>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: u(gap) }}>
      {states.map((s) => (
        <div
          key={s.index}
          style={{
            opacity: s.phase === 'eliminating' ? s.opacity : undefined,
            filter: s.phase === 'eliminating' ? `saturate(${s.saturate})` : undefined,
          }}
        >
          <ChoiceChip
            index={s.index}
            text={s.text}
            state={s.chipState}
            frame={frame}
            at={enterAt}
            stateAt={s.chipState === 'idle' ? undefined : from + s.stateAt}
            level={level}
            width={width}
            height={height}
          />
        </div>
      ))}
    </div>
  );
};
