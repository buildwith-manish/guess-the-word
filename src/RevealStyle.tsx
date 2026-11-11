import React from 'react';
import { COLORS, px } from './style';
import { clamp01, cssEaseIn, cssEaseInOut, cssEaseOut, htmlEase, ms } from './anim';
import { makeRandom } from './util';

export type RevealStyleName =
  | 'card-flip'
  | 'shatter'
  | 'curtain'
  | 'spotlight'
  | 'vault'
  | 'slot-machine';

const STYLES: RevealStyleName[] = [
  'card-flip',
  'shatter',
  'curtain',
  'spotlight',
  'vault',
  'slot-machine',
];

/** Stable per-question selection: the same question always gets the same reveal style. */
export const revealStyleFor = (questionId: number): RevealStyleName => {
  const random = makeRandom(questionId * 7919 + 17);
  return STYLES[Math.floor(random() * STYLES.length)] ?? STYLES[0];
};

const shardTransforms = [
  'translate(-150px, -100px) rotate(-18deg)',
  'translate(130px, -90px) rotate(16deg)',
  'translate(-170px, 100px) rotate(20deg)',
  'translate(160px, 110px) rotate(-14deg)',
  'translate(-35px, -140px) rotate(8deg)',
  'translate(45px, 145px) rotate(-9deg)',
];

export const RevealStyle: React.FC<{
  frame: number;
  start: number;
  exit: number;
  questionId: number;
  children: React.ReactNode;
}> = ({ frame, start, exit, questionId, children }) => {
  const style = revealStyleFor(questionId);
  const f = frame - start;
  const reveal = htmlEase(clamp01(f / ms(900)));
  const exitP = cssEaseIn(clamp01((frame - exit) / ms(380)));
  const opacity = 1 - exitP;
  const settle = cssEaseOut(clamp01((f - ms(180)) / ms(720)));
  const pulse = 0.5 + 0.5 * Math.sin((frame - start) / 30 * Math.PI * 2 * 1.4);

  const stageTransform =
    style === 'card-flip'
      ? `perspective(${px(1600)}px) rotateY(${(1 - reveal) * -82}deg) scale(${0.82 + 0.18 * reveal})`
      : style === 'vault'
        ? `perspective(${px(1600)}px) rotateZ(${(1 - reveal) * -9}deg) rotateY(${(1 - reveal) * -32}deg) scale(${0.9 + 0.1 * reveal})`
        : style === 'slot-machine'
          ? `translateY(${(1 - reveal) * px(230)}px) scale(${0.9 + 0.1 * reveal})`
          : `scale(${0.92 + 0.08 * reveal})`;

  const curtain = style === 'curtain' ? 1 - cssEaseOut(clamp01(f / ms(720))) : 0;
  const spotlight = style === 'spotlight' ? cssEaseInOut(clamp01(f / ms(1100))) : 0;
  const shatter = style === 'shatter' ? cssEaseOut(clamp01(f / ms(760))) : 0;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        opacity,
        transform: stageTransform,
        transformOrigin: '50% 50%',
      }}
    >
      {children}

      {style === 'curtain' ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: '8% 50% 8% 8%',
              zIndex: 12,
              borderRadius: `${px(28)}px 0 0 ${px(28)}px`,
              background: 'linear-gradient(135deg, #ffe9a8, #d98b16 48%, #6b3104)',
              transform: `translateX(${-curtain * 110}%) skewX(-5deg)`,
              boxShadow: `0 0 ${px(35)}px rgba(255,201,60,${0.35 + 0.25 * curtain})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '8% 8% 8% 50%',
              zIndex: 12,
              borderRadius: `0 ${px(28)}px ${px(28)}px 0`,
              background: 'linear-gradient(225deg, #ffe9a8, #d98b16 48%, #6b3104)',
              transform: `translateX(${curtain * 110}%) skewX(5deg)`,
              boxShadow: `0 0 ${px(35)}px rgba(255,201,60,${0.35 + 0.25 * curtain})`,
            }}
          />
        </>
      ) : null}

      {style === 'spotlight' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            pointerEvents: 'none',
            background: `linear-gradient(105deg, rgba(4,5,20,0.82) 0%, rgba(4,5,20,0.15) ${20 + spotlight * 55}%, rgba(255,255,255,0.34) ${28 + spotlight * 55}%, rgba(4,5,20,0.82) ${38 + spotlight * 55}%, rgba(4,5,20,0.82) 100%)`,
            mixBlendMode: 'multiply',
            opacity: 1 - 0.72 * reveal,
          }}
        />
      ) : null}

      {style === 'shatter' ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 12,
              pointerEvents: 'none',
              clipPath: `polygon(0 0, 100% 0, 100% ${100 - 18 * shatter}%, 0 ${100 - 4 * shatter}%)`,
              background: 'linear-gradient(135deg, rgba(255,233,168,0.72), rgba(255,201,60,0))',
              opacity: 1 - shatter,
            }}
          />
          {shardTransforms.map((transform, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${38 + (i % 3) * 12}%`,
                top: `${36 + Math.floor(i / 3) * 18}%`,
                width: px(72),
                height: px(44),
                zIndex: 13,
                pointerEvents: 'none',
                background: i % 2 ? COLORS.yellow : '#fff1b8',
                clipPath: 'polygon(50% 0, 100% 35%, 72% 100%, 0 68%)',
                opacity: (1 - shatter) * 0.9,
                transform: `${transform} scale(${0.8 + shatter * 0.3})`,
              }}
            />
          ))}
        </>
      ) : null}

      {style === 'vault' ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: '5%',
              zIndex: 12,
              pointerEvents: 'none',
              border: `${px(10)}px solid rgba(255,201,60,${0.85 * (1 - reveal)})`,
              borderRadius: px(38),
              boxShadow: `inset 0 0 ${px(30)}px rgba(255,201,60,${0.55 * (1 - reveal)}), 0 0 ${px(28)}px rgba(255,201,60,${0.4 * (1 - reveal)})`,
              transform: `rotate(${(1 - reveal) * 18}deg) scale(${1.08 - 0.08 * reveal})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              zIndex: 13,
              width: px(60),
              height: px(60),
              margin: `${-px(30)}px 0 0 ${-px(30)}px`,
              borderRadius: '50%',
              border: `${px(6)}px solid ${COLORS.yellow}`,
              background: 'rgba(25,15,4,0.9)',
              opacity: 1 - reveal,
              transform: `rotate(${(1 - reveal) * 360}deg) scale(${0.7 + 0.3 * reveal})`,
            }}
          />
        </>
      ) : null}

      {style === 'slot-machine' ? (
        <div
          style={{
            position: 'absolute',
            inset: '5% 2%',
            zIndex: 12,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: px(36),
            border: `${px(5)}px solid rgba(255,233,168,${0.8 * (1 - reveal)})`,
            boxShadow: `inset 0 ${px(90 * (1 - reveal))}px ${px(70)}px rgba(255,255,255,${0.12 * (1 - reveal)})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${-100 + 100 * reveal}%`,
              height: '18%',
              background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.7), transparent)',
              opacity: 1 - reveal,
            }}
          />
        </div>
      ) : null}

      {style === 'card-flip' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.72) 50%, transparent 62%)',
            transform: `translateX(${(-70 + 140 * settle)}%)`,
            opacity: (1 - reveal) * 0.9,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: px(520),
          height: px(520),
          margin: `${-px(260)}px 0 0 ${-px(260)}px`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 11,
          border: `${px(3)}px solid rgba(255,233,168,${0.2 * (1 - reveal) + 0.08 * pulse})`,
          opacity: style === 'spotlight' ? 0.6 : 0.35,
          transform: `scale(${0.5 + reveal * 1.2})`,
        }}
      />
    </div>
  );
};
