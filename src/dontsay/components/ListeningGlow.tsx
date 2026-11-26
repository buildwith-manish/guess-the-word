/**
 * ListeningGlow: a live waveform of 5-7 springy bars, in the level's one accent colour
 * (lighter/darker tints of the same hue, no other hues). Wakes at `wakeAt` ("Let's go"),
 * stays through the timer, dims to ~40% from `dimAt` (sealed slide and reveal), then fades
 * to off by `offAt`. This is the ONLY on-screen sign of the listening state: there is no
 * glow ring or halo around the card here any more (the card carries its own thin accent
 * edge + soft glow, drawn by the scene).
 * Waveform phase is seeded from the round number: the same round renders identically every time.
 * All timings are local design ticks (30 fps) supplied by the scene from timing.ts; none are fixed here.
 * Sizes in 1280x720 reference units through px(). Position: layout.waveform (src/dontsay/layout.ts).
 */
import React from 'react';
import { interpolate } from 'remotion';
import { springAt } from '../system';
import { WIDTH, useDontSayFrame } from '../timing';
import { GLOW_BAR_GAP, GLOW_BAR_MIN_H, GLOW_BAR_W, GLOW_MAX_H, GLOW_TOP, glowBarCount, glowRand as rand, layout } from '../layout';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Hex -> [r,g,b]. */
const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
/** Lighten (amt > 0, toward white) or darken (amt < 0, toward black) one hex colour, same hue. */
const tint = (c: string, amt: number): string => {
  const [r, g, b] = hex(c);
  const mix = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};

export const DIM_LEVEL = 0.4;

export type GlowBox = { left: number; top: number; width: number; height: number; radius?: number };

export type ListeningGlowProps = {
  /** Round number: seeds bar count and phases. */
  round: number;
  /** The level's one accent colour (levelColors[level].accent, data.ts). Only colour used here.
   * Optional only so callers that do not yet pass it (outside the round screen) keep compiling;
   * every round-screen call passes it explicitly. */
  accent?: string;
  /** Tick the glow wakes ("Let's go"). */
  wakeAt: number;
  /** Tick it dims to ~40% (start of the sealed slide). */
  dimAt: number;
  /** Tick it is fully off (end of the reveal). */
  offAt: number;
  /** Legacy override (Hook): position the waveform 30 units under this card rect. Omit it on the round screen:
   * the waveform then sits in layout.waveform. */
  card?: GlowBox;
  frame?: number;
};

const BAR_PERIOD = 7; // ticks between new bar targets

const Wave: React.FC<{ round: number; frame: number; wakeAt: number; dimmed: boolean; box?: GlowBox; accent: string }> = ({ round, frame, wakeAt, dimmed, box, accent }) => {
  const bright = tint(accent, 0.35);
  const dark = tint(accent, -0.3);
  const n = glowBarCount(round); // 5..7 bars
  const barW = px(GLOW_BAR_W), gap = px(GLOW_BAR_GAP), maxH = px(box ? 80 : GLOW_MAX_H), minH = px(GLOW_BAR_MIN_H);
  const width = n * barW + (n - 1) * gap;
  const local = Math.max(0, frame - wakeAt);
  return (
    <div style={{ position: 'absolute', left: px(box ? box.left + box.width / 2 : (layout.waveform.left + layout.waveform.right) / 2) - width / 2,
      top: px(box ? box.top + box.height + 30 : GLOW_TOP),
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
            background: i % 3 === 0 ? accent : i % 3 === 1 ? bright : dark }} />
        );
      })}
    </div>
  );
};

/** Fallback accent (Level 1 blue) for the rare caller that has not been updated to pass one. */
const DEFAULT_ACCENT = '#4DA3FF';

export const ListeningGlow: React.FC<ListeningGlowProps> = ({ round, accent = DEFAULT_ACCENT, wakeAt, dimAt, offAt, card, frame: frameProp }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  if (frame < wakeAt) return null;

  const wake = Math.min(1, springAt(frame, wakeAt, 'smooth'));
  const dim = interpolate(frame, [dimAt, dimAt + 8], [1, DIM_LEVEL], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const off = interpolate(frame, [offAt - 10, offAt], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const level = dim * off;
  if (level <= 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: wake * level }}>
      <Wave round={round} frame={frame} wakeAt={wakeAt} dimmed={dim < 1} box={card} accent={accent} />
    </div>
  );
};
