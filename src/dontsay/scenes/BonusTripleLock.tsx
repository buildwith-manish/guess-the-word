/**
 * BonusTripleLock (task 4c): bonus after round 18.
 *
 * Three stacked glass "widgets", each holding a sealed ink bubble with a drawn padlock.
 * The three locks click shut in a row (STAGGER apart), and the sealed bubbles are on
 * screen from tick 0. At the reveal the three ink covers dissolve left-to-right, one
 * after another, each uncovering one answer from data.ts.
 *
 * No heart animation and no collision chip (bonus rounds never cost hearts).
 * Prompt, answers, pass condition and voice lines all come from data.ts; the phase
 * lengths come from timing.ts (through BonusWrapper's bonusTicks). Sizes are in
 * 1280x720 reference units, scaled through px().
 */
import React from 'react';
import { Audio, Sequence, interpolate } from 'remotion';
import { bonuses, type Bonus } from '../data';
import { sfxSrc } from '../sfx';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, springAt, STAGGER } from '../system';
import { FPS, RENDER_FPS, TIME_SCALE, WIDTH, HEIGHT, beatSec, bonusClipId, bonusSec, secToFrames } from '../timing';
import { BonusWrapper, bonusGlass, bonusTicks, px, useBonus } from '../components/BonusWrapper';

const bonusData = (): Bonus => bonuses.find((b) => b.name === 'triple-lock') as Bonus;

const answersOf = (b: Bonus): string[] => (Array.isArray(b.answer) ? b.answer : [b.answer]);

/** Layout in reference units, inside the wrapper's stage slot (1024 wide, ~386 tall). */
const ROW = { h: 100, gap: 12, promptH: 40, padL: 28, lockSize: 46, textX: 100 } as const;
const DOTS_PER_ROW = 90;
/** Quiet hold after the last dissolve, before the result phase (design ticks). */
const TAIL_TICKS = Math.round(0.5 * FPS);

/** Event ticks, local to the bonus start. Derived from data.ts + timing.ts only. */
export const tripleLockTicks = (() => {
  const count = answersOf(bonusData()).length;
  const lockAt = Array.from({ length: count }, (_, i) => i * STAGGER.chip);
  const revealStart = bonusTicks.play;
  const firstDissolve = revealStart + Math.round(beatSec * FPS);
  const span = bonusTicks.reveal - firstDissolve - TAIL_TICKS;
  const dissolveLen = Math.max(1, Math.floor(span / count));
  const dissolveAt = Array.from({ length: count }, (_, i) => firstDissolve + i * dissolveLen);
  return { count, lockAt, dissolveAt, dissolveLen };
})();

/** Voice lines and clip ids (the clips themselves come from the voice pipeline). */
export const bonusTripleLockVoice = () => {
  const b = bonusData();
  return {
    intro: { id: bonusClipId(b.n, 'intro'), text: b.voiceIntro, at: 0 },
    reveal: { id: bonusClipId(b.n, 'reveal'), text: b.voiceReveal, at: bonusTicks.play },
  };
};

/** SFX cues (design ticks): lock clicks, dissolves. */
export const bonusTripleLockCues = () => [
  ...tripleLockTicks.lockAt.map((at) => ({ id: 'triple-lock-click' as const, at })),
  ...tripleLockTicks.dissolveAt.map((at) => ({ id: 'ink-dissolve' as const, at })),
];

export const bonusTripleLockFrames = (): number => secToFrames(bonusSec);

// ---------- ink ----------
const rng = (seed: number) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Dot = { x: number; y: number; ph: number; sp: number; amp: number; r: number; gold: boolean };
const makeDots = (seed: number): Dot[] => {
  const r = rng(seed + 7);
  return Array.from({ length: DOTS_PER_ROW }, () => ({
    x: r(),
    y: r(),
    ph: r() * Math.PI * 2,
    sp: 0.05 + r() * 0.08,
    amp: 2 + r() * 4,
    r: 1.6 + r() * 2.2,
    gold: r() < 0.25,
  }));
};

/** Our own drawn padlock. `lift` raises the shackle (0 = closed). */
const Lock: React.FC<{ size: number; colour: string; lift: number }> = ({ size, colour, lift }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <g transform={`translate(0 ${-lift})`}>
      <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke={colour} strokeWidth="2.2" strokeLinecap="round" />
    </g>
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="3.2" fill={colour} />
    <circle cx="12" cy="15.4" r="1.5" fill="rgba(0,0,0,0.45)" />
  </svg>
);

const Row: React.FC<{ index: number; answer: string; tick: number }> = ({ index, answer, tick }) => {
  const lockAt = tripleLockTicks.lockAt[index];
  const dAt = tripleLockTicks.dissolveAt[index];
  const dissolve = clamp01((tick - dAt) / tripleLockTicks.dissolveLen);
  const dots = React.useMemo(() => makeDots(index + 1), [index]);

  // Lock snaps shut at lockAt (shackle drops from 4 units up), lifts again when its ink dissolves.
  const closed = springAt(tick, lockAt, 'snappy');
  const opened = springAt(tick, dAt, 'snappy');
  const lift = (1 - closed) * 4 + opened * 4;
  const bump = tick >= lockAt ? Math.max(0, 1 - (tick - lockAt) / 8) : 0;

  // Sweep edge in % of the ink area; the front band is 8% wide.
  const e = -8 + 116 * dissolve;
  const coverMask = `linear-gradient(90deg, transparent ${e}%, #000 ${e + 8}%)`;
  const textMask = `linear-gradient(90deg, #000 ${e + 4}%, transparent ${e + 10}%)`;
  const inkW = 1024 - ROW.textX - 28;

  return (
    <div
      style={{
        position: 'relative',
        height: px(ROW.h),
        transform: `scale(${1 - 0.025 * bump})`,
        ...bonusGlass(34, 0.12),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: px(ROW.padL),
          top: px((ROW.h - ROW.lockSize) / 2),
          opacity: 0.95,
        }}
      >
        <Lock size={px(ROW.lockSize)} colour={colours.bonusGold} lift={lift} />
      </div>

      {/* ink area */}
      <div
        style={{
          position: 'absolute',
          left: px(ROW.textX),
          top: px(12),
          width: px(inkW),
          height: px(ROW.h - 24),
          overflow: 'hidden',
          borderRadius: px(22),
        }}
      >
        {dissolve > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: px(8),
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: px(58),
              letterSpacing: '-0.02em',
              color: colours.ink,
              WebkitMaskImage: textMask,
              maskImage: textMask,
            }}
          >
            {answer}
          </div>
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            WebkitMaskImage: coverMask,
            maskImage: coverMask,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(40,40,52,0.92), rgba(24,24,32,0.96))',
              borderRadius: px(22),
            }}
          />
          {dots.map((d, i) => {
            const t = tick * d.sp + d.ph;
            const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.7));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${d.x * 100}%`,
                  top: `${d.y * 100}%`,
                  width: px(d.r * 2),
                  height: px(d.r * 2),
                  borderRadius: '50%',
                  background: d.gold ? colours.bonusGold : 'rgba(255,255,255,0.92)',
                  opacity: 0.25 + 0.6 * tw,
                  transform: `translate(${px(Math.sin(t) * d.amp)}px, ${px(Math.cos(t * 0.8) * d.amp)}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stage: React.FC = () => {
  const { bonus, tick } = useBonus();
  const answers = answersOf(bonus);
  const fadeLen = 8 * TIME_SCALE;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* the prompt is shown as text as well as spoken */}
      <div
        style={{
          height: px(ROW.promptH),
          marginBottom: px(6),
          textAlign: 'center',
          fontFamily: fontHeadline,
          fontWeight: 700,
          fontSize: px(30),
          letterSpacing: '-0.01em',
          color: colours.muted,
        }}
      >
        {bonus.prompt}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(ROW.gap) }}>
        {answers.map((a, i) => (
          <Row key={i} index={i} answer={a} tick={tick} />
        ))}
      </div>

      {tripleLockTicks.lockAt.map((at, i) => (
        <Sequence key={`l${i}`} from={Math.round(at * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc('triple-lock-click')} volume={0.8} />
        </Sequence>
      ))}
      {tripleLockTicks.dissolveAt.map((at, i) => {
        const len = (tripleLockTicks.dissolveLen + 8) * TIME_SCALE;
        return (
          <Sequence key={`d${i}`} from={Math.round(at * TIME_SCALE)} durationInFrames={len} layout="none">
            <Audio
              src={sfxSrc('ink-dissolve')}
              volume={(f) => interpolate(f, [len - fadeLen, len], [0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
            />
          </Sequence>
        );
      })}
    </div>
  );
};

export const BonusTripleLock: React.FC = () => (
  <BonusWrapper bonus={bonusData()}>
    <Stage />
  </BonusWrapper>
);

export const BONUS_TRIPLE_LOCK_SIZE = { width: WIDTH, height: HEIGHT, fps: RENDER_FPS } as const;
