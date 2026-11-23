import { ranks } from './data';

/**
 * audioMap.ts: which voice line (docs/xmas/lines.csv id) belongs to which part of the score scene. Text is never stored
 * here: the end line lives in lines.csv, each rank line in data.ts (ranks[].voice). Task 6c extends this map to every
 * line when the audio is mastered; until then only the score scene needs it.
 */
export const scoreAudio = {
  /** "That was all fifty. Time to count your score." (type `end`) */
  end: 'xmas_102',
  /** one per rank, lowest first, same order as data.ts ranks (type `rank`) */
  rank: ['xmas_103', 'xmas_104', 'xmas_105', 'xmas_106', 'xmas_107'],
} as const;

if (scoreAudio.rank.length !== ranks.length) throw new Error(`audioMap: ${scoreAudio.rank.length} rank lines for ${ranks.length} ranks`);
