import React from 'react';
import { COLORS, FONTS, px } from './style';
import { prog, htmlEase, cssEaseInOut, keyframes, clamp01, ms } from './anim';
import { linear } from './gsap-helpers';

const WORDS = [
  { text: 'GUESS', accent: false },
  { text: 'THE', accent: false },
  { text: 'WORD', accent: true },
];

const TILE_W = px(38);
const TILE_H = px(46);
const TILE_FONT = px(32);
const RADIUS = px(11);

/**
 * "GUESS THE WORD" built from the same tiles as the answer row, so the title previews the game:
 *
 *   1. every letter flips up in 3D, one tile per 40 ms (the answer-tile flip: rotateX -80 -> 0, scale overshoot)
 *   2. GUESS / THE land as solid white keycap tiles (the "given" look)
 *   3. WORD then "solves" itself: its tiles ignite to glossy gold one after another,
 *      each with a pop and a travelling shine (the answer-reveal look)
 *   4. the gold hairline draws in underneath
 *
 *   animate=true : full sequence above
 *   animate=false: already on screen (WORD is gold, no motion)
 *   hideAt / showAt: the merge fades the whole lockup out (250 ms) and the reveal fades it back (380 ms)
 */
export const TitleLockup: React.FC<{
  frame: number;
  animate?: boolean;
  hideAt?: number;
  showAt?: number;
  /** legacy alias: hide for good from this frame (titleOut before a bonus round) */
  exitAt?: number;
}> = ({ frame, animate = true, hideAt, showAt, exitAt }) => {
  const hide = hideAt ?? exitAt;
  const out = hide === undefined ? 0 : prog(frame, hide, ms(250), linear);
  const back = showAt === undefined ? 0 : prog(frame, showAt, ms(380), linear);
  const opacity = hide === undefined ? 1 : showAt !== undefined && frame >= showAt ? back : 1 - out;

  const ruleP = animate ? prog(frame, ms(500), ms(900), htmlEase) : 1;
  const flipCount = WORDS.reduce((n, w) => n + w.text.length, 0);
  const igniteBase = ms(flipCount * 40 + 420); // WORD starts to "solve" once every tile has landed
  let running = -1;
  let accentIdx = -1;

  return (
    <div
      style={{
        position: 'absolute',
        top: px(38),
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
      }}
    >
      <div style={{ display: 'flex', gap: px(26), perspective: px(700), paddingBottom: px(6) }}>
        {WORDS.map((w, wi) => (
          <div key={wi} style={{ display: 'flex', gap: px(6) }}>
            {Array.from(w.text).map((ch, ci) => {
              running += 1;
              if (w.accent) accentIdx += 1;

              // ---- 3D flip-in (same curve as the answer tiles) ----
              const p = animate ? htmlEase(clamp01((frame - ms(running * 40)) / ms(600))) : 1;
              const flip = `rotateX(${keyframes(p, [0, 0.7, 1], [-80, 0, 0])}deg) scale(${keyframes(p, [0, 0.7, 1], [0.85, 1.12, 1])})`;
              const landed = animate ? clamp01(p * 6) : 1;

              // ---- WORD ignites to gold, tile by tile ----
              const at = igniteBase + (w.accent ? accentIdx * ms(80) : 0);
              const g = !w.accent ? 0 : animate ? clamp01((frame - at) / ms(240)) : 1;
              const pop = w.accent && animate ? keyframes(clamp01((frame - at) / ms(420)), [0, 0.45, 1], [1, 1.16, 1]) : 1;
              const shineT = w.accent && animate ? (frame - (at + ms(140))) / ms(520) : -1;

              return (
                <div
                  key={ci}
                  style={{
                    position: 'relative',
                    width: TILE_W,
                    height: TILE_H,
                    opacity: landed,
                    transform: `${flip} scale(${pop})`,
                  }}
                >
                  {/* solid keycap tile: the "given" look — opaque white, dark letter, firm bottom edge */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: RADIUS,
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #EEF0FB 58%, #D3D8F0 100%)',
                      border: `${px(1.5)}px solid #FFFFFF`,
                      boxShadow: `0 ${px(5)}px 0 #7F89BD, 0 ${px(12)}px ${px(18)}px rgba(0,0,0,0.45), inset 0 ${px(2)}px 0 rgba(255,255,255,0.9)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: FONTS.display,
                      fontSize: TILE_FONT,
                      lineHeight: 1,
                      color: '#1A1538',
                    }}
                  >
                    {ch}
                  </div>

                  {/* gold tile: the "solved" look, identical to the answer tiles */}
                  {g > 0 ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: RADIUS,
                        overflow: 'hidden',
                        background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow} 55%, ${COLORS.yellowDeep})`,
                        border: `${px(1.5)}px solid rgba(255,255,255,0.75)`,
                        boxShadow: `0 0 ${px(26)}px rgba(255,201,60,${0.55 * g}), 0 ${px(5)}px 0 #C27A00, 0 ${px(12)}px ${px(18)}px rgba(0,0,0,0.45), inset 0 ${px(2)}px 0 rgba(255,255,255,0.7)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONTS.display,
                        fontSize: TILE_FONT,
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
          height: px(3),
          width: px(440),
          marginTop: px(10),
          borderRadius: px(3),
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${COLORS.yellow}, rgba(0,0,0,0))`,
          transform: `scaleX(${ruleP})`,
        }}
      />
    </div>
  );
};
