/**
 * Part1: Hook + Settings card + Level 1 card + rounds 1-9 + Bonus 1 (Mind Reader).
 * Task 4i. Everything is mounted from timing.ts `segments` (part 1): no round, level, bonus or
 * duration literal lives here. Segments are hard-cut (no cross-fade), including round 9 -> Bonus 1.
 *
 * Audio: Hook, SettingsCard and LevelCard do not mount their own cues, so this part does. Rounds
 * (RevealEngine) and the Mind Reader bonus mount their own audio. `part1Cues()` in sfxCues.ts is the
 * full list for the mix; do not mount it a second time.
 */
import React from 'react';
import { Audio, Sequence } from 'remotion';
import { WIDTH, HEIGHT, RENDER_FPS, partRanges, segments, ticksToFrames } from '../timing';
import type { Segment } from '../timing';
import { levelBackground } from '../system';
import { sfxSrc } from '../sfx';
import type { SfxId } from '../sfx';
import { Hook, hookCues } from '../scenes/Hook';
import { LevelCard, levelCardCues } from '../scenes/LevelCard';
import { SettingsCard, settingsCardCues } from '../scenes/SettingsCard';
import { RoundScene } from '../scenes/RoundScene';
import { BonusMindReader } from '../scenes/BonusMindReader';

export const part1Range = partRanges[0];
export const part1Frames = part1Range.frames;
export { WIDTH as part1Width, HEIGHT as part1Height, RENDER_FPS as part1Fps };

type Cue = { name: string; id: SfxId; tick: number; volume: number };

/** Cues for scenes that do not mount their own audio, at their segment-local ticks. */
const Cues: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map((c) => (
      <Sequence key={`${c.name}-${c.tick}`} from={ticksToFrames(c.tick)} layout="none">
        <Audio src={sfxSrc(c.id)} volume={c.volume} />
      </Sequence>
    ))}
  </>
);

/** Part-1 segments in order. Throws if the data and timing no longer match this part's shape. */
export const part1Segments = (): Segment[] => {
  const own = segments.filter((s) => s.part === 1);
  const bonus = own.find((s) => s.kind === 'bonus');
  if (!bonus || bonus.kind !== 'bonus' || bonus.bonus.n !== 1) throw new Error('Part1: part 1 must end with bonus 1 (Mind Reader)');
  if (own[0].kind !== 'hook') throw new Error('Part1: part 1 must start with the hook');
  return own;
};

const firstLevelOf = (own: Segment[]) => {
  const l = own.find((s) => s.kind === 'levelCard');
  if (!l || l.kind !== 'levelCard') throw new Error('Part1: no level card in part 1');
  return l.level;
};

const Wallpaper: React.FC<{ level: 1 | 2 | 3 | 4 | 5 }> = ({ level }) => <div style={{ position: 'absolute', inset: 0, background: levelBackground[level] }} />;

export const Part1: React.FC = () => {
  const own = part1Segments();
  const firstLevel = firstLevelOf(own);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <Wallpaper level={firstLevel} />
      {own.map((s, i) => {
        const fromTick = s.from - part1Range.from;
        const from = ticksToFrames(fromTick);
        const dur = ticksToFrames(s.to) - ticksToFrames(s.from);
        const key = `${s.kind}-${i}`;

        if (s.kind === 'round') {
          // RoundScene owns its Sequence (from `at`, length from timing.ts) and its audio.
          return <RoundScene key={key} round={s.round} at={fromTick} />;
        }
        return (
          <Sequence key={key} from={from} durationInFrames={dur}>
            {s.kind === 'hook' && (
              <>
                <Hook />
                <Cues cues={hookCues} />
              </>
            )}
            {s.kind === 'settingsCard' && (
              <>
                <SettingsCard level={firstLevel} />
                <Cues cues={settingsCardCues()} />
              </>
            )}
            {s.kind === 'levelCard' && (
              <>
                <LevelCard level={s.level} />
                <Cues cues={levelCardCues(s.level)} />
              </>
            )}
            {s.kind === 'bonus' && <BonusMindReader />}
          </Sequence>
        );
      })}
    </div>
  );
};
