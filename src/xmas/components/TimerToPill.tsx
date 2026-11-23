import React from 'react';
import { clamp01 as clamp01m, easeInOut, easeOut, motionSpringAt } from '../shared/motion';
import { colors, glassSurface, LAYOUT, px, REF, textStyle, timerColor, useXmasFrame } from '../system';
import { fitTitle } from '../titleFit';
import { cue, tickId } from '../sfx';
import type { SfxCue } from '../sfx';
import { FPS } from '../shared/clock';
import { movieSegmentSec, playSecOf, timerSegmentCount } from '../timing';
import type { Slot } from '../data';

/**
 * TimerToPill: the segmented timer under the tiles, which morphs into the title pill at the answer.
 *
 * TIME UNIT: every frame number here (startFrame, morphFrame, the plan, the cues) is a DESIGN TICK (30 per second), the
 * unit scenes author in and the unit of sfx cues. The component samples it at the full 60 fps (useXmasFrame), so a render
 * frame is 2 ticks. Give it ticks relative to the same clock for all of them (for example the slot's local time).
 *
 * Behaviour: segment i (0-based) starts to fill at startFrame + i * step and takes FILL_TICKS to sweep in from the left;
 * its tick sound plays at that same moment. The bar is full at fullFrame = startFrame + segments * step (the end of the
 * thinking time), where it flashes for FLASH_TICKS. At morphFrame the capsule becomes the title pill.
 * No text is drawn before the morph. The title comes only from props (data.ts); the size from titleFit.ts.
 */

export const TIMER = {
  /** A segment sweeps in over this many ticks. */
  fillTicks: 4,
  /** The full-bar flash lasts this many ticks (peak at the third). */
  flashTicks: 9,
  /** The capsule becomes the pill over this many ticks (the iOS spring is within about 5% of its end here). */
  morphTicks: 14,
  /** The title starts to fade up this many ticks after the morph starts, and takes titleTicks. */
  titleDelayTicks: 3,
  titleTicks: 8,
  /** Title rise in reference units. */
  titleRise: 6,
  /** The glow of the front segment, reference units of blur. */
  glowBlur: 12,
  /** Most segments (the star timer); tick-01..tick-10 exist. */
  maxSegments: 10,
} as const;

/** Backdrop-blur budget: at most two blurred layers on screen (the two tiles), so small pills draw the same glass flat. */
export const withoutBackdrop = (style: React.CSSProperties): React.CSSProperties => {
  const { backdropFilter: _b, WebkitBackdropFilter: _w, ...flat } = style as React.CSSProperties & { WebkitBackdropFilter?: string };
  return flat;
};

export type TimerVariant = 'movie' | 'bonus';

export type TimerPlan = {
  segments: number;
  /** Ticks between two segments. */
  stepTicks: number;
  /** Tick at which each segment starts to fill (and its tick sound plays). */
  fills: number[];
  /** Tick at which the bar is full and flashes (timer-full sound). */
  full: number;
  flash: { from: number; to: number };
  morph: { from: number; to: number };
};

/** The one place that turns the props into tick numbers. Throws on an impossible plan. */
export const timerPlan = (startFrame: number, segments: number, secondsPerSegment: number, morphFrame?: number): TimerPlan => {
  if (!Number.isInteger(segments) || segments < 1 || segments > TIMER.maxSegments) throw new Error(`TimerToPill: ${segments} segments, expected 1..${TIMER.maxSegments}`);
  if (!(secondsPerSegment > 0)) throw new Error(`TimerToPill: secondsPerSegment ${secondsPerSegment} must be above 0`);
  const stepTicks = secondsPerSegment * FPS;
  const fills = Array.from({ length: segments }, (_, i) => Math.round(startFrame + i * stepTicks));
  const full = Math.round(startFrame + segments * stepTicks);
  const morphFrom = morphFrame ?? full + TIMER.flashTicks;
  if (morphFrom < full) throw new Error(`TimerToPill: morphFrame ${morphFrom} is before the bar is full (${full})`);
  return {
    segments,
    stepTicks,
    fills,
    full,
    flash: { from: full, to: full + TIMER.flashTicks },
    morph: { from: morphFrom, to: morphFrom + TIMER.morphTicks },
  };
};

/** The morphFrame that lets the flash play out completely (what a scene uses unless it has its own beat). */
export const defaultMorphFrame = (startFrame: number, segments: number, secondsPerSegment: number): number =>
  timerPlan(startFrame, segments, secondsPerSegment).flash.to;

/** Props for a slot, all from timing.ts: segment count (8, 10 or 6), seconds per segment, variant. */
export const timerPropsOf = (slot: Slot): { segments: number; secondsPerSegment: number; variant: TimerVariant } => {
  const segments = timerSegmentCount(slot);
  return { segments, secondsPerSegment: playSecOf(slot) / segments, variant: slot.kind === 'bonus' ? 'bonus' : 'movie' };
};

/**
 * Sound cues of the timer (design ticks, as sfx.ts expects): tick-01 rising to tick-N, one per segment at the moment
 * it starts to fill, then timer-full when the bar is full. `secondsPerSegment` defaults to the movie step (1 s).
 */
export const timerCues = (startFrame: number, segments: number, secondsPerSegment: number = movieSegmentSec): SfxCue[] => {
  const plan = timerPlan(startFrame, segments, secondsPerSegment);
  return [...plan.fills.map((f, i) => cue(tickId(i + 1), f)), cue('timer-full', plan.full)];
};

/* ------------------------------------------------------------------ drawing */

const clamp01 = clamp01m;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Segment i of n, relative to the capsule's top-left corner (reference units). */
const segmentRect = (i: number, n: number) => {
  const { capsule, padX, padY, gap } = LAYOUT.timer;
  const w = (capsule.w - padX * 2 - gap * (n - 1)) / n;
  return { x: padX + i * (w + gap), y: padY, w, h: capsule.h - padY * 2 };
};

/** Lit colour of segment i of n: green through lime and amber to red for a movie, gold for a bonus. */
export const litColor = (i: number, n: number, variant: TimerVariant): string =>
  variant === 'bonus' ? colors.gold : timerColor(n === 1 ? 0 : i / (n - 1));

export type TimerToPillProps = {
  /** 8 (movie), 10 (star) or 6 (bonus); use timerPropsOf(slot). */
  segments: number;
  /** Design tick at which segment 1 starts to fill. */
  startFrame: number;
  /** Seconds per segment (play time / segments); use timerPropsOf(slot). */
  secondsPerSegment: number;
  variant: TimerVariant;
  /** Design tick at which the bar morphs into the pill (not before the bar is full). */
  morphFrame: number;
  /** The title the pill shows: from data.ts only. */
  title: string;
  /** Current design tick; default is the live clock. */
  frame?: number;
};

export const TimerToPill: React.FC<TimerToPillProps> = ({ segments, startFrame, secondsPerSegment, variant, morphFrame, title, frame }) => {
  const live = useXmasFrame();
  const t = frame ?? live;
  const plan = timerPlan(startFrame, segments, secondsPerSegment, morphFrame);
  const fit = fitTitle(title);
  const cap = LAYOUT.timer.capsule;
  const cy = cap.y + cap.h / 2;
  const gold = variant === 'bonus';

  // the pill grows out of the bar with the iOS spring (about 1.5% overshoot); the other uses want 0..1
  const m = t < plan.morph.from ? 0 : motionSpringAt(t, plan.morph.from, 'ios');
  const mc = clamp01(m);
  const w = lerp(cap.w, fit.pillWidth, m);
  const h = lerp(cap.h, fit.pillHeight, m);
  const x = REF.w / 2 - w / 2;
  const y = cy - h / 2;
  const radius = h / 2;

  // flash: quick rise, slower fall, 0..1
  const fk = clamp01((t - plan.flash.from) / TIMER.flashTicks);
  const flash = t < plan.flash.from ? 0 : fk < 0.3 ? fk / 0.3 : 1 - (fk - 0.3) / 0.7;
  const barOpacity = 1 - clamp01(mc / 0.45);
  const titleK = easeOut((t - (plan.morph.from + TIMER.titleDelayTicks)) / TIMER.titleTicks);

  const glass = withoutBackdrop(
    glassSurface(radius, {
      edge: 0.6,
      depth: 0.45,
      base: colors.glassBase,
      ...(gold ? { tint: colors.gold, tintPercent: 16 } : {}),
    }),
  );

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(REF.w), height: px(REF.h), pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: px(x),
          top: px(y),
          width: px(w),
          height: px(h),
          boxSizing: 'border-box',
          ...glass,
          transform: `scale(${1 + 0.018 * flash})`,
          boxShadow: `${glass.boxShadow}, 0 0 ${px(34 * flash)}px ${gold ? 'rgba(255,200,87,0.55)' : 'rgba(255,255,255,0.45)'}`,
        }}
      >
        {/* the segments live in a box the size of the capsule, centred in the morphing container */}
        <div
          style={{
            position: 'absolute',
            left: px((w - cap.w) / 2),
            top: px((h - cap.h) / 2),
            width: px(cap.w),
            height: px(cap.h),
            opacity: barOpacity,
            transform: `scaleX(${1 - 0.3 * mc})`,
          }}
        >
          {Array.from({ length: segments }, (_, i) => {
            const r = segmentRect(i, segments);
            const f = easeInOut((t - plan.fills[i]) / TIMER.fillTicks);
            const c = litColor(i, segments, variant);
            // the front segment (the newest one) carries a glow in its own colour; it hands over softly to the next one
            const handOver = i + 1 < segments ? easeInOut((t - plan.fills[i + 1]) / (TIMER.fillTicks * 2)) : 0;
            const glow = f * (1 - handOver);
            return (
              <div key={i} style={{ position: 'absolute', left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h), borderRadius: px(r.h / 2), background: colors.segmentOff }}>
                {f > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${f * 100}%`,
                      borderRadius: px(r.h / 2),
                      background: c,
                      boxShadow: glow > 0.01 ? `0 0 ${px(TIMER.glowBlur * glow)}px ${c}` : undefined,
                    }}
                  />
                ) : null}
                {flash > 0 ? <div style={{ position: 'absolute', inset: 0, borderRadius: px(r.h / 2), background: '#FFFFFF', opacity: 0.8 * flash }} /> : null}
              </div>
            );
          })}
        </div>
        {/* the title: one line, size from titleFit */}
        {titleK > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: titleK,
              transform: `translateY(${px(TIMER.titleRise * (1 - titleK))}px)`,
            }}
          >
            <span style={{ ...textStyle('title'), fontWeight: 700, fontSize: px(fit.fontSize), whiteSpace: 'nowrap' }}>{title}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TimerToPill;
