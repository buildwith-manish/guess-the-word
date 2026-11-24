/**
 * Part2.tsx: Level 2 card + rules sheet, the level's rounds, then the bonus after the last one (task 4j).
 * Registered as "DontSay-P2".
 *
 * Order and lengths come from timing.ts `segments` (part 2); nothing about rounds, rules, points or
 * durations is written here. Level card: the L2 card slides SettingsCard over itself (LevelCard `sheet`),
 * which carries "Break a rule and it counts as a match." Rounds with `heavy` show the RULE BREAK = MATCH
 * chip through ExclusionChips inside RoundScene. The bonus is BonusTripleLock.
 */
import React from 'react';
import { Sequence } from 'remotion';
import { WIDTH, HEIGHT, RENDER_FPS, partRanges, segments, ticksToFrames } from '../timing';
import { levelBackground } from '../system';
import { VoiceLayer } from '../components/VoiceLayer';
import { LevelCard } from '../scenes/LevelCard';
import { RoundScene } from '../scenes/RoundScene';
import { BonusTripleLock } from '../scenes/BonusTripleLock';

export const part2Range = partRanges[1];
export const part2Frames = part2Range.frames;
export { WIDTH as part2Width, HEIGHT as part2Height, RENDER_FPS as part2Fps };

/** Segments of part 2, in order, from timing.ts. */
export const part2Segments = segments.filter((s) => s.part === 2);

const levelOfPart = (): 1 | 2 | 3 | 4 | 5 => {
  const card = part2Segments.find((s) => s.kind === 'levelCard');
  if (!card || card.kind !== 'levelCard') throw new Error('Part2: no level card in part 2 segments');
  return card.level;
};

const Wallpaper: React.FC = () => <div style={{ position: 'absolute', inset: 0, background: levelBackground[levelOfPart()] }} />;

export const Part2: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
    <Wallpaper />
    {part2Segments.map((s) => {
      const from = ticksToFrames(s.from - part2Range.from);
      // Same rounding as ticksToFrames(s.to) - ticksToFrames(s.from) so segments butt up exactly.
      const dur = ticksToFrames(s.to) - ticksToFrames(s.from);
      let node: React.ReactNode = null;
      if (s.kind === 'levelCard') node = <LevelCard level={s.level} sheet />;
      else if (s.kind === 'round') node = <RoundScene round={s.round} />;
      else if (s.kind === 'bonus') {
        if (s.bonus.name !== 'triple-lock') throw new Error(`Part2: bonus ${s.bonus.name} is not triple-lock`);
        node = <BonusTripleLock />;
      }
      if (!node) return null;
      const key = s.kind === 'round' ? `round-${s.round.n}` : s.kind === 'bonus' ? `bonus-${s.bonus.n}` : s.kind;
      return (
        <Sequence key={key} from={from} durationInFrames={dur}>
          {node}
          <VoiceLayer segment={s} />
        </Sequence>
      );
    })}
  </div>
);
