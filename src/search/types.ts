/** search/types.ts: shared shapes for the search-history video. Same idea as
 *  src/types.ts, adapted. The Round and Bonus DATA types live in search-data.ts
 *  (task 1a); this file never imports them. Segments refer to rounds and
 *  bonus puzzles by index (0-based position in ROUNDS / BONUS). */

export type LevelCfg = {
  name: string;
  accent: string;
  bg: string;
  /** background theme pair used while this level plays */
  theme: [string, string];
};

/** What the top-left HUD pill shows. */
export type Hud = { label: string; number: number; total: number };

export type IrisVariant = 'circle' | 'sweep' | 'curtain';

/** One round of searches (data comes from ROUNDS[index]). */
export type RoundSegment = {
  kind: 'round';
  from: number;
  duration: number;
  /** 0-based index into ROUNDS */
  index: number;
  levelIndex: number;
  /** frames of this round that already play inside the previous colour wipe (overlap) */
  lead?: number;
};

/** One bonus puzzle (data comes from BONUS[index]). */
export type BonusSegment = {
  kind: 'bonus';
  from: number;
  duration: number;
  /** 0-based index into BONUS */
  index: number;
};

export type Segment =
  | { kind: 'hook'; from: number; duration: number }
  | { kind: 'levelCard'; from: number; duration: number; levelIndex: number }
  | RoundSegment
  | BonusSegment
  | {
      kind: 'iris';
      from: number;
      duration: number;
      fromTheme: [string, string];
      toTheme: [string, string];
      /** what the HUD pill shows while the colour wipes (the scene we just left) */
      hud: Hud;
      /** wipe style: circle (easy), sweep (medium), curtain (hard) */
      variant?: IrisVariant;
    }
  | {
      kind: 'reminder';
      from: number;
      duration: number;
      theme: [string, string];
      hud: Hud;
    }
  | { kind: 'scoreboard'; from: number; duration: number }
  | { kind: 'endScreen'; from: number; duration: number };

export type Timeline = {
  segments: Segment[];
  totalFrames: number;
};
