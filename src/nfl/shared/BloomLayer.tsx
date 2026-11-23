import React from 'react';
import { finishBloom, finishStrength, px } from '../system';

/**
 * Optional, very faint bloom inside one UI surface: the lock-screen banner (LockNotification), the level / next-card banner
 * (NotificationBanner) and the points pill (PointsPill). Nothing else gets it: no frame-wide layer, no grain, no vignette, no split.
 *
 * Off by default. It draws only when `finishBloom` is true AND `finishStrength` is above 0 (both in system.ts); then the
 * opacity is BLOOM_MAX x strength. Drop it as the LAST child of a positioned surface: it fills that surface, reads the surface's
 * own pixels with `backdrop-filter` (brightness and contrast keep only the brightest, blur spreads them) and adds them back with
 * `screen`. The glow stays inside the surface's rounded rectangle (`radius`, reference units). Static: no motion, no flicker.
 * Unverified: needs Chromium's backdrop-filter + mix-blend-mode, nothing has been rendered.
 */
const BLOOM_MAX = 0.3;
/** Keep roughly v > 0.69 (out = 2.16 v - 1.5). */
const BRIGHTNESS = 0.54;
const CONTRAST = 4;
const BLUR = 8; // reference units

export const BloomLayer: React.FC<{ radius?: number }> = ({ radius = 0 }) => {
  const s = Math.max(0, Math.min(1, finishStrength));
  if (!finishBloom || s <= 0) return null;
  const f = `brightness(${BRIGHTNESS}) contrast(${CONTRAST}) blur(${px(BLUR)}px)`;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: px(radius),
        pointerEvents: 'none',
        backdropFilter: f,
        WebkitBackdropFilter: f,
        mixBlendMode: 'screen',
        opacity: BLOOM_MAX * s,
      }}
    />
  );
};
