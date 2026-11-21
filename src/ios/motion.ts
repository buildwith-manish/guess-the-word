/**
 * One spring for everything. `spring(t)` maps progress 0..1 (over the animation's length) to 0..1 with a barely
 * visible overshoot (about 1.5%), like a default iOS spring. Use it instead of ad-hoc easings, so all motion matches.
 * Typical lengths: 0.3 to 0.45 s. Give the length in seconds yourself; this is only the curve.
 */
const ZETA = 0.82; // damping ratio (1 = no overshoot)
const OMEGA = 9; // natural frequency over the 0..1 range; chosen so the motion has settled at t = 1

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const spring = (t: number): number => {
  const k = clamp01(t);
  if (k === 0) return 0;
  if (k === 1) return 1;
  const wd = OMEGA * Math.sqrt(1 - ZETA * ZETA);
  const e = Math.exp(-ZETA * OMEGA * k);
  const v = 1 - e * (Math.cos(wd * k) + ((ZETA * OMEGA) / wd) * Math.sin(wd * k));
  // Normalise the tiny residual at k = 1 so the curve lands exactly on 1.
  const e1 = Math.exp(-ZETA * OMEGA);
  const v1 = 1 - e1 * (Math.cos(wd) + ((ZETA * OMEGA) / wd) * Math.sin(wd));
  return v / v1;
};

/** A plain ease-out for fades (no overshoot). */
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
