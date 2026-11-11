import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, px, K } from './style';
import { makeRandom } from './util';
import settings from '../settings.json';

type Mood = { speed: number; peak: number; vignette: number; ember: number; pulse: number };
const NEUTRAL: Mood = { speed: 1, peak: 1, vignette: 0, ember: 0, pulse: 0 };
const BG = settings.background;
const rgba = (hex: string, a: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const Scene: React.FC<{
  frame: number;
  theme: [string, string];
  /** undefined = full look (every scene except the question phase); 0 = calm, 1 = reveal */
  energy?: number;
  mood?: Mood;
}> = ({ frame, theme, energy, mood = NEUTRAL }) => {
  const t = (frame / 30) * mood.speed;
  // aurora brightness: calm behind the clues, up to the level's peak at the reveal
  const k = energy === undefined ? mood.peak : lerp(BG.calm, mood.peak, energy);
  // two slow aurora blobs orbit the frame; purely frame-driven
  const ax = 22 + Math.sin(t * 0.35) * 8;
  const ay = 18 + Math.cos(t * 0.28) * 7;
  const bx = 80 + Math.cos(t * 0.3) * 8;
  const by = 82 + Math.sin(t * 0.4) * 6;
  // hard levels: an ember glow breathes in the bottom corners (never behind the clues)
  const ember = mood.ember * (0.75 + 0.25 * (energy ?? 1)) * (1 + mood.pulse * Math.sin(t * 2.2));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 120% 100% at 50% 0%, ${theme[1]} 0%, ${COLORS.base} 78%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${ax}% ${ay}%, ${rgba(theme[0], 0.4 * k)} 0%, ${rgba(theme[0], 0)} 46%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${bx}% ${by}%, ${rgba(theme[0], 0.25 * k)} 0%, ${rgba(theme[0], 0)} 44%)`,
        }}
      />
      {ember > 0.001 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 38% 46% at 0% 100%, ${rgba(theme[0], ember)} 0%, ${rgba(theme[0], 0)} 100%), radial-gradient(ellipse 38% 46% at 100% 100%, ${rgba(theme[0], ember)} 0%, ${rgba(theme[0], 0)} 100%)`,
          }}
        />
      ) : null}
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
const Depth: React.FC<{ frame: number; theme: [string, string]; opacity: number; speed?: number }> = ({ frame, theme, opacity, speed = 1 }) => {
  const t = (frame / 30) * speed;
  const H = 1440;
  const W = 2560;
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
 * The incoming theme, revealed in the shape of the wipe:
 *   circle  - grows from the centre (easy)
 *   sweep   - a slanted edge travels left to right with a bright leading line (medium)
 *   curtain - opens from the centre line outwards with two bright edges (hard)
 */
const IrisLayer: React.FC<{
  frame: number;
  iris: { theme: [string, string]; p: number; variant?: 'circle' | 'sweep' | 'curtain'; energy?: number };
}> = ({ frame, iris }) => {
  const { p, variant = 'circle' } = iris;
  const glow = Math.sin(Math.PI * Math.min(1, p)); // edge lines fade in and out with the wipe
  if (variant === 'sweep') {
    const S = 12; // skew in % of the width
    const E = -S + p * (100 + 2 * S);
    const edge = (w: number) => `polygon(${E + S - w}% 0, ${E + S}% 0, ${E - S}% 100%, ${E - S - w}% 100%)`;
    return (
      <>
        <AbsoluteFill style={{ clipPath: `polygon(0 0, ${E + S}% 0, ${E - S}% 100%, 0 100%)` }}>
          <Scene frame={frame} theme={iris.theme} energy={iris.energy} />
        </AbsoluteFill>
        <AbsoluteFill style={{ clipPath: edge(1.6), background: 'rgba(255,255,255,0.85)', opacity: 0.8 * glow }} />
        <AbsoluteFill style={{ clipPath: edge(7), background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.28))', opacity: glow }} />
      </>
    );
  }
  if (variant === 'curtain') {
    const half = 50 * p; // % of the width on each side of the centre line
    const line = (x: number) => `inset(0 ${100 - x - 0.5}% 0 ${x - 0.5}%)`;
    return (
      <>
        <AbsoluteFill style={{ clipPath: `inset(0 ${50 - half}% 0 ${50 - half}%)` }}>
          <Scene frame={frame} theme={iris.theme} energy={iris.energy} />
        </AbsoluteFill>
        <AbsoluteFill style={{ clipPath: line(50 - half), background: 'rgba(255,255,255,0.9)', opacity: 0.85 * glow }} />
        <AbsoluteFill style={{ clipPath: line(50 + half), background: 'rgba(255,255,255,0.9)', opacity: 0.85 * glow }} />
      </>
    );
  }
  return (
    <AbsoluteFill style={{ clipPath: `circle(${80 * p}% at 50% 50%)` }}>
      <Scene frame={frame} theme={iris.theme} energy={iris.energy} />
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
  iris?: { theme: [string, string]; p: number; variant?: 'circle' | 'sweep' | 'curtain'; energy?: number };
  /** question phase: 0 = calm (low aurora, soft centre, sparse dust) .. 1 = reveal; omit for the full look */
  energy?: number;
  /** per-level mood (speed, reveal peak, vignette, ember glow) */
  mood?: Mood;
  /** 0..1 opacity of the parallax dust layers (0 = off) */
  depth?: number;
}> = ({ frame, theme, pulse = 0, dim = 0, iris, depth = 0, energy, mood = NEUTRAL }) => {
  const drift = ((frame / (16 * 30)) % 1) * 60 * K * mood.speed;
  // centre spotlight: soft while the clues are up (contrast), full at the reveal
  const spot = energy === undefined ? 1 : lerp(BG.spotlightCalm, 1, energy);
  const dust = energy === undefined ? 1 : lerp(BG.dustCalm, 1, energy);
  return (
    <AbsoluteFill style={{ background: COLORS.base }}>
      <Scene frame={frame} theme={theme} energy={energy} mood={mood} />
      {iris && iris.p > 0 ? <IrisLayer frame={frame} iris={iris} /> : null}
      <AbsoluteFill
        style={{
          backgroundImage:
            `linear-gradient(rgba(255,255,255,0.045) ${K}px, rgba(0,0,0,0) ${K}px), linear-gradient(90deg, rgba(255,255,255,0.045) ${K}px, rgba(0,0,0,0) ${K}px)`,
          backgroundSize: `${60 * K}px ${60 * K}px`,
          backgroundPosition: `${drift}px ${drift}px`,
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, #000 20%, rgba(0,0,0,0) 85%)',
          maskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, #000 20%, rgba(0,0,0,0) 85%)',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 46% 50% at 50% 40%, rgba(255,255,255,${(0.1 * spot).toFixed(3)}), rgba(0,0,0,0) 72%)`,
        }}
      />
      {depth > 0.001 ? <Depth frame={frame} theme={theme} opacity={depth * dust} speed={mood.speed} /> : null}
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,${(0.62 + mood.vignette).toFixed(3)}) 100%)` }}
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
