/**
 * StateTitleLockup: "GUESS THE STATE" as plain Inter bold type in the iOS style (no tiles, gold gradient, shine or pop):
 * letters rise in on the shared spring and STATE turns to the accent colour, letter by letter. Same props, same lockupTimes() so sound cues are unchanged.
 *
 *   1. every letter rises and fades in, one per LOOK.flipEveryMs
 *   2. GUESS / THE stay white
 *   3. STATE then "solves" itself last: its letters ignite to gold one after another, each with a pop
 *      and a travelling shine
 *   4. the gold hairline draws in underneath
 *
 * Prop-driven, no time inside: `frame` = design ticks (30 per second) since the lockup started.
 * It is a plain centred column (no absolute position): the parent places it. `scale` multiplies every size.
 * `lockupTimes()` gives the ignite moments in the same ticks, for sound cues.
 */
import React from 'react';
import { px } from '../../style';
import { IOS } from '../../ios';
import { spr } from '../motion';
import { COLOR } from '../look';
import { clamp01, ms } from '../../anim';

const WORDS = [
  { text: 'GUESS', accent: false },
  { text: 'THE', accent: false },
  { text: 'STATE', accent: true },
];

/** Tile look and motion, in the units of the GTW title (ms for motion, 1280x720 reference px for size). */
const LOOK = {
  textFont: 62,
  flipEveryMs: 40,
  flipMs: 600,
  /** wait after the last tile has landed before STATE starts to ignite */
  igniteGapMs: 420,
  igniteStepMs: 80,
  igniteMs: 240,
  popMs: 420,
  shineDelayMs: 140,
  shineMs: 520,
  ruleDelayMs: 500,
  ruleMs: 900,
  ruleW: 440,
};

const flipCount = WORDS.reduce((n, w) => n + w.text.length, 0);
const accentCount = WORDS.reduce((n, w) => n + (w.accent ? w.text.length : 0), 0);

/** Ticks (since the lockup started) of the moments a sound can follow. */
export const lockupTimes = () => {
  const igniteAt = ms(flipCount * LOOK.flipEveryMs + LOOK.igniteGapMs);
  return {
    /** the first STATE tile starts to ignite */
    igniteAt,
    /** the last STATE tile has finished its pop */
    doneAt: igniteAt + ms((accentCount - 1) * LOOK.igniteStepMs + LOOK.popMs),
  };
};

export interface StateTitleLockupProps {
  /** design ticks since the lockup started */
  frame: number;
  /** false: already on screen (STATE gold, no motion), default true */
  animate?: boolean;
  /** multiplies every size, default 1 (the GTW title size) */
  scale?: number;
  /** colour STATE turns to; gold (the only place gold is a fixed part of the title) */
  accent?: string;
}

export const StateTitleLockup: React.FC<StateTitleLockupProps> = ({ frame, animate = true, scale = 1, accent = COLOR.gold }) => {
  const u = (v: number) => px(v) * scale;
  const font = u(LOOK.textFont);

  const ruleP = animate ? spr(frame, ms(LOOK.ruleDelayMs), 'normal') : 1;
  const igniteBase = lockupTimes().igniteAt;
  let running = -1;
  let accentIdx = -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: u(30), paddingBottom: u(6) }}>
        {WORDS.map((w, wi) => (
          <div key={wi} style={{ display: 'flex', gap: u(2) }}>
            {Array.from(w.text).map((ch, ci) => {
              running += 1;
              if (w.accent) accentIdx += 1;

              // plain letters rise and fade in, one after another (no tiles, no boxes)
              const p = animate ? spr(frame, ms(running * LOOK.flipEveryMs), 'quick') : 1; // per-letter cascade: 1-tick step (exempt from the 2-tick stagger)
              const rise = (1 - p) * u(22);

              // STATE ignites to gold, letter by letter
              const at = igniteBase + (w.accent ? accentIdx * ms(LOOK.igniteStepMs) : 0);
              const g = !w.accent ? 0 : animate ? clamp01((frame - at) / ms(LOOK.igniteMs)) : 1;

              return (
                <div
                  key={ci}
                  style={{
                    opacity: Math.min(1, p * 1.4),
                    transform: `translateY(${rise}px)`,
                    fontFamily: IOS.font,
                    fontWeight: IOS.weight.bold,
                    fontSize: font,
                    lineHeight: 1,
                    letterSpacing: u(-1),
                    // STATE fades from white to the accent
                    color: g > 0 ? `color-mix(in srgb, ${accent} ${Math.round(g * 100)}%, ${COLOR.text.primary})` : COLOR.text.primary,
                  }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{
          height: u(3),
          width: u(LOOK.ruleW),
          marginTop: u(10),
          borderRadius: u(3),
          background: COLOR.text.hint,
          transform: `scaleX(${ruleP})`,
        }}
      />
    </div>
  );
};
