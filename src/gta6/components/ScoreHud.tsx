/**
 * ScoreHud: "n / total" counter in a top corner (right by default, `side="left"`) with an activity-ring trio.
 *
 * DESIGN CHOICE (documented on purpose): answers are NOT scored on screen. The number shown is the
 * POSSIBLE score, i.e. it climbs by item index (item 1 -> 1, item 2 -> 2 ...), whether or not the
 * viewer got it right. The scene passes `score` = number of items reached so far and `total` = the
 * item count (both from data.ts / timing.ts); this component never decides what the numbers mean.
 *
 * The three rings (easy green, medium amber, hard red, from system.ts) fill in sequence: ring 1 fills
 * over the first third of `total`, ring 2 over the second third, ring 3 over the last. Pass
 * `levelTotals` (item counts per level) to split on the real level boundaries instead of thirds.
 *
 * Optional tween: pass `from` (previous score) plus `frame` and `at` to ease from `from` to `score`
 * with the snappy spring. Without them the HUD is static. No internal timers.
 */
import React from 'react';
import { SAFE, blurPx, colors, radius, springAt, textStyle, u } from '../system';

export type ScoreHudProps = {
  score: number;
  total: number;
  /** Previous score, to tween from (needs `frame` and `at`). */
  from?: number;
  /** Local design frame (30 fps ticks). */
  frame?: number;
  /** Local start frame of the tween. */
  at?: number;
  /** Items per level [easy, medium, hard]; defaults to thirds of `total`. */
  levelTotals?: readonly [number, number, number];
  /** Which top corner (default right). */
  side?: 'left' | 'right';
};

const RING_W = 9;
const SIZE = 104;

export const ScoreHud: React.FC<ScoreHudProps> = ({ score, total, from, frame, at = 0, levelTotals, side = 'right' }) => {
  const shown =
    from !== undefined && frame !== undefined ? from + (score - from) * springAt(frame, at, 'snappy') : score;

  const sizes = levelTotals ?? [total / 3, total / 3, total / 3];
  const ringColors = [colors.easy, colors.medium, colors.hard];
  let start = 0;
  const fills = sizes.map((s) => {
    const f = s <= 0 ? 0 : Math.min(1, Math.max(0, (shown - start) / s));
    start += s;
    return f;
  });

  const rings = fills.map((f, i) => {
    const r = SIZE / 2 - RING_W / 2 - i * (RING_W + 3);
    const c = 2 * Math.PI * r;
    return (
      <g key={i} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={ringColors[i]} strokeOpacity={0.22} strokeWidth={RING_W} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke={ringColors[i]}
          strokeWidth={RING_W}
          strokeLinecap="round"
          strokeDasharray={`${c * f} ${c}`}
        />
      </g>
    );
  });

  return (
    <div
      style={{
        position: 'absolute',
        ...(side === 'left' ? { left: u(SAFE.x) } : { right: u(SAFE.x) }),
        top: u(SAFE.top),
        display: 'flex',
        alignItems: 'center',
        gap: u(22),
        padding: `${u(14)}px ${u(30)}px ${u(14)}px ${u(16)}px`,
        borderRadius: u(radius.xl),
        background: colors.glass,
        border: `${u(1.5)}px solid ${colors.hairline}`,
        backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${u(10)}px ${u(30)}px ${colors.shadow}`,
      }}
    >
      <svg width={u(SIZE)} height={u(SIZE)} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {rings}
      </svg>
      <div style={{ ...textStyle('number'), fontSize: u(52), color: colors.ink, whiteSpace: 'nowrap' }}>
        {Math.round(shown)}
        <span style={{ color: colors.muted }}> / {total}</span>
      </div>
    </div>
  );
};
