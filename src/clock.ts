import { useCurrentFrame } from 'remotion';

/**
 * Returns the current composition frame. The composition now runs natively at 60 fps, so
 * no scaling is needed. Import useDesignFrame() instead of useCurrentFrame() throughout
 * so callers remain unchanged if the fps ever changes again.
 */
export const useDesignFrame = () => useCurrentFrame();
