/**
 * slots.ts: the slot maths that both a scene and the voice layer need, kept in one pure file (no React, no fonts) so it
 * can also run under Node (scripts/dontsay_voice_fit.ts). Scoreboard.tsx and Outro.tsx import from here; voiceCues.ts
 * uses the same numbers to place the spoken lines, so a voice line can never drift from the visual it belongs to.
 * All values are design ticks (30 fps), local to the segment.
 */
import { ranks } from './data';
import { endScreenSec, outroSec, scoreboardSec, secToTicks } from './timing';

/** Ticks into a scoreboard slot before that band's light-up starts. */
export const SCOREBOARD_LEAD = 6;
/** One slot per rank. */
export const scoreboardSlotTicks = (): number => Math.floor(secToTicks(scoreboardSec) / ranks.length);
/** Tick each band starts lighting, lowest rank (index 0) first. */
export const scoreboardBandAt: number[] = ranks.map((_, i) => i * scoreboardSlotTicks() + SCOREBOARD_LEAD);

/** Ticks after an outro slot starts before its ask springs in. */
export const OUTRO_IN_LEAD = 4;
/** Length of one ask slot when `count` asks share the part of the outro before the end screen. */
export const outroSlotTicks = (count: number): number => Math.floor(secToTicks(outroSec - endScreenSec) / count);
/** Start of each ask's slot. */
export const outroAskAt = (count: number): number[] => Array.from({ length: count }, (_, i) => i * outroSlotTicks(count));
