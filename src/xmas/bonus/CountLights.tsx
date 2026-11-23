import React from 'react';
import type { CountLightsBonus } from '../data';
import { BULB } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import { px, useXmasFonts, useXmasFrame } from '../system';
import { revealAt } from './revealAt';
import type { RoundProps } from './registry';

/**
 * Bonus 7, Count the Lights: its own big light string in the play box (not the small progress string at the top of the
 * frame). One bulb per entry of slot.sequence; bulb i flashes once, in order from the left, in its colour (r = red,
 * g = green) for flashSec / sequence.length seconds (0.5 s), then goes dark again. The viewer counts the red ones. At
 * the reveal the red bulbs light up again and the green ones stay dark. The answer text is BonusScene's (slot.answers);
 * nothing is typed here. Drawn in the play box (844 x 400), reference units, ticks are design ticks.
 */
export const COUNT_LIGHTS = {
  /** the first flash starts this many ticks after playFrom (the string is fully on screen by playFrom + 8) */
  startDelay: 8,
  /** wire: x margin, y at the ends, extra sag in the middle */
  wire: { margin: 54, endY: 130, sag: 90 },
  bulb: { w: 46, h: 68, hang: 8, cap: 12 },
  /** soft fade in and out of one flash, ticks */
  edge: 2,
  glow: 30,
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Ticks one flash lasts: flashSec spread over the sequence (0.5 s = 15 ticks for the data in use). */
export const flashTicks = (slot: CountLightsBonus): number => (slot.flashSec * 30) / slot.sequence.length;

/** Number of red flashes in the sequence (the check; must equal slot.redCount). */
export const redFlashes = (slot: CountLightsBonus): number => slot.sequence.filter((c) => c === 'r').length;

/** Sounds: one flash-blip at each flash, at absolute design tick `start` (the tick the slot begins at). */
export const countLightsCues = (slot: CountLightsBonus, playFrom: number, start: number): SfxCue[] =>
  slot.sequence.map((_, i) => cue('flash-blip', Math.round(start + playFrom + COUNT_LIGHTS.startDelay + i * flashTicks(slot))));

const bulbX = (i: number, n: number) => COUNT_LIGHTS.wire.margin + (i * (844 - COUNT_LIGHTS.wire.margin * 2)) / (n - 1);
const wireY = (x: number) => {
  const u = (x - 422) / (422 - COUNT_LIGHTS.wire.margin);
  return COUNT_LIGHTS.wire.endY + COUNT_LIGHTS.wire.sag * (1 - u * u);
};
const wireAngle = (x: number) => {
  const u = (x - 422) / (422 - COUNT_LIGHTS.wire.margin);
  const slope = (-2 * COUNT_LIGHTS.wire.sag * u) / (422 - COUNT_LIGHTS.wire.margin);
  return (Math.atan(slope) * 180) / Math.PI;
};

export const CountLights: React.FC<RoundProps> = ({ slot, playFrom }) => {
  useXmasFonts();
  const t = useXmasFrame();
  if (slot.key !== 'countLights') throw new Error(`CountLights: slot ${slot.slot} is not a count the lights`);
  const s: CountLightsBonus = slot;
  const C = COUNT_LIGHTS;
  const n = s.sequence.length;
  const per = flashTicks(s);
  const k = springAt(t, playFrom - 8, 'smooth');
  const at = revealAt(s, playFrom);
  const relight = springAt(t, at, 'smooth');

  // the wire: the same swag the bulbs hang from, a little past the first and last bulb
  const pts = Array.from({ length: 41 }, (_, j) => {
    const x = 24 + (j * (844 - 48)) / 40;
    return `${px(x)},${px(wireY(x))}`;
  }).join(' ');

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: clamp01(k * 2), transform: `translateY(${px((1 - k) * 20)}px)` }}>
      <svg width={px(844)} height={px(400)} viewBox={`0 0 ${px(844)} ${px(400)}`} style={{ position: 'absolute', left: 0, top: 0 }}>
        <polyline points={pts} fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth={px(3)} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {s.sequence.map((c, i) => {
        const x = bulbX(i, n);
        const y = wireY(x);
        const colour = c === 'r' ? BULB.red : BULB.green;
        // flash i: lit from its start to its end, soft edges
        const from = playFrom + C.startDelay + i * per;
        const to = from + per;
        const flash = Math.min(clamp01((t - from) / C.edge + 0.001), clamp01((to - t) / C.edge + 0.001));
        const inFlash = t >= from && t < to ? Math.max(0, flash) : 0;
        // reveal: the red bulbs come back, the green ones stay dark
        const lit = Math.max(inFlash, c === 'r' ? relight : 0);
        const glow = C.glow * lit;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px(x - C.bulb.w / 2),
              top: px(y),
              width: px(C.bulb.w),
              height: px(C.bulb.cap + C.bulb.hang + C.bulb.h),
              transformOrigin: '50% 0%',
              transform: `rotate(${wireAngle(x)}deg)`,
            }}
          >
            {/* socket */}
            <div style={{ position: 'absolute', left: '50%', top: 0, width: px(C.bulb.w * 0.5), height: px(C.bulb.cap), marginLeft: px(-C.bulb.w * 0.25), borderRadius: `${px(3)}px ${px(3)}px ${px(2)}px ${px(2)}px`, background: 'rgba(200,205,220,0.55)' }} />
            {/* glass */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: px(C.bulb.cap + C.bulb.hang - 6),
                width: px(C.bulb.w),
                height: px(C.bulb.h),
                boxSizing: 'border-box',
                borderRadius: '50% 50% 50% 50% / 38% 38% 62% 62%',
                background: lit > 0.01 ? `radial-gradient(ellipse at 50% 40%, rgba(255,255,255,${0.85 * lit}) 0%, ${colour} 55%, color-mix(in srgb, ${colour} 70%, #000) 100%)` : 'rgba(255,255,255,0.08)',
                border: `${px(1.5)}px solid ${lit > 0.01 ? colour : 'rgba(255,255,255,0.22)'}`,
                boxShadow: lit > 0.01 ? `0 0 ${px(glow)}px ${px(glow * 0.25)}px color-mix(in srgb, ${colour} ${Math.round(70 * lit)}%, transparent)` : `inset ${px(1)}px ${px(1)}px 0 rgba(255,255,255,0.25)`,
                opacity: lit > 0.01 ? 1 : 0.9,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CountLights;
