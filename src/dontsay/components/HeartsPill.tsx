// Honour-system: the video does not track hearts. This pill is a reference only.
/**
 * HeartsPill: small frosted pill, top-left, three drawn hearts plus a label.
 * It springs in ONCE at level start (hearts arrive on a 4-frame stagger) and then never moves,
 * never changes count, never jiggles or pops. No alert, no minus badge, no heart ever leaves.
 * Sizes in 1280x720 reference units through px(). Our own drawn hearts, no SF Symbols.
 *
 * Usage: at level start pass `at` (local design tick). On every other round pass no `at`:
 * the pill is then fully settled from frame 0 and does not animate at all.
 */
import React from 'react';
import { colours, fontHeadline, glassSurface, springAt, STAGGER, SYSTEM } from '../system';
import { WIDTH, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Hearts drawn in the pill (UI constant, the same at every level start). */
export const HEART_COUNT = 3;
/** UI labels. The count in the hearts label is HEART_COUNT. */
export const HEARTS_LABEL = `${HEART_COUNT} HEARTS`;
export const BONUS_LABEL = 'BONUS';

/** Flat drawn heart: one solid SYSTEM.red path. No highlight shapes, no gradient, no text glyph. */
const Heart: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block', overflow: 'visible' }}>
    <path d="M20 35 C5 25 4 12 11.5 9.5 C16 8 19 11 20 14 C21 11 24 8 28.5 9.5 C36 12 35 25 20 35 Z" fill={SYSTEM.red} />
  </svg>
);

/** Heart size in reference units (was 38; 13% smaller). */
const HEART_SIZE = 33;

export type HeartsPillProps = {
  /** Local design tick (30 fps) of the one-time spring-in. Omit for a settled, non-animated pill. */
  at?: number;
  /** Bonus rounds show "BONUS" instead of the hearts label. Hearts stay drawn, static. */
  bonus?: boolean;
  /** Optional frame override in design ticks; defaults to the enclosing Sequence's clock. */
  frame?: number;
  /** Position from the frame's left/top edge in reference units. Default is the safe corner. */
  left?: number;
  top?: number;
  /** Smaller pill (44 ref units high) for the round screen. Label stays at least 26 units / 0.9 opacity. Default false. */
  compact?: boolean;
};

export const HeartsPill: React.FC<HeartsPillProps> = ({ at, bonus = false, frame: frameProp, left = 128, top = 72, compact = false }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const animate = at !== undefined;
  // gentle preset: damping 20 so the one entrance settles without a bounce
  // compact: smaller pill and hearts, same shape. Still never animates unless `at` is given.
  const k = compact ? 0.69 : 1;
  const pill = animate ? Math.min(1, springAt(frame, at as number, 'gentle')) : 1;

  return (
    <div style={{
      position: 'absolute', left: px(left), top: px(top), display: 'flex', alignItems: 'center', gap: px(14 * k),
      ...glassSurface(40 * k), padding: `${px(10 * k)}px ${px(24 * k)}px ${px(10 * k)}px ${px(18 * k)}px`, height: px(64 * k),
      opacity: pill, transform: `translateY(${(1 - pill) * px(-22)}px) scale(${0.9 + 0.1 * pill})`, transformOrigin: 'left top',
    }}>
      <div style={{ display: 'flex', gap: px(4) }}>
        {Array.from({ length: HEART_COUNT }, (_, i) => {
          const p = animate ? Math.min(1, springAt(frame, (at as number) + 3 + i * STAGGER.heart, 'gentle')) : 1;
          return (
            <div key={i} style={{ opacity: p, transform: `scale(${0.4 + 0.6 * p})` }}>
              <Heart size={px(HEART_SIZE * k)} />
            </div>
          );
        })}
      </div>
      {/* label text stays >=26 units and ~0.9 opacity (not scaled by `k`), independent of the pill's own quiet chrome */}
      <span style={{
        fontFamily: fontHeadline, fontWeight: 800, fontSize: px(26), letterSpacing: '0.06em', color: colours.ink, opacity: 0.9, whiteSpace: 'nowrap',
      }}>{bonus ? BONUS_LABEL : HEARTS_LABEL}</span>
    </div>
  );
};
