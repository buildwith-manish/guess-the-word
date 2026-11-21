/**
 * StateTitleLockup: "GUESS THE STATE" as plain display type (no tiles or boxes); the old keycap-tile look
 * was replaced on request. Same props, same lockupTimes() so sound cues are unchanged.
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
import { COLORS, FONTS, px } from '../../style';
import { prog, htmlEase, cssEaseInOut, keyframes, clamp01, ms } from '../../anim';

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
}

export const StateTitleLockup: React.FC<StateTitleLockupProps> = ({ frame, animate = true, scale = 1 }) => {
  const u = (v: number) => px(v) * scale;
  const font = u(LOOK.textFont);

  const ruleP = animate ? prog(frame, ms(LOOK.ruleDelayMs), ms(LOOK.ruleMs), htmlEase) : 1;
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
              const p = animate ? htmlEase(clamp01((frame - ms(running * LOOK.flipEveryMs)) / ms(LOOK.flipMs))) : 1;
              const rise = (1 - p) * u(26);

              // STATE ignites to gold, letter by letter
              const at = igniteBase + (w.accent ? accentIdx * ms(LOOK.igniteStepMs) : 0);
              const g = !w.accent ? 0 : animate ? clamp01((frame - at) / ms(LOOK.igniteMs)) : 1;
              const pop = w.accent && animate ? keyframes(clamp01((frame - at) / ms(LOOK.popMs)), [0, 0.45, 1], [1, 1.14, 1]) : 1;
              const shineT = w.accent && animate ? (frame - (at + ms(LOOK.shineDelayMs))) / ms(LOOK.shineMs) : -1;

              return (
                <div
                  key={ci}
                  style={{
                    position: 'relative',
                    opacity: p,
                    transform: `translateY(${rise}px) scale(${pop})`,
                    fontFamily: FONTS.display,
                    fontSize: font,
                    lineHeight: 1,
                    letterSpacing: u(2),
                    color: '#FFFFFF',
                    textShadow: `0 ${u(4)}px ${u(18)}px rgba(0,0,0,0.55)`,
                  }}
                >
                  {ch}
                  {g > 0 ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: g,
                        backgroundImage: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow} 55%, ${COLORS.yellowDeep})`,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                        filter: `drop-shadow(0 0 ${u(16 * g)}px rgba(255,201,60,0.6))`,
                      }}
                    >
                      {ch}
                    </div>
                  ) : null}
                  {shineT > 0 && shineT < 1 ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-10%',
                        height: '120%',
                        width: '55%',
                        left: `${-70 + 190 * cssEaseInOut(shineT)}%`,
                        transform: 'skewX(-18deg)',
                        mixBlendMode: 'overlay',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.8), rgba(255,255,255,0))',
                      }}
                    />
                  ) : null}
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
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${COLORS.yellow}, rgba(0,0,0,0))`,
          transform: `scaleX(${ruleP})`,
        }}
      />
    </div>
  );
};
