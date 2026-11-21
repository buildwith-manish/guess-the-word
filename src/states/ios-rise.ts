/**
 * The entrance used by the Video 4 scenes: a thin wrapper over motion.ts enter(), so every scene has the same spring.
 * `len` (ticks) only picks the preset when none is given: windows up to 15 ticks use `quick`, longer ones `normal`.
 * Give 'slow' explicitly for hero moves (window of 24+ ticks).
 */
import { enter } from './motion';
import type { Enter, SpringName } from './motion';

export type Rise = Enter;

export const rise = (frame: number, at: number, len: number, dist = 24, preset?: SpringName): Rise =>
  enter(frame, at, preset ?? (len <= 15 ? 'quick' : 'normal'), dist);
