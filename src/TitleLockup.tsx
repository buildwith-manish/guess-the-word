import React from 'react';
import { COLORS, FONTS, S, px } from './style';
import { prog } from './anim';
import { expoOut, linear } from './gsap-helpers';

const WORDS = [
  { text: 'GUESS', accent: false },
  { text: 'THE', accent: false },
  { text: 'WORD', accent: true },
];

/** "GUESS THE WORD" letter cascade + the yellow hairline under it. */
export const TitleLockup: React.FC<{ frame: number; exitAt?: number }> = ({ frame, exitAt }) => {
  const exitP = exitAt === undefined ? 0 : prog(frame, exitAt, 12, linear);
  const ruleP = prog(frame, 9, 27, expoOut);

  let running = -1;

  return (
    <div
      style={{
        position: 'absolute',
        top: S.titleTop,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: 1 - exitP,
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
              const delay = running * 1.2 + (wi === 2 ? 3 : 0);
              const p = prog(frame, delay, 18, expoOut);
              return (
                <span
                  key={ci}
                  style={{
                    display: 'inline-block',
                    fontFamily: FONTS.display,
                    fontWeight: 400,
                    fontSize: S.titleLetter,
                    lineHeight: 1.1,
                    letterSpacing: S.titleSpacing,
                    color: w.accent ? COLORS.yellow : '#fff',
                    transform: `translateY(${(1 - p) * 120 - exitP * 120}%)`,
                    opacity: p * (1 - exitP),
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
          background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${COLORS.yellow} 50%, rgba(0,0,0,0) 100%)`,
          transform: `scaleX(${ruleP * (1 - exitP)})`,
        }}
      />
    </div>
  );
};
