/**
 * ScoreHud: "n / total" counter in a top corner (right by default, `side="left"`) with an activity-ring trio.
 *
 * The scene passes `score` and `total` (from data.ts / timing.ts); this component never decides what the numbers
 * mean. In NFL the rings are expected to fill with cards completed (decision in docs/nfl-context.md, task 2e).
 *
 * The three rings (green, amber, red level colours from system.ts) fill in sequence: ring 1 fills over the first
 * third of `total`, ring 2 over the second, ring 3 over the last. Pass `levelTotals` (cards per level) to split on
 * the real level boundaries instead of thirds.
 *
 * Optional tween: pass `from` (previous score) plus `frame` and `at` to ease from `from` to `score`
 * with the snappy spring. Without them the HUD is static. No internal timers.
 *
 * Copied ring math only; hudCounts.ts is not copied (it counted gta6 items). 2e builds the NFL counts from data.ts.
 */
import React from 'react';
import { SAFE, blurPx, colors, radius, springAt, textStyle, px } from '../system';

export type ScoreHudProps = {
  score: number;
  total: number;
  /** Previous score, to tween from (needs `frame` and `at`). */
  from?: number;
  /** Local design frame (30 fps ticks). */
  frame?: number;
  /** Local start frame of the tween. */
  at?: number;
  /** Cards per level [rookie, starter, hof]; defaults to thirds of `total`. */
  levelTotals?: readonly [number, number, number];
  /** Which top corner (default right). */
  side?: 'left' | 'right';
  /** Distance from the side edge in reference units (default SAFE.x). */
  inset?: number;
  /** Overall size, 1 = full (default). The box shrinks toward its corner. */
  scale?: number;
};

const RING_W = 6;
const SIZE = 70;

export const ScoreHud: React.FC<ScoreHudProps> = ({ score, total, from, frame, at = 0, levelTotals, side = 'right', inset = SAFE.x, scale = 1 }) => {
  const shown =
    from !== undefined && frame !== undefined ? from + (score - from) * springAt(frame, at, 'snappy') : score;

  const sizes = levelTotals ?? [total / 3, total / 3, total / 3];
  const ringColors = [colors.green, colors.amber, colors.red];
  let start = 0;
  const fills = sizes.map((s) => {
    const f = s <= 0 ? 0 : Math.min(1, Math.max(0, (shown - start) / s));
    start += s;
    return f;
  });

  const rings = fills.map((f, i) => {
    const r = SIZE / 2 - RING_W / 2 - i * (RING_W + 2);
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
        ...(side === 'left' ? { left: px(inset) } : { right: px(inset) }),
        top: px(SAFE.top),
        transform: `scale(${scale})`,
        transformOrigin: side === 'left' ? 'top left' : 'top right',
        display: 'flex',
        alignItems: 'center',
        gap: px(15),
        padding: `${px(10)}px ${px(20)}px ${px(10)}px ${px(11)}px`,
        borderRadius: px(radius.xl),
        background: colors.glass,
        border: `${px(1)}px solid ${colors.hairline}`,
        backdropFilter: `blur(${px(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${px(7)}px ${px(20)}px ${colors.shadow}`,
      }}
    >
      <svg width={px(SIZE)} height={px(SIZE)} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {rings}
      </svg>
      <div style={{ ...textStyle('number'), fontSize: px(36), color: colors.ink, whiteSpace: 'nowrap' }}>
        {Math.round(shown)}
        <span style={{ color: colors.muted }}> / {total}</span>
      </div>
    </div>
  );
};
