import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { bonuses } from '../data';
import { TIME_SCALE } from '../timing';
import { backgroundStyle } from '../system';
import { LightString, bulbCues } from './LightString';

/**
 * Dev preview of LightString (composition `Xmas-LightString`, 300 render frames at 60 fps). Not part of the video.
 * Render frames to check by eye:
 *   0    all unlit
 *   60   12 lit
 *   126  pulse on slot 13 (bulb lit 3 ticks ago, glow pop near its peak)
 *   186  gold bonus bulb pulse (the third bonus round, slot from data)
 *   250  all 50 glow (ripple running)
 */
export const LIGHT_PREVIEW = { lit: 12, pulseStart: 120, goldStart: 180, allStart: 240, frames: 300 } as const;

export const lightPreviewCues = () => [
  ...bulbCues(LIGHT_PREVIEW.lit + 1, LIGHT_PREVIEW.pulseStart / TIME_SCALE),
  ...bulbCues(bonuses[2].slot, LIGHT_PREVIEW.goldStart / TIME_SCALE),
];

export const LightStringPreview: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / TIME_SCALE; // design ticks
  const P = LIGHT_PREVIEW;
  const goldSlot = bonuses[2].slot;
  let props: React.ComponentProps<typeof LightString>;
  if (f >= P.allStart) props = { litUpTo: 50, mode: 'all', pulseFrame: t - P.allStart / TIME_SCALE, counter: 50 };
  else if (f >= P.goldStart) props = { litUpTo: goldSlot - 1, pulseSlot: goldSlot, pulseFrame: t - P.goldStart / TIME_SCALE, counter: goldSlot };
  else if (f >= P.pulseStart) props = { litUpTo: P.lit, pulseSlot: P.lit + 1, pulseFrame: t - P.pulseStart / TIME_SCALE, counter: P.lit + 1 };
  else if (f >= 60) props = { litUpTo: P.lit, counter: P.lit + 1 };
  else props = { litUpTo: 0, counter: 1 };
  return (
    <AbsoluteFill style={backgroundStyle()}>
      <LightString {...props} />
    </AbsoluteFill>
  );
};
