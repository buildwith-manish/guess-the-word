import React from 'react';
import { ISLANDS, LAKE, LAND_PATH } from '../scenes/looks/mapsArt';
import { seeded } from '../components/Shake';
import { colors, u } from '../system';

/** Invented wetland patch in mapsArt coordinates, south of the lake. */
const MARSH_PATH = 'M 1030 800 C 1080 760, 1190 790, 1200 850 C 1205 900, 1150 940, 1110 930 C 1060 925, 1020 880, 1030 800 Z';
const CHANNELS = [
  'M 1045 850 C 1090 830, 1120 885, 1165 862',
  'M 1060 895 C 1100 880, 1130 915, 1170 900',
  'M 1090 800 C 1100 840, 1090 880, 1120 925',
  'M 1150 815 C 1150 850, 1175 870, 1185 900',
];
const CENTER = { x: 1112, y: 852 };

/** Sawgrass tufts: deterministic positions inside an ellipse over the marsh. */
const TUFTS: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (let i = 0; i < 400 && out.length < 70; i++) {
    const a = seeded(i * 2 + 11) * Math.PI * 2;
    const r = Math.sqrt(seeded(i * 2 + 12));
    const x = CENTER.x + Math.cos(a) * r * 92;
    const y = CENTER.y + Math.sin(a) * r * 70;
    out.push([x, y]);
  }
  return out;
})();

export type MapCropProps = {
  frame: number;
  /** Local frame the slow zoom starts. */
  at: number;
  /** Frames of the slow pull-back (zoomFrom to 1); frozen after. */
  dur: number;
  variant?: 'wetland';
  /** Local frame an amber dashed outline appears around the wetland (for the reveal). Omit for none. */
  highlightAt?: number;
  zoomFrom?: number;
  width?: number;
  height?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Crop of the invented map on the southern peninsula, wetland variant: marsh patch, channels, sawgrass tufts, a lake and
 * keys. Slowly pulls back from `zoomFrom` to 1 over `dur`. Invented art.
 */
export const MapCrop: React.FC<MapCropProps> = ({ frame, at, dur, highlightAt, zoomFrom = 1.7, width = 1100, height = 620 }) => {
  const p = clamp01((frame - at) / Math.max(1, dur));
  const z = 1 + (zoomFrom - 1) * (1 - (1 - (1 - p) * (1 - p))) ; // 1 - ease-out progress
  const vw = 640 * z;
  const vh = (vw * height) / width;
  const vx = CENTER.x - vw / 2;
  const vy = CENTER.y - vh / 2;
  const hl = highlightAt === undefined ? 0 : clamp01((frame - highlightAt) / 8);
  const pulse = hl > 0 ? 0.75 + 0.25 * Math.sin(((frame - (highlightAt ?? 0)) / 30) * Math.PI * 2 * 1.5) : 0;
  return (
    <div
      style={{
        position: 'relative',
        width: u(width),
        height: u(height),
        borderRadius: u(34),
        overflow: 'hidden',
        border: `${u(1.5)}px solid ${colors.hairline}`,
        boxSizing: 'border-box',
        background: '#0A1522',
      }}
    >
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d={LAND_PATH} fill="#172233" stroke={`${colors.medium}99`} strokeWidth={3 * z} />
        {ISLANDS.map((e, i) => (
          <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} fill="#172233" stroke={`${colors.medium}66`} strokeWidth={2 * z} />
        ))}
        <ellipse cx={LAKE.cx} cy={LAKE.cy} rx={LAKE.rx} ry={LAKE.ry} transform={`rotate(${LAKE.rot} ${LAKE.cx} ${LAKE.cy})`} fill="#0A1522" stroke="rgba(120,190,230,0.4)" strokeWidth={2 * z} />
        <clipPath id="marsh-clip"><path d={MARSH_PATH} /></clipPath>
        <path d={MARSH_PATH} fill="rgba(63,174,140,0.22)" stroke="rgba(63,174,140,0.5)" strokeWidth={2 * z} />
        <g clipPath="url(#marsh-clip)">
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} d={`M 1000 ${770 + i * 12} q 28 -8 56 0 t 56 0 t 56 0 t 56 0`} fill="none" stroke="rgba(63,174,140,0.18)" strokeWidth={1.6 * z} />
          ))}
        </g>
        {CHANNELS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(120,190,230,0.55)" strokeWidth={3 * z} strokeLinecap="round" />
        ))}
        {TUFTS.map(([x, y], i) => (
          <path key={i} d={`M ${x} ${y} l -3 -9 M ${x} ${y} l 0 -11 M ${x} ${y} l 3 -9`} stroke="rgba(110,210,170,0.7)" strokeWidth={1.6 * z} strokeLinecap="round" fill="none" />
        ))}
        <path d={MARSH_PATH} fill="none" stroke={colors.medium} strokeWidth={5 * z} strokeDasharray={`${18 * z} ${12 * z}`} opacity={hl * pulse} />
      </svg>
    </div>
  );
};
