/** searchEndScreenCues.ts: beats, YouTube slot positions, sound cues and voiceover for the end screen (task 5b).
 *
 *  Pure functions, no React. Ticks are design frames (1/30 s), scene-local unless a function takes `f0`.
 *  Place cues with absolute = seg.from + cue.frame. Scene length is decided in search-timing.ts
 *  (endScreenFrames = max(root endScreen.frames, offset + outro clip + tail)); the outro clip starts at
 *  voiceover.offsetFrames so that rule holds the scene exactly until the clip is done. */
import type { Cue, Voice } from '../../sound';
import { SCALE } from '../../style';
import rootSettings from '../../../settings.json';
import { voiceOutro } from '../search-timing';

// ---- beats (motion constants, ticks) ----
/** "Your score out of N" slams in; confetti and the boom start here. */
export const LINE1_AT = 9;
/** "Which character should I do next?" */
export const LINE2_AT = 40;
/** Subscribe prompt pill. */
export const SUBSCRIBE_AT = 80;
/** The three slot frames pop in. */
export const SLOTS_AT = 120;
/** Pointer to the next video (only drawn when settings.nextVideo has text). */
export const POINTER_AT = 140;
/** Outro clip start: the voiceover offset from root settings, the same offset search-timing uses to hold the scene. */
export const OUTRO_VO_AT = rootSettings.voiceover.offsetFrames;

// ---- YouTube end-screen slots, 1280x720 reference units (x, y = top-left corner; the stage is 2560x1440, so multiply by SCALE) ----
export type SlotRect = { x: number; y: number; w: number; h: number };
/** Two video elements (16:9) side by side and the subscribe element (circle) between them, all in the bottom half. */
export const END_SLOTS: { videoLeft: SlotRect; videoRight: SlotRect; subscribe: SlotRect } = {
  videoLeft: { x: 170, y: 400, w: 400, h: 225 },
  videoRight: { x: 710, y: 400, w: 400, h: 225 },
  subscribe: { x: 585, y: 457, w: 110, h: 110 },
};

/** The same slots in output pixels (2560x1440), for placing the YouTube elements in Studio. */
export const endSlotsPx = (): Record<keyof typeof END_SLOTS, SlotRect> => {
  const k = (r: SlotRect): SlotRect => ({ x: r.x * SCALE, y: r.y * SCALE, w: r.w * SCALE, h: r.h * SCALE });
  return { videoLeft: k(END_SLOTS.videoLeft), videoRight: k(END_SLOTS.videoRight), subscribe: k(END_SLOTS.subscribe) };
};

/** Outro voiceover clip, if one exists. */
export const endScreenVoice = (f0 = 0): Voice[] => {
  const clip = voiceOutro();
  return clip ? [{ frame: Math.round(f0 + OUTRO_VO_AT), file: clip.file, frames: clip.frames }] : [];
};

export const searchEndScreenCues = (): Cue[] => {
  const cues: Cue[] = [];
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  add(LINE1_AT, 'boom');
  add(LINE2_AT, 'jingle-cta');
  add(SUBSCRIBE_AT, 'ding');
  add(SLOTS_AT, 'ding-hi');
  return cues.sort((a, b) => a.frame - b.frame);
};
