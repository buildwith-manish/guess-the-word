/**
 * BonusWrapper (task 2f): shared frame for the five bonus scenes.
 *
 * Warm amber glaze over the level wallpaper, gold-tinted glass, a BONUS pill that
 * slides in from the top (bonus-pill sfx), the hearts pill label switched to "BONUS",
 * and an explicit pass-condition chip. Bonus rounds never cost hearts: this file has
 * no heart animation and no collision chip.
 *
 * Text and timing come from data.ts / timing.ts only. Sizes are written in
 * 1280x720 reference units and scaled through px().
 */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, rounds, type Bonus, type Level } from '../data';
import { sfxSrc } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import {
  colours,
  fontHeadline,
  fontNumeric,
  glassSurface,
  levelBackground,
  springAt,
} from '../system';
import {
  FPS,
  TIME_SCALE,
  WIDTH,
  bonusIntroSec,
  bonusPlaySec,
  bonusResultSec,
  bonusRevealSec,
} from '../timing';

/** 1280x720 reference units -> 2560x1440 screen px. */
const REF_W = 1280;
export const px = (v: number): number => Math.round(v * (WIDTH / REF_W) * 100) / 100;

/** Layout in 1280x720 reference units. Centre 80% = x 128..1152, y 72..648. */
const L = {
  safeX: 128,
  safeTop: 72,
  safeBottom: 72,
  pillH: 52,
  chipTop: 148,
  stageTop: 262,
} as const;

/** Label the hearts pill shows during a bonus (no hearts drawn, none animated). */
export const BONUS_HEARTS_LABEL = 'BONUS';

export type BonusPhase = 'intro' | 'play' | 'reveal' | 'result';

/** Phase boundaries in design ticks (30 fps), local to the wrapper's start. */
export const bonusTicks = (() => {
  const intro = Math.round(bonusIntroSec * FPS);
  const play = intro + Math.round(bonusPlaySec * FPS);
  const reveal = play + Math.round(bonusRevealSec * FPS);
  const result = reveal + Math.round(bonusResultSec * FPS);
  return { intro, play, reveal, result, chipAt: Math.round(intro / 2) } as const;
})();

export const bonusPhaseAt = (tick: number): BonusPhase =>
  tick < bonusTicks.intro ? 'intro' : tick < bonusTicks.play ? 'play' : tick < bonusTicks.reveal ? 'reveal' : 'result';

export type BonusContextValue = { bonus: Bonus; level: Level; phase: BonusPhase; tick: number };
const BonusContext = createContext<BonusContextValue | null>(null);
/** For the mechanic inside the wrapper: current phase and tick. */
export const useBonus = (): BonusContextValue => {
  const v = useContext(BonusContext);
  if (!v) throw new Error('useBonus must be used inside <BonusWrapper>');
  return v;
};

/** Glass tinted toward gold, for cards and chips inside a bonus. */
export const bonusGlass = (radiusRef: number, alpha = 0.12): React.CSSProperties => ({
  ...glassSurface(radiusRef * (WIDTH / REF_W) / (WIDTH / 1920), { tint: colours.bonusGold, alpha }),
  border: `${px(0.5)}px solid rgba(255,214,10,0.38)`,
});

export type BonusWrapperProps = {
  /** The bonus to show; pass-condition text and sub-line come from it. */
  bonus: Bonus | Bonus['n'];
  /** Optional override; defaults to the level of the round the bonus follows. */
  level?: Level;
  /** The mechanic. Use useBonus() inside for phase/tick. */
  children?: React.ReactNode;
};

export const BonusWrapper: React.FC<BonusWrapperProps> = ({ bonus: bonusProp, level: levelProp, children }) => {
  const tick = useDesignFrame();
  const bonus = typeof bonusProp === 'number' ? (bonuses.find((b) => b.n === bonusProp) as Bonus) : bonusProp;
  const level: Level = levelProp ?? rounds.find((r) => r.n === bonus.afterRound)?.level ?? 1;
  const phase = bonusPhaseAt(tick);

  // Warm glaze: amber over the level colour, ramps in over the first half-second.
  const warm = clamp01(tick / (FPS / 2));

  // BONUS pill: slides in from the top at tick 0, lively overshoot.
  const pillIn = springAt(tick, 0, 'pop');
  const pillY = (1 - pillIn) * -px(L.pillH + L.safeTop + 24);

  // Hearts pill label and chip arrive in order, STAGGER-style, after the pill.
  const labelIn = springAt(tick, 4, 'gentle');
  const chipIn = springAt(tick, bonusTicks.chipAt, 'snappy');

  const note = bonus.onScreenNote;
  const sfxFrom = 0;

  return (
    <BonusContext.Provider value={{ bonus, level, phase, tick }}>
      <AbsoluteFill style={{ background: levelBackground[level], overflow: 'hidden' }}>
        {/* amber glaze over the level colour */}
        <AbsoluteFill
          style={{
            opacity: warm,
            background: [
              'radial-gradient(120% 80% at 50% -10%, rgba(255,184,48,0.46) 0%, rgba(255,159,10,0.18) 45%, rgba(255,159,10,0) 75%)',
              'linear-gradient(180deg, rgba(255,214,10,0.10) 0%, rgba(255,140,0,0.14) 100%)',
            ].join(', '),
            mixBlendMode: 'screen',
          }}
        />

        <Sequence from={Math.round(sfxFrom * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc('bonus-pill')} />
        </Sequence>

        {/* hearts pill position: label only, no hearts drawn */}
        <div
          style={{
            position: 'absolute',
            left: px(L.safeX),
            top: px(L.safeTop),
            height: px(L.pillH),
            padding: `0 ${px(22)}px`,
            display: 'flex',
            alignItems: 'center',
            opacity: labelIn,
            transform: `scale(${0.92 + 0.08 * labelIn})`,
            transformOrigin: 'left center',
            ...bonusGlass(26, 0.1),
            fontFamily: fontNumeric,
            fontWeight: 800,
            fontSize: px(24),
            letterSpacing: '0.08em',
            color: colours.bonusGold,
          }}
        >
          {BONUS_HEARTS_LABEL}
        </div>

        {/* BONUS pill, top centre */}
        <div
          style={{
            position: 'absolute',
            top: px(L.safeTop),
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            transform: `translateY(${pillY}px)`,
          }}
        >
          <div
            style={{
              height: px(L.pillH),
              padding: `0 ${px(34)}px`,
              display: 'flex',
              alignItems: 'center',
              ...bonusGlass(26, 0.2),
              background: 'linear-gradient(160deg, rgba(255,214,10,0.55), rgba(255,149,0,0.32))',
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: px(30),
              letterSpacing: '0.14em',
              color: '#2A1700',
            }}
          >
            BONUS
          </div>
        </div>

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
            transform: `translateY(${(1 - chipIn) * px(18)}px) scale(${0.94 + 0.06 * chipIn})`,
          }}
        >
          <div
            style={{
              maxWidth: '100%',
              padding: `${px(14)}px ${px(36)}px`,
              textAlign: 'center',
              ...bonusGlass(32, 0.14),
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
