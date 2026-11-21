/**
 * StateTitleLockup: "GUESS THE STATE" in the tile style of the word quiz title (src/TitleLockup.tsx,
 * copied and adapted: that file hard-codes GUESS / THE / WORD and positions itself at the top).
 *
 *   1. every letter flips up in 3D, one tile per LOOK.flipEveryMs
 *   2. GUESS / THE land as solid white keycap tiles
 *   3. STATE then "solves" itself last: its tiles ignite to glossy gold one after another, each with a pop
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
  tileW: 38,
  tileH: 46,
  tileFont: 32,
  radius: 11,
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
  const tileW = u(LOOK.tileW);
  const tileH = u(LOOK.tileH);
  const tileFont = u(LOOK.tileFont);
  const radius = u(LOOK.radius);

  const ruleP = animate ? prog(frame, ms(LOOK.ruleDelayMs), ms(LOOK.ruleMs), htmlEase) : 1;
  const igniteBase = lockupTimes().igniteAt;
  let running = -1;
  let accentIdx = -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: u(26), perspective: u(700), paddingBottom: u(6) }}>
        {WORDS.map((w, wi) => (
          <div key={wi} style={{ display: 'flex', gap: u(6) }}>
            {Array.from(w.text).map((ch, ci) => {
              running += 1;
              if (w.accent) accentIdx += 1;

              // 3D flip-in
              const p = animate ? htmlEase(clamp01((frame - ms(running * LOOK.flipEveryMs)) / ms(LOOK.flipMs))) : 1;
              const flip = `rotateX(${keyframes(p, [0, 0.7, 1], [-80, 0, 0])}deg) scale(${keyframes(p, [0, 0.7, 1], [0.85, 1.12, 1])})`;
              const landed = animate ? clamp01(p * 6) : 1;

              // STATE ignites to gold, tile by tile
              const at = igniteBase + (w.accent ? accentIdx * ms(LOOK.igniteStepMs) : 0);
              const g = !w.accent ? 0 : animate ? clamp01((frame - at) / ms(LOOK.igniteMs)) : 1;
              const pop = w.accent && animate ? keyframes(clamp01((frame - at) / ms(LOOK.popMs)), [0, 0.45, 1], [1, 1.16, 1]) : 1;
              const shineT = w.accent && animate ? (frame - (at + ms(LOOK.shineDelayMs))) / ms(LOOK.shineMs) : -1;

              return (
                <div
                  key={ci}
                  style={{
                    position: 'relative',
                    width: tileW,
                    height: tileH,
                    opacity: landed,
                    transform: `${flip} scale(${pop})`,
                  }}
                >
                  {/* solid keycap tile: opaque white, dark letter, firm bottom edge */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: radius,
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #EEF0FB 58%, #D3D8F0 100%)',
                      border: `${u(1.5)}px solid #FFFFFF`,
                      boxShadow: `0 ${u(5)}px 0 #7F89BD, 0 ${u(12)}px ${u(18)}px rgba(0,0,0,0.45), inset 0 ${u(2)}px 0 rgba(255,255,255,0.9)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: FONTS.display,
                      fontSize: tileFont,
                      lineHeight: 1,
                      color: '#1A1538',
                    }}
                  >
                    {ch}
                  </div>

                  {/* gold tile: the "solved" look */}
                  {g > 0 ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: radius,
                        overflow: 'hidden',
                        background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow} 55%, ${COLORS.yellowDeep})`,
                        border: `${u(1.5)}px solid rgba(255,255,255,0.75)`,
                        boxShadow: `0 0 ${u(26)}px rgba(255,201,60,${0.55 * g}), 0 ${u(5)}px 0 #C27A00, 0 ${u(12)}px ${u(18)}px rgba(0,0,0,0.45), inset 0 ${u(2)}px 0 rgba(255,255,255,0.7)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONTS.display,
                        fontSize: tileFont,
                        lineHeight: 1,
                        color: COLORS.inkDark,
                        opacity: g,
                      }}
                    >
                      {ch}
                      {shineT > 0 && shineT < 1 ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-10%',
                            height: '120%',
                            width: '55%',
                            left: `${-70 + 190 * cssEaseInOut(shineT)}%`,
                            transform: 'skewX(-18deg)',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.8), rgba(255,255,255,0))',
                          }}
                        />
                      ) : null}
                    </div>
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
