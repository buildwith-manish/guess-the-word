import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from './Background';
import { Hud } from './Hud';
import { Watermark } from './Watermark';
import { TitleLockup } from './TitleLockup';
import { prog, irisEase } from './anim';
import { BONUS_THEME } from './timing';
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
  // question backdrops are calm; only the orange bonus backdrop is already at full energy
  const isBonus = (t: [string, string]) => t.join() === BONUS_THEME.join();
  const fromEnergy = isBonus(seg.fromTheme) ? undefined : 0;
  const toEnergy = isBonus(seg.toTheme) ? undefined : 0;
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={seg.fromTheme} energy={fromEnergy} iris={{ theme: seg.toTheme, p, variant: seg.variant, energy: toEnergy }} />
      {seg.title ? <TitleLockup frame={frame} animate={false} /> : null}
      <Hud
        label={seg.hud.label}
        number={seg.hud.number}
        total={seg.hud.total}
        erases={seg.hud.erases}
        frame={999}
      />
      {seg.watermark ? <Watermark /> : null}
    </AbsoluteFill>
  );
};
