import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, S } from './style';
import { breathe } from './anim';

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
}> = ({ frame, theme, pulse = 0, hideBars = false, dim = 0 }) => {
  const drift = ((frame / (12 * 30)) % 1) * 44;
  const gridOpacity = 0.5 + 0.14 * breathe(frame, 180);

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 80% at 50% 8%, ${theme[0]}, ${theme[1]})`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 2px, rgba(0,0,0,0) 2.5px)',
          backgroundSize: '44px 44px',
          backgroundPosition: `${drift}px ${drift}px`,
          maskImage: 'linear-gradient(rgba(0,0,0,0) 0%, #000 40%, #000 70%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage:
            'linear-gradient(rgba(0,0,0,0) 0%, #000 40%, #000 70%, rgba(0,0,0,0) 100%)',
          opacity: gridOpacity,
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
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 14%, rgba(0,0,0,0) 32%)',
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
      {hideBars ? null : (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: S.bar, background: '#000' }} />
          <div
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: S.bar, background: '#000' }}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
