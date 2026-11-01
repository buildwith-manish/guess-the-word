import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from './Background';
import { Hud } from './Hud';
import { Watermark } from './Watermark';
import { prog, irisEase } from './anim';
import type { Segment } from './types';

type IrisSegment = Extract<Segment, { kind: 'iris' }>;

/**
 * The colour wipe between scenes (HTML iris()): the next theme grows from the
 * centre as a circle over the old one, with a whoosh (see sound.ts). Nothing
 * else is on screen except the HUD pill and the watermark, as in the HTML
 * where everything has already faded out before the wipe starts.
 */
export const Iris: React.FC<{ frame: number; seg: IrisSegment }> = ({ frame, seg }) => {
  const p = prog(frame, 0, seg.duration, irisEase);
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={seg.fromTheme} iris={{ theme: seg.toTheme, p }} />
      <Hud
        label={seg.hud.label}
        number={seg.hud.number}
        total={seg.hud.total}
        erases={seg.hud.erases}
        frame={999}
      />
      {seg.watermark ? <Watermark frame={999} /> : null}
    </AbsoluteFill>
  );
};
