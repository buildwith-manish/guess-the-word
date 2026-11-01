/** types.ts — shared shapes, kept in one module so scenes never import
 *  each other just for a type (keeps the dependency graph acyclic). */
import type { BonusPuzzle } from './bonus-engine';

export type LevelCfg = {
  name: string;
  time: number;
  accent: string;
  bg: string;
};

export type Question = {
  id: number;
  word: string;
  emoji1: string;
  emoji2: string;
  level: string;
  /** 0-based position of the second free letter (the first letter is always free) */
  reveal: number;
  fact?: string;
};

/** What the top-left HUD pill (and the BONUS ERASES badge under it) shows. */
export type Hud = { label: string; number: number; total: number; erases: number };

export type Segment =
  | { kind: 'hook'; from: number; duration: number }
  | { kind: 'levelCard'; from: number; duration: number; levelIndex: number }
  | { kind: 'question'; from: number; duration: number; index: number; erases: number }
  | { kind: 'bonus'; from: number; duration: number; index: number; puzzle: BonusPuzzle }
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
