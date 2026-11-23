/**
 * Measured voice-clip lengths for the Christmas quiz. EMPTY until the clip-timing script (a later task) fills it;
 * while it is empty, src/xmas/timing.ts uses the base constants. One entry per spoken intro or reveal of a slot.
 */
export type ClipTiming = { slot: number; part: 'intro' | 'reveal'; durSec: number };

export const clipTimings: ClipTiming[] = [];
