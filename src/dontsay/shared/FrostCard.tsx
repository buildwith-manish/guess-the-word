/**
 * FrostCard.tsx — frosted-glass card with a spring rise-in.
 * Adapted from src/gta6/components/FrostCard.tsx.
 *
 * Changes: imports from ../system (dontsay), Level is 1-5, uses glassSurface()
 * which encodes the docx glass spec (blur 40px, saturate 180%, bright top rim,
 * 0.5px border, two soft shadows).
 */
import React from 'react';
import type { Level } from '../data';
import { colours, glassSurface, radius as R, springAt, u } from '../system';

export type FrostCardProps = {
  children?: React.ReactNode;
  /** Local design frame; with `at` it drives a rise-in. Omit for a static card. */
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
  /** Override the spring preset (default gentle). */
  preset?: 'gentle' | 'snappy' | 'smooth' | 'pop' | 'bouncy';
  style?: React.CSSProperties;
};

const tintOf = (level: Level | undefined, alpha: string): string | undefined =>
  level ? `${colours.level[level]}${alpha}` : undefined;

export const FrostCard: React.FC<FrostCardProps> = ({
  children, frame, at = 0, level, width, height, padding = 32, radius = R.lg, preset = 'gentle', style,
}) => {
  const p = frame === undefined ? 1 : springAt(frame, at, preset);
  const tint = tintOf(level, '26');
  return (
    <div
      style={{
        ...glassSurface(radius, { tint, shadow: 1 }),
        width: width === undefined ? undefined : u(width),
        height: height === undefined ? undefined : u(height),
        padding: u(padding),
        opacity: p,
        transform: `translateY(${(1 - p) * u(28)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
