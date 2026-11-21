/**
 * StateBonus (task 4c): picks the bonus scene for a puzzle from its kind (missing, borders, capital, nickname).
 * Props: { frame, puzzle, duration? } with puzzle = BONUS_PUZZLES[seg.index], frame = design ticks since the bonus
 * segment started. `stateBonusCues(puzzle)` gives the matching cue list (ticks from the segment start).
 * Not wired into Main, not rendered or viewed.
 */
import React from 'react';
import type { BonusPuzzle } from '../bonus-engine';
import type { StateCue } from './stateRoundCues';
import { BonusMissing, bonusMissingCues } from './bonus/BonusMissing';
import { BonusBorders, bonusBordersCues } from './bonus/BonusBorders';
import { BonusCapital, bonusCapitalCues } from './bonus/BonusCapital';
import { BonusNickname, bonusNicknameCues } from './bonus/BonusNickname';

export const StateBonus: React.FC<{ frame: number; puzzle: BonusPuzzle; duration?: number }> = ({ frame, puzzle, duration }) => {
  switch (puzzle.kind) {
    case 'missing':
      return <BonusMissing frame={frame} puzzle={puzzle} duration={duration} />;
    case 'borders':
      return <BonusBorders frame={frame} puzzle={puzzle} duration={duration} />;
    case 'capital':
      return <BonusCapital frame={frame} puzzle={puzzle} duration={duration} />;
    case 'nickname':
      return <BonusNickname frame={frame} puzzle={puzzle} duration={duration} />;
  }
};

/** Cues for the puzzle's kind, ticks from the start of the bonus segment. */
export const stateBonusCues = (puzzle: BonusPuzzle): StateCue[] => {
  switch (puzzle.kind) {
    case 'missing':
      return bonusMissingCues(puzzle);
    case 'borders':
      return bonusBordersCues(puzzle);
    case 'capital':
      return bonusCapitalCues(puzzle);
    case 'nickname':
      return bonusNicknameCues(puzzle);
  }
};
