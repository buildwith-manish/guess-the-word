import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from './style';

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
}> = ({ frame, theme, pulse = 0, dim = 0, iris }) => {
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
