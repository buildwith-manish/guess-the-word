/**
 * Silhouette: an animal silhouette tile built from simple SVG shapes (ellipses, rects, polygons). No art assets, no text.
 * Only the animals in `SILHOUETTES` exist; add a drawer there to add an animal. Currently: alligator (Q20, Grassrivers).
 */
import React from 'react';
import type { Level } from '../data';
import { blurPx, colors, radius, springAt, u } from '../system';

const ink = colors.ink;

/** Each drawer paints into a 200 x 120 viewBox. */
export const SILHOUETTES = {
  alligator: (
    <g fill={ink}>
      <rect x="40" y="50" width="104" height="34" rx="17" />
      <polygon points="42,58 4,90 8,96 46,80" />
      <rect x="132" y="56" width="62" height="22" rx="10" />
      <circle cx="146" cy="52" r="8" />
      <rect x="56" y="78" width="14" height="22" rx="6" />
      <rect x="82" y="78" width="14" height="22" rx="6" />
      <rect x="108" y="78" width="14" height="22" rx="6" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <polygon key={k} points={`${54 + k * 15},50 ${61 + k * 15},38 ${68 + k * 15},50`} />
      ))}
    </g>
  ),
} as const;

export type SilhouetteAnimal = keyof typeof SILHOUETTES;

export type SilhouetteProps = {
  animal: SilhouetteAnimal;
  /** With `frame` the tile springs in from `at`; without, it is static. */
  frame?: number;
  at?: number;
  level?: Level;
  /** Tile side, reference units. */
  size?: number;
};

export const Silhouette: React.FC<SilhouetteProps> = ({ animal, frame, at = 0, level, size = 360 }) => {
  const p = frame === undefined ? 1 : springAt(frame, at, 'snappy');
  if (p <= 0) return null;
  return (
    <div
      style={{
        width: u(size), height: u(size), borderRadius: u(radius.lg), display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: level ? `${colors.level[level]}26` : colors.glass, border: `${u(1.5)}px solid ${colors.hairline}`,
        backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`, opacity: Math.min(1, p), transform: `scale(${0.9 + 0.1 * p})`,
      }}
    >
      <svg viewBox="0 0 200 120" width={u(size * 0.8)} height={u(size * 0.48)}>{SILHOUETTES[animal]}</svg>
    </div>
  );
};
