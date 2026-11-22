/**
 * StrokeIcon (round two, Step 10): the States video's UI icons as thin, rounded SF-Symbols-style strokes. Outline only, round
 * caps and joins, label colour, ICON.stroke (1.75) in a 24-unit box so it is about 1.75 px at the reference size. Replaces the
 * shared neon Icon for UI (the shared src/Icon.tsx is untouched). Static: a pure function of its props.
 */
import React from 'react';
import { COLOR, ICON } from '../look';

const PATHS = {
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0',
} as const;

export type StrokeIconName = keyof typeof PATHS;

export const StrokeIcon: React.FC<{ name: StrokeIconName; size: number; color?: string }> = ({ name, size, color = COLOR.text.label }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
    <path d={PATHS[name]} fill="none" stroke={color} strokeWidth={ICON.stroke} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
