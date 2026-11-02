import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from './style';

/**
 * The stacked full-bleed layers of the reference stage:
 * radial base -> drifting dot grid -> spotlight -> vignette -> red pulse
 * -> 40px letterbox bars. Purely frame-driven, so seams never flicker.
 */
export const Background: React.FC<{
  frame: number;
  theme: [string, string];
  pulse?: number;
  hideBars?: boolean;
  dim?: number;
  /** colour wipe: a circle of `theme` growing from the centre over the base (HTML #iris), p = 0..1 */
  iris?: { theme: [string, string]; p: number };
}> = ({ frame, theme, pulse = 0, hideBars = false, dim = 0, iris }) => {
  const drift = ((frame / (12 * 30)) % 1) * 44;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 80% at 50% 8%, ${theme[0]}, ${theme[1]})`,
        }}
      />
      {iris && iris.p > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 90% 80% at 50% 8%, ${iris.theme[0]}, ${iris.theme[1]})`,
            // circle(80%) is the CSS reference radius the HTML used; it clears every corner
            clipPath: `circle(${80 * iris.p}% at 50% 50%)`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 2px, rgba(0,0,0,0) 2.5px)',
          backgroundSize: '44px 44px',
          backgroundPosition: `${drift}px ${drift}px`,
          maskImage: 'linear-gradient(rgba(0,0,0,0) 0%, #000 40%, #000 70%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage:
            'linear-gradient(rgba(0,0,0,0) 0%, #000 40%, #000 70%, rgba(0,0,0,0) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 44% 50% at 50% 36%, rgba(255,255,255,0.23), rgba(0,0,0,0) 70%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.733) 100%)',
        }}
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

/** Letterbox bars stay removed in the redesign; kept as a no-op so call sites compile. */
export const Bars: React.FC = () => null;
