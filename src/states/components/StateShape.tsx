/**
 * StateShape: one US state as a neon outline and/or gradient silhouette.
 * Pure and prop-driven: the parent samples time with useDesignFrame (src/clock.ts) and passes
 * progress / fill / glow as 0..1 values, so every frame renders identically in any order.
 * Glow is stacked wide low-alpha strokes (no SVG filter, which is slow at 2560x1440).
 */
import React, { useId, useMemo } from 'react';
import { evolvePath, getLength } from '@remotion/paths';
import { COLORS } from '../../style';
import { SHAPE_BOX, getShape } from '../geo';

export type StateShapeMode = 'outline' | 'filled' | 'ghost';

export interface StateShapeProps {
  /** Two-letter key, e.g. "TX". */
  stateKey: string;
  /** Side of the square shape box, in px (use px() from style.ts). */
  size: number;
  /** Outline draw, 0 to 1. */
  progress?: number;
  /** Gradient fill strength, 0 to 1. */
  fill?: number;
  /** Glow strength, 0 to 1. */
  glow?: number;
  /** Degrees, clockwise, about the centre of the shape box. */
  rotation?: number;
  /** outline: neon stroke (+ fill); filled: solid silhouette with a thin edge; ghost: faint silhouette. */
  mode?: StateShapeMode;
  /** Level accent colour (any CSS colour). Default: COLORS.cyan. */
  accent?: string;
}

/** Layout proportions, in shape-box units (box = SHAPE_BOX). */
const LOOK = {
  /** crisp core stroke width, as a fraction of the box */
  core: 0.008,
  /** halo layers: stroke width (x core) and base opacity, widest first */
  halo: [
    { k: 9, a: 0.06 },
    { k: 6, a: 0.1 },
    { k: 3.6, a: 0.16 },
    { k: 2, a: 0.28 },
  ],
  /** gradient: opacity at the top and bottom of the silhouette */
  gradTop: 1,
  gradBottom: 0.35,
  /** edge stroke (x core) for the filled silhouette */
  edge: 0.6,
  /** ghost silhouette opacity and edge opacity */
  ghostFill: 0.12,
  ghostEdge: 0.35,
};

/** Placement box of the shape for other components: px size of the fitted shape and the box. */
export interface ShapeBoxPx {
  /** Fitted shape width/height in px. */
  w: number;
  h: number;
  /** Side of the square box in px (= size). */
  box: number;
}

/** Fitted shape size in px for a given box size, so callers can place labels and pins. */
export const getShapeBox = (stateKey: string, size: number): ShapeBoxPx => {
  const g = getShape(stateKey);
  const f = size / SHAPE_BOX;
  return { w: g.w * f, h: g.h * f, box: size };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Split a multi-subpath path ("M..Z M..Z") so each island/ring draws from its own start. */
const splitSubpaths = (d: string): string[] => d.split(/(?=M)/).filter((s) => s.trim().length > 0);

export const StateShape: React.FC<StateShapeProps> = ({
  stateKey,
  size,
  progress = 1,
  fill = 0,
  glow = 0,
  rotation = 0,
  mode = 'outline',
  accent = COLORS.cyan,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `ss-grad-${uid}`;
  const geo = getShape(stateKey);

  // Per-subpath lengths are computed once per state.
  const parts = useMemo(
    () => splitSubpaths(geo.shape).map((d) => ({ d, len: getLength(d) })),
    [geo.shape],
  );

  const core = SHAPE_BOX * LOOK.core;
  const p = clamp01(progress);
  const g = clamp01(glow);
  const f = clamp01(fill);

  const strokeParts = (width: number, opacity: number, key: string, drawn = p) =>
    parts.map((part, i) => {
      const ev = evolvePath(drawn, part.d);
      return (
        <path
          key={`${key}-${i}`}
          d={part.d}
          fill="none"
          stroke={accent}
          strokeWidth={width}
          strokeOpacity={opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={ev.strokeDasharray}
          strokeDashoffset={ev.strokeDashoffset}
        />
      );
    });

  const silhouetteOpacity = mode === 'ghost' ? LOOK.ghostFill : f;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SHAPE_BOX} ${SHAPE_BOX}`}
      style={{
        overflow: 'visible',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 50%',
        display: 'block',
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity={LOOK.gradTop} />
          <stop offset="1" stopColor={accent} stopOpacity={LOOK.gradBottom} />
        </linearGradient>
      </defs>

      {silhouetteOpacity > 0 && (
        <path d={geo.shape} fill={`url(#${gradId})`} fillOpacity={silhouetteOpacity} stroke="none" />
      )}

      {mode === 'outline' && (
        <>
          {g > 0 && LOOK.halo.map((h, i) => strokeParts(core * h.k, h.a * g, `halo${i}`))}
          {p > 0 && strokeParts(core, 1, 'core')}
        </>
      )}

      {mode === 'filled' && (
        <>
          {g > 0 && LOOK.halo.map((h, i) => strokeParts(core * h.k, h.a * g, `halo${i}`, 1))}
          {strokeParts(core * LOOK.edge, 1, 'edge', 1)}
        </>
      )}

      {mode === 'ghost' && strokeParts(core * LOOK.edge, LOOK.ghostEdge, 'ghost', 1)}
    </svg>
  );
};
