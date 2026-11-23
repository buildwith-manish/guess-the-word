/**
 * Part6.tsx: rank card hold, scoreboard, outro (task 4h). Registered as "DontSay-P6".
 *
 * Order and lengths come from timing.ts `segments` (part 6): rankCard (6 s), scoreboard (20 s), outro (30 s).
 * Task 4g (RankCard.tsx, Scoreboard.tsx) is not built yet, so those two segments take their scene as a prop
 * (`rankCard`, `scoreboard`) and show only the level-1 wallpaper until it exists. When 4g lands, import the two
 * scenes and pass them as the defaults below (two lines). The outro is real.
 */
import React from 'react';
import { Sequence } from 'remotion';
import { WIDTH, HEIGHT, RENDER_FPS, partRanges, segments, ticksToFrames } from '../timing';
import { levelBackground } from '../system';
import { Outro } from '../scenes/Outro';

export const part6Range = partRanges[5];
export const part6Frames = part6Range.frames;
export { WIDTH as part6Width, HEIGHT as part6Height, RENDER_FPS as part6Fps };

export type Part6Props = { rankCard?: React.ReactNode; scoreboard?: React.ReactNode };

const Wallpaper: React.FC = () => <div style={{ position: 'absolute', inset: 0, background: levelBackground[1] }} />;

export const Part6: React.FC<Part6Props> = ({ rankCard, scoreboard }) => {
  const own = segments.filter((s) => s.part === 6);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <Wallpaper />
      {own.map((s) => {
        const from = ticksToFrames(s.from - part6Range.from);
        const dur = ticksToFrames(s.to) - ticksToFrames(s.from);
        const node = s.kind === 'rankCard' ? rankCard : s.kind === 'scoreboard' ? scoreboard : s.kind === 'outro' ? <Outro /> : null;
        return (
          <Sequence key={s.kind} from={from} durationInFrames={dur}>
            {node}
          </Sequence>
        );
      })}
    </div>
  );
};
