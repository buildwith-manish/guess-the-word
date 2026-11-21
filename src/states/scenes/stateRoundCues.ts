/**
 * stateRoundCues: the sound cue list of one state round (tasks 3a-3c).
 *
 * Same shape as the word quiz cue list (`Cue = { frame, sfx, rate?, volume? }`), but all `frame`s are
 * design ticks (30 per second) counted from PLAN TICK 0 of the question, i.e. from
 * `segment.from - segment.lead`. The caller that walks TIMELINE.segments adds that base:
 *     absoluteTick = seg.from - (seg.lead ?? 0) + cue.frame
 * Nothing here knows about the video clock: any frame range renders in any order.
 *
 * All timings come from buildQuestionPlan (state-timing.ts); sound names are files in public/sounds.
 */
import soundManifest from '../../sound-manifest.json';
import settings from '../states-settings.json';
import { FPS, buildQuestionPlan } from '../state-timing';
import type { StateQuestionPlan } from '../state-timing';

/** A sound effect name: a key of src/sound-manifest.json (a file in public/sounds), minus the music loops. */
export type StateSfx = Exclude<keyof typeof soundManifest, `music-${string}`>;

export type StateCue = {
  /** design tick, counted from plan tick 0 of the question */
  frame: number;
  sfx: StateSfx;
  rate?: number;
  volume?: number;
};

/** Question ids (1-50) that get the streak banner (settings.streak.milestones). */
export const isStreakMilestone = (id: number): boolean => (settings.streak.milestones as number[]).includes(id);

/** Tick the streak banner (and its sound) starts: one reveal-build after the stamp, so it does not fight the stamp. */
export const streakAt = (plan: StateQuestionPlan): number => plan.stamp + (plan.stamp - plan.revealStart);

/**
 * Cues of question `index` (0-based).
 * `withTitle` must match what the timeline used for that question (buildQuestionPlan's second argument).
 *
 * - whoosh at the moment the outline starts drawing (stage-in)
 * - pop when the clock ring pops in (the "get ready" beat after the question read-out)
 * - tick on every whole second the clock has run (the same instants the TimerRing pulses on)
 * - tick-low instead of tick for every second boundary that falls inside the last second
 *   (the last FPS ticks of the clock, where the ring turns red)
 * - ping-hi when the emoji hint appears, ding-hi when the region glow appears
 * - stamp when the answer lands (the flash is on the same tick)
 * - chime-arp when the streak banner pops in (milestone questions only)
 * - whoosh when the shape flies into the mini map (the end of the hold)
 */
export const stateRoundCues = (index: number, withTitle = false): StateCue[] => {
  const plan = buildQuestionPlan(index, withTitle);
  const cues: StateCue[] = [];
  const add = (frame: number, sfx: StateSfx, extra: Partial<StateCue> = {}) => cues.push({ frame, sfx, ...extra });

  // stage-in
  add(plan.drawStart, 'whoosh');

  // get ready: the clock ring pops in
  add(plan.readyStart, 'pop', { volume: 0.8 });

  // clock: a boundary at 1 s, 2 s, ... strictly before the clock ends
  const lastSecondFrom = plan.timerFrames - FPS;
  for (let t = FPS; t < plan.timerFrames; t += FPS) {
    add(plan.timerStart + t, t >= lastSecondFrom ? 'tick-low' : 'tick');
  }

  // hints: emoji at hintAt[0], region glow at hintAt[1] (fractions of the clock from states-settings.json)
  add(plan.hintAt[0], 'ping-hi');
  add(plan.hintAt[1], 'ding-hi');

  // answer
  add(plan.stamp, 'stamp');
  if (isStreakMilestone(plan.id)) add(streakAt(plan), 'chime-arp');

  // fly-in to the mini map
  add(plan.exit, 'whoosh');

  return cues.sort((a, b) => a.frame - b.frame);
};
