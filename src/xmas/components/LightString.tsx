import React from 'react';
import { bulbColor, slotAt } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { TOTAL_SLOTS, counterParts } from '../ui';
import { LAYOUT, bulbStyle, bulbs, lightWirePath, px, textStyle, useXmasFonts } from '../system';

/**
 * LightString: 50 bulbs on a thin wire that sags in gentle waves along the top (y 40..77), plus the "N OF 50" counter
 * centred under the timer (y 688). Bulb n is slot n: its colour comes from data.ts bulbColor (red / green for movies,
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

const wirePath = lightWirePath();

export const LightString: React.FC<LightStringProps> = ({ litUpTo, pulseSlot, pulseFrame = 0, mode = 'progress', counter }) => {
  useXmasFonts();
  const list = bulbs();
  if (list.length !== TOTAL_SLOTS) throw new Error(`LightString: ${list.length} bulbs for ${TOTAL_SLOTS} slots`);
  const L = LAYOUT.lights;
  const all = mode === 'all';
  const parts = counter === undefined ? null : counterParts(counter);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(1280), height: px(720), pointerEvents: 'none' }}>
      <svg width={px(1280)} height={px(L.bottom + 3)} viewBox={`0 0 1280 ${L.bottom + 3}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={wirePath} fill="none" stroke="rgba(170,185,215,0.38)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
        {list.map((b) => (
          <rect key={b.i} x={b.x - 2.5} y={b.wireY - 0.5} width={5} height={L.hang + 2} rx={1.2} fill="rgba(120,135,165,0.55)" />
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
        const base = bulbStyle({ ...b, color }, lit, glow);
        const haloSize = (gold ? 64 : 48) * p;
        return (
          <React.Fragment key={b.i}>
            {p > 0 && lit ? (
              <div
                style={{
                  position: 'absolute',
                  left: px(b.x - haloSize / 2),
                  top: px(b.top + L.bulbH / 2 - haloSize / 2),
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
            left: 0,
            width: px(1280),
            top: px(LAYOUT.counter.box.y),
            height: px(LAYOUT.counter.box.h),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: px(16),
            // trailing letter-spacing pushes the text left by half a tracking step: balance it
            paddingLeft: px(0.3 * 24),
            boxSizing: 'border-box',
          }}
        >
          <span style={textStyle('counter')}>{parts.n}</span>
          <span style={textStyle('counterRest')}>{parts.rest}</span>
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
