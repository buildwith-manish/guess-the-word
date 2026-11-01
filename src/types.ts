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
  reveal: number;
  fact?: string;
};

export type Segment =
  | { kind: 'hook'; from: number; duration: number }
  | { kind: 'levelCard'; from: number; duration: number; levelIndex: number }
  | { kind: 'question'; from: number; duration: number; index: number }
  | { kind: 'bonus'; from: number; duration: number; index: number; puzzle: BonusPuzzle }
  | { kind: 'scoreboard'; from: number; duration: number }
  | { kind: 'endScreen'; from: number; duration: number };

export type Timeline = {
  segments: Segment[];
  totalFrames: number;
};
