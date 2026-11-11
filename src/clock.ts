import { useCurrentFrame } from 'remotion';
import { TIME_SCALE } from './timing';

/**
 * The composition renders at 60 fps but every scene is authored in 30 fps "design frames".
 * This returns the current time in design frames (fractional, e.g. 12, 12.5, 13 ...), so every
 * animation is sampled at the full output rate with identical timing.
 */
export const useDesignFrame = () => useCurrentFrame() / TIME_SCALE;
