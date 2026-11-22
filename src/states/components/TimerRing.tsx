/**
 * TimerRing: a glass disc (look.ts glassPanel, round, depth 0.5, rim light) inside a thin ring that shrinks with the clock, the remaining seconds in the centre (or below),
 * level-accent colour. iOS look: no halo, no pulse; the number is primary white (1.3x larger, bold, tabular), and the ring and number turn
 * red only for the last three seconds.
 * Time comes from useDesignFrame() (design ticks, local to the enclosing Sequence); pass `frame`
 * to drive it from a parent instead. `from` and `duration` are design ticks (30 per second).
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { IOS } from '../../ios';
import { FPS } from '../state-timing';
import { BACKDROP, COLOR, FONT, SOFT_GLOW, TIMER, WEIGHT, glassPanel } from '../look';
import { enter, exitTicks, leave, settleTicks } from '../motion';
import { px } from '../../style';

export interface TimerRingProps {
  /** tick the clock starts */
  from: number;
  /** clock length in ticks (timerSeconds * 30, see buildQuestionPlan().timerFrames) */
  duration: number;
  /** level accent colour */
  accent: string;
  /** outer diameter in px (use px()) */
  size: number;
  /** where the seconds are drawn (default 'center') */
  digits?: 'center' | 'below' | 'none';
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** Proportions of the ring (fractions of `size`). */
const LOOK = TIMER;

/** the last three seconds of the clock turn red */
const RED_TICKS = 3 * FPS;

/**
 * Digit change (iOS): the old digit rises `moveOut` px and blurs out, the new one rises in from below with the quick
 * spring. The exit is 70% of the entrance (exitTicks), iosOut, no bounce; both run from the same tick so they overlap.
 */
const DIGIT = { moveIn: 12, moveOut: 12, blurOut: 4, scaleFrom: 0.97 } as const;

export const TimerRing: React.FC<TimerRingProps> = ({ from, duration, accent, size, digits = 'center', frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;

  // continuous sweep: f is a fractional design tick (frame / 2 at 60 fps), so the arc angle and the head dot move linearly in time
  // and advance by 360 / (duration * 2) degrees on every output frame; nothing here steps per second or eases per second
  const elapsed = Math.max(0, Math.min(duration, f - from));
  const remainingTicks = Math.max(0, duration - elapsed);
  const remainingFrac = duration > 0 ? remainingTicks / duration : 0;
  const seconds = Math.ceil(remainingTicks / FPS - 1e-6);
  const red = remainingTicks <= RED_TICKS;
  const color = red ? COLOR.alert : accent;

  const stroke = size * LOOK.stroke;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const len = 2 * Math.PI * r;
  const arc = len * remainingFrac;
  // the arc end as an angle clockwise from 12 o'clock; the conic gradient, the head dot and the arc length all use this one number
  const arcDeg = 360 * remainingFrac;
  const arcRad = (arcDeg * Math.PI) / 180;
  const headD = stroke * LOOK.headScale;
  const tint = `color-mix(in srgb, ${color} ${100 - LOOK.arcTint}%, white)`;
  const ringMask = `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), ${BACKDROP.black} calc(100% - ${stroke}px))`;

  // glass disc: its edge sits `discGap` of the diameter inside the ring's inner edge (ring inner radius = size / 2 - stroke)
  const discD = size - 2 * stroke - 2 * size * LOOK.discGap;

  const digitPx = size * LOOK.digitSize;
  const total = Math.round(duration / FPS);
  // digit d is on screen while remaining ticks are in ((d-1) * FPS, d * FPS], so it starts at from + duration - d * FPS
  const startOf = (d: number) => from + duration - d * FPS;
  const inTicks = settleTicks('quick');
  const outTicks = exitTicks(inTicks);
  // a fixed-size box (full ring width, one line high) with the digit centred in it: the digit never shifts between numbers
  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: size,
    height: digitPx,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.sans,
    fontWeight: WEIGHT.strong,
    fontVariantNumeric: 'tabular-nums',
    fontSize: digitPx,
    lineHeight: 1,
    ...(digits === 'below' ? { top: size + size * LOOK.digitBelowGap } : { top: c - digitPx / 2 }),
  };
  const colorOf = (d: number) => (d * FPS <= RED_TICKS ? COLOR.alert : COLOR.text.primary);

  // the digit on screen now: the first one is just there (the entrance is the get-ready step), later ones spring in
  const nowIn = seconds >= total ? null : enter(f, startOf(seconds), 'quick', DIGIT.moveIn, DIGIT.scaleFrom);
  // the previous digit leaves while the new one comes in, as a pure function of the frame
  const prev = seconds + 1;
  const prevLeave = seconds >= total ? null : leave(f, startOf(seconds), outTicks, DIGIT.moveOut);
  const showPrev = prevLeave !== null && prevLeave.t < 1;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {digits === 'center' && (
        <div
          style={{
            position: 'absolute',
            left: c - discD / 2,
            top: c - discD / 2,
            width: discD,
            height: discD,
            ...glassPanel(discD / 2, undefined, LOOK.discDepth),
          }}
        />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={COLOR.fill} strokeWidth={stroke} strokeLinecap="round" />
      </svg>
      {arc > 0 && (
        <>
          {/* the arc: a conic gradient (tint at the start, full accent at the head) cut to the ring by a mask, so there are no seams */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, ${tint} 0deg, ${color} ${arcDeg}deg, transparent ${arcDeg}deg 360deg)`,
              WebkitMaskImage: ringMask,
              maskImage: ringMask,
            }}
          />
          {/* round cap at the start of the arc, in the start tint */}
          <div style={{ position: 'absolute', left: c - stroke / 2, top: c - r - stroke / 2, width: stroke, height: stroke, borderRadius: '50%', background: tint }} />
          {/* the head: rides the arc end (same angle maths), accent at full, two soft glow layers from SOFT_GLOW */}
          <div
            style={{
              position: 'absolute',
              left: c + r * Math.sin(arcRad) - headD / 2,
              top: c - r * Math.cos(arcRad) - headD / 2,
              width: headD,
              height: headD,
              borderRadius: '50%',
              background: color,
              boxShadow: [
                `0 0 ${headD * LOOK.headGlowBlur}px color-mix(in srgb, ${color} ${SOFT_GLOW.near.alpha * LOOK.headGlowGain * 100}%, transparent)`,
                `0 0 ${headD * LOOK.headGlowBlur * (SOFT_GLOW.far.blur / SOFT_GLOW.near.blur)}px color-mix(in srgb, ${color} ${SOFT_GLOW.far.alpha * LOOK.headGlowGain * 100}%, transparent)`,
              ].join(', '),
            }}
          />
        </>
      )}
      {digits !== 'none' && showPrev && prevLeave && (
        <div
          style={{
            ...boxStyle,
            color: colorOf(prev),
            opacity: prevLeave.opacity,
            transform: prevLeave.transform,
            filter: `blur(${prevLeave.t * px(DIGIT.blurOut)}px)`,
          }}
        >
          {prev}
        </div>
      )}
      {digits !== 'none' && (
        <div style={{ ...boxStyle, color: colorOf(seconds), ...(nowIn ? { opacity: nowIn.opacity, transform: nowIn.transform } : null) }}>
          {seconds}
        </div>
      )}
    </div>
  );
};
