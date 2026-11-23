/**
 * Part6.tsx: rank card hold, scoreboard, outro (task 4h). Registered as "DontSay-P6".
 *
 * Order and lengths come from timing.ts `segments` (part 6): rankCard (6 s), scoreboard (20 s), outro (30 s).
 * RankCard and Scoreboard (task 4g) are the defaults for their segments; either can still be overridden
 * via the `rankCard` / `scoreboard` props. The outro is real.
 *
 * Audio: RankCard and Scoreboard mount their own cues; Outro does not, so this part mounts `outroCues`
 * at the outro start (task 4n). `part6Cues()` in sfxCues.ts is the full list for the mix; do not mount it again.
 * Segments are back-to-back Sequences: hard cuts, no fade, no overlap.
 */
import React from 'react';
import { Audio, Sequence } from 'remotion';
import { WIDTH, HEIGHT, RENDER_FPS, frameRange, ticksToFrames, partRanges, segments } from '../timing';
import { sfxFrames, sfxSrc } from '../sfx';
import { levelBackground } from '../system';
import { Outro, outroCues } from '../scenes/Outro';
import { RankCard } from '../scenes/RankCard';
import { Scoreboard } from '../scenes/Scoreboard';

export const part6Range = partRanges[5];
export const part6Frames = part6Range.frames;
export { WIDTH as part6Width, HEIGHT as part6Height, RENDER_FPS as part6Fps };

export type Part6Props = { rankCard?: React.ReactNode; scoreboard?: React.ReactNode };

/** Outro scene plus its cues (the outro does not mount audio itself). */
const OutroBlock: React.FC = () => (
  <>
    <Outro />
    {outroCues.map((c) => (
      <Sequence key={c.name} from={ticksToFrames(c.tick)} durationInFrames={sfxFrames(c.id)} layout="none">
        <Audio src={sfxSrc(c.id)} volume={c.volume} />
      </Sequence>
    ))}
  </>
);

const Wallpaper: React.FC = () => <div style={{ position: 'absolute', inset: 0, background: levelBackground[1] }} />;

export const Part6: React.FC<Part6Props> = ({ rankCard = <RankCard />, scoreboard = <Scoreboard /> }) => {
  const own = segments.filter((s) => s.part === 6);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <Wallpaper />
      {own.map((s) => {
        const fr = frameRange(s);
        const from = fr.from - part6Range.renderFrom;
        const dur = fr.frames;
        if (s.kind !== 'rankCard' && s.kind !== 'scoreboard' && s.kind !== 'outro') throw new Error(`Part6: unexpected segment kind \"${s.kind}\" in part 6`);
        const node = s.kind === 'rankCard' ? rankCard : s.kind === 'scoreboard' ? scoreboard : <OutroBlock />;
        return (
          <Sequence key={s.kind} from={from} durationInFrames={dur}>
            {node}
          </Sequence>
        );
      })}
    </div>
  );
};
