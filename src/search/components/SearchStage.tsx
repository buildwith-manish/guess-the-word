import React from 'react';
import { Background } from '../../Background';
import { COLORS, FONTS, SCALE, SAFE_X, SAFE_Y, glass, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import type { Hud as HudInfo } from '../types';
import '../../fonts';

/**
 * Layout frame for one round: Background, a HUD pill (top left), and five slots
 * (search, timer, hint, answer, dots) that take children.
 *
 * Every slot is `{ at?, children }`:
 *  - `at`: design tick (scene-local) when the slot fades in; omit = always there. Before `at` nothing is rendered.
 *  - `children`: a node, or a function that receives the slot's rect (see SLOTS) so the child can be
 *    given `at` and `size` from one source. The slot layer fills the frame, so children position
 *    themselves with their own reference-unit `at`, exactly as SearchBar / TimerBar / HintEmoji do.
 *
 * All rects are inside the safe margin from style.ts (SAFE_X, SAFE_Y), in 1280x720 reference units.
 */

export type Rect = { x: number; y: number; w: number; h: number }; // x = centre-x, y = top, w, h

/** Fade-in length of a slot, in seconds. Motion constant. */
const FADE_SECONDS = 0.25;

// Safe box in reference units, taken from style.ts.
const X0 = SAFE_X / SCALE;
const Y0 = SAFE_Y / SCALE;
const SW = 1280 - 2 * X0;
const SH = 720 - 2 * Y0;

const colX = (f: number) => X0 + SW * f;
const rowY = (f: number) => Y0 + SH * f;

/** Slot rects (centre-x, top-y, width, height), as proportions of the safe box. */
export const SLOTS = {
  hud: { x: X0, y: Y0, w: SW * 0.2, h: SH * 0.07 } as Rect, // x here is the LEFT edge
  search: { x: colX(0.36), y: rowY(0.14), w: SW * 0.5, h: SH * 0.64 } as Rect,
  timer: { x: colX(0.36), y: rowY(0.81), w: SW * 0.5, h: SH * 0.07 } as Rect,
  hint: { x: colX(0.82), y: rowY(0.2), w: SW * 0.34, h: SH * 0.3 } as Rect,
  answer: { x: colX(0.82), y: rowY(0.58), w: SW * 0.34, h: SH * 0.24 } as Rect,
  dots: { x: colX(0.5), y: rowY(0.97), w: SW, h: SH * 0.04 } as Rect, // y here is the CENTRE
};

export type SlotProps = {
  at?: number;
  children: React.ReactNode | ((rect: Rect) => React.ReactNode);
};

export type SearchStageProps = {
  /** Background colour pair [accent, base], from the level. */
  theme: [string, string];
  /** Level accent (HUD label colour). */
  accent: string;
  /** HUD text, e.g. label "EASY", number 3, total 10. */
  hud: HudInfo;
  /** Background calm-to-reveal energy, 0..1 (omit for the full look). */
  energy?: number;
  search?: SlotProps;
  timer?: SlotProps;
  hint?: SlotProps;
  answer?: SlotProps;
  dots?: SlotProps;
};

const Slot: React.FC<{ slot?: SlotProps; rect: Rect; frame: number }> = ({ slot, rect, frame }) => {
  if (!slot) return null;
  const at = slot.at ?? -Infinity;
  if (frame < at) return null;
  const k = slot.at === undefined ? 1 : Math.max(0, Math.min(1, (frame - at) / (FADE_SECONDS * FPS)));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: k }}>
      {typeof slot.children === 'function' ? slot.children(rect) : slot.children}
    </div>
  );
};

export const SearchStage: React.FC<SearchStageProps> = ({ theme, accent, hud, energy, search, timer, hint, answer, dots }) => {
  const frame = useDesignFrame();
  const pill = SLOTS.hud;
  const H = px(pill.h);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Background frame={frame} theme={theme} energy={energy} />

      {/* HUD pill, top left */}
      <div
        style={{
          position: 'absolute',
          left: px(pill.x),
          top: px(pill.y),
          height: H,
          padding: `0 ${H * 0.5}px`,
          display: 'flex',
          alignItems: 'center',
          gap: H * 0.3,
          fontFamily: FONTS.display,
          fontSize: H * 0.55,
          letterSpacing: H * 0.05,
          whiteSpace: 'pre',
          ...glass(H / 2),
        }}
      >
        <span style={{ color: accent }}>{hud.label}</span>
        <span style={{ color: COLORS.ink }}>
          {hud.number}/{hud.total}
        </span>
      </div>

      <Slot slot={search} rect={SLOTS.search} frame={frame} />
      <Slot slot={timer} rect={SLOTS.timer} frame={frame} />
      <Slot slot={hint} rect={SLOTS.hint} frame={frame} />
      <Slot slot={answer} rect={SLOTS.answer} frame={frame} />
      <Slot slot={dots} rect={SLOTS.dots} frame={frame} />
    </div>
  );
};
