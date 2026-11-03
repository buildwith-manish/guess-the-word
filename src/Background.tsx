import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, px } from './style';
import { makeRandom } from './util';

const Scene: React.FC<{ frame: number; theme: [string, string] }> = ({ frame, theme }) => {
  const t = frame / 30;
  // two slow aurora blobs orbit the frame; purely frame-driven
  const ax = 22 + Math.sin(t * 0.35) * 8;
  const ay = 18 + Math.cos(t * 0.28) * 7;
  const bx = 80 + Math.cos(t * 0.3) * 8;
  const by = 82 + Math.sin(t * 0.4) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 120% 100% at 50% 0%, ${theme[1]} 0%, ${COLORS.base} 78%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${ax}% ${ay}%, ${theme[0]}66 0%, ${theme[0]}00 46%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${bx}% ${by}%, ${theme[0]}40 0%, ${theme[0]}00 44%)`,
        }}
      />
    </AbsoluteFill>
  );
};


type Layer = { n: number; size: [number, number]; speed: number; alpha: number; soft: number; seed: number };
// three depth planes: far = small & slow, near = big, soft & fast (bokeh). Sizes in 1280x720 stage px.
const LAYERS: Layer[] = [
  { n: 16, size: [3, 7], speed: 9, alpha: 0.5, soft: 0.55, seed: 11 },
  { n: 9, size: [9, 18], speed: 20, alpha: 0.32, soft: 0.4, seed: 23 },
  { n: 4, size: [30, 62], speed: 42, alpha: 0.2, soft: 0.12, seed: 37 },
];

const DEPTH_PARTICLES = LAYERS.map((L) => {
  const r = makeRandom(L.seed);
  return Array.from({ length: L.n }, (_, i) => ({
    x: r(),
    y: r(),
    size: L.size[0] + r() * (L.size[1] - L.size[0]),
    phase: r() * 6.283,
    sway: 10 + r() * 26,
    white: i % 2 === 0,
  }));
});

/**
 * Parallax dust / bokeh: three planes rise at different speeds, sway and twinkle. They live inside
 * the Background, so the camera push scales them less than the content (real depth). Particles
 * fade out near the top and bottom so the wrap-around never pops.
 */
const Depth: React.FC<{ frame: number; theme: [string, string]; opacity: number }> = ({ frame, theme, opacity }) => {
  const t = frame / 30;
  const H = 1080;
  const W = 1920;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      {LAYERS.map((L, li) =>
        DEPTH_PARTICLES[li].map((p, i) => {
          const size = px(p.size);
          const travel = H + size * 2;
          const yy = (((p.y * travel - L.speed * 1.5 * t) % travel) + travel) % travel;
          const edge = Math.sin(Math.PI * (yy / travel));
          const twinkle = 0.65 + 0.35 * Math.sin(t * 1.3 + p.phase);
          const xx = p.x * W + Math.sin(t * 0.4 + p.phase) * px(p.sway);
          const c = p.white ? '255,255,255' : '255,214,120';
          const core = Math.round(L.soft * 100);
          return (
            <div
              key={`${li}-${i}`}
              style={{
                position: 'absolute',
                left: xx - size / 2,
                top: yy - size,
                width: size,
                height: size,
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(${c},${L.alpha}) ${core}%, rgba(${c},0) 70%)`,
                opacity: edge * twinkle,
              }}
            />
          );
        }),
      )}
    </AbsoluteFill>
  );
};

/**
 * Full-bleed backdrop: deep gradient base -> drifting aurora -> fine grid
 * -> centre spotlight -> vignette. No letterbox bars.
 */
export const Background: React.FC<{
  frame: number;
  theme: [string, string];
  pulse?: number;
  hideBars?: boolean;
  dim?: number;
  /** colour wipe: a circle of `theme` growing from the centre over the base, p = 0..1 */
  iris?: { theme: [string, string]; p: number };
  /** 0..1 opacity of the parallax dust layers (0 = off) */
  depth?: number;
}> = ({ frame, theme, pulse = 0, dim = 0, iris, depth = 0 }) => {
  const drift = ((frame / (16 * 30)) % 1) * 60;
  return (
    <AbsoluteFill style={{ background: COLORS.base }}>
      <Scene frame={frame} theme={theme} />
      {iris && iris.p > 0 ? (
        <AbsoluteFill style={{ clipPath: `circle(${80 * iris.p}% at 50% 50%)` }}>
          <Scene frame={frame} theme={iris.theme} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, rgba(0,0,0,0) 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, rgba(0,0,0,0) 1px)',
          backgroundSize: '60px 60px',
          backgroundPosition: `${drift}px ${drift}px`,
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, #000 20%, rgba(0,0,0,0) 85%)',
          maskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, #000 20%, rgba(0,0,0,0) 85%)',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 46% 50% at 50% 40%, rgba(255,255,255,0.10), rgba(0,0,0,0) 72%)',
        }}
      />
      {depth > 0.001 ? <Depth frame={frame} theme={theme} opacity={depth} /> : null}
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)' }}
      />
      {pulse > 0.001 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, ${COLORS.red} 100%)`,
            opacity: pulse,
          }}
        />
      ) : null}
      {dim > 0.001 ? <AbsoluteFill style={{ background: '#000', opacity: dim }} /> : null}
    </AbsoluteFill>
  );
};

/** Letterbox bars were removed in the redesign; kept as a no-op so call sites compile. */
export const Bars: React.FC = () => null;
