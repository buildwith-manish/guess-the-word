/**
 * presence.ts — 0..1 presence of a card that springs in at local tick `at`,
 * holds, and springs out over the last `outLen` ticks of `dur`.
 * Copied from src/gta6/components/presence.ts, import path fixed to ../system.
 */
import { springAt } from '../system';

export const presence = (frame: number, at: number, dur: number, outLen: number): number =>
  springAt(frame, at, 'snappy') * (1 - springAt(frame, at + dur - outLen, 'snappy'));
