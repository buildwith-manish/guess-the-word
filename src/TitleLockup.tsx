import React from 'react';
import { COLORS, FONTS, px } from './style';
import { prog, htmlEase, ms } from './anim';
import { linear } from './gsap-helpers';

const WORDS = [
  { text: 'GUESS', accent: false },
  { text: 'THE', accent: false },
  { text: 'WORD', accent: true },
];

/**
 * "GUESS THE WORD" letter cascade + the yellow hairline under it (HTML #title).
 *   animate=true : titleIn() — letters rise one per 40 ms (600 ms, EASE), rule draws in (900 ms, +300 ms)
 *   animate=false: already on screen (the page builds the lockup once and keeps it)
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

  const ruleP = animate ? prog(frame, ms(300), ms(900), htmlEase) : 1;
  let running = -1;

  return (
    <div
      style={{
        position: 'absolute',
        top: px(24),
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: px(18),
          filter: `drop-shadow(0 ${px(4)}px ${px(12)}px rgba(0,0,0,0.53))`,
        }}
      >
        {WORDS.map((w, wi) => (
          <div key={wi} style={{ display: 'flex', overflow: 'hidden', padding: `${px(2)}px 0` }}>
            {Array.from(w.text).map((ch, ci) => {
              running += 1;
              const p = animate ? prog(frame, ms(running * 40), ms(600), htmlEase) : 1;
              return (
                <span
                  key={ci}
                  style={{
                    display: 'inline-block',
                    fontFamily: FONTS.display,
                    fontWeight: 400,
                    fontSize: px(42),
                    lineHeight: 1.1,
                    letterSpacing: px(8),
                    color: w.accent ? COLORS.yellow : COLORS.ink,
                    transform: `translateY(${(1 - p) * 120}%)`,
                    opacity: p,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{
          height: px(3),
          width: px(440),
          marginTop: px(2),
          borderRadius: px(3),
          background: `linear-gradient(90deg, rgba(0,0,0,0), ${COLORS.yellow}, rgba(0,0,0,0))`,
          transform: `scaleX(${ruleP})`,
        }}
      />
    </div>
  );
};
