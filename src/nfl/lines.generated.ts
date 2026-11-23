/* Placeholder until the audio pipeline (task 5a) writes this from the spoken script (docs/nfl/lines.csv). Do not edit by hand.
 * Empty array = no script text yet: scenes that show a spoken line (ScoreCard) draw without it.
 * One row per spoken line. `id` is the script id, `type` and `key` are the same slot keys as in timings.generated.ts
 * (scorecard 'rookie' 'starter' | level 'rookie' 'starter' 'hof'), `text` is the line exactly as spoken. */
import type { ClipType } from './timings.generated';

export type LineRow = { id: string; type: ClipType; key: string; text: string };
export const lines: LineRow[] = [];
