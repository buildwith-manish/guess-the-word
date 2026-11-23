import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bonuses, showPassRule } from '../data';
import type { BonusSlot } from '../data';
import { BonusReveal, BONUS_REVEAL, revealLayout } from '../components/BonusReveal';
import { FrameShimmer } from '../components/FrameShimmer';
import { LightString, bulbCues } from '../components/LightString';
import { Snow } from '../components/Snow';
import { Vignette } from '../components/Vignette';
import { TIMER, TimerToPill, defaultMorphFrame, timerCues, timerPropsOf, withoutBackdrop } from '../components/TimerToPill';
import { PLAY_AREA, passRuleText, roundOf } from '../bonus/registry';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import {
  BOKEH,
  LAYOUT,
  backgroundStyle,
  bokehStyle,
  colors,
  frameBorderStyle,
  glassSurface,
  lightZoneStyle,
  px,
  textStyle,
  useXmasFonts,
  useXmasFrame,
} from '../system';
import { bokehParallax } from './MovieScene';
import { segmentOfSlot, ticksToFrames } from '../timing';
import { UI } from '../ui';

/**
 * BonusScene({ slot }): one bonus round, from its own start (local tick 0 = the slot's first tick; place it in a Sequence).
 *   intro  warm gold frame; the BONUS banner slides in (UI.bonus + the round name from data); the round may enter at the end
 *   play   gold timer (6 segments over the play time) + the round's play area (bonus/registry.ts); pass rule caption for
 *          the bonuses in PASS_RULE_BONUSES
 *   reveal the bar flashes, then BonusReveal (one pill, or a stack of two to four) and the gold bulb lights
 * All times come from timing.ts (segmentOfSlot), all text from data.ts and ui.ts. Frame numbers are design ticks.
 */

/** Scene-local tick numbers of one bonus slot. */
export type BonusBeats = {
  /** length of the whole slot */
  total: number;
  playFrom: number;
  playTo: number;
  /** the bar is full, the flash plays */
  revealFrom: number;
  /** the timer morph and the answer pills start here (after the flash) */
  answersFrom: number;
};

export const bonusBeats = (slot: BonusSlot): BonusBeats => {
  const seg = segmentOfSlot(slot.slot);
  const p = seg.phases;
  const tp = timerPropsOf(slot);
  const playFrom = p.timer.from - seg.from;
  return {
    total: seg.to - seg.from,
    playFrom,
    playTo: p.timer.to - seg.from,
    revealFrom: p.reveal.from - seg.from,
    answersFrom: defaultMorphFrame(playFrom, tp.segments, tp.secondsPerSegment),
  };
};

/** Length of the scene in render frames. */
export const bonusSceneFrames = (slot: BonusSlot): number => ticksToFrames(bonusBeats(slot).total);

export const BANNER = { cy: LAYOUT.caption.cy, height: 46, slideTicks: 14, rise: 34, padX: 26 } as const;

/** Sounds of a bonus slot at absolute design tick `start` (the tick the slot begins at). Sorted by tick. */
export const bonusCues = (slot: BonusSlot, start: number): SfxCue[] => {
  const b = bonusBeats(slot);
  const tp = timerPropsOf(slot);
  const out: SfxCue[] = [
    cue('bonus-banner', start + 2),
    ...timerCues(start + b.playFrom, tp.segments, tp.secondsPerSegment),
    cue('reveal-chime', start + b.answersFrom),
    ...bulbCues(slot.slot, start + b.answersFrom),
  ];
  return out.sort((a, c) => a.frame - c.frame);
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const BonusScene: React.FC<{ slot: BonusSlot }> = ({ slot }) => {
  useXmasFonts();
  const t = useXmasFrame();
  const b = bonusBeats(slot);
  const tp = timerPropsOf(slot);
  const Round = roundOf(slot);
  const rule = showPassRule ? passRuleText(slot) : null;
  const stacked = slot.answers.length > 1;
  const seconds = t / 30;

  const banner = springAt(t, 0, 'smooth');
  const dim = stacked ? 1 - 0.75 * clamp01((t - b.answersFrom) / 10) : 1;
  const timerFade = 1 - clamp01((t - b.answersFrom) / TIMER.morphTicks);
  const lit = t >= b.answersFrom ? slot.slot : slot.slot - 1;

  return (
    <AbsoluteFill style={backgroundStyle()}>
      {/* warm light: gold behind both halves, gold bokeh, gold frame border */}
      <div style={bokehParallax(t, b.total)}>
        {BOKEH.map((d, i) => (
          <div
            key={i}
            style={{
              ...bokehStyle(d, seconds),
              background: `radial-gradient(circle at 50% 50%, rgba(255,200,87,${d.alpha}) 0%, rgba(255,200,87,${d.alpha * 0.8}) 55%, rgba(255,200,87,0) 100%)`,
            }}
          />
        ))}
      </div>
      <Snow />
      <Vignette />
      <div style={lightZoneStyle('left', 0.9, 'gold')} />
      <div style={lightZoneStyle('right', 0.9, 'gold')} />
      <div
        style={{
          ...frameBorderStyle(),
          background: `linear-gradient(135deg, ${colors.gold} 0%, rgba(255,200,87,0.85) 40%, ${colors.orange} 100%)`,
        }}
      />
      <FrameShimmer rgb="255,240,200" />

      <LightString litUpTo={lit} pulseSlot={slot.slot} pulseFrame={t - b.answersFrom} counter={slot.slot} />

      {/* BONUS banner: slides in from above, stays */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(BANNER.cy - BANNER.height / 2),
          height: px(BANNER.height),
          transform: `translateX(-50%) translateY(${px(-BANNER.rise * (1 - banner))}px)`,
          opacity: clamp01(banner * 2),
          boxSizing: 'border-box',
          padding: `0 ${px(BANNER.padX)}px`,
          display: 'flex',
          alignItems: 'center',
          gap: px(14),
          whiteSpace: 'nowrap',
          ...withoutBackdrop(glassSurface(BANNER.height / 2, { edge: 0.6, depth: 0.45, base: colors.glassBase, tint: colors.gold, tintPercent: 18 })),
        }}
      >
        <span style={{ ...textStyle('label'), color: colors.gold, fontWeight: 700 }}>{UI.bonus}</span>
        <span style={{ ...textStyle('label'), color: colors.faint }}>·</span>
        <span style={{ ...textStyle('label'), color: colors.ink }}>{slot.name}</span>
      </div>

      {/* the round's play area */}
      <div style={{ position: 'absolute', left: px(PLAY_AREA.x), top: px(PLAY_AREA.y), width: px(PLAY_AREA.w), height: px(PLAY_AREA.h), opacity: dim }}>
        <Round slot={slot} playFrom={b.playFrom} playFrames={b.playTo - b.playFrom} />
      </div>

      {/* pass rule (only the bonuses in PASS_RULE_BONUSES) */}
      {rule ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: px(1280),
            top: px(PLAY_AREA.y + PLAY_AREA.h + 8),
            textAlign: 'center',
            opacity: springAt(t, b.playFrom - 6, 'smooth'),
          }}
        >
          <span style={{ ...textStyle('label'), color: colors.gold }}>{rule}</span>
        </div>
      ) : null}

      {/* gold timer; fades out as the answers come in */}
      <div style={{ position: 'absolute', inset: 0, opacity: timerFade }}>
        <TimerToPill
          segments={tp.segments}
          startFrame={b.playFrom}
          secondsPerSegment={tp.secondsPerSegment}
          variant="bonus"
          morphFrame={b.answersFrom}
          title=""
        />
      </div>

      {t >= b.answersFrom ? <BonusReveal slot={slot} startFrame={b.answersFrom + 4} /> : null}
    </AbsoluteFill>
  );
};

/** Composition wrapper: bonus number 1..10 (not the play-order slot). */
export const BonusSceneById: React.FC<{ bonus: number }> = ({ bonus }) => {
  const slot = bonuses[bonus - 1];
  if (!slot || slot.bonus !== bonus) throw new Error(`BonusScene: no bonus ${bonus}`);
  return <BonusScene slot={slot} />;
};

export const bonusSceneFramesById = (bonus: number): number => {
  const slot = bonuses[bonus - 1];
  if (!slot || slot.bonus !== bonus) throw new Error(`BonusScene: no bonus ${bonus}`);
  return bonusSceneFrames(slot);
};

// re-exported so a check can use the same numbers
export { BONUS_REVEAL, revealLayout };
export default BonusScene;
