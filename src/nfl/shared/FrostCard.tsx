import React from 'react';
import type { Level } from '../data';
import { blurPx, colors, radius as R, springAt, px } from '../system';

export type FrostCardProps = {
  children?: React.ReactNode;
  /** Local design frame; with `at` it drives a rise-in. Omit `frame` for a static card. */
  frame?: number;
  /** Local start frame of the entrance. */
  at?: number;
  /** Tint the glass with the level colour. */
  level?: Level;
  /** 1280x720 reference units. */
  width?: number;
  height?: number;
  padding?: number;
  radius?: number;
  style?: React.CSSProperties;
};

const tintOf = (level: Level | undefined, alpha: string): string | undefined =>
  level ? `${colors.level[level]}${alpha}` : undefined;

/** Glass base surface (also the base for WalletCard in 2b). */
export const FrostCard: React.FC<FrostCardProps> = ({
  children, frame, at = 0, level, width, height, padding = 22, radius = R.lg, style,
}) => {
  const p = frame === undefined ? 1 : springAt(frame, at, 'gentle');
  const tint = tintOf(level, '26'); // ~15% alpha
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: width === undefined ? undefined : px(width),
        height: height === undefined ? undefined : px(height),
        padding: px(padding),
        borderRadius: px(radius),
        background: tint
          ? `linear-gradient(160deg, ${tint}, ${colors.glass})`
          : `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
        border: `${px(1)}px solid ${level ? `${colors.level[level]}55` : colors.hairline}`,
        backdropFilter: `blur(${px(blurPx)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${px(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${px(12)}px ${px(32)}px ${colors.shadow}`,
        opacity: p,
        transform: `translateY(${(1 - p) * px(19)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
