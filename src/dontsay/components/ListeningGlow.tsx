/**
 * ListeningGlow: Siri-style multicolour glow (cool blue / violet / soft pink) around the main card,
 * plus a live waveform of 5-7 springy bars. Wakes at `wakeAt` ("Let's go"), stays through the timer,
 * dims to ~40% from `dimAt` (sealed slide and reveal), then fades to off by `offAt`.
 * Waveform phase is seeded from the round number: the same round renders identically every time.
 * All timings are local design ticks (30 fps) supplied by the scene from timing.ts; none are fixed here.
 * Sizes in 1280x720 reference units through px().
 */
import React from 'react';
import { interpolate } from 'remotion';
import { springAt } from '../system';
import { WIDTH, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

const BLUE = '#5AA9FF';
const VIOLET = '#9B6BFF';
const PINK = '#FF8FC8';
export const DIM_LEVEL = 0.4;

/** Deterministic 0..1 hash from integers (no Math.random, so renders are repeatable). */
const rand = (...ns: number[]): number => {
  let h = 2166136261;
  for (const n of ns) { h ^= n + 0x9e3779b9; h = Math.imul(h, 16777619); h ^= h >>> 13; }
  h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
};

export type GlowBox = { left: number; top: number; width: number; height: number; radius?: number };
/** Default card box: centre of the frame, inside the centre 80%. */
export const DEFAULT_CARD: GlowBox = { left: 200, top: 210, width: 880, height: 300, radius: 40 };

export type ListeningGlowProps = {
  /** Round number: seeds bar count and phases. */
  round: number;
  /** Tick the glow wakes ("Let's go"). */
  wakeAt: number;
  /** Tick it dims to ~40% (start of the sealed slide). */
  dimAt: number;
  /** Tick it is fully off (end of the reveal). */
  offAt: number;
  /** The main card's rect in reference units. */
  card?: GlowBox;
  frame?: number;
};

const BAR_PERIOD = 7; // ticks between new bar targets

const Wave: React.FC<{ round: number; frame: number; wakeAt: number; dimmed: boolean; box: GlowBox }> = ({ round, frame, wakeAt, dimmed, box }) => {
  const n = 5 + Math.floor(rand(round, 1) * 3); // 5..7 bars
  const barW = px(16), gap = px(14), maxH = px(80), minH = px(14);
  const width = n * barW + (n - 1) * gap;
  const local = Math.max(0, frame - wakeAt);
  return (
    <div style={{ position: 'absolute', left: px(box.left + box.width / 2) - width / 2, top: px(box.top + box.height + 30),
      height: maxH, width, display: 'flex', alignItems: 'center', gap }}>
      {Array.from({ length: n }, (_, i) => {
        const step = Math.floor((local + rand(round, 2, i) * BAR_PERIOD) / BAR_PERIOD);
        const startAt = step * BAR_PERIOD - rand(round, 2, i) * BAR_PERIOD;
        const prev = rand(round, 3, i, step - 1);
        const next = rand(round, 3, i, step);
        // springy move from previous target to next; 'bouncy' overshoots slightly
        const p = springAt(local, startAt, 'bouncy');
        const v = Math.max(0, prev + (next - prev) * p);
        const calm = dimmed ? 0.55 : 1;
        const h = minH + (maxH - minH) * Math.min(1, v) * calm;
        const grow = springAt(frame, wakeAt + i * 2, 'snappy');
        return (
          <div key={i} style={{ width: barW, height: h * Math.min(1, grow), borderRadius: barW,
            background: i % 3 === 0 ? BLUE : i % 3 === 1 ? VIOLET : PINK }} />
        );
      })}
    </div>
  );
};

export const ListeningGlow: React.FC<ListeningGlowProps> = ({ round, wakeAt, dimAt, offAt, card = DEFAULT_CARD, frame: frameProp }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  if (frame < wakeAt) return null;

  const wake = Math.min(1, springAt(frame, wakeAt, 'smooth'));
  const dim = interpolate(frame, [dimAt, dimAt + 8], [1, DIM_LEVEL], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const off = interpolate(frame, [offAt - 10, offAt], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const level = dim * off;
  if (level <= 0) return null;

  const spin = (frame - wakeAt) * 3 + rand(round, 9) * 360; // degrees, deterministic per round
  const grad = `conic-gradient(from ${spin}deg, ${BLUE}, ${VIOLET}, ${PINK}, ${VIOLET}, ${BLUE})`;
  const r = px(card.radius ?? 40);
  const out = px(14);
  const rect: React.CSSProperties = {
    position: 'absolute', left: px(card.left) - out, top: px(card.top) - out,
    width: px(card.width) + out * 2, height: px(card.height) + out * 2, borderRadius: r + out, pointerEvents: 'none',
  };
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: wake * level }}>
      <div style={{ ...rect, background: grad, filter: `blur(${px(34)}px)`, opacity: 0.75, transform: `scale(${0.96 + 0.04 * wake})` }} />
      <div style={{ ...rect, background: grad, padding: px(5), boxSizing: 'border-box',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)' }} />
      <Wave round={round} frame={frame} wakeAt={wakeAt} dimmed={dim < 1} box={card} />
    </div>
  );
};
