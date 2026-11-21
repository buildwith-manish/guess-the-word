/**
 * BonusNickname (task 4c): bonus kind "nickname". Same scene as BonusCapital (state shape in the centre, four
 * option chips with the nicknames, clock, correct chip lights up, AnswerCard-style stamp); only the stamp caption
 * differs. The shared scene, timing and cues live in BonusCapital.tsx.
 * Not rendered or viewed.
 */
import React from 'react';
import type { BonusPuzzle } from '../../bonus-engine';
import type { StateCue } from '../stateRoundCues';
import { BonusShapeScene, shapeBonusCues } from './BonusCapital';

/** Cues of the nickname bonus (ticks from the start of the segment). */
export const bonusNicknameCues = (puzzle: BonusPuzzle): StateCue[] => shapeBonusCues(puzzle);

export const BonusNickname: React.FC<{ frame: number; puzzle: BonusPuzzle; duration?: number }> = ({ frame, puzzle, duration }) => (
  <BonusShapeScene frame={frame} puzzle={puzzle} duration={duration} kind="nickname" />
);
