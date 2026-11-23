import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TIME_SCALE } from '../shared/clock';
import { FRAME, SPRINGS, finishStrength, px } from '../system';
import { RENDER_FPS, segments, ticksToFrames } from '../timing';
import { revealBeats } from './RevealEngine';

/**
 * Finish layer for NFL-Full: soft bloom on bright pixels only, film grain, a gentle vignette, and a chromatic split on the
 * name-reveal frame. One overlay, no children, nothing moves: it only tints what is under it.
 *
 * Mounting: directly in NflFull, outside every Sequence (it reads the absolute render frame with useCurrentFrame), after
 * the parts and BEFORE the watermark, so the watermark is never touched. Do not wrap it in a Sequence or an element with
 * opacity, filter or a blend mode: the bloom and the split read the pixels behind them with `backdrop-filter`, and such a
 * wrapper would cut them off from the video.
 *
 * Strength (`finishStrength` in system.ts, or the prop): 0 renders nothing. It ramps to 0 before the end screen starts
 * (`endScreenFrom` of the outro segment, timing.ts) and stays 0 for the whole end-screen slot.
 *
 * Layers, all full-frame, pointer events off:
 *  - bloom: a copy of what is behind, with everything below about 70% brightness crushed to black, blurred and blended
 *    with `screen` at 60% x strength (backdrop-filter: brightness, contrast, blur).
 *  - grain: SVG feTurbulence, new seed every design tick (deterministic from the frame), grey, `overlay` blend at 2% x strength.
 *  - vignette: radial, transparent to 58% of the way to the corner, then up to 50% black x strength. The safe box is untouched.
 *  - split: on the tick of the `name-reveal` cue of every card (`revealBeats(card).name`), for one design tick, the red and
 *    blue channels of the picture behind are shifted 2 reference units apart (backdrop-filter: url(#svg filter)).
 * Nothing is rendered or checked yet: the bloom and the split depend on Chromium's backdrop-filter and blend modes.
 */

const GRAIN_MAX = 0.02;
const VIGNETTE_MAX = 0.5;
const BLOOM_MAX = 0.6;
/** Bloom threshold: brightness x contrast keep roughly v > 0.69 (out = 2.16 v - 1.5). */
const BLOOM_BRIGHTNESS = 0.54;
const BLOOM_CONTRAST = 4;
const BLOOM_BLUR = 14; // reference units
const SPLIT_UNITS = 2; // reference units
const SPLIT_TICKS = 1; // the name-reveal tick only

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Render frames at which a name reveal starts (the tick of the `name-reveal` cue), one per card segment. */
export const nameRevealFrames: number[] = segments.flatMap((seg) =>
  seg.kind === 'card' ? [ticksToFrames(seg.phases.beat.from + revealBeats(seg.card).name)] : [],
);

const outro = segments.find((s) => s.kind === 'outro');
/** First render frame of the end-screen slot. The layer is fully off from here. */
export const finishOffFrame: number = outro && outro.kind === 'outro' ? ticksToFrames(outro.endScreenFrom) : Number.POSITIVE_INFINITY;
const rampFrames = Math.round(SPRINGS.slow * RENDER_FPS);
const splitFrames = ticksToFrames(SPLIT_TICKS);

/** Strength at a render frame: `strength`, ramped to 0 over `rampFrames` ending at the end screen. */
export const finishStrengthAt = (frame: number, strength: number): number =>
  clamp01(strength) * clamp01((finishOffFrame - frame) / rampFrames);

export const inSplit = (frame: number): boolean => nameRevealFrames.some((f) => frame >= f && frame < f + splitFrames);

const fill: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };

export const FinishLayer: React.FC<{ strength?: number }> = ({ strength = finishStrength }) => {
  const frame = useCurrentFrame();
  const s = finishStrengthAt(frame, strength);
  if (s <= 0) return null;

  const tick = Math.floor(frame / TIME_SCALE);
  const d = px(SPLIT_UNITS);

  return (
    <>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id="nfl-finish-grain" filterUnits="userSpaceOnUse" x={0} y={0} width={FRAME.w} height={FRAME.h} colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={0.8} numOctaves={1} seed={tick} stitchTiles="stitch" />
            {/* grey, opaque, stretched to the full range */}
            <feColorMatrix type="matrix" values="0.66 0.66 0.66 0 -0.5  0.66 0.66 0.66 0 -0.5  0.66 0.66 0.66 0 -0.5  0 0 0 0 1" />
          </filter>
          <filter id="nfl-finish-split" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={d} dy={0} result="ro" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={-d} dy={0} result="bo" />
            <feBlend in="ro" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="bo" mode="screen" />
          </filter>
        </defs>
      </svg>

      {/* bloom: bright pixels only */}
      <div
        style={{
          ...fill,
          backdropFilter: `brightness(${BLOOM_BRIGHTNESS}) contrast(${BLOOM_CONTRAST}) blur(${px(BLOOM_BLUR)}px)`,
          WebkitBackdropFilter: `brightness(${BLOOM_BRIGHTNESS}) contrast(${BLOOM_CONTRAST}) blur(${px(BLOOM_BLUR)}px)`,
          mixBlendMode: 'screen',
          opacity: BLOOM_MAX * s,
        }}
      />

      {/* vignette */}
      <div style={{ ...fill, background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,${(VIGNETTE_MAX * s).toFixed(3)}) 100%)` }} />

      {/* grain */}
      <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} preserveAspectRatio="none" style={{ ...fill, width: '100%', height: '100%', mixBlendMode: 'overlay', opacity: GRAIN_MAX * s }}>
        <rect x={0} y={0} width={FRAME.w} height={FRAME.h} filter="url(#nfl-finish-grain)" />
      </svg>

      {/* chromatic split, name-reveal tick only */}
      {inSplit(frame) && <div style={{ ...fill, backdropFilter: 'url(#nfl-finish-split)', WebkitBackdropFilter: 'url(#nfl-finish-split)' }} />}
    </>
  );
};
