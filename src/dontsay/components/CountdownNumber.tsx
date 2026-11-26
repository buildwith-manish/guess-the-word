/**
 * CountdownNumber: a small plain glass pill (about 150 x 56, glassSurface tinted with the level accent; never filled
 * red) in the top centre, on the HUD row with the hearts pill and the watermark (layout.countdown). Tabular seconds
 * (Nunito ExtraBold) in the ink colour (colours.ink, same as the prompt) at full opacity, and a thin accent progress line
 * inside the pill that fills over the timer. Only the line turns red for the last URGENT_SECONDS
 * (shared/timerMath), with a red edge pulse on every remaining frame; the number never changes colour.
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
import { layout } from '../layout';
import { FPS, WIDTH, secToTicks, timerSecFor, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

/** Pill layout in reference units (centre 80% safe). */
const L = { w: layout.countdown.right - layout.countdown.left, h: layout.countdown.bottom - layout.countdown.top, radius: 28, numberSize: 34, lineH: 4, lineInset: 22, lineBottom: 7 } as const;
/** Ticks the pill springs in before the timer starts. */
const LEAD_IN = 6;
/** Number crossfade and red fade-in, in ticks. */
const SWAP_TICKS = 6;
/** The progress line fades to red over this many ticks at the start of the urgent window. */
const RED_TICKS = 6;
/** Red edge pulse: fade-in at the urgent start, quick rise then ease-out fall on each second, fade-out at the timer end. */
const EDGE_IN_TICKS = 8;
const EDGE_RISE_TICKS = 4;
const EDGE_OUT_TICKS = 6;
const EDGE_PEAK = 0.57; // old peak was 0.85; about a third lower

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
  /** Top of the pill in reference units. Default: layout.countdown.top (top centre, same row as hearts and watermark). */
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
  // quick rise, then a long ease-out fall to nothing within the second
  const beat = m.tickInSecond < EDGE_RISE_TICKS
    ? easeOut(m.tickInSecond / EDGE_RISE_TICKS)
    : 1 - easeOut((m.tickInSecond - EDGE_RISE_TICKS) / (FPS - EDGE_RISE_TICKS), 2);
  const a = on ? EDGE_PEAK * beat * easeOut(m.urgentTicks / EDGE_IN_TICKS) * easeOut(m.left / EDGE_OUT_TICKS) : 0;
  // Soft vignette, not a frame: closest-side so the edges carry the colour, and a corner mask so the
  // corners are about half as strong (they never go solid dark red).
  const cornerMask = 'radial-gradient(ellipse farthest-corner at 50% 50%, #000 70%, rgba(0,0,0,0.5) 100%)';
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: a,
        background: `radial-gradient(ellipse closest-side at 50% 50%, transparent 58%, ${SYSTEM.red}E6 100%)`,
        WebkitMaskImage: cornerMask,
        maskImage: cornerMask,
      }}
    />
  );
};

export const CountdownNumber: React.FC<CountdownNumberProps> = ({ level, at, durationSec, top = layout.countdown.top, frame, edge = true }) => {
  const clock = useDontSayFrame();
  const t = frame ?? clock;
  const dur = secToTicks(durationSec ?? timerSecFor(level));
  const m = timerMath(t, at, dur);

  const inP = springAt(t, at - LEAD_IN, 'snappy');
  // red warning fades in over RED_TICKS from the first urgent tick (no instant switch)
  const redP = m.urgent ? easeOut(m.urgentTicks / RED_TICKS) : 0;
  // progress line only: the level's one accent colour, blending to red in the last URGENT_SECONDS. The number stays colours.ink.
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
        <div style={{ display: 'grid', marginTop: -px(4) }}>
          {swap < 1 ? (
            <div style={{ gridArea: '1 / 1', ...numberStyle, color: colours.ink, opacity: 1 - swap }}>{shown + 1}</div>
          ) : null}
          <div style={{ gridArea: '1 / 1', ...numberStyle, color: colours.ink, opacity: swap }}>{shown}</div>
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
