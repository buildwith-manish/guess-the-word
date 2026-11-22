import React from 'react';
import { ROADS, TOWNS } from '../scenes/looks/mapsArt';
import { u } from '../system';

export type PlainMapProps = { width: number; height: number; radius?: number; children?: React.ReactNode; style?: React.CSSProperties };

/**
 * A plain, flat street-style map backdrop: dark ground, a faint grid, the invented roads and unnamed town dots from
 * mapsArt.ts, a few park blocks and a river. Invented art, no real places. A box of `width` x `height` (1920x1080 units);
 * children are positioned inside it.
 */
export const PlainMap: React.FC<PlainMapProps> = ({ width, height, radius = 34, children, style }) => (
  <div
    style={{
      position: 'relative',
      width: u(width),
      height: u(height),
      borderRadius: u(radius),
      overflow: 'hidden',
      background: '#0D1520',
      border: `${u(1.5)}px solid rgba(255,255,255,0.16)`,
      boxSizing: 'border-box',
      ...style,
    }}
  >
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {Array.from({ length: 21 }, (_, i) => (
        <line key={`v${i}`} x1={i * 96} y1={0} x2={i * 96} y2={1080} stroke="rgba(255,255,255,0.04)" strokeWidth={2} />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 96} x2={1920} y2={i * 96} stroke="rgba(255,255,255,0.04)" strokeWidth={2} />
      ))}
      <rect x={300} y={620} width={260} height={150} rx={26} fill="rgba(60,140,90,0.14)" />
      <rect x={1350} y={180} width={300} height={170} rx={26} fill="rgba(60,140,90,0.14)" />
      <path d="M -20 820 C 300 700, 600 900, 960 780 S 1600 700, 1960 800" fill="none" stroke="rgba(80,150,220,0.28)" strokeWidth={34} strokeLinecap="round" />
      <g transform="translate(260 60) scale(1.15)">
        {ROADS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth={5} strokeLinecap="round" />
        ))}
        {TOWNS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={6} fill="rgba(255,255,255,0.3)" />
        ))}
      </g>
    </svg>
    {children}
  </div>
);
