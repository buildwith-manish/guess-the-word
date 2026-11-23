import React from 'react';
import type { Card } from '../data';
import { FPS } from '../shared/clock';
import { EdgeGlow } from '../shared/EdgeGlow';
import { fadeWindow } from '../shared/fade';
import { LowPowerTint } from '../shared/LowPowerTint';
import { cue, sfxFrames } from '../sfx';
import type { SfxCue } from '../sfx';
import { SAFE, SPRINGS, colors, easeOut, px, springAt, textStyle } from '../system';
import { clueBaseSec, clueTmwSec, segments } from '../timing';

/**
 * Two-Minute Warning wrapper (cards 5, 15, 25: `card.twoMinuteWarning`). Draws over its children and never moves them:
 *  - yellow Low Power Mode tint (shared/LowPowerTint) for the whole clue phase,
 *  - a badge (label + clock graphic) in the top band, clear of the clue area (y 168 and below),
 *  - a clock hand that steps once per second, on the same ticks as the `tmw-tick` cues,
 *  - a stronger edge pulse: a steady red glow plus a second one that pulses on every tick,
 *  - faster clue flips: `tmwFlipTicks(card)` for ClueStack's `flipTicks`.
 * On any other card it renders its children only. The clue text is never covered: the badge sits above the
 * clue area, and the tint and glow are translucent overlays with pointer events off.
 * All numbers come from data.ts, timing.ts and sfx.ts; the label is passed in.
 */

/** One tick sound per this many ticks: the length of the tmw-tick sample (1 s). */
const TICK_EVERY = sfxFrames('tmw-tick');
/** Hand step per tick, degrees (12 positions on the dial). */
const STEP_DEG = 30;
/** How long one hand step takes, ticks. */
const STEP_TICKS = 3;

/** Flip length for a card, ticks: the normal `gentle` flip scaled by clueTmwSec / clueBaseSec. undefined on normal cards. */
export const tmwFlipTicks = (card: Card): number | undefined =>
  card.twoMinuteWarning ? Math.max(1, Math.round(SPRINGS.gentle * FPS * (clueTmwSec / clueBaseSec))) : undefined;

/** Where the warning stands at `frame` (ticks local to the card; `start` and `end` in the same origin). */
export const tmwMath = (frame: number, start: number, end: number) => {
  const active = frame >= start && frame < end;
  const t = Math.max(0, frame - start);
  const step = Math.floor(t / TICK_EVERY);
  const inStep = t - step * TICK_EVERY;
  /** 1 on the tick, easing to 0 within 10 ticks (as the urgent pulse of timerMath). */
  const pulse = active && step >= 1 ? Math.pow(Math.max(0, 1 - inStep / 10), 2) : 0;
  const angle = step === 0 ? 0 : STEP_DEG * (step - 1 + easeOut(inStep / STEP_TICKS));
  return { active, step, pulse, angle };
};

export type TwoMinuteWarningProps = {
  card: Card;
  /** Local design frame (30 fps ticks). Same origin as `starts` and `end`. */
  frame: number;
  /** Start tick of each clue slot (timing.ts `phases.clues[i].from`, local). Only the first is used. */
  starts: readonly number[];
  /** Tick where the last clue slot ends (`phases.clues[4].to`, local). */
  end: number;
  /** Badge text. Supplied by the scene; data.ts has no such string. */
  label: string;
  /** Badge top edge, reference units. Default SAFE.top; the badge is 56 high, so it ends well above the clue area. */
  top?: number;
  children?: React.ReactNode;
};

const BADGE_H = 56;
const CLOCK = 36;

const Clock: React.FC<{ angle: number; scale: number }> = ({ angle, scale }) => (
  <svg width={px(CLOCK)} height={px(CLOCK)} viewBox="0 0 100 100" style={{ flex: 'none', transform: `scale(${scale})` }}>
    <circle cx={50} cy={50} r={44} fill="none" stroke={colors.lowPower} strokeWidth={8} />
    {Array.from({ length: 12 }, (_, i) => (
      <line key={i} x1={50} y1={13} x2={50} y2={i % 3 === 0 ? 22 : 19} stroke={colors.lowPower} strokeWidth={4} strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
    ))}
    <line x1={50} y1={50} x2={50} y2={24} stroke={colors.lowPower} strokeWidth={7} strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
    <circle cx={50} cy={50} r={6} fill={colors.lowPower} />
  </svg>
);

export const TwoMinuteWarning: React.FC<TwoMinuteWarningProps> = ({ card, frame, starts, end, label, top = SAFE.top, children }) => {
  if (!card.twoMinuteWarning || starts.length === 0) return <>{children}</>;
  const start = starts[0];
  const m = tmwMath(frame, start, end);
  const enter = springAt(frame, start, 'gentle');
  const fade = fadeWindow(frame, start, end, 1, 6);
  const show = frame >= start && frame < end;

  return (
    <>
      {children}
      {show && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <LowPowerTint frame={frame} at={start} dur={end - start} />
          {/* stronger edge pulse: a steady glow, plus a second one that peaks on every tick */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.45 * fade }}>
            <EdgeGlow frame={frame} at={start} dur={TICK_EVERY} />
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: m.pulse * fade }}>
            <EdgeGlow frame={frame} at={start} dur={TICK_EVERY} />
          </div>
          {/* badge */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: px(top), display: 'flex', justifyContent: 'center', opacity: Math.min(1, enter * 2) * fade }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: px(12),
                height: px(BADGE_H),
                padding: `0 ${px(22)}px 0 ${px(14)}px`,
                boxSizing: 'border-box',
                borderRadius: px(BADGE_H / 2),
                background: 'rgba(0,0,0,0.55)',
                border: `${px(1.5)}px solid ${colors.lowPower}`,
                backdropFilter: `blur(${px(14)}px)`,
                transform: `scale(${0.9 + 0.1 * enter + 0.03 * m.pulse})`,
                transformOrigin: '50% 0%',
              }}
            >
              <Clock angle={m.angle} scale={1 + 0.08 * m.pulse} />
              <div style={{ ...textStyle('caption'), fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.lowPower, whiteSpace: 'nowrap' }}>
                {label}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Sound cues for a Two-Minute Warning card. `startFrame` = absolute design tick of the card segment (seg.from); pass
 * the real one and the cues land on the real clue phase. `tmw-alert` at clue 1, then `tmw-tick` once per second
 * (every TICK_EVERY ticks) until clue 5 ends. The clock hand and the edge pulse step on the same ticks. Empty on other cards.
 */
export const tmwCues = (card: Card, startFrame = 0): SfxCue[] => {
  if (!card.twoMinuteWarning) return [];
  const seg = segments.find((s) => s.kind === 'card' && s.card.n === card.n);
  if (!seg || seg.kind !== 'card') return [];
  const shift = startFrame - seg.from;
  const first = seg.phases.clues[0].from + shift;
  const last = seg.phases.clues[seg.phases.clues.length - 1].to + shift;
  const out: SfxCue[] = [cue('tmw-alert', first)];
  for (let t = first + TICK_EVERY; t < last; t += TICK_EVERY) out.push(cue('tmw-tick', t));
  return out;
};
