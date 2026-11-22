import React from 'react';
import type { Level } from '../data';
import { colors, radius, textStyle, u } from '../system';
import { extraWindow } from './shared';

export type DateChipProps = {
  /** The date text exactly as it should read, e.g. cut from `item.reveal`. */
  text: string;
  frame: number;
  /** Local frame of the answer reveal: the chip springs in here. */
  at: number;
  dur?: number;
  level?: Level;
  /** Centre-x and top, reference units (1920x1080). */
  x: number;
  top: number;
};

/** Small date pill with a calendar glyph. Draws nothing outside [at, at + dur). */
export const DateChip: React.FC<DateChipProps> = ({ text, frame, at, dur, level, x, top }) => {
  const w = extraWindow(frame, at, dur);
  if (!w.visible) return null;
  const accent = level ? colors.level[level] : colors.ink;
  const g = 44;
  return (
    <div style={{ position: 'absolute', left: u(x), top: u(top), transform: 'translateX(-50%)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: u(18),
          height: u(88),
          padding: `0 ${u(36)}px 0 ${u(26)}px`,
          borderRadius: u(radius.xl),
          background: `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
          border: `${u(1.5)}px solid ${accent}66`,
          backdropFilter: `blur(${u(22)}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${u(22)}px) saturate(1.4)`,
          boxShadow: `0 ${u(14)}px ${u(36)}px ${colors.shadow}`,
          opacity: Math.min(1, w.p),
          transform: `scale(${0.85 + 0.15 * Math.min(1.05, w.pop)})`,
          whiteSpace: 'nowrap',
        }}
      >
        <svg width={u(g)} height={u(g)} viewBox="0 0 44 44" fill="none">
          <rect x="4" y="8" width="36" height="32" rx="8" stroke={accent} strokeWidth="3" />
          <path d="M4 18h36" stroke={accent} strokeWidth="3" />
          <path d="M14 3v8M30 3v8" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span style={{ ...textStyle('choice'), color: colors.ink }}>{text}</span>
      </div>
    </div>
  );
};
