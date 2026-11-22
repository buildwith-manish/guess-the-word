import { DYK_MAX_TICKS } from '../components/DidYouKnowCard';
import { presence } from '../components/presence';
import { springAt } from '../system';
import { dykSec, secToTicks } from '../timing';

/** Spring-out length of every extra. */
export const OUT_TICKS = secToTicks(0.3);
/** Every extra stays on screen under 3 s (3 s minus one tick), like the did-you-know card. */
export const EXTRA_MAX_TICKS = DYK_MAX_TICKS;
export const EXTRA_DEFAULT_TICKS = secToTicks(dykSec);

/**
 * Window of an extra that springs in at `at` (the answer reveal) and out before `at + dur`.
 * `visible` is false outside [at, at + dur); `p` is the in/out presence (0..1); `pop` is the bouncy entrance (0..1+).
 */
export const extraWindow = (frame: number, at: number, dur: number = EXTRA_DEFAULT_TICKS) => {
  const d = Math.min(dur, EXTRA_MAX_TICKS);
  const f = frame - at;
  return {
    d,
    f,
    visible: f >= 0 && f < d,
    p: presence(frame, at, d, OUT_TICKS),
    pop: springAt(frame, at, 'bouncy'),
  };
};
