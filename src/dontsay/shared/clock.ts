/**
 * clock.ts — design-frame clock, copied from src/clock.ts with the import path
 * fixed to ./timing (relative to src/dontsay/shared/).
 *
 * The composition renders at 60 fps but every scene is authored in 30 fps
 * "design frames". This returns the current time in design frames (fractional),
 * so every animation is sampled at the full output rate with identical timing.
 */
import { useCurrentFrame } from 'remotion';
import { TIME_SCALE } from '../timing';

export const useDesignFrame = () => useCurrentFrame() / TIME_SCALE;
