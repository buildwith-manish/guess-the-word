/**
 * StateAtmosphere (Step 6): depth, vignette and film grain for the States video only.
 * Mounted ONCE in StateMain above the scenes, and driven by the global composition frame (not a segment-local one), so the
 * atmosphere is the same on both sides of every cut and wipe: nothing restarts, nothing jumps.
 *
 * Layers (all pure functions of the frame, no CSS animation, no Math.random):
 *   1. parallax glow: two very soft white lights that drift by at most ATMOS.driftPx (ref px) with a seeded sine,
 *      on a long loop, so the drift is far below 10 px over any one question.
 *   2. fine grid: a faint hairline grid that drifts the other way (a second depth plane), masked towards the edges.
 *   3. vignette: a faint radial darkening.
 *   4. film grain: SVG feTurbulence noise tile, re-seeded every GRAIN.holdFrames render frames (2 = 30 re-seeds/s at 60 fps),
 *      which reads as fine grain and not as shimmer. It also breaks up gradient banding in the exported video.
 *
 * KNOBS: ATMOS (drift, glow, grid, vignette) and GRAIN (opacity, tile, seeds) below.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { px } from '../style';
import { makeRandom } from '../util';
import { TIME_SCALE } from '../timing';
import { whiteA, blackA } from './look';

export const ATMOS = {
  /** max parallax travel (ref px) of the glow; the grid moves by `gridShare` of it, the other way */
  driftPx: 8,
  gridShare: 0.5,
  /** loop length of the drift in seconds (long: the motion is felt, not seen) */
  loopSeconds: [47, 61] as const,
  /** white glow strength (alpha of the centre) and size (% of the frame) */
  glow: 0.045,
  glowSize: 58,
  /** hairline grid alpha and cell (ref px); 0 alpha turns it off */
  gridAlpha: 0.014,
  gridCell: 64,
  /** vignette: alpha at the corners (0 = off) */
  vignette: 0.32,
  vignetteStart: 56,
} as const;

export const GRAIN = {
  /** overlay opacity (2.5-5%): 0 turns it off. Round two: 0.04 -> 0.025 so text stays crisp (grain stays above the scenes) */
  opacity: 0.025,
  /** noise tile (px, square) and how many distinct seeds the cycle uses */
  tile: 256,
  seeds: 12,
  /** re-seed every N render frames (60 fps): 2 = 30 changes a second */
  holdFrames: 2,
  /** feTurbulence base frequency (higher = finer grain) */
  baseFrequency: 0.85,
} as const;

const MASK_ON = blackA(1);

// the seeded phases make the drift deterministic and different per axis
const PH = (() => {
  const r = makeRandom(606);
  return Array.from({ length: 4 }, () => r() * Math.PI * 2);
})();

// one data URI per seed, built once at module load (pure: same string every run)
const noiseUri = (seed: number): string => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${GRAIN.tile}' height='${GRAIN.tile}'>` +
    `<filter id='n' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${GRAIN.baseFrequency}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};
const NOISE = Array.from({ length: GRAIN.seeds }, (_, i) => noiseUri(i + 1));

export const StateAtmosphere: React.FC = () => {
  const renderFrame = useCurrentFrame();
  const t = renderFrame / TIME_SCALE / 30; // seconds
  const TAU = Math.PI * 2;
  const [l0, l1] = ATMOS.loopSeconds;
  const dx = ATMOS.driftPx * Math.sin((t / l0) * TAU + PH[0]);
  const dy = ATMOS.driftPx * Math.sin((t / l1) * TAU + PH[1]);
  const seed = Math.floor(renderFrame / GRAIN.holdFrames) % GRAIN.seeds;
  // the grain tile also shifts a little per seed so the pattern never repeats on screen
  const off = (seed * 97) % GRAIN.tile;
  const cell = px(ATMOS.gridCell);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {ATMOS.glow > 0 ? (
        <AbsoluteFill
          style={{
            transform: `translate(${px(dx).toFixed(2)}px, ${px(dy).toFixed(2)}px)`,
            background: `radial-gradient(ellipse ${ATMOS.glowSize}% ${ATMOS.glowSize}% at 50% 38%, ${whiteA(ATMOS.glow)}, ${whiteA(0)} 70%)`,
          }}
        />
      ) : null}
      {ATMOS.gridAlpha > 0 ? (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${whiteA(ATMOS.gridAlpha)} ${px(1)}px, ${blackA(0)} ${px(1)}px), linear-gradient(90deg, ${whiteA(ATMOS.gridAlpha)} ${px(1)}px, ${blackA(0)} ${px(1)}px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${(-px(dx) * ATMOS.gridShare).toFixed(2)}px ${(-px(dy) * ATMOS.gridShare).toFixed(2)}px`,
            WebkitMaskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, ${MASK_ON} 20%, ${blackA(0)} 85%)`,
            maskImage: `radial-gradient(ellipse 70% 65% at 50% 45%, ${MASK_ON} 20%, ${blackA(0)} 85%)`,
          }}
        />
      ) : null}
      {ATMOS.vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, ${blackA(0)} ${ATMOS.vignetteStart}%, ${blackA(ATMOS.vignette)} 100%)`,
          }}
        />
      ) : null}
      {GRAIN.opacity > 0 ? (
        <AbsoluteFill
          style={{
            backgroundImage: NOISE[seed],
            backgroundSize: `${px(GRAIN.tile)}px ${px(GRAIN.tile)}px`,
            backgroundPosition: `${off}px ${(off * 3) % GRAIN.tile}px`,
            opacity: GRAIN.opacity,
            mixBlendMode: 'overlay',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
