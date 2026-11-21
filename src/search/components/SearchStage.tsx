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

/** Background drift light: loop length in seconds, travel in % of the frame, size in %, strength. Motion constants. */
const DRIFT_SECONDS = 40;
const DRIFT_RANGE_X = 14;
const DRIFT_RANGE_Y = 9;
const DRIFT_W = 60;
const DRIFT_H = 55;
const DRIFT_ALPHA = 0.045;

/** Atmosphere (task 8c). Two slow accent-coloured lights and a vignette that builds with `tension`. Motion constants. */
const AMBIENT_SECONDS = [53, 71]; // loop length of each light; different, so they never line up
const AMBIENT_SIZE = 46; // % of the frame
const AMBIENT_PERCENT = 13; // strength of each light, percent of the accent
const VIGNETTE_PERCENT = 46; // accent strength at the frame edge when tension = 1
const VIGNETTE_INNER = 52; // % of the way out where the vignette starts
const PULSE_FROM = 0.55; // tension where the once-a-second pulse starts
const PULSE_DEPTH = 0.18;
const mixAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent.toFixed(2)}%, transparent)`;

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
  search: { x: colX(0.36), y: rowY(0.17), w: SW * 0.5, h: SH * 0.62 } as Rect,
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
  /** Level accent. Kept for API compatibility; the stage itself is neutral (accent lives on timer, current dot, stamp). */
  accent: string;
  /** HUD text, e.g. label "EASY", number 3, total 10. */
  hud: HudInfo;
  /** Background calm-to-reveal energy, 0..1 (omit for the full look). */
  energy?: number;
  /** 0..1. Builds an accent vignette (and a pulse) toward the end of the clock. 0 or omitted = none. */
  tension?: number;
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

export const SearchStage: React.FC<SearchStageProps> = ({ theme, accent, hud, energy, tension = 0, search, timer, hint, answer, dots }) => {
  const frame = useDesignFrame();
  const pill = SLOTS.hud;
  const H = px(pill.h);
  const driftT = (frame / (DRIFT_SECONDS * FPS)) * Math.PI * 2;
  const driftX = 40 + DRIFT_RANGE_X * Math.sin(driftT);
  const driftY = 45 + DRIFT_RANGE_Y * Math.sin(driftT * 2 + 1);

  const amb = AMBIENT_SECONDS.map((sec, i) => (frame / (sec * FPS)) * Math.PI * 2 + i * 2.1);
  const pulse = tension > PULSE_FROM ? 1 - PULSE_DEPTH * (0.5 + 0.5 * Math.cos((frame / FPS) * Math.PI * 2)) : 1;
  const vignette = Math.max(0, Math.min(1, tension)) * pulse;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Background frame={frame} theme={theme} energy={energy} />

      {/* Subtle drift: one very soft light that wanders behind the content (about 40 s per loop). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse ${DRIFT_W}% ${DRIFT_H}% at ${driftX}% ${driftY}%, rgba(255,255,255,${DRIFT_ALPHA}), rgba(255,255,255,0) 70%)`,
        }}
      />

      {/* Atmosphere: two slow lights in the level accent, behind everything. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: [
            `radial-gradient(ellipse ${AMBIENT_SIZE}% ${AMBIENT_SIZE}% at ${72 + 16 * Math.sin(amb[0])}% ${28 + 14 * Math.cos(amb[0])}%, ${mixAlpha(accent, AMBIENT_PERCENT)}, transparent 70%)`,
            `radial-gradient(ellipse ${AMBIENT_SIZE}% ${AMBIENT_SIZE}% at ${24 + 14 * Math.cos(amb[1])}% ${72 + 12 * Math.sin(amb[1])}%, ${mixAlpha(accent, AMBIENT_PERCENT)}, transparent 70%)`,
          ].join(', '),
        }}
      />

      {/* Tension: accent vignette that builds as the clock runs down (harder levels pass a higher value). */}
      {vignette > 0.001 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(ellipse at 50% 50%, transparent ${VIGNETTE_INNER}%, ${mixAlpha(accent, VIGNETTE_PERCENT * vignette)} 100%)`,
          }}
        />
      )}

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
        <span style={{ color: COLORS.muted }}>{hud.label}</span>
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
