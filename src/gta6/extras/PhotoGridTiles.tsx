/**
 * PhotoGridTiles: a Photos-app grid of placeholder tiles. No pictures: each tile is a deterministic gradient from its `seed`.
 * Tiles spring in `stagger` ticks apart, row by row. Optional `label` is drawn bottom-left (supplied by the scene).
 */
import React from 'react';
import { colors, radius, springAt, textStyle, u } from '../system';
import { hash01 } from './util';

export type PhotoTile = { seed: string | number; label?: string };

export type PhotoGridTilesProps = {
  tiles: readonly PhotoTile[];
  frame: number;
  at: number;
  cols?: number;
  /** Tile side, reference units. */
  tile?: number;
  gap?: number;
  /** Ticks between tiles entering. */
  stagger?: number;
};

export const PhotoGridTiles: React.FC<PhotoGridTilesProps> = ({ tiles, frame, at, cols = 3, tile = 240, gap = 16, stagger = 3 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${u(tile)}px)`, gap: u(gap) }}>
    {tiles.map((t, i) => {
      const p = springAt(frame, at + i * stagger, 'snappy');
      const h1 = Math.round(hash01(t.seed, 1) * 360);
      const h2 = (h1 + 30 + Math.round(hash01(t.seed, 2) * 60)) % 360;
      return (
        <div
          key={i}
          style={{
            width: u(tile), height: u(tile), borderRadius: u(radius.sm), position: 'relative', overflow: 'hidden',
            background: `linear-gradient(${Math.round(hash01(t.seed, 3) * 360)}deg, hsl(${h1} 40% 34%), hsl(${h2} 45% 48%))`,
            border: `${u(1.5)}px solid ${colors.hairline}`,
            opacity: Math.min(1, p), transform: `scale(${0.85 + 0.15 * p})`,
          }}
        >
          {t.label ? <div style={{ position: 'absolute', left: u(16), bottom: u(12), ...textStyle('caption'), color: colors.ink }}>{t.label}</div> : null}
        </div>
      );
    })}
  </div>
);
