/**
 * MiniMap: all 50 states from the `mini` paths (975x610 Albers map, AK and HI insets).
 * Unanswered = dim outline; answered = filled in that state's level colour; current = pulsing outline;
 * highlightRegion = soft glow on that Census region. Glow is stacked wide strokes, no SVG filter.
 * Time (pulse) comes from useDesignFrame() unless `frame` is passed.
 */
import React, { useMemo } from 'react';
import { useDesignFrame } from '../../clock';
import { COLORS } from '../../style';
import { IOS } from '../../ios';
import { ms } from '../../anim';
import settingsJson from '../states-settings.json';
import { STATES, getState } from '../states-data';
import type { Region } from '../states-data';
import { MINI_BOX, getShape } from '../geo';

export type Rect = { x: number; y: number; w: number; h: number };

export interface MiniMapProps {
  /** keys of answered states, drawn filled in their level colour */
  answered?: readonly string[];
  /** key of the current state, pulsing outline */
  current?: string;
  /** Census region to glow softly */
  highlightRegion?: Region;
  /** map width in px (use px()); height is miniMapHeight(size) */
  size: number;
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

const [MINI_W, MINI_H] = MINI_BOX;

/** Rendered height of a MiniMap of width `size`. */
export const miniMapHeight = (size: number) => (size * MINI_H) / MINI_W;

/** Level accent colour for a state (from states-settings.json). */
export const levelAccent = (stateKey: string): string => {
  const level = getState(stateKey).level;
  const hit = settingsJson.levels.find((l) => l.name === level);
  if (!hit) throw new Error(`No level config for ${level}`);
  return hit.accent;
};

/**
 * Where a state sits inside a MiniMap placed at `map` (map.w = its width, map.h = miniMapHeight):
 * the px rect of the state's miniBBox.
 */
export const getMiniRect = (stateKey: string, map: Rect): Rect => {
  const [x0, y0, x1, y1] = getShape(stateKey).miniBBox;
  const k = map.w / MINI_W;
  return { x: map.x + x0 * k, y: map.y + y0 * k, w: (x1 - x0) * k, h: (y1 - y0) * k };
};

/** Layout proportions, in map units (975 wide). */
const LOOK = {
  edge: 0.9,
  dimEdgeAlpha: 0.28,
  dimFillAlpha: 0.04,
  answeredFillAlpha: 0.9,
  answeredEdgeAlpha: 0.6,
  currentStroke: 2.6,
  /** pulse period in ms, and how much stroke width / halo swing */
  pulseMs: 900,
  pulseSwing: 0,
  halo: [
    { k: 7, a: 0.07 },
    { k: 4, a: 0.12 },
    { k: 2, a: 0.2 },
  ],
};

export const MiniMap: React.FC<MiniMapProps> = ({ answered = [], current, highlightRegion, size, frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;

  const paths = useMemo(() => STATES.map((s) => ({ key: s.key, region: s.region, d: getShape(s.key).mini, accent: levelAccent(s.key) })), []);
  const done = useMemo(() => new Set(answered), [answered]);

  const period = ms(LOOK.pulseMs);
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / period);
  const cur = current ? paths.find((p) => p.key === current) : undefined;
  const glowing = highlightRegion ? paths.filter((p) => p.region === highlightRegion) : [];

  return (
    <svg width={size} height={miniMapHeight(size)} viewBox={`0 0 ${MINI_W} ${MINI_H}`} style={{ display: 'block', overflow: 'visible' }}>
      {paths.map((p) =>
        done.has(p.key) ? (
          <path key={p.key} d={p.d} fill={p.accent} fillOpacity={LOOK.answeredFillAlpha} stroke={COLORS.base} strokeOpacity={LOOK.answeredEdgeAlpha} strokeWidth={LOOK.edge} strokeLinejoin="round" />
        ) : (
          <path key={p.key} d={p.d} fill={COLORS.ink} fillOpacity={LOOK.dimFillAlpha} stroke={COLORS.ink} strokeOpacity={LOOK.dimEdgeAlpha} strokeWidth={LOOK.edge} strokeLinejoin="round" />
        ),
      )}

      {glowing.map((p) =>
        LOOK.halo.map((h, i) => (
          <path key={`g-${p.key}-${i}`} d={p.d} fill="none" stroke={IOS.color.blue} strokeOpacity={h.a} strokeWidth={LOOK.edge * h.k} strokeLinejoin="round" strokeLinecap="round" />
        )),
      )}

      {cur && (
        <>
          {LOOK.halo.map((h, i) => (
            <path key={`c-${i}`} d={cur.d} fill="none" stroke={IOS.color.label} strokeOpacity={h.a * (1 + pulse)} strokeWidth={LOOK.edge * h.k} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          <path
            d={cur.d}
            fill="none"
            stroke={IOS.color.label}
            strokeOpacity={1 - LOOK.pulseSwing * (1 - pulse)}
            strokeWidth={LOOK.currentStroke * (1 + LOOK.pulseSwing * pulse)}
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
};
