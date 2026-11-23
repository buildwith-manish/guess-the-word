import React from 'react';
import type { OddOneOutBonus } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import { bonusTileGlass, colors, px, useXmasFonts, useXmasFrame } from '../system';
import { revealAt } from './revealAt';
import type { RoundProps } from './registry';

/**
 * Bonus 3, Odd One Out (iOS emoji keyboard): a gold glass keyboard panel with an empty search pill on top, a grid of
 * grid.cols x grid.rows emoji (grid.common everywhere, grid.odd at grid.oddIndex, counted row by row from 0 at the top
 * left) and a row of category dots at the bottom. At the reveal a glowing gold ring marks the odd emoji and the other
 * emoji dim. The emoji are drawn as text in the loaded Noto Color Emoji face. No text of our own. Drawn in the play box
 * (844 x 400), reference units, ticks are design ticks.
 */
export const ODD_ONE_OUT = {
  panel: { w: 640, h: 400, radius: 56, pad: 18 },
  search: { h: 32, w: 300 },
  dots: { count: 6, size: 9, gap: 14 },
  /** emoji size (font size) and the ring diameter */
  emoji: 54,
  ring: 84,
  dimTo: 0.4,
  dimTicks: 10,
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Sound: ring-glow at the reveal, at absolute design tick `start` (the tick the slot begins at). */
export const oddOneOutCues = (slot: OddOneOutBonus, playFrom: number, start: number): SfxCue[] => [cue('ring-glow', start + revealAt(slot, playFrom))];

export const OddOneOut: React.FC<RoundProps> = ({ slot, playFrom }) => {
  useXmasFonts();
  const t = useXmasFrame();
  if (slot.key !== 'oddOneOut') throw new Error(`OddOneOut: slot ${slot.slot} is not an odd one out`);
  const g = slot.grid;
  const O = ODD_ONE_OUT;
  const k = springAt(t, playFrom - 10, 'smooth');
  const at = revealAt(slot, playFrom);
  const r = clamp01((t - at) / O.dimTicks);
  const ring = springAt(t, at, 'pop');
  const pulse = t >= at ? 0.5 + 0.5 * Math.sin(((t - at) / 20) * Math.PI * 2) : 0;

  const gridTop = O.panel.pad + O.search.h + 14;
  const gridBottom = O.panel.h - O.panel.pad - O.dots.size - 14;
  const cellW = (O.panel.w - O.panel.pad * 2) / g.cols;
  const cellH = (gridBottom - gridTop) / g.rows;
  const left = (844 - O.panel.w) / 2;
  const cellX = (i: number) => O.panel.pad + (i % g.cols) * cellW + cellW / 2;
  const cellY = (i: number) => gridTop + Math.floor(i / g.cols) * cellH + cellH / 2;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div
        style={{
          position: 'absolute',
          left: px(left),
          top: 0,
          width: px(O.panel.w),
          height: px(O.panel.h),
          ...bonusTileGlass(),
          borderRadius: px(O.panel.radius),
          opacity: clamp01(k * 2),
          transform: `translateY(${px((1 - k) * 28)}px)`,
        }}
      >
        {/* empty search pill */}
        <div
          style={{
            position: 'absolute',
            left: px((O.panel.w - O.search.w) / 2),
            top: px(O.panel.pad),
            width: px(O.search.w),
            height: px(O.search.h),
            borderRadius: px(O.search.h / 2),
            background: 'rgba(255,255,255,0.12)',
            boxShadow: `inset ${px(1)}px ${px(1)}px 0 rgba(255,255,255,0.25)`,
          }}
        />
        {/* the emoji grid */}
        {Array.from({ length: g.cols * g.rows }, (_, i) => {
          const odd = i === g.oddIndex;
          const dim = odd ? 1 : 1 - (1 - O.dimTo) * r;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: px(cellX(i) - cellW / 2),
                top: px(cellY(i) - cellH / 2),
                width: px(cellW),
                height: px(cellH),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Noto Color Emoji", sans-serif',
                fontSize: px(O.emoji),
                lineHeight: 1,
                opacity: dim,
                transform: odd ? `scale(${1 + 0.14 * clamp01(ring)})` : undefined,
              }}
            >
              {odd ? g.odd : g.common}
            </div>
          );
        })}
        {/* the ring */}
        {t >= at ? (
          <div
            style={{
              position: 'absolute',
              left: px(cellX(g.oddIndex) - O.ring / 2),
              top: px(cellY(g.oddIndex) - O.ring / 2),
              width: px(O.ring),
              height: px(O.ring),
              borderRadius: '50%',
              boxSizing: 'border-box',
              border: `${px(4)}px solid ${colors.gold}`,
              boxShadow: `0 0 ${px(18 + 14 * pulse)}px ${px(3)}px rgba(255,200,87,${0.45 + 0.25 * pulse}), inset 0 0 ${px(14)}px rgba(255,200,87,0.35)`,
              opacity: clamp01(ring * 1.5),
              transform: `scale(${1.5 - 0.5 * clamp01(ring)})`,
            }}
          />
        ) : null}
        {/* category dots */}
        <div style={{ position: 'absolute', left: 0, width: '100%', top: px(O.panel.h - O.panel.pad - O.dots.size), display: 'flex', justifyContent: 'center', gap: px(O.dots.gap) }}>
          {Array.from({ length: O.dots.count }, (_, i) => (
            <div key={i} style={{ width: px(O.dots.size), height: px(O.dots.size), borderRadius: '50%', background: i === 0 ? colors.gold : 'rgba(255,255,255,0.28)' }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OddOneOut;
