/**
 * sfxCues.ts: per-part SFX cue lists for "Don't Say The Same As Me".
 * Ticks are 30 fps design ticks, local to the part (0 = first frame of the part).
 * Part 1 to 5 lists are added by tasks 4i to 4m.
 */
import { partRanges, segments } from './timing';
import { outroCues } from './scenes/Outro';
import type { SfxId } from './sfx';

export type PartCue = { name: string; id: SfxId; tick: number; volume: number };

const part6 = partRanges[5];
const seg = (kind: 'rankCard' | 'scoreboard' | 'outro') => {
  const s = segments.find((x) => x.part === 6 && x.kind === kind);
  if (!s) throw new Error(`part 6 has no ${kind} segment`);
  return s;
};

/**
 * Part 6 cues. Rank card: rank-reveal when it lands. Outro: its own cue list shifted to the outro start.
 * Scoreboard per-rank cues belong to task 4g (Scoreboard.tsx) and are NOT here yet.
 */
export const part6Cues = (): PartCue[] => [
  { name: 'rank-card', id: 'rank-reveal', tick: seg('rankCard').from - part6.from, volume: 0.8 },
  ...outroCues.map((c) => ({ ...c, name: `outro-${c.name}`, tick: c.tick + seg('outro').from - part6.from })),
];
