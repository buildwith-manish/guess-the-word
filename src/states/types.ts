/** states/types.ts: shared shapes for video 4, kept in one module so scenes never import each
 *  other just for a type. Adapted from src/types.ts (the GTW word quiz). */
import type settingsJson from './states-settings.json';
import type { CropSide, Level } from './states-data';

/** The whole states-settings.json, typed from the file itself. */
export type StatesSettings = typeof settingsJson;

/** One level's look and clock (a row of states-settings.json "levels"). */
export type LevelCfg = {
  name: Level;
  /** seconds on the clock */
  time: number;
  accent: string;
  bg: string;
  /** colour pair used by the wipe / background for this level */
  theme: [string, string];
};

/** What a state question needs to be played (built from states-data.ts). */
export type StateQuestion = {
  /** 1-50, video order */
  id: number;
  /** two-letter key */
  key: string;
  level: Level;
  /** degrees, HARD only */
  rotation?: number;
  /** MEDIUM only */
  cropSide?: CropSide;
  fact?: string;
};

/** What the top-left HUD pill (and the erase badge under it) shows. */
export type Hud = { label: string; number: number; total: number; erases: number };

export type IrisVariant = 'circle' | 'sweep' | 'curtain';

/** Bonus slot kinds, in states-settings.json "bonus.kinds". */
export type BonusKind = 'missing' | 'borders' | 'capital' | 'nickname';

/** All frame values are 30 fps design ticks (see src/clock.ts). */
export type Segment =
  | { kind: 'hook'; from: number; duration: number }
  | { kind: 'levelCard'; from: number; duration: number; levelIndex: number }
  | {
      kind: 'question';
      from: number;
      duration: number;
      /** 0-based position in video order (question id - 1) */
      index: number;
      erases: number;
      /** frames of this question that already play inside the previous colour wipe (overlap) */
      lead?: number;
    }
  | { kind: 'bonus'; from: number; duration: number; index: number; bonusKind: BonusKind }
  | {
      kind: 'iris';
      from: number;
      duration: number;
      fromTheme: [string, string];
      toTheme: [string, string];
      /** what the HUD pill shows while the colour wipes (the scene we just left) */
      hud: Hud;
      /** the watermark stays on while leaving a question */
      watermark: boolean;
      /** the title lockup stays on screen through question -> question wipes */
      title?: boolean;
      /** wipe style per level */
      variant?: IrisVariant;
    }
  | {
      kind: 'reminder';
      from: number;
      duration: number;
      theme: [string, string];
      hud: Hud;
      /** the title lockup is still on screen (no bonus round follows) */
      title?: boolean;
    }
  | { kind: 'scoreboard'; from: number; duration: number }
  | { kind: 'endScreen'; from: number; duration: number };

export type Timeline = {
  segments: Segment[];
  totalFrames: number;
};
