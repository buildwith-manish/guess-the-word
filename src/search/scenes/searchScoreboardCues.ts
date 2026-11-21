/** searchScoreboardCues.ts: beat timing, sound cues and voiceover for the final scoreboard (task 5a).
 *
 *  Pure functions, no React. All ticks are design frames (1/30 s), scene-local unless a function says
 *  it takes `f0`. Place cues with absolute = seg.from + cue.frame (the scoreboard segment has no lead).
 *  Rank names and thresholds come from search-settings.json, the round count from search-data.ts,
 *  clip lengths from the voiceover manifest through search-timing.ts. */
import type { Cue, Voice } from '../../sound';
import cfg from '../search-settings.json';
import { ROUNDS, BONUS } from '../search-data';
import { voiceScoreboard } from '../search-timing';

export type RankCfg = { name: string; min: number; accent: string };

/** Ranks in settings order: best first. */
export const RANKS: RankCfg[] = cfg.ranks as RankCfg[];
export const RANK_COUNT = RANKS.length;
/** Highest possible score: one point per round and per bonus puzzle (the rank minimums in settings are scaled to this). */
export const MAX_SCORE = ROUNDS.length + BONUS.length;

/** Score range of rank i, inclusive. The best rank ends at MAX_SCORE, every other one just below the rank above it. */
export const rankRange = (i: number): [number, number] => [RANKS[i].min, i === 0 ? MAX_SCORE : RANKS[i - 1].min - 1];

/** Voiceover key of a rank: legend, expert, good, beginner, keepgoing. */
export const rankKey = (name: string) => name.replace(/\s+/g, '').toLowerCase();

// ---- beats (motion constants, 1/30 s ticks, same rhythm as the GTW scoreboard) ----
/** Tick the recap strip starts to light up. */
export const DOTS_AT = 6;
/** Ticks the whole recap strip takes to light up, whatever the number of rounds (so the later beats never move). */
export const DOTS_SPAN = 30;
/** Ticks between the last dot and the first rank row. */
export const DOTS_TO_ROWS = 10;
/** Ticks between two rank rows. */
export const ROW_STEP = 22;
/** Ticks from the best rank landing to its glow and confetti. */
export const LEGEND_DELAY = 21;
/** Ticks from the glow to the closing line. */
export const LINE_DELAY = 8;
/** Gap between two voiceover clips. */
const VO_GAP = 4;
/** Gap between the last row and the first voiceover clip. */
const VO_AFTER_ROWS = 10;
/** Pitch rise per row for the row sound (1 = unchanged). */
const ROW_PITCH_STEP = 1 / 3;

export const rowBase = () => DOTS_AT + DOTS_SPAN + DOTS_TO_ROWS;
/** Tick rank i (0 = best) drops in. Rows fill bottom to top, the best rank lands last. */
export const rowStart = (i: number) => rowBase() + (RANK_COUNT - 1 - i) * ROW_STEP;
export const legendAt = () => rowStart(0) + LEGEND_DELAY;
export const lineAt = () => legendAt() + LINE_DELAY;

/** Voiceover clips in play order: the scoreboard intro, then one per rank, best first. Clips that do not exist are skipped. */
export const scoreboardVoice = (f0 = 0): Voice[] => {
  const out: Voice[] = [];
  let at = rowStart(0) + ROW_STEP + VO_AFTER_ROWS;
  for (const key of ['intro', ...RANKS.map((r) => rankKey(r.name))]) {
    const clip = voiceScoreboard(key);
    if (!clip) continue;
    out.push({ frame: Math.round(f0 + at), file: clip.file, frames: clip.frames });
    at += clip.frames + VO_GAP;
  }
  return out;
};

/** Scene-local tick where the last voiceover clip ends (0 when there are no clips). */
export const scoreboardVoiceEnd = (): number => {
  const v = scoreboardVoice(0);
  return v.length ? v[v.length - 1].frame + v[v.length - 1].frames : 0;
};

export const searchScoreboardCues = (): Cue[] => {
  const cues: Cue[] = [];
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });

  add(DOTS_AT, 'riser'); // the strip filling up
  for (let i = 0; i < RANK_COUNT; i++) {
    const fromBottom = RANK_COUNT - 1 - i;
    add(rowStart(i), 'row', { rate: 1 + fromBottom * ROW_PITCH_STEP });
  }
  add(legendAt(), 'legend');
  add(lineAt(), 'ding');
  return cues.sort((a, b) => a.frame - b.frame);
};
