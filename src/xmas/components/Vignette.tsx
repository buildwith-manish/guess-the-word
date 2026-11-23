import React from 'react';

/**
 * Vignette: a soft darkening toward the edges so the centre (the tiles) pulls forward.
 * Drawn on the background layer, right after Snow and BEFORE the tiles, caption, timer and light string, so it never dims them.
 * Pure CSS gradient, no blur filter, so it costs almost nothing to render.
 */
export const VIGNETTE = {
  /** where the clear centre ends, as a percentage of the ellipse radius */
  clearUntil: 50,
  /** darkness at the very edge (0 to 1) */
  edgeAlpha: 0.45,
  /** centre of the ellipse, percent of the frame */
  cx: 50,
  cy: 50,
} as const;

export const vignetteStyle = (): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: `radial-gradient(ellipse 78% 74% at ${VIGNETTE.cx}% ${VIGNETTE.cy}%, rgba(0,0,0,0) ${VIGNETTE.clearUntil}%, rgba(0,0,0,${VIGNETTE.edgeAlpha}) 100%)`,
});

export const Vignette: React.FC = () => <div style={vignetteStyle()} />;
