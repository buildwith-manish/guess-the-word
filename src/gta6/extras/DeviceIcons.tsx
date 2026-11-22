import React from 'react';
import { colors, springAt, textStyle, u } from '../system';

export type DeviceKind = 'ps5' | 'xboxX' | 'xboxS' | 'pc';
export type DeviceItem = {
  kind: DeviceKind;
  /** Label under the icon (the scene supplies it, e.g. from the item's options). */
  label: string;
  /** Not launched on: fades to grey at `greyAt`. */
  greyed?: boolean;
};

export type DeviceIconsProps = {
  devices: DeviceItem[];
  frame: number;
  /** Local frame the first card enters. */
  at: number;
  /** Local frame the greyed devices go grey (8-tick fade). Omit to keep all in colour. */
  greyAt?: number;
  stagger?: number;
  cardW?: number;
  cardH?: number;
  gap?: number;
};

const INK = '#E8EAF0';
const DARK = '#14171F';

/** Simple generic device silhouettes, 200x200. No logos, no brand marks: plain shapes only. */
export const DeviceGlyph: React.FC<{ kind: DeviceKind; size?: number }> = ({ kind, size = 220 }) => (
  <svg viewBox="0 0 200 200" style={{ width: u(size), height: u(size), display: 'block' }}>
    {kind === 'ps5' && (
      <g>
        <path d="M100 26 C74 26 52 48 50 100 C52 152 74 174 100 174 Z" fill={INK} />
        <path d="M100 26 C126 26 148 48 150 100 C148 152 126 174 100 174 Z" fill={INK} />
        <rect x={82} y={20} width={36} height={160} rx={16} fill={DARK} />
        <rect x={68} y={178} width={64} height={8} rx={4} fill="#8A90A0" />
      </g>
    )}
    {kind === 'xboxX' && (
      <g>
        <rect x={62} y={22} width={76} height={156} rx={8} fill="#1B1D22" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        <ellipse cx={100} cy={36} rx={28} ry={7} fill="#06070A" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={74} x2={126} y1={118 + i * 9} y2={118 + i * 9} stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
        ))}
        <rect x={72} y={180} width={56} height={7} rx={3} fill="#8A90A0" />
      </g>
    )}
    {kind === 'xboxS' && (
      <g>
        <rect x={54} y={52} width={92} height={118} rx={10} fill="#E6E8EE" />
        <circle cx={100} cy={92} r={27} fill="#12141A" />
        <circle cx={100} cy={92} r={19} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
        <circle cx={100} cy={92} r={10} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
        <rect x={72} y={140} width={56} height={5} rx={2.5} fill="#B4B9C6" />
      </g>
    )}
    {kind === 'pc' && (
      <g>
        <rect x={12} y={34} width={128} height={86} rx={8} fill="#1A1E28" stroke="#C8CCD8" strokeWidth={4} />
        <rect x={22} y={44} width={108} height={66} rx={3} fill="rgba(120,160,230,0.22)" />
        <rect x={68} y={120} width={16} height={24} fill="#C8CCD8" />
        <rect x={48} y={144} width={56} height={8} rx={4} fill="#C8CCD8" />
        <rect x={150} y={48} width={38} height={124} rx={6} fill="#2A2F3C" stroke="#C8CCD8" strokeWidth={3} />
        <rect x={158} y={60} width={22} height={50} rx={3} fill="rgba(120,180,255,0.30)" />
        <circle cx={169} cy={140} r={4} fill="#C8CCD8" />
      </g>
    )}
  </svg>
);

/**
 * A row of four device cards that stagger in; devices flagged `greyed` fade to grey at `greyAt`. Pure function of props.
 */
export const DeviceIcons: React.FC<DeviceIconsProps> = ({ devices, frame, at, greyAt, stagger = 5, cardW = 360, cardH = 380, gap = 32 }) => (
  <div style={{ display: 'flex', gap: u(gap) }}>
    {devices.map((d, i) => {
      const enter = frame < at + i * stagger ? 0 : springAt(frame, at + i * stagger, 'snappy');
      const g = d.greyed && greyAt !== undefined ? Math.max(0, Math.min(1, (frame - greyAt) / 8)) : 0;
      return (
        <div
          key={i}
          style={{
            boxSizing: 'border-box',
            width: u(cardW),
            height: u(cardH),
            borderRadius: u(34),
            background: `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
            border: `${u(1.5)}px solid ${colors.hairline}`,
            boxShadow: `0 ${u(14)}px ${u(36)}px ${colors.shadow}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: u(24),
            opacity: enter * (1 - 0.65 * g),
            filter: g > 0 ? `grayscale(${g})` : undefined,
            transform: `translateY(${(1 - enter) * u(30)}px) scale(${0.94 + 0.06 * enter - 0.03 * g})`,
            color: colors.ink,
          }}
        >
          <DeviceGlyph kind={d.kind} />
          <div style={{ ...textStyle('choice'), textAlign: 'center' }}>{d.label}</div>
        </div>
      );
    })}
  </div>
);
