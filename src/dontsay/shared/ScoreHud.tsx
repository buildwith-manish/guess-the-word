/**
 * ScoreHud.tsx — round counter in a top corner.
 * Adapted from src/gta6/components/ScoreHud.tsx.
 *
 * DESIGN CHOICE (documented on purpose, matching decision 1 in the prompt pack):
 * the counter shows the round index climbing (1, 2, ... 45) — it is NOT the
 * viewer's score. The viewer keeps their own score; this component never decides
 * what the numbers mean.
 *
 * The docx says "no rings" for the in-round look, so rings default OFF. Pass
 * `rings=true` for the scoreboard/rank card, where activity rings are wanted.
 *
 * Hearts are NOT shown here — HeartsPill is a separate static component (task 2c).
 */
import React from 'react';
import { SAFE, blurPx, colours, radius, springAt, textStyle, u } from '../system';
import type { Level } from '../data';

export type ScoreHudProps = {
  /** Current round index (1-45) or bonus index (1-5). */
  score: number;
  /** Total (45 for rounds, 5 for bonuses). */
  total: number;
  /** Previous value, to tween from (needs `frame` and `at`). */
  from?: number;
  frame?: number;
  at?: number;
  /** Show activity rings (default false per docx "no rings"). */
  rings?: boolean;
  /** Items per level [L1..L5]; used when rings=true. */
  levelTotals?: readonly [number, number, number, number, number];
  side?: 'left' | 'right';
  inset?: number;
  /** Label after the number, e.g. "OF 45". */
  label?: string;
};

const RING_W = 9;
const SIZE = 104;

export const ScoreHud: React.FC<ScoreHudProps> = ({
  score, total, from, frame, at = 0, rings = false, levelTotals, side = 'right', inset = SAFE.x, label,
}) => {
  const shown = from !== undefined && frame !== undefined
    ? from + (score - from) * springAt(frame, at, 'snappy')
    : score;

  const sizes = levelTotals ?? [total / 5, total / 5, total / 5, total / 5, total / 5];
  const ringColours = [1, 2, 3, 4, 5].map((l) => colours.level[l as Level]);
  let start = 0;
  const fills = sizes.map((s) => {
    const f = s <= 0 ? 0 : Math.min(1, Math.max(0, (shown - start) / s));
    start += s;
    return f;
  });

  const ringSvg = rings && (
    <svg width={u(SIZE)} height={u(SIZE)} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {fills.map((f, i) => {
        const r = SIZE / 2 - RING_W / 2 - i * (RING_W + 3);
        const c = 2 * Math.PI * r;
        return (
          <g key={i} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={ringColours[i]} strokeOpacity={0.22} strokeWidth={RING_W} />
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none"
              stroke={ringColours[i]} strokeWidth={RING_W} strokeLinecap="round"
              strokeDasharray={`${c * f} ${c}`}
            />
          </g>
        );
      })}
    </svg>
  );

  return (
    <div
      style={{
        position: 'absolute',
        ...(side === 'left' ? { left: u(inset) } : { right: u(inset) }),
        top: u(SAFE.top),
        display: 'flex',
        alignItems: 'center',
        gap: u(22),
        padding: `${u(14)}px ${u(30)}px ${u(14)}px ${u(16)}px`,
        borderRadius: u(radius.xl),
        background: colours.glass,
        border: `${u(1.5)}px solid ${colours.hairline}`,
        backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${u(10)}px ${u(30)}px ${colours.shadow}`,
      }}
    >
      {ringSvg}
      <div style={{ ...textStyle('counter'), fontSize: u(44), color: colours.ink, whiteSpace: 'nowrap' }}>
        {Math.round(shown)}
        <span style={{ color: colours.muted }}>{label ? ` ${label}` : ` / ${total}`}</span>
      </div>
    </div>
  );
};
