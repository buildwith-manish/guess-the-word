import React from 'react';
import { COLORS, FONTS, px } from '../../style';
import { prog, htmlEase, cssEaseInOut, keyframes, clamp01, ms } from '../../anim';
import '../../fonts';

/**
 * Title lockup for the search video (task 3c). Copy-and-adapt of GTW's TitleLockup: the words come
 * from props (GTW's has "GUESS THE WORD" hard-coded), and the final word is the one that ignites.
 *
 *   1. every letter flips up in 3D, one tile per FLIP_STAGGER_MS
 *   2. all words but the last land as solid white keycap tiles
 *   3. the last word then "solves" itself: its tiles ignite to glossy gold one after another
 *   4. the gold hairline draws in, and the subtitle fades up under it
 *
 * `frame` is the scene tick, `from` the tick the lockup starts (nothing is drawn before it).
 * Sizes are 1280x720 reference units through px(). `top` is the top edge of the tiles.
 */

/** Tile geometry in reference units at scale 1 (same keycap as GTW's lockup). Motion constants. */
const TILE_W = 38;
const TILE_H = 46;
const TILE_FONT = 32;
const RADIUS = 11;
const TILE_GAP = 6;
const WORD_GAP = 26;
const RULE_W = 440;
/** Timing, in milliseconds like GTW's lockup. */
const FLIP_STAGGER_MS = 40;
const FLIP_MS = 600;
const IGNITE_WAIT_MS = 420;
const IGNITE_STAGGER_MS = 80;
const IGNITE_MS = 240;
const SUBTITLE_AFTER_IGNITE_MS = 200;
const SUBTITLE_FADE_MS = 500;
const SUBTITLE_RISE = 14;

export type SearchTitleLockupProps = {
  frame: number;
  /** Tick the lockup starts. */
  from: number;
  /** Title, words separated by spaces. The last word is the gold one. */
  title: string;
  /** Line under the title. */
  subtitle: string;
  /** Top edge of the tiles, reference units. */
  top: number;
  /** Size multiplier for the whole lockup. */
  scale?: number;
};

export const SearchTitleLockup: React.FC<SearchTitleLockupProps> = ({ frame, from, title, subtitle, top, scale = 1 }) => {
  const f = frame - from;
  if (f < 0) return null;

  const words = title.split(/\s+/).filter(Boolean);
  const tileW = px(TILE_W * scale);
  const tileH = px(TILE_H * scale);
  const font = px(TILE_FONT * scale);
  const radius = px(RADIUS * scale);
  const s = (v: number) => px(v * scale);

  const flipCount = words.reduce((n, w) => n + w.length, 0);
  const igniteBase = ms(flipCount * FLIP_STAGGER_MS + IGNITE_WAIT_MS);
  const accentWord = words.length - 1;
  const accentLen = words[accentWord]?.length ?? 0;
  const igniteEnd = igniteBase + ms((accentLen - 1) * IGNITE_STAGGER_MS + IGNITE_MS);

  const ruleP = prog(f, ms(500), ms(900), htmlEase);
  const subP = prog(f, igniteEnd + ms(SUBTITLE_AFTER_IGNITE_MS), ms(SUBTITLE_FADE_MS), htmlEase);

  let running = -1;
  let accentIdx = -1;

  return (
    <div
      style={{
        position: 'absolute',
        top: px(top),
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', gap: s(WORD_GAP), perspective: s(700), paddingBottom: s(6) }}>
        {words.map((word, wi) => {
          const accent = wi === accentWord;
          return (
            <div key={wi} style={{ display: 'flex', gap: s(TILE_GAP) }}>
              {Array.from(word).map((ch, ci) => {
                running += 1;
                if (accent) accentIdx += 1;

                const p = htmlEase(clamp01((f - ms(running * FLIP_STAGGER_MS)) / ms(FLIP_MS)));
                const flip = `rotateX(${keyframes(p, [0, 0.7, 1], [-80, 0, 0])}deg) scale(${keyframes(p, [0, 0.7, 1], [0.85, 1.12, 1])})`;
                const landed = clamp01(p * 6);

                const at = igniteBase + (accent ? accentIdx * ms(IGNITE_STAGGER_MS) : 0);
                const g = accent ? clamp01((f - at) / ms(IGNITE_MS)) : 0;
                const pop = accent ? keyframes(clamp01((f - at) / ms(420)), [0, 0.45, 1], [1, 1.16, 1]) : 1;
                const shineT = accent ? (f - (at + ms(140))) / ms(520) : -1;

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
                        border: `${px(1.5)}px solid #FFFFFF`,
                        boxShadow: `0 ${s(5)}px 0 #7F89BD, 0 ${s(12)}px ${s(18)}px rgba(0,0,0,0.45), inset 0 ${px(2)}px 0 rgba(255,255,255,0.9)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONTS.display,
                        fontSize: font,
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
                          border: `${px(1.5)}px solid rgba(255,255,255,0.75)`,
                          boxShadow: `0 0 ${s(26)}px rgba(255,201,60,${0.55 * g}), 0 ${s(5)}px 0 #C27A00, 0 ${s(12)}px ${s(18)}px rgba(0,0,0,0.45), inset 0 ${px(2)}px 0 rgba(255,255,255,0.7)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: FONTS.display,
                          fontSize: font,
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
          );
        })}
      </div>
      <div
        style={{
          height: px(3),
          width: s(RULE_W),
          marginTop: s(10),
          borderRadius: px(3),
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${COLORS.yellow}, rgba(0,0,0,0))`,
          transform: `scaleX(${ruleP})`,
        }}
      />
      <div
        style={{
          marginTop: s(16),
          fontFamily: FONTS.body,
          fontWeight: 600,
          fontSize: s(17),
          letterSpacing: s(6),
          textTransform: 'uppercase',
          color: COLORS.ink,
          opacity: subP,
          transform: `translateY(${(1 - subP) * s(SUBTITLE_RISE)}px)`,
          whiteSpace: 'pre',
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
