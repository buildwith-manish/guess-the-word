import React from 'react';
import { GlassTile } from '../components/GlassTile';
import type { ControlCenterBonus } from '../data';
import { springAt } from '../shared/springs';
import { colors, px, useXmasFonts, useXmasFrame } from '../system';
import { clueIdOf } from './clueRef';
import { revealAt } from './revealAt';
import type { RoundProps } from './registry';

/**
 * Bonus 8, Control Center: one row of four toggle tiles (slot.icons), each a gold glass tile with an iOS switch under
 * it, all on. The tile whose image id is slot.decoy is the decoy. At the reveal the decoy tile grows a little and gets a
 * gold glow ring while the other three dim and their switches turn off. Image ids and the decoy come from data.ts.
 * No text. Drawn in the play box (844 x 400), reference units, ticks are design ticks.
 */
export const CONTROL_CENTER = {
  tile: 190,
  gap: 28,
  /** switch under each tile */
  sw: { w: 52, h: 30, gap: 18, knob: 24 },
  enterTicks: 8,
  stagger: 2,
  dimTo: 0.35,
  dimTicks: 10,
  popScale: 0.07,
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const ControlCenter: React.FC<RoundProps> = ({ slot, playFrom }) => {
  useXmasFonts();
  const t = useXmasFrame();
  if (slot.key !== 'controlCenter') throw new Error(`ControlCenter: slot ${slot.slot} is not a control center`);
  const c: ControlCenterBonus = slot;
  const C = CONTROL_CENTER;
  const ids = c.icons.map(clueIdOf);
  if (!ids.includes(c.decoy)) throw new Error(`ControlCenter: decoy ${c.decoy} is not one of the icons`);
  const at = revealAt(c, playFrom);
  const r = clamp01((t - at) / C.dimTicks);
  const pop = springAt(t, at, 'pop');
  const total = ids.length * C.tile + (ids.length - 1) * C.gap;
  const x0 = (844 - total) / 2;
  const groupH = C.tile + C.sw.gap + C.sw.h;
  const y0 = (400 - groupH) / 2;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {ids.map((id, i) => {
        const decoy = id === c.decoy;
        const enter = springAt(t, playFrom - C.enterTicks + i * C.stagger, 'smooth');
        const alpha = decoy ? 1 : 1 - (1 - C.dimTo) * r;
        const off = decoy ? 0 : r; // 1 = switch fully off
        const lift = decoy ? 1 + C.popScale * clamp01(pop) : 1;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px(x0 + i * (C.tile + C.gap)),
              top: px(y0),
              width: px(C.tile),
              height: px(groupH),
              opacity: clamp01(enter * 2) * alpha,
              transform: `translateY(${px((1 - enter) * 24)}px) scale(${lift})`,
              transformOrigin: '50% 40%',
            }}
          >
            {decoy && t >= at ? (
              <div
                style={{
                  position: 'absolute',
                  left: px(-8),
                  top: px(-8),
                  width: px(C.tile + 16),
                  height: px(C.tile + 16),
                  borderRadius: px((C.tile + 16) * 0.27),
                  boxSizing: 'border-box',
                  border: `${px(4)}px solid ${colors.gold}`,
                  boxShadow: `0 0 ${px(26)}px ${px(4)}px rgba(255,200,87,0.5)`,
                  opacity: clamp01(pop * 1.5),
                }}
              />
            ) : null}
            <GlassTile imageId={id} side="bonus" size={C.tile} light={false} frosted={false} />
            {/* iOS switch: on = green with the knob right, off = grey with the knob left */}
            <div
              style={{
                position: 'absolute',
                left: px((C.tile - C.sw.w) / 2),
                top: px(C.tile + C.sw.gap),
                width: px(C.sw.w),
                height: px(C.sw.h),
                borderRadius: px(C.sw.h / 2),
                boxSizing: 'border-box',
                background: `color-mix(in srgb, ${colors.green} ${Math.round((1 - off) * 100)}%, rgba(120,120,128,0.45))`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: px((C.sw.h - C.sw.knob) / 2),
                  left: px(3 + (C.sw.w - C.sw.knob - 6) * (1 - off)),
                  width: px(C.sw.knob),
                  height: px(C.sw.knob),
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: `0 ${px(2)}px ${px(4)}px rgba(0,0,0,0.3)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ControlCenter;
