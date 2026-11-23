/**
 * Part4.tsx: Level 4 card + rules sheet, rounds 28 to 36, Bonus 4 Opposite Day (task 4l).
 * Registered as "DontSay-P4".
 *
 * Order and lengths come from timing.ts `segments` (part 4). Nothing is hard-coded here:
 * rounds, bonus and level come from the segment objects.
 * Pattern: Part6.tsx (Part3.tsx does not exist on this branch yet).
 */
import React from 'react';
import { Sequence } from 'remotion';
import { WIDTH, HEIGHT, RENDER_FPS, partRanges, segments, ticksToFrames } from '../timing';
import { levelBackground } from '../system';
import { LevelCard } from '../scenes/LevelCard';
import { RoundScene } from '../scenes/RoundScene';
import { BonusOppositeDay } from '../scenes/BonusOppositeDay';

export const part4Range = partRanges[3];
export const part4Frames = part4Range.frames;
export { WIDTH as part4Width, HEIGHT as part4Height, RENDER_FPS as part4Fps };

/** The level of the part's level card (one levelCard segment). */
const levelSeg = () => {
  const s = segments.find((x) => x.part === 4 && x.kind === 'levelCard');
  if (!s || s.kind !== 'levelCard') throw new Error('part 4 has no levelCard segment');
  return s;
};

export type Part4Props = {
  /** Slide the rules sheet (SettingsCard) over the level card. Default true (task 4l). */
  sheet?: boolean;
};

export const Part4: React.FC<Part4Props> = ({ sheet = true }) => {
  const own = segments.filter((s) => s.part === 4);
  const level = levelSeg().level;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      {/* Wallpaper follows LEVEL, never hearts. */}
      <div style={{ position: 'absolute', inset: 0, background: levelBackground[level] }} />
      {own.map((s) => {
        const from = ticksToFrames(s.from - part4Range.from);
        const dur = ticksToFrames(s.to) - ticksToFrames(s.from);
        let node: React.ReactNode = null;
        let key = '';
        if (s.kind === 'levelCard') {
          key = `level-${s.level}`;
          node = <LevelCard level={s.level} sheet={sheet} />;
        } else if (s.kind === 'round') {
          key = `round-${s.round.n}`;
          node = <RoundScene round={s.round} />;
        } else if (s.kind === 'bonus') {
          key = `bonus-${s.bonus.n}`;
          node = <BonusOppositeDay />;
        }
        if (!node) return null;
        return (
          <Sequence key={key} from={from} durationInFrames={dur}>
            {node}
          </Sequence>
        );
      })}
    </div>
  );
};
