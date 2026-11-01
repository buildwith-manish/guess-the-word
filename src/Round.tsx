import React from 'react';
import { Img } from 'remotion';
import { COLORS, FONTS, S, px } from './style';
import { buildQuestionPlan, QUESTIONS, TOTAL, themeForQuestion, FPS } from './timing';
import { prog, fadeIn, floatY, mix } from './anim';
import { backOut, elasticOut, expoOut, linear } from './gsap-helpers';
import { makeConfetti } from './util';
import { Hud } from './Hud';
import { Watermark } from './Watermark';
import { TitleLockup } from './TitleLockup';
import { Background } from './Background';
import settings from '../settings.json';
import { imageSrc, hasImage, clueSrc } from './assets';

const CONFETTI = makeConfetti(7, 26, { x: 960, y: 620 });

/**
 * One question. Beats, all derived from buildQuestionPlan():
 *   emoji pair -> letter blanks -> 6/7/8s clock -> free letters flip at 2/3
 *   and 1/3 of the time left -> the rest flip at the end
 *   -> answer card stamps in with confetti -> optional fact card
 */
export const Round: React.FC<{ frame: number; index: number; erases?: number }> = ({
  frame,
  index,
  erases = 0,
}) => {
  const q = QUESTIONS[index];
  const levelIndex = Math.max(0, settings.levels.findIndex((l) => l.name === q.level));
  const plan = buildQuestionPlan(q, levelIndex, index === 0);
  const theme = themeForQuestion(index);
  const letters = Array.from(q.word);

  const emojiSeq: { ch: string; kind: 'emoji' | 'plus' }[] = [
    { ch: q.clueA, kind: 'emoji' },
    { ch: '+', kind: 'plus' },
    { ch: q.clueB, kind: 'emoji' },
  ];

  const timerStart = plan.timerStart;
  const timerEnd = timerStart + plan.timerFrames;
  const clockP = Math.min(1, Math.max(0, (frame - timerStart) / plan.timerFrames));
  const secondsLeft = Math.max(1, Math.ceil((plan.timerFrames - (frame - timerStart)) / FPS));
  const low = secondsLeft <= settings.timer.lowSeconds && frame >= timerStart;
  const timerVisible = frame >= timerStart - 10 && frame < timerEnd + 8;

  const merged = frame >= plan.stamp - 12;
  const exitP = prog(frame, plan.exit, 22, linear);

  const showFact = plan.showFact && !!plan.fact;
  const chipIn = prog(frame, plan.stamp + 6, 15, backOut);
  const factIn = prog(frame, plan.stamp + 24, 15, expoOut);

  return (
    <>
      <Background frame={frame} theme={theme} />
      <Hud label="Q" number={index + 1} total={TOTAL} erases={erases} frame={frame} />
      <Watermark frame={index === 0 ? frame : frame + 999} />
      {index === 0 ? <TitleLockup frame={frame} exitAt={plan.stamp} /> : null}

      {/* ---------- emoji pair ---------- */}
      {emojiSeq.map((item, i) => {
        const start = plan.emojiStart + i * 8;
        const p = prog(frame, start, 27, backOut);
        const out = prog(frame, plan.stamp - 12, 22, expoOut);
        const isEmoji = item.kind === 'emoji';
        const gap = px(340) + px(20);
        const left = i === 0 ? -gap : i === 1 ? 0 : gap;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: S.emojiTop,
              left: '50%',
              marginLeft: left - px(170),
              width: px(340),
              height: px(340),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isEmoji ? Math.max(0, p - out) : Math.max(0, p - out),
              transform: `translate3d(${mix(0, isEmoji ? (i === 0 ? -30 : 30) : 0, out)}px, ${(1 - p) * 160 + floatY(frame, isEmoji ? 7 : 3)}px, 0) scale(${(0.2 + 0.8 * p) * (1 - 0.55 * out)}) rotate(${(1 - p) * -35}deg)`,
            }}
          >
            {isEmoji ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    bottom: px(6),
                    width: px(220),
                    height: px(24),
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.53)',
                    filter: `blur(${px(12)}px)`,
                  }}
                />
                <Img
                  src={clueSrc(item.ch)}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: px(300),
                    height: px(300),
                    objectFit: 'contain',
                    filter: `drop-shadow(0 ${px(22)}px ${px(26)}px rgba(0,0,0,0.67))`,
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 400,
                  fontSize: S.emojiPlus,
                  color: '#fff',
                  textShadow: `0 0 ${px(20)}px rgba(255,255,255,0.53)`,
                }}
              >
                {item.ch}
              </div>
            )}
          </div>
        );
      })}

      {/* ---------- letter blanks ---------- */}
      {!merged
        ? letters.map((letter, i) => {
            const start = plan.blanksStart + i * 1.6;
            const p = prog(frame, start, 18, expoOut);
            // free letters flip while the clock runs; the rest flip when it ends
            const endFlipAt = plan.flips + i * 1.4;
            const free = plan.free.find((f) => f.index === i);
            const flipAt = free ? free.at : endFlipAt;
            const flipped = frame >= flipAt;
            const flipP = prog(frame, flipAt, 17, backOut);
            // an already-open letter gives a little pulse when the others flip (HTML: scale 1 -> 1.2 -> 1)
            const pulse = free && frame >= endFlipAt ? Math.sin(Math.PI * prog(frame, endFlipAt, 13, linear)) : 0;
            const width = px(56);
            const gap = px(9);
            const totalW = letters.length * width + (letters.length - 1) * gap;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: S.blanksTop,
                  left: '50%',
                  marginLeft: -totalW / 2 + i * (width + gap),
                  width,
                  height: S.blankH,
                  borderRadius: px(11),
                  background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8))',
                  border: `${px(3)}px solid ${flipped ? COLORS.yellow : 'rgba(255,255,255,0.88)'}`,
                  boxShadow: flipped
                    ? `0 0 ${px(28)}px rgba(255,214,10,0.53), 0 ${px(12)}px ${px(24)}px rgba(0,0,0,0.4)`
                    : `0 0 0 1px rgba(0,0,0,0.47), 0 0 ${px(16)}px rgba(255,255,255,0.27), 0 ${px(10)}px ${px(20)}px rgba(0,0,0,0.4)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONTS.display,
                  fontSize: S.blankFont,
                  color: COLORS.yellow,
                  textShadow: `0 0 ${px(22)}px rgba(255,214,10,0.8)`,
                  opacity: p * (1 - exitP),
                  transform: `translate3d(0, ${(1 - p) * 60}px, 0) perspective(700px) rotateX(${(1 - p) * 70}deg) scale(${(flipped ? 0.82 + 0.18 * flipP : 1) * (1 + 0.2 * pulse)})`,
                }}
              >
                <span
                  style={{
                    opacity: flipped ? flipP : 0,
                    transform: `rotateX(${(1 - flipP) * -95}deg)`,
                    display: 'inline-block',
                  }}
                >
                  {letter}
                </span>
              </div>
            );
          })
        : null}

      {/* ---------- clock ---------- */}
      {timerVisible ? (
        <div
          style={{
            position: 'absolute',
            left: S.timerLeft,
            width: S.timerWidth,
            bottom: S.timerBottom,
            height: px(70),
            opacity: fadeIn(frame, timerStart - 10, 14) * (1 - prog(frame, plan.flips, 10, linear)),
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: px(26),
              height: S.timerTrackH,
              borderRadius: px(10),
              background: 'rgba(0,0,0,0.6)',
              border: `${px(2)}px solid rgba(255,255,255,0.2)`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformOrigin: 'left',
                transform: `scaleX(${1 - clockP})`,
                background: `linear-gradient(90deg, ${COLORS.yellowDeep} 0%, ${COLORS.yellow} 70%, ${COLORS.yellowSoft} 100%)`,
                borderRadius: px(12),
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 calc(100%/${plan.timerSeconds} - 2px), rgba(0,0,0,0.4) calc(100%/${plan.timerSeconds} - 2px) calc(100%/${plan.timerSeconds}))`,
              }}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              left: -px(31) + (1 - clockP) * S.timerWidth,
              top: px(4),
              width: px(62),
              height: px(62),
            }}
          >
            <div
              style={{
                width: px(62),
                height: px(62),
                borderRadius: '50%',
                background: low ? COLORS.red : '#fff',
                color: low ? '#fff' : '#8a0010',
                border: `${px(3)}px solid ${low ? '#fff' : COLORS.yellow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.display,
                fontSize: px(34),
                boxShadow: low
                  ? `0 0 ${px(30)}px ${COLORS.red}`
                  : `0 0 ${px(26)}px rgba(255,214,10,0.8), 0 ${px(8)}px ${px(16)}px rgba(0,0,0,0.4)`,
              }}
            >
              {secondsLeft}
            </div>
          </div>

          {/* 💡 hints light up at 2/3 and 1/3 of the clock */}
          {settings.timer.bulbFractions.map((f, i) => {
            const onAt = timerStart + plan.timerFrames * (1 - f);
            const on = frame >= onAt;
            const pop = prog(frame, timerStart, 12, backOut);
            const lit = prog(frame, onAt, 16, elasticOut);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: S.timerWidth * f - px(20),
                  top: px(46),
                  width: px(40),
                  textAlign: 'center',
                  fontFamily: FONTS.emoji,
                  fontSize: px(30),
                  lineHeight: `${px(40)}px`,
                  opacity: pop * (on ? 1 : 0.45),
                  filter: on
                    ? `drop-shadow(0 0 ${px(14)}px ${COLORS.yellow})`
                    : 'grayscale(1) brightness(0.85)',
                  transform: `scale(${on ? 1 + 0.5 * (1 - lit) : 1})`,
                }}
              >
                💡
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ---------- answer card ---------- */}
      {merged ? <ResultCard frame={frame} plan={plan} word={q.word} index={index} /> : null}

      {/* ---------- answer chip / fact ---------- */}
      {!showFact && frame >= plan.stamp + 6 ? (
        <div
          style={{
            position: 'absolute',
            bottom: S.chipBottom,
            left: '50%',
            marginLeft: -px(280),
            width: S.chipW,
            textAlign: 'center',
            padding: `${px(9)}px 0`,
            borderRadius: px(40),
            background: COLORS.yellow,
            color: COLORS.inkDark,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(22),
            letterSpacing: px(4),
            boxShadow: `0 0 ${px(34)}px rgba(255,214,10,0.6)`,
            opacity: chipIn * (1 - exitP),
            transform: `translate3d(0, ${(1 - chipIn) * 30}px, 0) scale(${0.6 + 0.4 * chipIn})`,
          }}
        >
          {settings.text.correctChip}
        </div>
      ) : null}

      {showFact && frame >= plan.stamp + 24 ? (
        <div
          style={{
            position: 'absolute',
            left: px(120),
            right: px(120),
            top: S.factTop,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: px(22),
            lineHeight: 1.3,
            padding: `${px(6)}px ${px(22)}px`,
            borderRadius: px(20),
            background: 'rgba(0,0,0,0.67)',
            border: `${px(2)}px solid rgba(255,255,255,0.2)`,
            color: '#fff',
            opacity: factIn * (1 - exitP),
            transform: `translate3d(0, ${(1 - factIn) * 30}px, 0)`,
          }}
        >
          <b style={{ color: COLORS.yellow, fontSize: px(15), letterSpacing: px(3), display: 'block' }}>
            {settings.text.factEyebrow}
          </b>
          {plan.fact}
        </div>
      ) : null}

      {/* ---------- confetti on the answer ---------- */}
      {CONFETTI.map((c) => {
        const start = plan.stamp + c.delay;
        if (frame < start) return null;
        const p = Math.min(1, (frame - start) / c.duration);
        return (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: c.x,
              top: c.y,
              width: c.size,
              height: c.size * 1.6,
              background: c.color,
              borderRadius: c.round ? '50%' : 2,
              opacity: 1 - Math.max(0, (p - 0.45) / 0.55),
              transform: `translate3d(${c.dx * p}px, ${c.dy * Math.min(1, p / 0.45) + 320 * Math.max(0, p - 0.45)}px, 0) rotate(${c.spin * p}deg)`,
            }}
          />
        );
      })}
    </>
  );
};

/** Merged answer card: rotating rays + the 1280x720 image frame. */
const ResultCard: React.FC<{
  frame: number;
  plan: ReturnType<typeof buildQuestionPlan>;
  word: string;
  index: number;
}> = ({ frame, plan, word, index }) => {
  const seat = prog(frame, plan.stamp - 12, 27, backOut);
  const out = prog(frame, plan.exit, 12, linear);
  const showImage = settings.images.enabled && hasImage(index);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        marginLeft: -px(400),
        top: S.resultTop,
        width: S.resultW,
        height: S.resultH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4,
        opacity: Math.max(0, seat - out),
        transform: `scale(${0.62 + 0.38 * seat}) translateY(${-out * 70}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: px(640),
          height: px(640),
          marginLeft: -px(320),
          marginTop: -px(320),
          borderRadius: '50%',
          background:
            'repeating-conic-gradient(rgba(255,214,10,0.33) 0 7deg, rgba(0,0,0,0) 7deg 18deg)',
          maskImage: 'radial-gradient(circle, #000 15%, rgba(0,0,0,0) 68%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 15%, rgba(0,0,0,0) 68%)',
          transform: `rotate(${(frame / 360) * 360}deg)`,
        }}
      />
      <div
        style={{
          position: 'relative',
          width: S.resultImageW,
          height: S.resultH,
          borderRadius: px(24),
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.19), rgba(255,255,255,0.06))',
          border: `${px(4)}px solid ${COLORS.yellow}`,
          boxShadow: `0 0 0 ${px(8)}px rgba(0,0,0,0.4), 0 ${px(26)}px ${px(50)}px rgba(0,0,0,0.69), 0 0 ${px(70)}px rgba(255,214,10,0.67)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showImage ? (
          <Img
            src={imageSrc(index)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(6),
              width: `calc(100% - ${px(28)}px)`,
              height: `calc(100% - ${px(28)}px)`,
              border: `${px(3)}px dashed rgba(255,255,255,0.53)`,
              borderRadius: px(20),
            }}
          >
            <span style={{ fontFamily: FONTS.emoji, fontSize: px(78), lineHeight: 1 }}>🖼️</span>
            <b style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(20), letterSpacing: px(4) }}>
              IMAGE HERE
            </b>
            <small
              style={{
                fontFamily: FONTS.display,
                fontSize: px(30),
                letterSpacing: px(3),
                color: COLORS.yellow,
              }}
            >
              {word}
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

