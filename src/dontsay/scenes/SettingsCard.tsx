/**
 * SettingsCard.tsx: the 4 s rules sheet of "Don't Say The Same As Me" (task 4a).
 *
 * Slides up and shows the level's rule type (None / Banned list / Filters / Two rules at once); on
 * Level 2 only it adds "Break a rule and it counts as a match." (decision 6). All of that is drawn
 * by SettingsSheet (task 2e), which derives the rule type and the L2-only line from data.ts rounds.
 * This card is the level intro SPOKEN OVER, never on its own: `settingsCardVoice` is the narration
 * that must play under it. Length is `settingsCardSec` (timing.ts). No heart is drawn or animated.
 */
import React from 'react';
import { levelColors, type Level } from '../data';
import { settingsCardSec } from '../timing';
import { SettingsSheet } from '../components/SettingsSheet';
import type { SfxId } from '../sfx';

export type SettingsCue = { name: string; id: SfxId; tick: number; volume: number };

/** SFX for the sheet: a soft card-in as it slides up. */
export const settingsCardCues = (): SettingsCue[] => [{ name: 'slide', id: 'card-in', tick: 0, volume: 0.5 }];

export type SettingsCardProps = {
  level: Level;
  /** Local design tick; defaults to the clock of the enclosing Sequence. */
  frame?: number;
  /** Default settingsCardSec. */
  durationSec?: number;
};

export const SettingsCard: React.FC<SettingsCardProps> = ({ level, frame, durationSec = settingsCardSec }) => (
  <SettingsSheet level={level} frame={frame} durationSec={durationSec} />
);
