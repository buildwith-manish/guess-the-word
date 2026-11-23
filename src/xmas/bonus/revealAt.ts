import type { BonusSlot } from '../data';
import { defaultMorphFrame, timerPropsOf } from '../components/TimerToPill';

/**
 * revealAt: the scene-local design tick at which BonusScene's answers come in (the timer has filled, flashed and starts
 * to morph). A round that marks its answer at the reveal (ring, highlight) starts on this tick. Same number BonusScene
 * uses (`bonusBeats().answersFrom`), derived from the same timer props, so the two cannot drift apart.
 */
export const revealAt = (slot: BonusSlot, playFrom: number): number => {
  const tp = timerPropsOf(slot);
  return defaultMorphFrame(playFrom, tp.segments, tp.secondsPerSegment);
};
