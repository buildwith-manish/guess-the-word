/**
 * Part5.tsx: Level 5 card + rules sheet, rounds 37 to 45 (45 is the callback), Bonus 5 (task 4m).
 * Registered as "DontSay-P5".
 *
 * Order and lengths come from timing.ts `segments` (part 5), nothing is timed here:
 *   levelCard (L5, with the SettingsCard sheet slid over it), rounds 37-44 (RoundScene),
 *   round 45 (Round45Callback: 4.2 s callback intro), then Bonus 5 (BonusVoiceOnly).
 * Which scene a round gets is decided by the data flag `round.callback`; which scene a bonus gets by
 * the bonus number. Heavy-rule rounds need no switch here: RoundScene reads `round.heavy` itself.
 *
 * The round 45 -> Bonus 5 boundary is two back-to-back Sequences: a hard cut, no fade, no overlap.
 * Pattern: Part6.tsx (Sequence per segment, local frames from the part start).
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { WIDTH, HEIGHT, RENDER_FPS, clipPath, clipSec, frameRange, partRanges, segments, ticksToFrames, type Segment } from '../timing';
import { sfxFrames, sfxSrc } from '../sfx';
import { levelBackground } from '../system';
import type { Level } from '../data';
import { LevelCard, levelCardCues, levelCardVoice } from '../scenes/LevelCard';
import { RoundScene } from '../scenes/RoundScene';
import { Round45Callback } from '../scenes/Round45Callback';
import { BonusVoiceOnly } from '../scenes/BonusVoiceOnly';

export const part5Range = partRanges[4];
export const part5Frames = part5Range.frames;
export { WIDTH as part5Width, HEIGHT as part5Height, RENDER_FPS as part5Fps };

/** Bonus scenes by bonus number. Part 5 holds only the voice-only bonus. */
const bonusScenes: Partial<Record<number, React.FC>> = { 5: BonusVoiceOnly };

const own = segments.filter((s) => s.part === 5);

/** Local render frames of a segment inside this part. */
const place = (s: Segment): { from: number; dur: number } => {
  const fr = frameRange(s);
  return { from: fr.from - part5Range.renderFrom, dur: fr.frames };
};

/** The card launches out of the previous level's wallpaper (derived from the first level card in this part). */
const backdropLevel = (): Level => {
  const first = own.find((s): s is Extract<Segment, { kind: 'levelCard' }> => s.kind === 'levelCard');
  return Math.max(1, (first ? first.level : 2) - 1) as Level;
};

/** Level card with its rules sheet, plus the swell/slide cues and the level voice line (when its clip exists). */
const LevelBlock: React.FC<{ level: Level }> = ({ level }) => {
  const voice = levelCardVoice(level);
  const hasVoice = clipSec(voice.clipId) !== undefined;
  return (
    <>
      <LevelCard level={level} sheet />
      {levelCardCues(level, true).map((c) => (
        <Sequence key={c.name} from={ticksToFrames(c.tick)} durationInFrames={sfxFrames(c.id)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
      {hasVoice ? (
        <Sequence from={0} layout="none">
          <Audio src={staticFile(clipPath(voice.clipId))} />
        </Sequence>
      ) : null}
    </>
  );
};

const sceneFor = (s: Segment): React.ReactNode => {
  if (s.kind === 'levelCard') return <LevelBlock level={s.level} />;
  if (s.kind === 'round') return s.round.callback ? <Round45Callback round={s.round} /> : <RoundScene round={s.round} />;
  if (s.kind === 'bonus') {
    const Scene = bonusScenes[s.bonus.n];
    if (!Scene) throw new Error(`Part5: no scene mapped for bonus ${s.bonus.n}`);
    return <Scene />;
  }
  throw new Error(`Part5: unexpected segment kind "${s.kind}" in part 5`);
};

export const Part5: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[backdropLevel()] }} />
    {own.map((s) => {
      const { from, dur } = place(s);
      const key = s.kind === 'round' ? `round-${s.round.n}` : s.kind === 'bonus' ? `bonus-${s.bonus.n}` : `${s.kind}-${s.from}`;
      return (
        <Sequence key={key} from={from} durationInFrames={dur}>
          {sceneFor(s)}
        </Sequence>
      );
    })}
  </div>
);
