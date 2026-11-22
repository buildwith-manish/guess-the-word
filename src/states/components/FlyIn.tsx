/**
 * FlyIn: the big stage shape travels to its place on the mini map over `dur` ticks, on an eased arc,
 * scaling down (and un-rotating) as it goes. Before `at` it sits on the `from` rect, after `at + dur` on its
 * mini-map slot. Absolutely positioned: mount it in a layer whose origin is the same as the rects.
 *
 * Rects (same coordinate space, px):
 *   from = the StateShape's square box on the stage:   { x, y, w: size, h: size }
 *   to   = the MiniMap's box:                           { x, y, w: mapSize, h: miniMapHeight(mapSize) }
 * The end position is computed here from the state's miniBBox (getMiniRect), centred on it.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { FLIGHT, sprFit } from '../motion';
import { COLORS } from '../../style';
import { getShape, SHAPE_BOX } from '../geo';
import { getMiniRect } from './MiniMap';
import type { Rect } from './MiniMap';
import { StateShape } from './StateShape';
import type { StateShapeMode } from './StateShape';

export interface FlyInProps {
  stateKey: string;
  /** the StateShape's square box on the stage */
  from: Rect;
  /** the MiniMap's box */
  to: Rect;
  /** tick the flight starts */
  at: number;
  /** flight length in ticks */
  dur: number;
  /** level accent colour (same as the stage shape) */
  accent?: string;
  /** degrees the stage shape was rotated by; eases to 0 on the way */
  rotation?: number;
  /** StateShape mode while flying (default 'filled') */
  mode?: StateShapeMode;
  /** StateShape fill / glow at take-off (glow fades out during the flight) */
  fill?: number;
  glow?: number;
  /** outline draw 0..1 (MEDIUM trace); default 1, so existing callers are unchanged */
  progress?: number;
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** Arc height as a fraction of the travel distance (motion.ts FLIGHT.arc). */
const ARC = FLIGHT.arc;

export const FlyIn: React.FC<FlyInProps> = ({
  stateKey,
  from,
  to,
  at,
  dur,
  accent = COLORS.cyan,
  rotation = 0,
  mode = 'filled',
  fill = 1,
  glow = 1,
  progress = 1,
  frame,
}) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;
  const p = sprFit(f, at, dur, 'normal');

  const geo = getShape(stateKey);
  const k = from.w / SHAPE_BOX;
  const fitW = geo.w * k;
  const fitH = geo.h * k;

  const slot = getMiniRect(stateKey, to);
  const startCx = from.x + from.w / 2;
  const startCy = from.y + from.h / 2;
  const endCx = slot.x + slot.w / 2;
  const endCy = slot.y + slot.h / 2;
  const endScale = Math.min(slot.w / fitW, slot.h / fitH);

  const dx = (endCx - startCx) * p;
  const dy = (endCy - startCy) * p;
  const dist = Math.hypot(endCx - startCx, endCy - startCy);
  const lift = -ARC * dist * Math.sin(Math.PI * p);
  const scale = 1 + (endScale - 1) * p;

  return (
    <div
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: from.w,
        height: from.h,
        transform: `translate(${dx}px, ${dy + lift}px) scale(${scale})`,
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
      }}
    >
      <StateShape stateKey={stateKey} size={from.w} progress={progress} mode={mode} accent={accent} fill={fill} glow={glow * (1 - p)} rotation={rotation * (1 - p)} />
    </div>
  );
};
