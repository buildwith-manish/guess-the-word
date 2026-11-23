/**
 * CountdownNumber: Dynamic Island-style pill under the prompt. Big tabular seconds (Nunito ExtraBold),
 * a thin progress line inside the pill that fills over the timer. The number and line turn red
 * for the last URGENT_SECONDS (shared/timerMath) and a red edge pulse beats on every remaining frame.
 * Timer starts at `at` (the first tick after the intro), so reading time never counts.
 * Duration comes from timing.ts (timerSecFor: 5/4/3 s by level). No sizes, rounds or seconds hard-coded.
 * Sizes in 1280x720 reference units through px(). Our own drawn UI, no logos.
 *
 * Note: shared/EdgeGlow and shared/TimerRing do not exist on this branch, so the red edge pulse
 * is drawn here (EdgeBeat) and the island pill is drawn here too. Swap when 2a lands them.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Level } from '../data';
import { colours, fontNumeric, glassSurface, springAt, SYSTEM, tabular } from '../system';
import { timerMath } from '../shared/timerMath';
import { WIDTH, secToTicks, timerSecFor, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Pill layout in reference units (centre 80% safe). */
const L = { w: 220, h: 112, radius: 56, numberSize: 76, lineH: 5, lineInset: 30, lineBottom: 12 } as const;
/** Ticks the pill springs in before the timer starts. */
const LEAD_IN = 6;

export type CountdownNumberProps = {
  level: Level;
  /** Local design tick (30 fps) at which the timer starts: the end of the intro. */
  at: number;
  /** Override only for tests; default is timerSecFor(level). */
  durationSec?: number;
  /** Top of the pill in reference units (under the prompt). */
  top?: number;
  /** Local design tick; defaults to the current clock. */
  frame?: number;
  /** Draw the red edge pulse (default true). */
  edge?: boolean;
};

/** The red edge pulse on its own, driven by the same timer maths. */
export const EdgeBeat: React.FC<{ level: Level; at: number; durationSec?: number; frame?: number }> = ({ level, at, durationSec, frame }) => {
  const clock = useDontSayFrame();
  const t = frame ?? clock;
  const dur = secToTicks(durationSec ?? timerSecFor(level));
  const m = timerMath(t, at, dur);
  const on = m.urgent && m.left > 0;
  // Never fully off while urgent: 0.35 floor, beats up on each second.
  const a = on ? 0.35 + 0.5 * m.pulse : 0;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: a,
        boxShadow: `inset 0 0 ${px(90)}px ${px(18)}px ${SYSTEM.red}`,
      }}
    />
  );
};

export const CountdownNumber: React.FC<CountdownNumberProps> = ({ level, at, durationSec, top = 470, frame, edge = true }) => {
  const clock = useDontSayFrame();
  const t = frame ?? clock;
  const dur = secToTicks(durationSec ?? timerSecFor(level));
  const m = timerMath(t, at, dur);

  const inP = springAt(t, at - LEAD_IN, 'snappy');
  const red = m.urgent;
  const tone = red ? SYSTEM.red : colours.ink;
  const scale = 1 + 0.06 * m.pulse;
  // Before the timer starts the pill shows the full duration and an empty line.
  const shown = m.started ? m.seconds : Math.ceil(dur / 30);

  return (
    <>
      {edge ? <EdgeBeat level={level} at={at} durationSec={durationSec} frame={t} /> : null}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(top),
          width: px(L.w),
          height: px(L.h),
          marginLeft: -px(L.w) / 2,
          opacity: Math.min(1, inP * 1.4),
          transform: `translateY(${(1 - inP) * -px(16)}px) scale(${0.86 + 0.14 * inP})`,
          transformOrigin: '50% 0%',
          ...glassSurface(L.radius * 1.5, { alpha: 0.12 }),
          borderRadius: px(L.radius),
          background: red ? `linear-gradient(160deg, ${SYSTEM.red}55, rgba(0,0,0,0.35))` : 'linear-gradient(160deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: fontNumeric,
            fontWeight: 800,
            fontSize: px(L.numberSize),
            lineHeight: 1,
            color: tone,
            transform: `scale(${scale})`,
            marginTop: -px(6),
            ...tabular,
          }}
        >
          {shown}
        </div>
        {/* thin progress line inside the pill */}
        <div
          style={{
            position: 'absolute',
            left: px(L.lineInset),
            right: px(L.lineInset),
            bottom: px(L.lineBottom),
            height: px(L.lineH),
            borderRadius: px(L.lineH),
            background: 'rgba(255,255,255,0.18)',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${m.fill * 100}%`, height: '100%', borderRadius: px(L.lineH), background: tone }} />
        </div>
      </div>
    </>
  );
};
