import React from 'react';
import type { Item, Level } from '../data';
import { springAt, u } from '../system';
import { FPS, eliminationFor, expandDelayFor, holdSec, revealExpandSec, revealFadeSec, revealGapSec, revealGreySec, secToTicks } from '../timing';
import { ChoiceChip } from './ChoiceChip';
import type { ChipState } from './ChoiceChip';

/**
 * Reveal engine. Frames are local design ticks (30 per second), measured from the START of the reveal,
 * which is the start of the item's `hold` phase (timing.ts `phases.hold.from`): the hold is part of the engine.
 *
 *   hold   holdSec (timing.ts), options frozen: all idle, no motion, no sound
 *   full   wrong options grey out one at a time, `gapSec` apart (overlapping), the correct one expands at the
 *          later of the elimination end and revealClipLeadSec after the hold (timing.ts)
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
  greySec: revealGreySec, // full: one option's grey-out length (longer than the gap: the grey-outs overlap)
  fadeSec: revealFadeSec, // fast: all three wrong options together
  expandSec: revealExpandSec, // the correct option's expand
  highlightSec: 0.3, // full: the correct option's colour fade (glass to solid), see `highlight`
  fastHighlightSec: 0.6, // fast: starts fastHighlightStartSec after the hold and ends 0.1 s after the expand begins, so colour, fade and pop overlap
  fastHighlightStartSec: 0.1,
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
  /**
   * 0..1 colour fade of the correct option (glass to solid accent). Pass to ChoiceChip `highlight`. It starts when the
   * elimination has ended (or `highlightSec` before the expand, if that is later) and runs `highlightSec`, so the answer
   * lights up as the others finish dimming instead of snapping on at the expand. The expand (scale pop, voice sync) is unchanged.
   */
  highlight: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const EPS = 1e-9; // tick/second rounding noise at phase boundaries
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const elimSec = (mode: RevealMode) => eliminationFor(mode === 'full');
/** Seconds from the reveal start until the correct option begins to expand. */
export const expandStartSec = (mode: RevealMode): number => holdSec + expandDelayFor(mode === 'full');
/** Seconds from the reveal start until the reveal voice clip starts: the end of the hold. */
export const revealClipStartSec: number = holdSec;
/** Seconds from the reveal start until the correct option has finished expanding. */
export const revealEndSec = (mode: RevealMode): number => expandStartSec(mode) + REVEAL.expandSec;
export const revealEndTicks = (mode: RevealMode): number => secToTicks(revealEndSec(mode));
/** Local tick at which the correct option begins to expand, given the tick the hold starts (`phases.hold.from`):
 *  the later of the elimination end and `revealClipLeadSec` after the reveal clip starts (which is the end of the hold). */
export const expandStartTick = (holdFrom: number, mode: RevealMode): number => holdFrom + secToTicks(expandStartSec(mode));
/** Local tick at which the reveal voice clip starts: when the hold ends, while the elimination plays. */
export const revealClipTick = (holdFrom: number): number => holdFrom + secToTicks(revealClipStartSec);

/** Per-option state at `frame` ticks after the reveal start (negative frames count as 0). Pure. */
export const optionStateAt = (item: Item, frame: number, mode: RevealMode): OptionState[] => {
  const t = Math.max(0, frame) / FPS;
  const wrong = item.options.map((_, i) => i).filter((i) => i !== item.answer);
  const expandStartTick = secToTicks(expandStartSec(mode));
  const { greyedOpacity, greyedSaturate } = REVEAL;

  return item.options.map((text, index) => {
    const correct = index === item.answer;
    const idle = { index, text, correct, chipState: 'idle' as ChipState, stateAt: 0, elim: 0, opacity: 1, saturate: 1, scale: 1, expand: 0, highlight: 0 };
    if (t < holdSec) return { ...idle, phase: 'hold' };

    if (correct) {
      const p = (t - expandStartSec(mode)) / REVEAL.expandSec;
      // fast: the colour fade starts 0.1 s into the wrong options' fade and overlaps the pop (iOS-style, one fluid motion)
      const hlSec = mode === 'fast' ? REVEAL.fastHighlightSec : REVEAL.highlightSec;
      const highlightFrom = mode === 'fast' ? holdSec + REVEAL.fastHighlightStartSec : Math.max(holdSec + elimSec(mode), expandStartSec(mode) - REVEAL.highlightSec);
      const highlight = smooth((t - highlightFrom) / hlSec);
      if (p <= 0) return { ...idle, phase: 'idle', highlight };
      const expand = springAt(frame, expandStartTick, 'pop');
      return {
        ...idle,
        phase: p < 1 - EPS ? 'expanding' : 'correct',
        chipState: 'correct',
        stateAt: expandStartTick,
        expand,
        scale: 1 + REVEAL.expandScale * expand,
        highlight,
      };
    }

    const k = wrong.indexOf(index);
    const startSec = mode === 'full' ? holdSec + k * REVEAL.gapSec : holdSec;
    const len = mode === 'full' ? REVEAL.greySec : REVEAL.fadeSec;
    const raw = (t - startSec) / len;
    if (raw <= 0) return { ...idle, phase: 'idle' };
    const elim = smooth(raw);
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
        <div key={s.index}>
          <ChoiceChip
            index={s.index}
            text={s.text}
            state={s.chipState === 'greyed' ? 'idle' : s.chipState}
            grey={s.phase === 'eliminated' ? 1 : s.phase === 'eliminating' ? s.elim : 0}
            frame={frame}
            at={enterAt}
            stateAt={s.chipState === 'idle' || s.chipState === 'greyed' ? undefined : from + s.stateAt}
            highlight={s.highlight}
            level={level}
            width={width}
            height={height}
          />
        </div>
      ))}
    </div>
  );
};
