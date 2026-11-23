/**
 * Measured voice-clip lengths. Placeholder until the voice pipeline exists: empty means
 * "no clips yet", and timing.ts falls back to its base constants.
 * A later task replaces this file (ffprobe of public/dontsay/voiceover/clips).
 */
export type ClipTiming = { id: string; durSec: number; file: string };
export const clipTimings: ClipTiming[] = [];
