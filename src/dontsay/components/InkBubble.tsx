/**
 * InkBubble (task 2b): the iMessage invisible-ink style sealed answer.
 *
 * A glass bubble covered in shimmering ink dots (slow drift, twinkle, edge mask).
 * Two states: `small` (corner, ~12% of frame width, lock icon + "locked") and
 * `large` (centred, ~58% of frame width, ready to dissolve). In `auto` it is small
 * from frame 0 of the round and springs to large at the sealed-slide time
 * (sealedSlideSec from timing.ts; spring damping 16, stiffness 150).
 *
 * The answer text is NEVER rendered while `dissolve` is 0, so it cannot show
 * through the ink. `dissolve` (0..1, driven by the reveal engine, task 2g) sweeps the
 * ink away left to right and only then mounts the text. The answer comes from the
 * `answer` prop (card.answer); nothing is hard-coded here.
 *
 * Sizes are in 1280x720 reference units, scaled through px().
 * Local time is the round's local design tick: render inside the round's Sequence.
 */
import React from 'react';
import { Audio, Sequence, spring } from 'remotion';
import { sfxSrc } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, glassSurface } from '../system';
import { FPS, TIME_SCALE, WIDTH, sealedSlideSec } from '../timing';

const REF_W = 1280;
const px = (v: number): number => Math.round(v * (WIDTH / REF_W) * 100) / 100;
/** glassSurface() takes 1920-reference radii; convert from 1280 units. */
const glassR = (r1280: number): number => r1280 * (1920 / REF_W);

/** Slide spring from the task: damping 16, stiffness 150. */
export const INK_SPRING = { damping: 16, stiffness: 150, mass: 1 } as const;

/** Geometry in 1280x720 reference units. */
const SMALL = { w: 0.12 * REF_W, h: 92, right: 1152, top: 72, r: 30 } as const;
const LARGE = { w: 0.58 * REF_W, h: 300, r: 56 } as const;
const LARGE_CENTRE = { x: REF_W / 2, y: 372 } as const;

/** Design tick at which the bubble slides to centre (1.5 s into the round). */
export const inkSlideTick = Math.round(sealedSlideSec * FPS);
/** "locked" label finishes arriving at 0.6 s. */
const LOCKED_TICKS = Math.round(0.6 * FPS);

export type InkBubbleState = 'auto' | 'small' | 'large';

export type InkBubbleProps = {
  /** card.answer. Never shown while dissolve is 0. */
  answer: string;
  /** auto = small from tick 0, large from the slide; small/large force a state (stills). */
  state?: InkBubbleState;
  /** 0..1 left-to-right ink dissolve, driven by the reveal engine. */
  dissolve?: number;
  /** Seed for the particle field (e.g. the round number). */
  seed?: number;
  /** Optional level accent to tint the ink glow. */
  accent?: string;
  /** Play the lock click at tick 0 and a soft one at the slide. */
  sfx?: boolean;
  /** Centre of the large state, in 1280x720 units. */
  centre?: { x: number; y: number };
  /** Design tick (local to the enclosing Sequence) at which the bubble slides to centre. Default inkSlideTick. */
  slideAt?: number;
};

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

type Dot = { x: number; y: number; ph: number; sp: number; amp: number; r: number; tw: number };
const makeDots = (seed: number, n: number): Dot[] => {
  const r = rng(seed + 1);
  return Array.from({ length: n }, () => ({
    x: r(),
    y: r(),
    ph: r() * Math.PI * 2,
    sp: 0.04 + r() * 0.07, // radians per design tick: slow drift
    amp: 3 + r() * 6, // reference units
    r: 1.6 + r() * 2.4,
    tw: 0.08 + r() * 0.14,
  }));
};
const DOT_COUNT = 220;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Our own drawn padlock (no system symbols). */
const Lock: React.FC<{ size: number; colour: string }> = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke={colour} strokeWidth="2.2" strokeLinecap="round" />
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="3.2" fill={colour} />
    <circle cx="12" cy="15.4" r="1.5" fill="rgba(0,0,0,0.45)" />
  </svg>
);

export const InkBubble: React.FC<InkBubbleProps> = ({
  answer,
  state = 'auto',
  dissolve = 0,
  seed = 1,
  accent,
  sfx = true,
  centre = LARGE_CENTRE,
  slideAt = inkSlideTick,
}) => {
  const tick = useDesignFrame();
  const dots = React.useMemo(() => makeDots(seed, DOT_COUNT), [seed]);

  const p =
    state === 'small'
      ? 0
      : state === 'large'
        ? 1
        : spring({ frame: Math.max(0, tick - slideAt), fps: FPS, config: INK_SPRING });

  // Geometry (reference units)
  const w = lerp(SMALL.w, LARGE.w, p);
  const h = lerp(SMALL.h, LARGE.h, p);
  const r = lerp(SMALL.r, LARGE.r, p);
  const left = lerp(SMALL.right - SMALL.w, centre.x - LARGE.w / 2, p);
  const top = lerp(SMALL.top, centre.y - LARGE.h / 2, p);

  const d = clamp01(dissolve);
  const soft = 22; // % width of the dissolve edge
  const edge = d * (100 + soft) - soft;
  const inkMask = `linear-gradient(90deg, transparent ${edge}%, #000 ${edge + soft}%)`;
  const textMask = `linear-gradient(90deg, #000 ${edge}%, transparent ${edge + soft}%)`;
  const edgeFade = 'radial-gradient(ellipse 80% 78% at 50% 50%, #000 55%, rgba(0,0,0,0.5) 100%)';

  const lockedIn = state === 'small' ? 1 : state === 'large' ? 0 : clamp01(tick / LOCKED_TICKS) * (1 - clamp01(p * 1.6));
  const lockIconOpacity = state === 'large' ? 0 : 1 - clamp01(p * 1.6);
  const lockPop = state === 'auto' ? spring({ frame: tick, fps: FPS, config: { damping: 14, stiffness: 180, mass: 1 } }) : 1;

  const tint = accent ?? colours.ink;
  const sizeK = 0.55 + 0.45 * (w / LARGE.w);

  // Shimmer sweep
  const sweep = ((tick * 0.9) % 160) - 30;

  const fit = Math.min(1, 11 / Math.max(answer.length, 1));
  const answerSize = Math.max(46, 100 * fit);

  return (
    <>
      {sfx && state === 'auto' ? (
        <>
          <Sequence from={0} layout="none">
            <Audio src={sfxSrc('lock-click')} />
          </Sequence>
          <Sequence from={Math.round(slideAt * TIME_SCALE)} layout="none">
            <Audio src={sfxSrc('lock-click')} volume={0.3} />
          </Sequence>
        </>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: px(left),
          top: px(top),
          width: px(w),
          height: px(h),
          ...glassSurface(glassR(r), { tint: accent, alpha: 0.12, shadow: 0.6 + 0.4 * p }),
          overflow: 'hidden',
        }}
      >
        {/* answer: mounted only once the dissolve has started */}
        {d > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `0 ${px(w * 0.06)}px`,
              textAlign: 'center',
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: px(answerSize),
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: colours.ink,
              WebkitMaskImage: textMask,
              maskImage: textMask,
            }}
          >
            {answer}
          </div>
        ) : null}

        {/* ink layer */}
        {d < 1 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              WebkitMaskImage: inkMask,
              maskImage: inkMask,
            }}
          >
            {/* veil */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(90% 120% at 30% 20%, ${tint}30 0%, rgba(20,24,40,0.80) 70%)`,
              }}
            />
            {/* shimmer sweep */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(105deg, transparent ${sweep - 14}%, rgba(255,255,255,0.20) ${sweep}%, transparent ${sweep + 14}%)`,
              }}
            />
            {/* particles */}
            <svg
              width={px(w)}
              height={px(h)}
              style={{ position: 'absolute', inset: 0, WebkitMaskImage: edgeFade, maskImage: edgeFade }}
            >
              {dots.map((dt, i) => {
                const cx = dt.x * w + Math.sin(tick * dt.sp + dt.ph) * dt.amp * sizeK;
                const cy = dt.y * h + Math.cos(tick * dt.sp * 0.8 + dt.ph * 1.3) * dt.amp * sizeK;
                const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(tick * dt.tw + dt.ph * 2));
                return <circle key={i} cx={px(cx)} cy={px(cy)} r={px(dt.r * sizeK)} fill={colours.ink} opacity={a} />;
              })}
            </svg>
          </div>
        ) : null}

        {/* small-state lock + label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(4),
            pointerEvents: 'none',
          }}
        >
          <div style={{ opacity: lockIconOpacity, transform: `scale(${0.6 + 0.4 * lockPop})` }}>
            <Lock size={px(30)} colour={colours.ink} />
          </div>
          <div
            style={{
              opacity: lockedIn,
              transform: `translateY(${(1 - lockedIn) * px(4)}px)`,
              fontFamily: fontHeadline,
              fontWeight: 700,
              fontSize: px(19),
              letterSpacing: '0.04em',
              color: colours.ink,
            }}
          >
            locked
          </div>
        </div>
      </div>
    </>
  );
};
