import React from 'react';
import { useCurrentFrame } from 'remotion';
import { bulbColor, slotAt } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { TOTAL_SLOTS, counterParts } from '../ui';
import { LAYOUT, REF, bulbStyle, bulbs, colors, glassSurface, lightWireY, px, textStyle, useXmasFonts } from '../system';
import { withoutBackdrop } from './TimerToPill';

/**
 * LightString: 50 bulbs on a thin wire that sags in gentle waves along the top (y 40..77), plus the "N OF 50" counter in a small glass pill
 * at the top left of the safe box (x 128, y 88..128, number thickened with a hairline stroke; Inter is loaded to 700 only). Bulb n is slot n: its colour comes from data.ts bulbColor (red / green for movies,
 * gold for bonus rounds). Unlit bulbs are dim blue-grey glass.
 *
 * Stateless: the same props give the same picture, so a Part started alone renders the same as in the full video.
 * Absolutely positioned over the whole 1280x720 reference frame; put it inside a frame-sized parent.
 */
export type LightStringProps = {
  /** number of slots already revealed: slots 1..litUpTo are lit */
  litUpTo: number;
  /** the slot whose bulb lights now */
  pulseSlot?: number;
  /** design ticks since that bulb lit. 0 = the tick it lights, negative = not yet (the bulb is still dim). Drives the glow pop. */
  pulseFrame?: number;
  /** 'all' = the ending: every bulb glows (a soft ripple runs along the string while pulseFrame advances) */
  mode?: 'progress' | 'all';
  /** slot number shown in the counter ("7 OF 50"); omit to hide the counter */
  counter?: number;
};

/** ticks the glow pop lasts */
const POP_TICKS = 14;

/** 0..1: quick rise, soft fall. 0 outside the pop. */
const pop = (ticks: number): number => {
  if (ticks < 0 || ticks >= POP_TICKS) return 0;
  return Math.sin(Math.PI * Math.pow(ticks / POP_TICKS, 0.6));
};

/**
 * Sway: a slow travelling wave along the wire, deterministic from the render frame (60 fps), no randomness.
 * 1.6 reference units peak (about 3 px at 2560 wide), one cycle every 6 s, a quarter wave across the width.
 * Bulbs hang from the wire, so they move with it.
 */
const SWAY = { amp: 1.6, periodFrames: 360, waveLen: 1280 * 4 } as const;
const swayAt = (x: number, frame: number): number => SWAY.amp * Math.sin(2 * Math.PI * (frame / SWAY.periodFrames - x / SWAY.waveLen));

const wirePathAt = (frame: number): string => {
  const pts: string[] = [];
  for (let x = 0; x <= REF.w; x += 8) pts.push(`${x === 0 ? 'M' : 'L'} ${x} ${(lightWireY(x) + swayAt(x, frame)).toFixed(2)}`);
  return pts.join(' ');
};


export const LightString: React.FC<LightStringProps> = ({ litUpTo, pulseSlot, pulseFrame = 0, mode = 'progress', counter }) => {
  useXmasFonts();
  const list = bulbs();
  if (list.length !== TOTAL_SLOTS) throw new Error(`LightString: ${list.length} bulbs for ${TOTAL_SLOTS} slots`);
  const L = LAYOUT.lights;
  const C = LAYOUT.counter;
  const all = mode === 'all';
  const parts = counter === undefined ? null : counterParts(counter);
  const frame = useCurrentFrame();
  const wirePath = wirePathAt(frame);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(1280), height: px(720), pointerEvents: 'none' }}>
      <svg width={px(1280)} height={px(L.bottom + 3)} viewBox={`0 0 1280 ${L.bottom + 3}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={wirePath} fill="none" stroke="rgba(170,185,215,0.38)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
        {list.map((b) => (
          <rect key={b.i} x={b.x - 2.5} y={b.wireY + swayAt(b.x, frame) - 0.5} width={5} height={L.hang + 2} rx={1.2} fill="rgba(120,135,165,0.55)" />
        ))}
      </svg>

      {list.map((b) => {
        const n = b.i + 1;
        const slot = slotAt(n);
        const color = bulbColor(slot);
        const isPulse = !all && n === pulseSlot;
        const lit = all || n <= litUpTo || (isPulse && pulseFrame >= 0);
        // pop: the pulsing bulb; in 'all' mode a ripple that travels along the string (pulseFrame advances)
        const p = isPulse ? pop(pulseFrame) : all ? pop(pulseFrame - b.i * 0.8) : 0;
        const gold = slot.kind === 'bonus';
        const glow = (all ? 1.35 : 1) * (1 + (gold ? 1.9 : 1.4) * p);
        const dy = swayAt(b.x, frame);
        const sb = { ...b, color, wireY: b.wireY + dy, top: b.top + dy };
        const base = bulbStyle(sb, lit, glow * 1.15);
        const haloSize = (gold ? 64 : 48) * p;
        // steady bloom of every lit bulb: soft radial gradient behind the glass
        const bloomSize = gold ? 46 : 40;
        return (
          <React.Fragment key={b.i}>
            {lit ? (
              <div
                style={{
                  position: 'absolute',
                  left: px(b.x - bloomSize / 2),
                  top: px(sb.top + L.bulbH / 2 - bloomSize / 2),
                  width: px(bloomSize),
                  height: px(bloomSize),
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${color}66 0%, ${color}2e 38%, ${color}00 72%)`,
                }}
              />
            ) : null}
            {p > 0 && lit ? (
              <div
                style={{
                  position: 'absolute',
                  left: px(b.x - haloSize / 2),
                  top: px(sb.top + L.bulbH / 2 - haloSize / 2),
                  width: px(haloSize),
                  height: px(haloSize),
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${color}88 0%, ${color}00 70%)`,
                  opacity: Math.min(1, p),
                }}
              />
            ) : null}
            <div style={{ ...base, transform: `scale(${1 + 0.22 * p})`, transformOrigin: '50% 0%' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '24%',
                  top: '14%',
                  width: '30%',
                  height: '34%',
                  borderRadius: '50%',
                  background: `rgba(255,255,255,${lit ? 0.5 : 0.16})`,
                }}
              />
            </div>
          </React.Fragment>
        );
      })}

      {parts ? (
        <div
          style={{
            position: 'absolute',
            left: px(C.box.x),
            top: px(C.box.y),
            height: px(C.box.h),
            display: 'flex',
            alignItems: 'center',
            gap: px(C.gap),
            // the trailing letter-spacing of the last word adds to the right padding: take it off
            padding: `0 ${px(C.padX - C.tracking * 24)}px 0 ${px(C.padX)}px`,
            whiteSpace: 'nowrap',
            ...withoutBackdrop(glassSurface(C.box.h / 2, { edge: 0.6, depth: 0.45, base: colors.glassBase })),
          }}
        >
          <span style={{ ...textStyle('counter'), letterSpacing: `${C.tracking}em`, WebkitTextStroke: `${px(0.7)}px currentColor` }}>{parts.n}</span>
          <span style={{ ...textStyle('counterRest'), letterSpacing: `${C.tracking}em` }}>{parts.rest}</span>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Sounds for a bulb lighting: `bulb-on` for a movie slot, `gold-bulb` for a bonus slot.
 * `frame` is the absolute design frame (30 fps) at which the bulb lights (pulseFrame 0).
 */
export const bulbCues = (slot: number, frame: number): SfxCue[] => [cue(slotAt(slot).kind === 'bonus' ? 'gold-bulb' : 'bulb-on', frame)];

export default LightString;
