/**
 * ScoreHud (NFL, task 2e): three activity rings in a top corner that fill with CARDS COMPLETED, not with a score.
 *
 * IMPORTANT: this component cannot know the viewer's score. The video is a quiz the viewer answers off-screen; nothing
 * in the video records what they guessed. The rings and the "n / total" counter therefore only show progress through
 * the 30 cards. The label ("30 cards, 150 points") tells the viewer what is on offer; it is not their result.
 *
 * All numbers and words come from data.ts: total = cards.length, points = maxPoints, ring splits = cards per level.
 * The scene passes `done` (cards completed so far) and the local design tick `frame`. No internal timers.
 * Optional tween: pass `from` (previous count) plus `at` (local tick) to ease from `from` to `done` with the snappy spring.
 *
 * Adapted from ../shared/ScoreHud.tsx (ring math), with the label added. Imports: src/nfl/ only.
 */
import React from 'react';
import { byLevel, cards, levels, maxPoints } from '../data';
import { SAFE, blurPx, colors, radius, springAt, textStyle, type, px } from '../system';

/** Counts the HUD shows, all derived from data.ts. */
export const hudCounts = () => ({
  total: cards.length,
  points: maxPoints,
  /** Cards per level in play order: [rookie, starter, hof]. */
  levelTotals: levels.map((l) => byLevel[l].length) as [number, number, number],
});

/** Text of the label under the counter, built from data.ts. */
export const hudLabel = (): string => {
  const { total, points } = hudCounts();
  return `${total} cards, ${points} points`;
};

export type ScoreHudProps = {
  /** Cards completed so far (0..total). Not the viewer's score. */
  done: number;
  /** Local design frame (30 fps ticks). */
  frame: number;
  /** Previous `done`, to tween from (needs `at`). */
  from?: number;
  /** Local start tick of the tween. */
  at?: number;
  /** Which top corner (default right). */
  side?: 'left' | 'right';
  /** Distance from the side edge in reference units (default SAFE.x). */
  inset?: number;
  /** Overall size, 1 = full. The box shrinks toward its corner. */
  scale?: number;
  /** Top edge in reference units (default SAFE.top). */
  top?: number;
  /** Rings + label only, for the 72-unit band above the card: smaller rings, no "n / total" counter (the card header already shows the card number). Label stays at type.caption. */
  compact?: boolean;
};

const RING_W = 6;
const SIZE = 70;
const SIZE_COMPACT = 52;

export const ScoreHud: React.FC<ScoreHudProps> = ({ done, frame, from, at = 0, side = 'right', inset = SAFE.x, scale = 1, top = SAFE.top, compact = false }) => {
  const ring = compact ? SIZE_COMPACT : SIZE;
  const { total, levelTotals } = hudCounts();
  const shown = from !== undefined ? from + (done - from) * springAt(frame, at, 'snappy') : done;

  const ringColors = [colors.green, colors.amber, colors.red];
  let start = 0;
  const fills = levelTotals.map((s) => {
    const f = s <= 0 ? 0 : Math.min(1, Math.max(0, (shown - start) / s));
    start += s;
    return f;
  });

  const rings = fills.map((f, i) => {
    const r = SIZE / 2 - RING_W / 2 - i * (RING_W + 2); // drawn on the 70 grid; the svg scales it down when compact
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
        top: px(top),
        transform: `scale(${scale})`,
        transformOrigin: side === 'left' ? 'top left' : 'top right',
        display: 'flex',
        alignItems: 'center',
        gap: px(16),
        padding: compact ? `${px(8)}px ${px(22)}px ${px(8)}px ${px(8)}px` : `${px(12)}px ${px(22)}px ${px(12)}px ${px(12)}px`,
        borderRadius: px(radius.xl),
        background: colors.glass,
        border: `${px(1)}px solid ${colors.hairline}`,
        backdropFilter: `blur(${px(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${px(7)}px ${px(20)}px ${colors.shadow}`,
      }}
    >
      <svg width={px(ring)} height={px(ring)} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {rings}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(2) }}>
        {!compact && (
          <div style={{ ...textStyle('counter'), color: colors.ink, whiteSpace: 'nowrap' }}>
            {Math.round(shown)}
            <span style={{ color: colors.muted }}> / {total}</span>
          </div>
        )}
        <div style={{ ...textStyle('caption'), color: colors.muted, whiteSpace: 'nowrap' }}>{hudLabel()}</div>
      </div>
    </div>
  );
};
