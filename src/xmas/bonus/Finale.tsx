import React from 'react';
import { GlassTile } from '../components/GlassTile';
import type { FinaleBonus } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import { bonusTileGlass, colors, px, useXmasFonts, useXmasFrame } from '../system';
import { clueIdOf } from './clueRef';
import type { RoundProps } from './registry';

/**
 * Bonus 10, Finale (iOS widget stack): a 2 x 2 widget of the slot's four clue tiles, with two widgets peeking out
 * behind it (the stack) and page dots at its right. The four tiles pop in one after another before play starts and stay
 * through the reveal. No text here (BonusScene shows the pass rule). Drawn in the play box (844 x 400), reference units.
 */
export const FINALE = {
  widget: 372,
  /** widget top in the play box; the two back widgets peek out above it */
  top: 28,
  pad: 18,
  gap: 14,
  /** back widgets: width fraction of the front one, top y */
  back: [
    { scale: 0.92, top: 14, alpha: 0.7 },
    { scale: 0.84, top: 0, alpha: 0.45 },
  ],
  dots: { count: 3, size: 10, gap: 14, offsetX: 24 },
  /** the widget starts to enter this many ticks before playFrom; tile i starts (tileEnter - i * tileStagger) ticks before playFrom */
  widgetEnter: 12,
  tileEnter: 8,
  tileStagger: 2,
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Sounds: one widget-pop per tile, at absolute design tick `playFrom` (the tick play starts at). */
export const finaleCues = (slot: FinaleBonus, playFrom: number): SfxCue[] =>
  slot.tiles.map((_, i) => cue('widget-pop', playFrom - FINALE.tileEnter + i * FINALE.tileStagger));

export const Finale: React.FC<RoundProps> = ({ slot, playFrom }) => {
  useXmasFonts();
  const t = useXmasFrame();
  if (slot.key !== 'finale') throw new Error(`Finale: slot ${slot.slot} is not a finale`);
  const f: FinaleBonus = slot;
  const F = FINALE;
  const tile = (F.widget - F.pad * 2 - F.gap) / 2;
  const x0 = (844 - F.widget) / 2;
  const k = springAt(t, playFrom - F.widgetEnter, 'smooth');
  const rise = (1 - k) * 24;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: clamp01(k * 2), transform: `translateY(${px(rise)}px)` }}>
      {/* the stack behind the front widget */}
      {F.back.map((b, i) => {
        const w = F.widget * b.scale;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px(x0 + (F.widget - w) / 2),
              top: px(b.top),
              width: px(w),
              height: px(F.widget),
              borderRadius: px(60),
              background: `color-mix(in srgb, ${colors.gold} 14%, rgba(34,44,66,${b.alpha}))`,
              border: `${px(1)}px solid rgba(255,255,255,0.18)`,
              boxSizing: 'border-box',
            }}
          />
        );
      })}

      {/* the front widget: gold glass with a 2 x 2 grid of tiles */}
      <div
        style={{
          position: 'absolute',
          left: px(x0),
          top: px(F.top),
          width: px(F.widget),
          height: px(F.widget),
          ...bonusTileGlass(),
          borderRadius: px(60),
        }}
      >
        {f.tiles.map((ref, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px(F.pad + (i % 2) * (tile + F.gap)),
              top: px(F.pad + Math.floor(i / 2) * (tile + F.gap)),
            }}
          >
            <GlassTile imageId={clueIdOf(ref)} side="bonus" size={tile} light={false} frosted={false} enterFrame={playFrom - F.tileEnter + i * F.tileStagger} />
          </div>
        ))}
      </div>

      {/* page dots of the stack */}
      {Array.from({ length: F.dots.count }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: px(x0 + F.widget + F.dots.offsetX),
            top: px(F.top + F.widget / 2 - ((F.dots.count - 1) * (F.dots.size + F.dots.gap)) / 2 + i * (F.dots.size + F.dots.gap) - F.dots.size / 2),
            width: px(F.dots.size),
            height: px(F.dots.size),
            borderRadius: '50%',
            background: i === 0 ? colors.gold : 'rgba(255,255,255,0.30)',
          }}
        />
      ))}
    </div>
  );
};

export default Finale;
