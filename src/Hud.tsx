import React from 'react';
import { COLORS, FONTS, S, px, glass } from './style';
import { prog, htmlEase, bounceEase } from './anim';

/** Question counter pill (top-left) with a thin progress rail, plus the BONUS ERASES badge. */
export const Hud: React.FC<{
  label: string;
  number: number | string;
  total: number;
  /** bonus rounds finished so far; the badge is hidden at 0 */
  erases: number;
  eraseAt?: number;
  frame: number;
}> = ({ label, number, total, erases, eraseAt, frame }) => {
  const pop = prog(frame, 0, 18, bounceEase);
  const eraseIn = eraseAt === undefined || frame < eraseAt ? 1 : prog(frame, eraseAt, 15, htmlEase);
  const ratio = typeof number === 'number' ? Math.min(1, number / Math.max(1, total)) : 0;

  return (
    <>
      <div style={{ position: 'absolute', left: S.hudLeft, top: S.hudTop }}>
        <div
          style={{
            ...glass(px(40)),
            display: 'flex',
            alignItems: 'center',
            gap: px(10),
            padding: `${px(5)}px ${px(22)}px ${px(5)}px ${px(18)}px`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            color: COLORS.ink,
          }}
        >
          <span style={{ fontSize: px(15), letterSpacing: px(3), color: COLORS.muted }}>{label}</span>
          <b
            style={{
              display: 'inline-block',
              minWidth: px(26),
              textAlign: 'center',
              fontFamily: FONTS.display,
              fontWeight: 400,
              fontSize: px(40),
              lineHeight: 1,
              color: COLORS.yellow,
              textShadow: `0 0 ${px(22)}px rgba(255,201,60,0.55)`,
              transform: `translateY(${(1 - pop) * 70}%) scale(${0.5 + 0.5 * pop})`,
              opacity: Math.min(1, Math.max(0, pop)),
            }}
          >
            {number}
          </b>
          <small style={{ fontWeight: 800, fontSize: px(17), letterSpacing: px(1), color: COLORS.muted }}>/{total}</small>
        </div>
        <div
          style={{
            marginTop: px(8),
            marginLeft: px(8),
            width: px(150),
            height: px(4),
            borderRadius: px(4),
            background: 'rgba(255,255,255,0.14)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${ratio * 100}%`,
              height: '100%',
              borderRadius: px(4),
              background: `linear-gradient(90deg, ${COLORS.yellowDeep}, ${COLORS.yellow})`,
            }}
          />
        </div>
      </div>

      {erases > 0 ? (
        <div
          style={{
            ...glass(px(30)),
            position: 'absolute',
            left: S.hudLeft,
            top: px(108),
            padding: `${px(5)}px ${px(16)}px ${px(6)}px`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(14),
            letterSpacing: px(2),
            color: COLORS.green,
            opacity: eraseIn,
            transform: `translateX(${(1 - eraseIn) * -30}px)`,
          }}
        >
          BONUS ERASES · {erases}
        </div>
      ) : null}
    </>
  );
};
