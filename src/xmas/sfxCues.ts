import type { BonusSlot } from './data';
import { doubleFeatureCues } from './bonus/DoubleFeature';
import { finaleCues } from './bonus/Finale';
import { countLightsCues } from './bonus/CountLights';
import { oddOneOutCues } from './bonus/OddOneOut';
import { speedRoundCues } from './bonus/SpeedRound';
import { spotlightCues } from './bonus/Spotlight';
import { bonusBeats, bonusCues } from './scenes/BonusScene';
import { hookCues } from './scenes/Hook';
import { movieCues } from './scenes/MovieScene';
import { outroCues } from './scenes/Outro';
import { scoreCues } from './scenes/ScoreScene';
import type { SfxCue } from './sfx';
import { partRanges } from './timing';
import type { PartRange, Segment } from './timing';

/**
 * sfxCues: every sound effect of each Part, as one sorted list per part.
 * UNIT: design ticks (30 per second, like every number in src/xmas), LOCAL to the part (0 = the part's first tick, which is
 * what Remotion frame 0 of XMAS-P1..P3 is). Render frame = tick * 2. Voice lines are not here (Audio.tsx reads the audio map).
 *   hook    hookCues
 *   movie   movieCues (tiles-in, timer ticks, timer-full, reveal chime, bulb)
 *   bonus   bonusCues (banner, timer, chime, bulb) + the round's own sounds (the round exports them, BonusScene does not play them)
 *   score   scoreCues, outro: outroCues
 */

/** The sounds a bonus round draws itself, at part-local tick `start` (the tick the slot begins at). */
const roundCues = (slot: BonusSlot, start: number): SfxCue[] => {
  const playFrom = bonusBeats(slot).playFrom;
  switch (slot.key) {
    case 'spotlight':
      return spotlightCues(slot, start + playFrom);
    case 'oddOneOut':
      return oddOneOutCues(slot, playFrom, start);
    case 'countLights':
      return countLightsCues(slot, playFrom, start);
    case 'doubleFeature':
      return doubleFeatureCues(start + playFrom);
    case 'speedRound':
      return speedRoundCues(slot, start + playFrom);
    case 'finale':
      return finaleCues(slot, start + playFrom);
    default:
      // focus, autocomplete, cleanUp: their files export no cue list (see docs/xmas-progress.md)
      return [];
  }
};

const segmentCues = (seg: Segment, start: number): SfxCue[] => {
  switch (seg.kind) {
    case 'hook':
      return hookCues(start);
    case 'slot':
      return seg.slot.kind === 'bonus' ? [...bonusCues(seg.slot, start), ...roundCues(seg.slot, start)] : movieCues(seg.slot, start);
    case 'score':
      return scoreCues(start);
    case 'outro':
      return outroCues(start);
  }
};

/** All cues of a part, part-local ticks, sorted by tick (stable: equal ticks keep segment order). */
export const partCues = (part: PartRange): SfxCue[] =>
  part.segments
    .flatMap((seg) => segmentCues(seg, seg.from - part.from))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.frame - b.c.frame || a.i - b.i)
    .map(({ c }) => c);

export const part1Cues: SfxCue[] = partCues(partRanges[0]);
export const part2Cues: SfxCue[] = partCues(partRanges[1]);
export const part3Cues: SfxCue[] = partCues(partRanges[2]);
