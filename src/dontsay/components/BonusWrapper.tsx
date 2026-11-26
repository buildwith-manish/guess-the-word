/**
 * BonusWrapper (task 2f): shared frame for the five bonus scenes.
 *
 * The same wallpaper and glass as the round screen (AuroraWallpaper, glassSurface with the level
 * tint), a gold BONUS pill that rises in (bonus-pill sfx), the normal static hearts pill top-left (no second BONUS label),
 * and an explicit pass-condition chip. Bonus rounds never cost hearts: this file has
 * no heart animation and no collision chip.
 *
 * Text and timing come from data.ts / timing.ts only. Sizes are written in
 * 1280x720 reference units and scaled through px().
 */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, rounds, type Bonus, type Level } from '../data';
import { AuroraWallpaper } from './AuroraWallpaper';
import { HeartsPill } from './HeartsPill';
import { CountdownNumber, EdgeBeat } from './CountdownNumber';
import { sfxSrc } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import {
  colours,
  fontHeadline,
  glassSurface,
  springAt,
} from '../system';
import {
  segments,
  TIME_SCALE,
  WIDTH,
  bonusTicksFor,
  bonusPlaySecFor,
} from '../timing';
export { bonusTicksFor };

/** 1280x720 reference units -> 2560x1440 screen px. */
const REF_W = 1280;
export const px = (v: number): number => Math.round(v * (WIDTH / REF_W) * 100) / 100;

/** Ticks the countdown pill is mounted before the timer starts (its spring-in lead) and after it ends. */
const TIMER_LEAD_TICKS = 6;
const TIMER_EXIT_TICKS = 4;

/** Layout in 1280x720 reference units. Centre 80% = x 128..1152, y 72..648. */
const L = {
  safeX: 128,
  safeTop: 72,
  safeBottom: 72,
  pillTop: 104, // under the countdown slot (layout.countdown, y 42-98)
  pillH: 38,
  chipTop: 150,
  stageTop: 262,
  hudLeft: 64, // same top-left spot as RoundScene's hearts pill
  hudTop: 48,
} as const;

export type BonusPhase = 'intro' | 'play' | 'reveal' | 'result';

export type BonusTicks = ReturnType<typeof bonusTicksFor>;
export const bonusPhaseAt = (tick: number, t: BonusTicks): BonusPhase =>
  tick < t.intro ? 'intro' : tick < t.play ? 'play' : tick < t.reveal ? 'reveal' : 'result';

export type BonusContextValue = { bonus: Bonus; level: Level; phase: BonusPhase; tick: number };
const BonusContext = createContext<BonusContextValue | null>(null);
/** For the mechanic inside the wrapper: current phase and tick. */
export const useBonus = (): BonusContextValue => {
  const v = useContext(BonusContext);
  if (!v) throw new Error('useBonus must be used inside <BonusWrapper>');
  return v;
};

/** Same glass as the round screen (thin bright top edge, soft shadow, light level tint). Pass the bonus level. */
export const bonusGlass = (radiusRef: number, alpha = 0.12, level?: Level): React.CSSProperties =>
  glassSurface(radiusRef * (WIDTH / REF_W) / (WIDTH / 1920), { level, alpha });

/** bonusGlass bound to the current bonus level, for use inside the mechanic. */
export const useBonusGlass = (): ((radiusRef: number, alpha?: number) => React.CSSProperties) => {
  const { level } = useBonus();
  return (radiusRef, alpha = 0.12) => bonusGlass(radiusRef, alpha, level);
};

export type BonusWrapperProps = {
  /** The bonus to show; pass-condition text and sub-line come from it. */
  bonus: Bonus | Bonus['n'];
  /** Optional override; defaults to the level of the round the bonus follows. */
  level?: Level;
  /**
   * Optional, default 0 (no change for the other bonuses). 0..1 colour-invert amount applied to the
   * WALLPAPER only; the pills, chip and mechanic above it are never filtered.
   */
  wallpaperInvert?: number;
  /** The mechanic. Use useBonus() inside for phase/tick. */
  children?: React.ReactNode;
};

export const BonusWrapper: React.FC<BonusWrapperProps> = ({ bonus: bonusProp, level: levelProp, wallpaperInvert = 0, children }) => {
  const tick = useDesignFrame();
  const bonus = typeof bonusProp === 'number' ? (bonuses.find((b) => b.n === bonusProp) as Bonus) : bonusProp;
  const level: Level = levelProp ?? rounds.find((r) => r.n === bonus.afterRound)?.level ?? 1;
  const bonusTicks = bonusTicksFor(bonus.n);
  const phase = bonusPhaseAt(tick, bonusTicks);
  // Timer = the play phase (bonusPlaySecFor). Mounted like RoundScene does: its spring-in lead before the
  // intro ends, and a 4-tick exit after the play phase ends.
  const timerSec = bonusPlaySecFor(bonus.n);
  const showTimer = tick >= bonusTicks.intro - TIMER_LEAD_TICKS && tick < bonusTicks.play + TIMER_EXIT_TICKS;

  // Wallpaper phase from the video clock (segment start + local tick), like the round screen.
  const segFrom = segments.find((s) => s.kind === 'bonus' && s.bonus.n === bonus.n)?.from ?? 0;

  // BONUS pill: a short rise and fade at tick 0, no bounce.
  const pillIn = springAt(tick, 0, 'soft');
  const pillY = (1 - pillIn) * -px(16);

  // The pass-condition chip arrives after the pill.
  const chipIn = springAt(tick, bonusTicks.chipAt, 'soft');

  const note = bonus.onScreenNote;
  const sfxFrom = 0;

  return (
    <BonusContext.Provider value={{ bonus, level, phase, tick }}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {/* same wallpaper as the round screen */}
        <AbsoluteFill style={wallpaperInvert > 0 ? { filter: `invert(${wallpaperInvert})` } : undefined}>
          <AuroraWallpaper level={level} clock={segFrom + tick} />
        </AbsoluteFill>

        {/* red edge pulse for the last seconds of the timer, under the HUD */}
        {showTimer ? <EdgeBeat level={level} at={bonusTicks.intro} durationSec={timerSec} /> : null}

        <Sequence from={Math.round(sfxFrom * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc('bonus-pill')} />
        </Sequence>

        {/* top-left: the normal hearts pill, same as the round screens (compact, static: no `at`).
            The gold BONUS pill below is the only BONUS label. Bonus rounds never change hearts. */}
        <HeartsPill compact level={level} left={L.hudLeft} top={L.hudTop} />

        {/* BONUS pill, top centre */}
        <div
          style={{
            position: 'absolute',
            top: px(L.pillTop),
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: pillIn,
            transform: `translateY(${pillY}px)`,
          }}
        >
          <div
            style={{
              height: px(L.pillH),
              padding: `0 ${px(26)}px`,
              display: 'flex',
              alignItems: 'center',
              ...bonusGlass(19, 0.2, level),
              background: 'linear-gradient(160deg, rgba(255,214,10,0.55), rgba(255,149,0,0.32))',
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: px(22),
              letterSpacing: '0.14em',
              color: '#2A1700',
            }}
          >
            BONUS
          </div>
        </div>

        {/* countdown: the same pill as the round screens, top centre, running exactly the play phase */}
        {showTimer ? <CountdownNumber level={level} at={bonusTicks.intro} durationSec={timerSec} edge={false} /> : null}

        {/* pass-condition chip */}
        <div
          style={{
            position: 'absolute',
            top: px(L.chipTop),
            left: px(L.safeX),
            right: px(L.safeX),
            display: 'flex',
            justifyContent: 'center',
            opacity: chipIn,
            transform: `translateY(${(1 - chipIn) * px(16)}px)`,
          }}
        >
          <div
            style={{
              maxWidth: '100%',
              padding: `${px(14)}px ${px(36)}px`,
              textAlign: 'center',
              ...bonusGlass(32, 0.14, level),
              fontFamily: fontHeadline,
              color: colours.ink,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: px(40), lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {bonus.passCondition}
            </div>
            {note ? (
              <div
                style={{
                  marginTop: px(6),
                  fontWeight: 600,
                  fontSize: px(26),
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  color: colours.muted,
                }}
              >
                {note}
              </div>
            ) : null}
          </div>
        </div>

        {/* mechanic slot, inside the centre 80% */}
        <div
          style={{
            position: 'absolute',
            left: px(L.safeX),
            right: px(L.safeX),
            top: px(L.stageTop),
            bottom: px(L.safeBottom),
          }}
        >
          {children}
        </div>
      </AbsoluteFill>
    </BonusContext.Provider>
  );
};
