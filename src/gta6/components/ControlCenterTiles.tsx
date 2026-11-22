/**
 * ControlCenterTiles: a row of iOS Control Center style rule tiles that fade/spring in and fade out.
 * Tiles come from props, e.g. [{ value: 4, label: 'CHOICES' }, { value: 6, label: 'SECONDS' }, { label: 'KEEP SCORE' }];
 * the scene builds them from data.ts / timing.ts (this file contains no numbers or rule text).
 * A tile without `value` shows a ring-check glyph. All motion is a pure function of `frame`, `at`, `outAt`.
 */
import React from 'react';
import { blurPx, colors, radius, springAt, textStyle, u } from '../system';
import { fadeWindow } from './fade';

export type RuleTile = { value?: string | number; label: string };

export type ControlCenterTilesProps = {
  tiles: readonly RuleTile[];
  frame: number;
  /** Local start frame. */
  at: number;
  /** Local frame at which the tiles are fully faded out (omit to stay). */
  outAt?: number;
  /** Ticks between tiles. */
  stagger?: number;
  tileSize?: number;
};

const CheckGlyph: React.FC = () => (
  <svg width={u(76)} height={u(76)} viewBox="0 0 76 76">
    <circle cx="38" cy="38" r="31" fill="none" stroke={colors.easy} strokeWidth="7" />
    <path d="M24 39 L34 49 L53 27" fill="none" stroke={colors.easy} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ControlCenterTiles: React.FC<ControlCenterTilesProps> = ({
  tiles,
  frame,
  at,
  outAt,
  stagger = 4,
  tileSize = 250,
}) => (
  <div style={{ display: 'flex', gap: u(28), justifyContent: 'center' }}>
    {tiles.map((t, i) => {
      const start = at + i * stagger;
      const p = springAt(frame, start, 'snappy');
      const outStart = outAt === undefined ? undefined : outAt - i * 0; // same fade-out for all tiles
      return (
        <div
          key={i}
          style={{
            width: u(tileSize),
            height: u(tileSize),
            borderRadius: u(radius.xl),
            background: colors.glass,
            border: `${u(1.5)}px solid ${colors.hairline}`,
            backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
            boxShadow: `0 ${u(14)}px ${u(40)}px ${colors.shadow}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: u(14),
            opacity: fadeWindow(frame, start, outStart, 8, 10),
            transform: `translateY(${u(30) * (1 - p)}px) scale(${0.92 + 0.08 * p})`,
          }}
        >
          {t.value === undefined ? (
            <CheckGlyph />
          ) : (
            <div style={{ ...textStyle('number'), fontSize: u(96), lineHeight: 1, color: colors.ink }}>{t.value}</div>
          )}
          <div
            style={{
              ...textStyle('caption'),
              fontSize: u(30),
              fontWeight: 700,
              letterSpacing: u(2),
              color: colors.muted,
              textAlign: 'center',
            }}
          >
            {t.label}
          </div>
        </div>
      );
    })}
  </div>
);
