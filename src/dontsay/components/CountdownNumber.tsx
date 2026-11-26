/**
 * CountdownNumber: a plain glass pill (glassSurface, tinted with the level accent) placed just
 * under the waveform. Big tabular seconds (Nunito ExtraBold), a thin accent progress line inside
 * the pill that fills over the timer. The number and line turn red for the last URGENT_SECONDS
 * (shared/timerMath) and a red edge pulse beats on every remaining frame.
 * Timer starts at `at` (the first tick after the intro), so reading time never counts.
 * Duration comes from timing.ts (timerSecFor: 5/4/3 s by level). No sizes, rounds or seconds hard-coded.
 * Sizes in 1280x720 reference units through px(). Our own drawn UI, no logos.
 *
 * Note: shared/EdgeGlow and shared/TimerRing do not exist on this branch, so the red edge pulse
 * is drawn here (EdgeBeat) and the pill is drawn here too. Swap when 2a lands them.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Level } from '../data';
import { colours, easeOut, fontNumeric, glassSurface, springAt, SYSTEM, tabular } from '../system';
import { timerMath } from '../shared/timerMath';
import { FPS, WIDTH, secToTicks, timerSecFor, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Pill layout in reference units (centre 80% safe). */
const L = { w: 220, h: 112, radius: 56, numberSize: 76, lineH: 5, lineInset: 30, lineBottom: 12 } as const;
/** Ticks the pill springs in before the timer starts. */
const LEAD_IN = 6;
/** Number crossfade and red fade-in, in ticks. */
const SWAP_TICKS = 6;
const RED_TICKS = 8;

const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
/** Blend two #rrggbb colours, k 0..1. */
const mix = (a: string, b: string, k: number): string => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${[0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * k)).join(',')})`;
};

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
  const a = on ? (0.35 + 0.5 * m.pulse) * easeOut(m.urgentTicks / RED_TICKS) : 0;
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
  // red warning fades in over RED_TICKS from the first urgent tick (no instant switch)
  const redP = m.urgent ? easeOut(m.urgentTicks / RED_TICKS) : 0;
  // the level's one accent colour; blends to red only in the last URGENT_SECONDS
  const accent = colours.level[level];
  const tone = mix(accent, SYSTEM.red, redP);
  // the number changes by a short crossfade, no scale, no pop
  const raw = t - at;
  const since = raw >= dur ? raw - dur : raw % FPS;
  const swap = raw >= FPS ? easeOut(since / SWAP_TICKS) : 1;
  // Before the timer starts the pill shows the full duration and an empty line.
  const shown = m.started ? m.seconds : Math.ceil(dur / 30);

  const numberStyle: React.CSSProperties = {
    fontFamily: fontNumeric,
    fontWeight: 800,
    fontSize: px(L.numberSize),
    lineHeight: 1,
    textAlign: 'center',
    ...tabular,
  };

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
          ...glassSurface(L.radius * 1.5, { level, alpha: 0.12 }),
          borderRadius: px(L.radius),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* red tint fades in over the pill (the pill itself is unchanged) */}
        {redP > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: px(L.radius),
              background: `linear-gradient(160deg, ${SYSTEM.red}55, transparent)`,
              opacity: redP,
            }}
          />
        ) : null}
        <div style={{ display: 'grid', marginTop: -px(6) }}>
          {swap < 1 ? (
            <div style={{ gridArea: '1 / 1', ...numberStyle, color: tone, opacity: 1 - swap }}>{shown + 1}</div>
          ) : null}
          <div style={{ gridArea: '1 / 1', ...numberStyle, color: tone, opacity: swap }}>{shown}</div>
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
