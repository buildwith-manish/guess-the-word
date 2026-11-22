import React from 'react';
import type { Level } from '../data';
import { blurPx, colors, radius as R, springAt, u } from '../system';

export type FrostCardProps = {
  children?: React.ReactNode;
  /** Local design frame; with `at` it drives a rise-in. Omit `frame` for a static card. */
  frame?: number;
  /** Local start frame of the entrance. */
  at?: number;
  /** Tint the glass with the level colour. */
  level?: Level;
  /** Reference units (1920x1080). */
  width?: number;
  height?: number;
  padding?: number;
  radius?: number;
  style?: React.CSSProperties;
};

const tintOf = (level: Level | undefined, alpha: string): string | undefined =>
  level ? `${colors.level[level]}${alpha}` : undefined;

export const FrostCard: React.FC<FrostCardProps> = ({
  children, frame, at = 0, level, width, height, padding = 32, radius = R.lg, style,
}) => {
  const p = frame === undefined ? 1 : springAt(frame, at, 'gentle');
  const tint = tintOf(level, '26'); // ~15% alpha
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: width === undefined ? undefined : u(width),
        height: height === undefined ? undefined : u(height),
        padding: u(padding),
        borderRadius: u(radius),
        background: tint
          ? `linear-gradient(160deg, ${tint}, ${colors.glass})`
          : `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
        border: `${u(1.5)}px solid ${level ? `${colors.level[level]}55` : colors.hairline}`,
        backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${u(18)}px ${u(48)}px ${colors.shadow}`,
        opacity: p,
        transform: `translateY(${(1 - p) * u(28)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
