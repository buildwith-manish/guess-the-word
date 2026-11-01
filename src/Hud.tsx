import React from 'react';
import { COLORS, FONTS, S, px } from './style';
import { prog } from './anim';
import { backOut } from './gsap-helpers';

/** "Q 1 /50" pill (top-left) plus the bonus-erases counter under it. */
export const Hud: React.FC<{
  label: string;
  number: number | string;
  total: number;
  erases: number;
  frame: number;
}> = ({ label, number, total, erases, frame }) => {
  const pop = prog(frame, 0, 20, backOut);
  const eraseIn = prog(frame, 0, 22, backOut);

  return (
    <>
      <div style={{ position: 'absolute', left: S.hudLeft, top: S.hudTop }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: px(6),
            background: 'rgba(0,0,0,0.69)',
            border: `${px(2)}px solid rgba(255,255,255,0.2)`,
            padding: `${px(4)}px ${px(22)}px ${px(6)}px`,
            borderRadius: px(44),
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(20),
            letterSpacing: px(2),
            boxShadow: `0 ${px(8)}px ${px(24)}px rgba(0,0,0,0.33)`,
            color: '#fff',
          }}
        >
          <span>{label}</span>
          <b
            style={{
              display: 'inline-block',
              minWidth: px(24),
              textAlign: 'center',
              fontFamily: FONTS.display,
              fontWeight: 400,
              fontSize: px(40),
              lineHeight: 1,
              color: COLORS.yellow,
              textShadow: `0 0 ${px(22)}px rgba(255,214,10,0.53)`,
              transform: `translateY(${(1 - pop) * 70}%) scale(${0.5 + 0.5 * pop})`,
              opacity: pop,
            }}
          >
            {number}
          </b>
          <small style={{ opacity: 0.6 }}>/{total}</small>
        </div>
      </div>

      {erases > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: S.hudLeft,
            top: px(128),
            padding: `${px(5)}px ${px(16)}px ${px(6)}px`,
            borderRadius: px(30),
            background: 'rgba(0,0,0,0.69)',
            border: `${px(2)}px solid rgba(255,255,255,0.2)`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(15),
            letterSpacing: px(2),
            color: COLORS.green,
            opacity: eraseIn,
            transform: `translateX(${(1 - eraseIn) * -30}px)`,
          }}
        >
          BONUS ERASES: {erases}
        </div>
      ) : null}
    </>
  );
};
