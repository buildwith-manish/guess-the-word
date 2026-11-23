/**
 * sfxCues.ts: per-part SFX cue lists for "Don't Say The Same As Me".
 * Ticks are 30 fps design ticks, local to the part (0 = first frame of the part).
 * Part 1 to 5 lists are added by tasks 4i to 4m.
 */
import { partRanges, segments } from './timing';
import { outroCues } from './scenes/Outro';
import { rankCardCues } from './scenes/RankCard';
import { scoreboardCues } from './scenes/Scoreboard';
import type { SfxId } from './sfx';

export type PartCue = { name: string; id: SfxId; tick: number; volume: number };

const part6 = partRanges[5];
const seg = (kind: 'rankCard' | 'scoreboard' | 'outro') => {
  const s = segments.find((x) => x.part === 6 && x.kind === kind);
  if (!s) throw new Error(`part 6 has no ${kind} segment`);
  return s;
};

/**
 * Part 6 cues. Rank card and scoreboard cue lists (task 4g) are reused here, shifted from their
 * own local clock to the part-6 clock. Outro: its own cue list shifted to the outro start.
 */
export const part6Cues = (): PartCue[] => [
  ...rankCardCues().map((c) => ({ ...c, name: `rank-card-${c.name}`, tick: c.tick + seg('rankCard').from - part6.from })),
  ...scoreboardCues().map((c) => ({ ...c, name: `scoreboard-${c.name}`, tick: c.tick + seg('scoreboard').from - part6.from })),
  ...outroCues.map((c) => ({ ...c, name: `outro-${c.name}`, tick: c.tick + seg('outro').from - part6.from })),
];
