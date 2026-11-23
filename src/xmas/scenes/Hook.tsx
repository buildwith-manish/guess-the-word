import React from 'react';
import { AbsoluteFill } from 'remotion';
import { GlassTile } from '../components/GlassTile';
import { LightString } from '../components/LightString';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { FPS } from '../shared/clock';
import { BOKEH, LAYOUT, backgroundStyle, bokehStyle, frameBorderStyle, px, useXmasFonts, useXmasFrame } from '../system';
import { easeOut } from '../../ios/motion';
import { hookSec, secToTicks, ticksToFrames } from '../timing';
import { TOTAL_SLOTS } from '../ui';

/**
 * Hook: the first 6 s (timing.ts hookSec). No text of any kind: no title card, no rules, no like or subscribe ask.
 * The only voice is the hook line (type `hook` in docs/xmas/lines.csv, id xmas_001), which Audio.tsx places at tick 0 of
 * this scene; this scene draws nothing from it. Frame numbers are design ticks (30 per second), scene-local.
 *
 *   0 to 24     the dark frame fades up from black
 *   24 to 54    the light string glows on: the bulbs light in a quick sweep from left to right
 *   54 to 110   a soft glow ripple travels along the fully lit string
 *   110 to 150  the lit string settles back to the dim, unlit state (slot 1 starts with nothing lit)
 *   96 and 100  the two empty glass tiles spring in (green light zone left, red right)
 *   150 to 180  hold: the picture is exactly the opening state of slot 1 (see HANDOFF)
 */
export const HOOK = {
  fadeUp: { from: 0, to: 24 },
  sweep: { from: 24, to: 54 },
  ripple: { from: 54 },
  settle: { from: 110, to: 150 },
  tilesIn: { left: 96, right: 100 },
} as const;

/**
 * HANDOFF: what the last frame of the Hook shows, and so what slot 1 must show at its first tick, for no visible jump:
 * MovieBackdrop, an unlit LightString, two empty tiles at their layout positions, nothing else. Bokeh time is
 * (local tick - hook length) / 30, so it is exactly 0 at the hand-off: MovieScene must sample bokeh at its own tick / 30.
 * What a movie frame adds on top (the clue images, the caption, the counter, the timer) comes in during slot 1's own intro.
 */
export const hookTicks = secToTicks(hookSec);

/** The movie frame's fixed background: dark gradient, soft red and green bokeh, rounded gradient border. `seconds` drives the slow bokeh drift. */
export const MovieBackdrop: React.FC<{ seconds: number }> = ({ seconds }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, ...backgroundStyle() }} />
    {BOKEH.map((d, i) => (
      <div key={i} style={bokehStyle(d, seconds)} />
    ))}
    <div style={frameBorderStyle()} />
  </>
);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Sounds of the hook at absolute design tick `start`: two soft bulb pops on the sweep and the tiles coming in. Sorted. */
export const hookCues = (start: number): SfxCue[] =>
  [
    cue('bulb-on', start + HOOK.sweep.from),
    cue('bulb-on', start + HOOK.sweep.from + 15, { rate: 1.12 }),
    cue('tiles-in', start + HOOK.tilesIn.left),
  ].sort((a, b) => a.frame - b.frame);

/** The hook line starts with the scene. (Audio.tsx reads the clip from the audio map; no id or text is written here.) */
export const HOOK_VOICE_TICK = 0;

export const Hook: React.FC = () => {
  useXmasFonts();
  const t = useXmasFrame();

  const black = 1 - easeOut((t - HOOK.fadeUp.from) / (HOOK.fadeUp.to - HOOK.fadeUp.from));
  const sweepK = clamp01((t - HOOK.sweep.from) / (HOOK.sweep.to - HOOK.sweep.from));
  // ease in-out so the sweep starts and ends softly
  const sweepEased = sweepK * sweepK * (3 - 2 * sweepK);
  const settleK = clamp01((t - HOOK.settle.from) / (HOOK.settle.to - HOOK.settle.from));
  const litOpacity = 1 - settleK * settleK * (3 - 2 * settleK);
  const sweeping = t < HOOK.ripple.from;
  const litUpTo = Math.floor(sweepEased * TOTAL_SLOTS + 0.001);
  const lit = t >= HOOK.sweep.from && litOpacity > 0;

  return (
    <AbsoluteFill>
      <MovieBackdrop seconds={(t - hookTicks) / FPS} />

      {/* the dim, unlit string is always there: it is what the lit one settles back into */}
      <LightString litUpTo={0} />
      {lit ? (
        <div style={{ position: 'absolute', inset: 0, opacity: litOpacity }}>
          {sweeping ? <LightString litUpTo={litUpTo} /> : <LightString litUpTo={0} mode="all" pulseFrame={t - HOOK.ripple.from} />}
        </div>
      ) : null}

      {/* two empty glass tiles at the movie layout positions */}
      {([['left', LAYOUT.tile.left, HOOK.tilesIn.left], ['right', LAYOUT.tile.right, HOOK.tilesIn.right]] as const).map(([side, r, at]) => (
        <div key={side} style={{ position: 'absolute', left: px(r.x), top: px(r.y) }}>
          <GlassTile side={side} enterFrame={at} />
        </div>
      ))}

      {/* fade up from black: on top of everything, gone by tick 24 */}
      {black > 0.001 ? <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: black }} /> : null}
    </AbsoluteFill>
  );
};

export const hookFrames = (): number => ticksToFrames(hookTicks);
export default Hook;
