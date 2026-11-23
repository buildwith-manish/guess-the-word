import React from 'react';
import { GlassTile } from '../components/GlassTile';
import type { DoubleFeatureBonus } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import { colors, glassSurface, px, useXmasFonts, useXmasFrame } from '../system';
import { clueIdOf } from './clueRef';
import type { RoundProps } from './registry';

/**
 * Bonus 4, Double Feature (iOS app switcher): two cards side by side, the left is the clue of the slot data.left names,
 * the right the one data.right names. Each card has the app-switcher header (a round gold icon and a short title bar,
 * no text) over a gold glass tile. The cards swipe in from the two sides before play starts and stay through the reveal.
 * No text, no timer, no pass rule here (BonusScene owns them). Sizes in 1280x720 reference units, drawn in the play box
 * (844 x 400); ticks are design ticks.
 */
export const DOUBLE_FEATURE = {
  card: 360,
  gap: 44,
  header: 40,
  icon: 26,
  /** the cards start their entrance this many ticks before playFrom (left, right) */
  enter: [10, 6],
  slide: 70,
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The swipe sounds, at absolute design tick `playFrom` (the tick play starts at). */
export const doubleFeatureCues = (playFrom: number): SfxCue[] => DOUBLE_FEATURE.enter.map((e) => cue('swipe', playFrom - e));

const Card: React.FC<{ imageId: string; enterAt: number; dir: -1 | 1 }> = ({ imageId, enterAt, dir }) => {
  const t = useXmasFrame();
  const D = DOUBLE_FEATURE;
  const k = springAt(t, enterAt, 'smooth');
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        width: px(D.card),
        height: px(D.header + D.card),
        opacity: clamp01(k * 2),
        transform: `translateX(${px(D.slide * dir * (1 - k))}px)`,
      }}
    >
      {/* app-switcher header: icon + title bar */}
      <div style={{ position: 'absolute', left: px(10), top: px(6), height: px(D.icon), display: 'flex', alignItems: 'center', gap: px(10) }}>
        <div
          style={{
            width: px(D.icon),
            height: px(D.icon),
            borderRadius: px(D.icon * 0.3),
            background: `linear-gradient(145deg, ${colors.gold} 0%, ${colors.orange} 100%)`,
            boxShadow: `inset ${px(1)}px ${px(1)}px 0 rgba(255,255,255,0.55)`,
          }}
        />
        <div style={{ width: px(84), height: px(8), borderRadius: px(4), background: 'rgba(255,255,255,0.28)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: px(D.header) }}>
        <GlassTile imageId={imageId} side="bonus" size={D.card} light={false} />
      </div>
    </div>
  );
};

export const DoubleFeature: React.FC<RoundProps> = ({ slot, playFrom }) => {
  useXmasFonts();
  if (slot.key !== 'doubleFeature') throw new Error(`DoubleFeature: slot ${slot.slot} is not a double feature`);
  const d: DoubleFeatureBonus = slot;
  const D = DOUBLE_FEATURE;
  const x0 = (844 - (2 * D.card + D.gap)) / 2;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: px(x0), top: px(0), width: px(D.card), height: px(400) }}>
        <Card imageId={clueIdOf(d.left)} enterAt={playFrom - D.enter[0]} dir={-1} />
      </div>
      <div style={{ position: 'absolute', left: px(x0 + D.card + D.gap), top: px(0), width: px(D.card), height: px(400) }}>
        <Card imageId={clueIdOf(d.right)} enterAt={playFrom - D.enter[1]} dir={1} />
      </div>
    </div>
  );
};

export default DoubleFeature;
