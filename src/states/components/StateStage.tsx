/**
 * StateStage: the layout frame of one question. Background (reused from src/Background.tsx), HUD pill top left
 * (level + number), title slot top centre, ring area + shape area in the centre, mini map bottom right, a
 * full-frame card layer and a full-frame overlay layer (for FlyIn). Every slot takes children and an `at` tick:
 * before `at` it is not drawn, after it it fades in over a few ticks. Children can be a function of the slot's
 * rect. STAGE_LAYOUT exposes the rects so scenes can size components and compute FlyIn's rects.
 * iOS look: calm IosBackground (level accent), frosted HUD pill. The HUD is a small own pill: src/Hud.tsx is word-quiz specific (HudPlan, GTW bonus plan), so it is not reused.
 * Time from useDesignFrame() unless `frame` is passed.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { IOS, IosBackground } from '../../ios';
import { S, SAFE_X, SAFE_Y, px } from '../../style';
import { enter } from '../motion';
import {RADIUS, glassPanel, COLOR, FONT, WEIGHT } from '../look';
import { HEIGHT, LEVELS, TOTAL, WIDTH } from '../state-timing';
import type { Level } from '../states-data';
import type { Rect } from './MiniMap';
import { miniMapHeight } from './MiniMap';
import { StateBackdrop } from './StateBackdrop';

export interface StageSlot {
  /** tick the slot appears (omit = always) */
  at?: number;
  /** fade in over a few ticks once `at` is reached (default true; AnswerCard slot defaults to false) */
  fade?: boolean;
  children: React.ReactNode | ((rect: Rect) => React.ReactNode);
}

export interface StateStageProps {
  /** level of the question (picks theme and accent from states-settings.json) */
  level: Level;
  /** question number 1-50 shown in the HUD pill */
  number: number;
  /** total shown in the pill (default TOTAL) */
  total?: number;
  slots?: {
    title?: StageSlot;
    /** square box for StateShape / PixelReveal / CropMask / EmojiFill (same `size`) */
    shape?: StageSlot;
    /** square box for TimerRing (same `size`) */
    ring?: StageSlot;
    /** MiniMap box (same `size` = rect.w) */
    miniMap?: StageSlot;
    /** full-frame layer for AnswerCard */
    card?: StageSlot;
    /** full-frame layer above the rest but below the card, for FlyIn */
    overlay?: StageSlot;
  };
  /** background phase 0 (calm) .. 1 (reveal); omit for the full look */
  energy?: number;
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** Layout proportions of the 2560x1440 frame. */
const LAYOUT = {
  /** vertical centre of the stage, as a fraction of the height */
  centerY: 0.54,
  /** ring diameter as a fraction of the height */
  ring: 0.72,
  /** shape box as a fraction of the ring */
  shapeInRing: 0.8,
  /** mini map width as a fraction of the width */
  mini: 0.22,
  /** title slot size, fractions of width / ref px */
  titleW: 0.4,
  titleH: 80,
  /** HUD pill ref px */
  hudFont: 24,
  /** HUD pill padding and name/number gap, ref px (kept clear of the title lockup: scripts/states-qa.js check 10) */
  hudPadX: 20,
  hudGap: 12,
  /** slot fade length in ticks */
  fade: 10,
  /** timer ring diameter, ref px (was TIMER_SIZE in StateRound) */
  timer: 190,
  /** gap between the ring and the shape box, ref px (round two, Step 6: the ring sits next to the shape, not at the left margin) */
  ringGap: 40,
  /** the ring + shape group is nudged right by this much (ref px) to balance the empty right side ... */
  groupShift: 47,
  /** ... but never closer than this to the corner mini map (ref px) */
  miniClear: 40,
};

const square = (cx: number, cy: number, side: number): Rect => ({ x: cx - side / 2, y: cy - side / 2, w: side, h: side });

const computeLayout = () => {
  const cx = WIDTH / 2;
  const cy = HEIGHT * LAYOUT.centerY;
  const ringD = HEIGHT * LAYOUT.ring;
  const miniW = WIDTH * LAYOUT.mini;
  const miniH = miniMapHeight(miniW);
  const titleW = WIDTH * LAYOUT.titleW;
  const miniMap = { x: WIDTH - SAFE_X - miniW, y: HEIGHT - SAFE_Y - miniH, w: miniW, h: miniH } as Rect;
  const shape0 = square(cx, cy, ringD * LAYOUT.shapeInRing);
  const shift = Math.max(0, Math.min(px(LAYOUT.groupShift), miniMap.x - px(LAYOUT.miniClear) - (shape0.x + shape0.w)));
  const shape = square(cx + shift, cy, ringD * LAYOUT.shapeInRing);
  const timerD = px(LAYOUT.timer);
  return {
    frame: { x: 0, y: 0, w: WIDTH, h: HEIGHT } as Rect,
    /** the clock ring, level with the shape and `ringGap` to its left */
    timer: { x: shape.x - px(LAYOUT.ringGap) - timerD, y: cy - timerD / 2, w: timerD, h: timerD } as Rect,
    /** inside the 5% safe margin */
    safe: { x: SAFE_X, y: SAFE_Y, w: WIDTH - 2 * SAFE_X, h: HEIGHT - 2 * SAFE_Y } as Rect,
    title: { x: (WIDTH - titleW) / 2, y: SAFE_Y, w: titleW, h: px(LAYOUT.titleH) } as Rect,
    ring: square(cx, cy, ringD),
    shape,
    miniMap,
  };
};

export const STAGE_LAYOUT = computeLayout();

const SlotBox: React.FC<{ rect: Rect; slot?: StageSlot; frame: number; fadeDefault?: boolean; centre?: boolean }> = ({
  rect,
  slot,
  frame,
  fadeDefault = true,
  centre = false,
}) => {
  if (!slot) return null;
  if (slot.at !== undefined && frame < slot.at) return null;
  const fade = slot.fade ?? fadeDefault;
  // slots come in on the quick spring (a short rise + fade + scale 0.97 -> 1); static slots stay as they are
  const e = fade && slot.at !== undefined ? enter(frame, slot.at, 'quick', 12) : undefined;
  const opacity = e ? e.opacity : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        opacity,
        ...(e ? { transform: e.transform } : {}),
        ...(centre ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}),
      }}
    >
      {typeof slot.children === 'function' ? slot.children(rect) : slot.children}
    </div>
  );
};

export const StateStage: React.FC<StateStageProps> = ({ level, number, total = TOTAL, slots = {}, energy, frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;
  const cfg = LEVELS.find((l) => l.name === level);
  if (!cfg) throw new Error(`Unknown level ${level}`);
  const L = STAGE_LAYOUT;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: WIDTH, height: HEIGHT, overflow: 'hidden' }}>
      <IosBackground accent={cfg.accent} />
      <StateBackdrop accent={cfg.accent} />

      <SlotBox rect={L.ring} slot={slots.ring} frame={f} />
      <SlotBox rect={L.shape} slot={slots.shape} frame={f} />
      <SlotBox rect={L.title} slot={slots.title} frame={f} centre />

      <div
        style={{
          ...glassPanel(px(RADIUS.pill), undefined, 0.4),
          position: 'absolute',
          left: S.hudLeft,
          top: S.hudTop,
          padding: `${px(8)}px ${px(LAYOUT.hudPadX)}px`,
          display: 'flex',
          alignItems: 'baseline',
          gap: px(LAYOUT.hudGap),
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.strong,
          fontSize: px(LAYOUT.hudFont),
          whiteSpace: 'pre',
        }}
      >
        <span style={{ color: COLOR.text.label }}>{cfg.name}</span>
        <span style={{ color: COLOR.text.primary, fontVariantNumeric: 'tabular-nums' }}>{`${number} / ${total}`}</span>
      </div>

      <SlotBox rect={L.miniMap} slot={slots.miniMap} frame={f} />
      <SlotBox rect={L.frame} slot={slots.overlay} frame={f} />
      <SlotBox rect={L.frame} slot={slots.card} frame={f} fadeDefault={false} />
    </div>
  );
};
