/**
 * The mix of XMAS-Full: every level and envelope time in one place, read by src/xmas/Audio.tsx and by
 * scripts/build_xmas_duck.ts (which bakes the music duck envelope). Levels are dB; gains are linear.
 *
 * Reference: the voice clips are mastered to -16 LUFS (scripts/master_xmas_voice.py), plain RMS about -17 dBFS.
 */
export const MIX = {
  /** Voice clips play at full level (they are already mastered). */
  voice: 1,
  /** Every sound effect is scaled so its plain RMS lands this far under the voice (task: 6 to 8 dB). */
  sfxUnderVoiceDb: 7,
  /** Plain RMS of the mastered voice in dBFS (median of public/xmas/voiceover/clips_master, measured in task 6c). */
  voiceRmsDb: -17,
  /**
   * Music bed: the track must be prepared to this loudness before it goes in public/ (see docs/xmas/music-license.md),
   * so the gain here is 1. About 10 dB under the voice while nobody speaks.
   */
  musicTargetLufs: -26,
  musicGain: 1,
  /** While a voice clip plays the bed drops by this many dB (about 8 dB, so about 18 dB under the voice). */
  musicDuckDb: -8,
  /** The bed starts dipping this long before a clip and comes back this long after it; clips closer together than the sum share one dip. */
  duckAttackSec: 0.25,
  duckReleaseSec: 0.6,
  /** Fade of the bed at the very start and the very end of the video. */
  musicFadeInSec: 1,
  musicFadeOutSec: 2.5,
} as const;

/** Linear gain of a level in dB. */
export const dbToGain = (db: number): number => 10 ** (db / 20);

/** The gain that puts a sound with plain RMS `rmsDb` at `voiceRmsDb - sfxUnderVoiceDb`. */
export const sfxGainFor = (rmsDb: number): number => dbToGain(MIX.voiceRmsDb - MIX.sfxUnderVoiceDb - rmsDb);

/** Gain of the bed under a voice clip. */
export const musicDuckGain: number = dbToGain(MIX.musicDuckDb);

/**
 * The music bed file, relative to public/ (for example 'xmas/music/bed.mp3'). null = no music: the video renders with
 * voice and sound effects only. Setting it requires licence text in docs/xmas/music-license.md (Audio.tsx refuses otherwise).
 */
export const MUSIC_FILE: string | null = 'xmas/music/bed.mp3';
