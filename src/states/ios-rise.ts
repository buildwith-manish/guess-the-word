/** The iOS-style entrance used by the Video 4 scenes: one spring, a short rise and a fade. Ticks in, style bits out. */
import { px } from '../style';
import { spring } from '../ios';

export interface Rise {
  /** 0..1 spring progress */
  t: number;
  opacity: number;
  transform: string;
}

export const rise = (frame: number, at: number, len: number, dist = 24): Rise => {
  const t = spring((frame - at) / Math.max(1, len));
  return { t, opacity: Math.min(1, t * 1.4), transform: `translateY(${(1 - t) * px(dist)}px)` };
};
