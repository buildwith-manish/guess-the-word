/**
 * Part3.tsx: Level 3 + heart check-in + Bonus 3 (task 4k). Registered as "DontSay-P3".
 *
 * Order and lengths come from timing.ts `segments` (part 3): level card, rounds, heart check-in, rounds, bonus.
 * Nothing here names a round, level, bonus, duration or prompt: every segment is mounted from its own data.
 * Pattern: parts/Part6.tsx (Part2.tsx does not exist on this branch).
 *
 * - Level card: LevelCard with `sheet` on, so the settings card slides over it inside the card's own
 *   levelCardSec. timing.ts has no separate settings segment after level 1, so this adds no time.
 * - Rounds: RoundScene (owns its wallpaper, ink bubble, reveal and result sounds).
 * - Heart check-in: static hearts pill, never animated (HeartCheckIn).
 * - Bonus: BonusChainReaction (owns its sounds). Hard cut from the last round to the bonus: no fade.
 *
 * Sound: the scenes below that own their audio mount it themselves (rounds, bonus). LevelCard, SettingsCard and
 * HeartCheckIn do not, so this part mounts their cues. `part3Cues()` (sfxCues.ts) lists every cue of the part.
 */
import React from 'react';
import { Audio, Sequence } from 'remotion';
import { partRanges, segments, ticksToFrames, TIME_SCALE, WIDTH, HEIGHT, RENDER_FPS } from '../timing';
import { levelBackground } from '../system';
import { VoiceLayer } from '../components/VoiceLayer';
import { sfxFrames, sfxSrc, type SfxId } from '../sfx';
import { LevelCard, levelCardCues } from '../scenes/LevelCard';
import { RoundScene } from '../scenes/RoundScene';
import { HeartCheckIn, heartCheckInCues } from '../scenes/HeartCheckIn';
import { BonusChainReaction } from '../scenes/BonusChainReaction';

export const part3Range = partRanges[2];
export const part3Frames = part3Range.frames;
export { WIDTH as part3Width, HEIGHT as part3Height, RENDER_FPS as part3Fps };

type Cue = { name: string; id: SfxId; tick: number; volume: number };

const Cues: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map((c) => (
      <Sequence key={c.name} from={Math.round(c.tick * TIME_SCALE)} durationInFrames={sfxFrames(c.id)} layout="none">
        <Audio src={sfxSrc(c.id)} volume={c.volume} />
      </Sequence>
    ))}
  </>
);

/** Part 3 opens on a level card: its level colours the wallpaper behind the cuts. */
const baseLevel = () => {
  const first = segments.find((s) => s.part === 3 && s.kind === 'levelCard');
  return first && first.kind === 'levelCard' ? first.level : 1;
};

export const Part3: React.FC = () => {
  const own = segments.filter((s) => s.part === 3);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <div style={{ position: 'absolute', inset: 0, background: levelBackground[baseLevel()] }} />
      {own.map((s) => {
        const from = ticksToFrames(s.from) - part3Range.renderFrom;
        const dur = ticksToFrames(s.to) - ticksToFrames(s.from);
        let node: React.ReactNode = null;
        if (s.kind === 'levelCard') {
          node = (
            <>
              <LevelCard level={s.level} sheet />
              <Cues cues={levelCardCues(s.level, true)} />
            </>
          );
        } else if (s.kind === 'round') {
          node = <RoundScene round={s.round} />;
        } else if (s.kind === 'heartCheckIn') {
          node = (
            <>
              <HeartCheckIn />
              <Cues cues={heartCheckInCues()} />
            </>
          );
        } else if (s.kind === 'bonus') {
          node = <BonusChainReaction />;
        }
        return (
          <Sequence key={`${s.kind}-${s.from}`} from={from} durationInFrames={dur}>
            {node}
            <VoiceLayer segment={s} />
          </Sequence>
        );
      })}
    </div>
  );
};
