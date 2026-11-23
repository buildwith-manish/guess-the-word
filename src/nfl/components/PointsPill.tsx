import React from 'react';
import type { Level } from '../data';
import { FPS } from '../shared/clock';
import { BloomLayer } from '../shared/BloomLayer';
import { EdgeGlow } from '../shared/EdgeGlow';
import { POP_SETTLE_TICKS, colors, easeOut, popAt, px, textStyle, type } from '../system';
import { pillLastSec, pillPulseSec } from '../timing';

export type PointsPillProps = {
  /** Local design frame (30 fps ticks). Same origin as `starts` and `end`. */
  frame: number;
  /** Start tick of each clue slot (from timing.ts `phases.clues[i].from`). The pill drops at each one. Slots are variable. */
  starts: number[];
  /** Tick where the last clue slot ends (from timing.ts, `phases.clues[last].to`). */
  end: number;
  /** Number shown at each clue. Default counts down from `starts.length` (5, 4, 3, 2, 1). Pass the card's own values for other cards. */
  values?: number[];
  /** Level colour for the number and progress line; red on the last clue. */
  level?: Level;
  /** Pill width and height in 1280x720 reference units. */
  width?: number;
  height?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Dynamic Island morph on every drop (visual motion only, no timing): the island swells to `wide` x `tall` over `growSec`,
 * then the POP spring (system.ts) settles it back with a small overshoot. One motion; the pulse waits until it is done.
 */
export const PILL_MORPH = { growSec: 0.1, wide: 0.14, tall: 0.1 } as const;
const PILL_GROW_TICKS = Math.round(PILL_MORPH.growSec * FPS);

/** Where the clock stands at `frame`. Exported so the scene and the check script read the same numbers. */
export const pointsPillMath = (frame: number, starts: number[], end: number) => {
  const n = starts.length;
  let idx = -1;
  for (let i = 0; i < n; i++) if (frame >= starts[i]) idx = i;
  const live = idx >= 0 && frame < end;
  const slotFrom = idx >= 0 ? starts[idx] : 0;
  const slotTo = idx >= 0 && idx < n - 1 ? starts[idx + 1] : end;
  const since = idx >= 0 ? frame - slotFrom : 0;
  const fill = idx >= 0 ? clamp01((frame - slotFrom) / Math.max(1, slotTo - slotFrom)) : 0;
  const last = n > 0 && idx === n - 1;
  // pulse once per pillPulseSec on the last clue, starting after the drop spring has settled
  const pulsePeriod = pillPulseSec * FPS;
  const pulseSince = since - PILL_GROW_TICKS - POP_SETTLE_TICKS;
  const pulse = last && pulseSince >= 0 ? Math.pow(Math.max(0, 1 - (pulseSince % pulsePeriod) / (pulsePeriod / 3)), 2) : 0;
  // red edge glow: builds over the last pillLastSec of the last slot, never before the slot starts
  const glowAt = n > 0 ? Math.max(starts[n - 1], end - pillLastSec * FPS) : end;
  const glowDur = end - glowAt;
  return { n, idx, live, since, fill, last, pulse, glowAt, glowDur };
};

/** The Dynamic Island-style pill: number, drop animation, progress line. The glow is `PointsPillGlow`. */
export const PointsPill: React.FC<PointsPillProps> = ({ frame, starts, end, values, level, width = 200, height = 72 }) => {
  const m = pointsPillMath(frame, starts, end);
  if (!m.live) return null;

  const w = px(width);
  const h = px(height);
  const accent = m.last ? colors.red : level ? colors.level[level] : colors.ink;

  const now = values?.[m.idx] ?? m.n - m.idx;
  const before = m.idx > 0 ? values?.[m.idx - 1] ?? m.n - m.idx + 1 : undefined;

  // POP spring from the start of this clue slot: clue 1 grows in, later clues morph (swell, then settle with a small overshoot)
  const q = popAt(frame, starts[m.idx]);
  const p = clamp01(q);
  const swap = p; // the number swaps during the swell
  const grow = m.idx > 0 ? easeOut(clamp01((frame - starts[m.idx]) / PILL_GROW_TICKS)) : 0;
  const settle = m.idx > 0 ? popAt(frame, starts[m.idx] + PILL_GROW_TICKS) : 1;
  const swell = grow * (1 - settle); // 0 at rest, up to 1 at the top of the swell, a hair below 0 on the overshoot
  const enter = m.idx === 0 ? 0.7 + 0.3 * q : 1;
  const pulseScale = 1 + 0.06 * m.pulse;
  const sx = enter * (1 + PILL_MORPH.wide * swell) * pulseScale;
  const sy = enter * (1 + PILL_MORPH.tall * swell) * pulseScale;
  const rise = h * 0.7;

  const digit: React.CSSProperties = {
    ...textStyle('pill'),
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.min(px(type.pill.size), h * 0.62), // the scale's pill size, smaller only if the pill is
    color: accent,
  };

  // The slot (w x h) never changes, so the pill keeps its position and the card layout. Only the island inside it morphs;
  // it is sized (not scaled), so the corners stay fully round at every size.
  return (
    <div style={{ position: 'relative', width: w, height: h, flex: 'none' }}>
      <div
        style={{
          boxSizing: 'border-box',
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: w * sx,
          height: h * sy,
          transform: 'translate(-50%, -50%)',
          borderRadius: (h * sy) / 2,
          background: '#000',
          border: `${px(1)}px solid ${colors.hairline}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${h * 0.36}px`,
          opacity: m.idx === 0 ? clamp01(p * 2) : 1,
          overflow: 'hidden',
        }}
      >
      {/* one pip per clue, filled up to the current clue */}
      <div style={{ display: 'flex', gap: px(6), alignItems: 'center' }}>
        {starts.map((_, i) => (
          <div
            key={i}
            style={{
              width: px(10),
              height: px(10),
              borderRadius: px(5),
              background: i <= m.idx ? accent : colors.glassStrong,
            }}
          />
        ))}
      </div>

      {/* number swap: the old number rises out, the new one comes up from below */}
      <div style={{ position: 'relative', width: h * 0.8, height: h, flex: 'none' }}>
        {before !== undefined && swap < 1 && (
          <div style={{ ...digit, transform: `translateY(${-swap * rise}px)`, opacity: 1 - swap }}>{before}</div>
        )}
        <div
          style={{
            ...digit,
            transform: `translateY(${m.idx > 0 ? (1 - swap) * rise : 0}px)`,
            opacity: m.idx > 0 ? swap : 1,
          }}
        >
          {now}
        </div>
      </div>

      {/* progress line: fills over the current clue slot */}
      <div
        style={{
          position: 'absolute',
          left: h * 0.36,
          right: h * 0.36,
          bottom: px(8),
          height: px(4),
          borderRadius: px(2),
          background: colors.glassStrong,
        }}
      >
        <div style={{ width: `${m.fill * 100}%`, height: '100%', borderRadius: px(2), background: accent }} />
      </div>
      <BloomLayer radius={height / 2} />
      </div>
    </div>
  );
};

/**
 * Red edge glow for the last pillLastSec of the last clue. Mount it full-frame (it fills its parent), above the card.
 * Takes the same `frame`, `starts` and `end` as the pill.
 */
export const PointsPillGlow: React.FC<Pick<PointsPillProps, 'frame' | 'starts' | 'end'>> = ({ frame, starts, end }) => {
  const m = pointsPillMath(frame, starts, end);
  if (starts.length === 0 || frame < m.glowAt || frame >= end) return null;
  return <EdgeGlow frame={frame} at={m.glowAt} dur={m.glowDur} />;
};
