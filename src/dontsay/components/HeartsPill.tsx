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

const Heart: React.FC<{ size: number; uid: string }> = ({ size, uid }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block', overflow: 'visible' }}>
    <defs>
      <linearGradient id={`hg-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF6B5E" />
        <stop offset="1" stopColor={SYSTEM.red} />
      </linearGradient>
    </defs>
    <path d="M20 35 C5 25 4 12 11.5 9.5 C16 8 19 11 20 14 C21 11 24 8 28.5 9.5 C36 12 35 25 20 35 Z"
      fill={`url(#hg-${uid})`} />
    <path d="M11 14 C12 12 14 11.5 16 12.5" stroke="rgba(255,255,255,0.65)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);

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
};

export const HeartsPill: React.FC<HeartsPillProps> = ({ at, bonus = false, frame: frameProp, left = 128, top = 72 }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const animate = at !== undefined;
  // gentle preset: damping 20 so the one entrance settles without a bounce
  const pill = animate ? Math.min(1, springAt(frame, at as number, 'gentle')) : 1;

  return (
    <div style={{
      position: 'absolute', left: px(left), top: px(top), display: 'flex', alignItems: 'center', gap: px(14),
      ...glassSurface(40), padding: `${px(10)}px ${px(24)}px ${px(10)}px ${px(18)}px`, height: px(64),
      opacity: pill, transform: `translateY(${(1 - pill) * px(-22)}px) scale(${0.9 + 0.1 * pill})`, transformOrigin: 'left top',
    }}>
      <div style={{ display: 'flex', gap: px(4) }}>
        {Array.from({ length: HEART_COUNT }, (_, i) => {
          const p = animate ? Math.min(1, springAt(frame, (at as number) + 3 + i * STAGGER.heart, 'gentle')) : 1;
          return (
            <div key={i} style={{ opacity: p, transform: `scale(${0.4 + 0.6 * p})` }}>
              <Heart size={px(38)} uid={String(i)} />
            </div>
          );
        })}
      </div>
      <span style={{
        fontFamily: fontHeadline, fontWeight: 800, fontSize: px(26), letterSpacing: '0.06em', color: colours.ink, whiteSpace: 'nowrap',
      }}>{bonus ? BONUS_LABEL : HEARTS_LABEL}</span>
    </div>
  );
};
