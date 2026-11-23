import type React from 'react';
import type { BonusSlot } from '../data';
import { UI } from '../ui';
import { CleanUp } from './CleanUp';
import { Focus } from './Focus';
import { PlaceholderRound } from './PlaceholderRound';

/**
 * registry.ts: the contract of a bonus round, and the table that maps bonus 1..10 to its component.
 *
 * CONTRACT. A round is a React component with props { slot, playFrom, playFrames } that draws ONLY the play area:
 *   - It is mounted for the whole scene (intro, play, reveal) inside a box of PLAY_AREA size; it draws in that box's
 *     own coordinates (0,0 is the box's top-left), sizes in 1280x720 reference units through px().
 *   - `playFrom` is the design tick (30 per second, scene-local, the same clock as useXmasFrame inside the scene) at
 *     which play starts, `playFrames` is how many ticks play lasts (despite the name: ticks, like every frame number in
 *     src/xmas). Read the time with useXmasFrame().
 *   - Enter during the last 8 ticks of the intro or at playFrom, be fully on screen by playFrom + 8, and keep the final
 *     picture through the reveal (the scene dims the box when the answers stack over it). One allowed exception: a round
 *     may animate a restore once play has ended and the timer has flashed (Clean Up brings the erased parts back).
 *   - It draws NO timer, banner, bulbs, counter, answer pill or pass rule: BonusScene owns all of those.
 *   - All text and images come from the slot (data.ts), clue image ids through ClueImage / GlassTile, UI strings from ui.ts.
 *   - A round that uses a sound exports its own cue list; BonusScene does not know about it.
 * Tasks 4a to 4d replace one entry of `rounds` each; nothing else in the scene changes.
 */
export type RoundProps = { slot: BonusSlot; playFrom: number; playFrames: number };
export type RoundComponent = React.ComponentType<RoundProps>;

/** The play area in 1280x720 reference units: the band the two movie tiles use (inside the safe band). */
export const PLAY_AREA = { x: 218, y: 138, w: 844, h: 400 } as const;

/** bonus number (1..10, `slot.bonus`) -> round component. Every entry is a placeholder until its task replaces it. */
export const rounds: Readonly<Record<number, RoundComponent>> = {
  1: PlaceholderRound, // 4a Spotlight
  2: Focus, // 4b Focus
  3: PlaceholderRound, // 4c Odd One Out
  4: PlaceholderRound, // 4d Double Feature
  5: PlaceholderRound, // 4a Autocomplete
  6: CleanUp, // 4b Clean Up
  7: PlaceholderRound, // 4c Count the Lights
  8: PlaceholderRound, // 4c Control Center
  9: PlaceholderRound, // 4d Speed Round
  10: PlaceholderRound, // 4d Finale
};

export const roundOf = (slot: BonusSlot): RoundComponent => {
  const r = rounds[slot.bonus];
  if (!r) throw new Error(`registry: no round for bonus ${slot.bonus}`);
  return r;
};

/** Bonus rounds whose pass rule is shown on screen (the others score the usual way). */
export const PASS_RULE_BONUSES: readonly number[] = [9, 10];

/** The pass-rule caption of a bonus (text from ui.ts), or null when this bonus shows none. */
export const passRuleText = (slot: BonusSlot): string | null => {
  if (!PASS_RULE_BONUSES.includes(slot.bonus)) return null;
  if (slot.key === 'speedRound') return UI.allThree;
  if (slot.key === 'finale') return UI.threeOfFour;
  return null;
};
