/**
 * MiniMap: all 50 states from the `mini` paths (975x610 Albers map, AK and HI insets).
 * Unanswered = lifted white fill + hairline (look.ts MAP); answered = filled in that state's level colour; current = pulsing outline;
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
import { MINI_PULSE, COLOR, MAP, whiteA } from '../look';

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
  /**
   * The state that is landing: while `p` goes 0 -> 1 its piece fades from the dim style to the answered accent fill, so
   * there is no swap at the stamp. Default undefined (old behaviour). At p = 1 it draws exactly like an answered state.
   */
  arriving?: { key: string; p: number };
  /** landing pulse: scales the piece `key` (and its outline) about its own centre; other states do not move. Default undefined */
  pulse?: { key: string; scale: number };
  /** 0..1 strength of the region glow (highlightRegion); default 1 (old behaviour) */
  regionGlow?: number;
  /** 0..1 strength of the `current` outline (halo and stroke); default 1 (old behaviour) */
  currentAlpha?: number;
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

export const MiniMap: React.FC<MiniMapProps> = ({ answered = [], current, highlightRegion, size, arriving, currentAlpha = 1, regionGlow = 1, pulse: pulseProp, frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;

  const paths = useMemo(() => STATES.map((s) => ({ key: s.key, region: s.region, d: getShape(s.key).mini, accent: levelAccent(s.key) })), []);
  const done = useMemo(() => new Set(answered), [answered]);

  const period = ms(LOOK.pulseMs);
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / period);
  const cur = current ? paths.find((p) => p.key === current) : undefined;
  // landing pulse: a scale about the centre of the state's own box (map units); undefined when there is none
  const pulseT = (key: string): string | undefined => {
    if (!pulseProp || pulseProp.key !== key || pulseProp.scale === 1) return undefined;
    const [x0, y0, x1, y1] = getShape(key).miniBBox;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return `translate(${cx} ${cy}) scale(${pulseProp.scale}) translate(${-cx} ${-cy})`;
  };
  const glowing = highlightRegion && regionGlow > 0 ? paths.filter((p) => p.region === highlightRegion) : [];

  return (
    <svg width={size} height={miniMapHeight(size)} viewBox={`0 0 ${MINI_W} ${MINI_H}`} style={{ display: 'block', overflow: 'visible' }}>
      {paths.map((p) => {
        const answeredPath = (opacity = 1) => (
          <path key={p.key} d={p.d} opacity={opacity} transform={pulseT(p.key)} fill={p.accent} fillOpacity={LOOK.answeredFillAlpha} stroke={COLORS.base} strokeOpacity={LOOK.answeredEdgeAlpha} strokeWidth={LOOK.edge} strokeLinejoin="round" />
        );
        const dimPath = (opacity = 1) => (
          <path key={`${p.key}-dim`} d={p.d} opacity={opacity} fill={whiteA(MAP.unansweredFill)} stroke={whiteA(MAP.unansweredEdge)} strokeWidth={MAP.unansweredEdgeWidth} strokeLinejoin="round" />
        );
        if (done.has(p.key)) return answeredPath();
        if (arriving && arriving.key === p.key) {
          const a = Math.max(0, Math.min(1, arriving.p));
          if (a >= 1) return answeredPath();
          if (a <= 0) return dimPath();
          return (
            <React.Fragment key={p.key}>
              {dimPath(1 - a)}
              {answeredPath(a)}
            </React.Fragment>
          );
        }
        return dimPath();
      })}

      {glowing.map((p) =>
        LOOK.halo.map((h, i) => (
          <path key={`g-${p.key}-${i}`} d={p.d} fill="none" stroke={COLOR.text.primary} strokeOpacity={h.a * regionGlow} strokeWidth={LOOK.edge * h.k} strokeLinejoin="round" strokeLinecap="round" />
        )),
      )}

      {cur && (
        <g transform={pulseT(cur.key)}>
          {LOOK.halo.map((h, i) => (
            <path key={`c-${i}`} d={cur.d} fill="none" stroke={COLOR.text.primary} strokeOpacity={h.a * (1 + MINI_PULSE.lift * pulse) * currentAlpha} strokeWidth={LOOK.edge * h.k} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          <path
            d={cur.d}
            fill="none"
            stroke={COLOR.text.primary}
            strokeOpacity={(1 - LOOK.pulseSwing * (1 - pulse)) * currentAlpha}
            strokeWidth={LOOK.currentStroke * (1 + LOOK.pulseSwing * pulse)}
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
};
