/* Placeholder until the audio pipeline (task 5a) measures the NFL clips and overwrites this file. Do not edit by hand.
 * Empty array = no measured clips: src/nfl/timing.ts keeps every constant (fallback mode).
 * One row per clip. `key` says which slot the clip belongs to:
 *   hook ''  | level 'starter' 'hof' | scorecard 'rookie' 'starter' 'hof' | cardintro '7' | reveal '7' | dyk '7'
 *   clue '7.3' (card 7, clue 3) | prediction '1'..'4' | rank '1'..'5' | outro '1'..'5' */
export type ClipType = 'hook' | 'level' | 'cardintro' | 'clue' | 'reveal' | 'dyk' | 'scorecard' | 'prediction' | 'rank' | 'outro';
export type ClipTiming = { id: string; type: ClipType; key: string; durSec: number; file: string };
export const clipTimings: ClipTiming[] = [];
