import React from 'react';
import { Img } from 'remotion';
import { COLORS, FONTS, S, px, glass } from './style';
import { buildQuestionPlan, QUESTIONS, TOTAL, themeForQuestion } from './timing';
import {
  prog,
  htmlEase,
  bounceEase,
  mergeEase,
  cssEaseIn,
  cssEaseOut,
  cssEaseInOut,
  springStyle,
  riseStyle,
  keyframes,
  ms,
  clamp01,
} from './anim';
import { linear } from './gsap-helpers';
import { Hud } from './Hud';
import { Watermark } from './Watermark';
import { TitleLockup } from './TitleLockup';
import { Background } from './Background';
import { Confetti, Ring, Flash } from './Fx';
import settings from '../settings.json';
import { imageSrc, hasImage, clueSrc } from './assets';

/** Layout constants from the reference stage (1280x720, scaled by px()). */
const PLUS_W = 19.2; // Anton "+" at 54px
const ROW_HALF = (340 + 20 + PLUS_W + 20 + 340) / 2;
const MERGE_DX = ROW_HALF - 170;

/**
 * One question, following the reference HTML beat for beat (all times converted from its ms):
 *   spring in emoji / "+" / emoji (230 ms apart, ring + float on the emoji)
 *   -> 3D blanks drop in (50 ms stagger) -> clock with 💡 bulbs, free letters flip at 1/3 and 2/3
 *   -> bulbs flare, remaining letters flip (50 ms apart), clock slides away
 *   -> merge(): "+" shrinks, emoji slide together (820 ms), flash + spring result card + rings + confetti
 *   -> chip / fact -> exit fades.
 * The plan from buildQuestionPlan() still decides WHEN each beat starts, so the audio plan is unchanged.
 */
export const Round: React.FC<{ frame: number; index: number; erases?: number }> = ({
  frame,
  index,
  erases = 0,
}) => {
  const q = QUESTIONS[index];
  const levelIndex = Math.max(0, settings.levels.findIndex((l) => l.name === q.level));
  const plan = buildQuestionPlan(q, levelIndex, index === 0 || settings.bonus.after.includes(index));
  const theme = themeForQuestion(index);
  const letters = Array.from(q.word);
  const n = letters.length;
  const T = plan.timerSeconds;

  // ---- beat times (frames) ----
  const R0 = plan.stamp; // flash + result card (merge starts 720 ms earlier)
  const M = R0 - ms(720); // merge() starts
  const afterMerge = M + ms(840); // merge() returns
  const merged = frame >= M;
  const timerStart = plan.timerStart;
  const timerEnd = timerStart + plan.timerFrames;
  const flipsEnd = plan.flips + n * ms(50);
  const showFact = plan.showFact && !!plan.fact;
  const bonusNext = settings.bonus.after.includes(index + 1);
  const titleAnimate = index === 0 || settings.bonus.after.includes(index);

  // ---- emoji row ----
  const seq: { kind: 'emoji' | 'plus'; src?: string }[] = [
    { kind: 'emoji', src: q.clueA },
    { kind: 'plus' },
    { kind: 'emoji', src: q.clueB },
  ];

  // ---- clock ----
  const clockT = (frame - timerStart) / ms(T * 1000);
  const left = Math.max(0, T - Math.max(0, (frame - timerStart) / 30));
  const nShown = Math.ceil(left - 1e-9);
  const popAt = timerStart + (T - nShown) * 30;
  const pop = prog(frame, popAt, ms(480), bounceEase);
  const low = nShown <= 3;
  const timerIn = htmlEase(clamp01((frame - timerStart) / ms(450)));
  const timerOut = clamp01((frame - flipsEnd) / ms(350));
  const timerVisible = frame >= timerStart && frame < flipsEnd + ms(350);

  return (
    <>
      <Background frame={frame} theme={theme} hideBars />
      <Hud label="Q" number={index + 1} total={TOTAL} erases={erases} frame={frame} />
      <Watermark />
      <TitleLockup
        frame={frame}
        animate={titleAnimate}
        hideAt={R0}
        showAt={bonusNext ? undefined : plan.exit}
      />

      {/* ---------- emoji pair: #emoji flex row, 340px slots, 20px gap ---------- */}
      <div
        style={{
          position: 'absolute',
          top: px(96),
          width: '100%',
          height: px(356),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: px(20),
        }}
      >
        {seq.map((item, i) => {
          const s0 = plan.emojiStart + i * ms(230);
          const isEmoji = item.kind === 'emoji';
          const sp = springStyle(frame, s0, 900, px(isEmoji ? 160 : 70));
          const dxSign = i === 0 ? 1 : -1;

          let wrap: React.CSSProperties = sp;
          if (merged) {
            if (isEmoji) {
              const e = mergeEase(clamp01((frame - M) / ms(820)));
              const dx = px(MERGE_DX) * dxSign;
              wrap = {
                opacity: keyframes(e, [0, 0.26, 0.88, 1], [1, 1, 1, 0]),
                transform: `translateX(${keyframes(e, [0, 0.26, 0.88, 1], [0, -dxSign * px(36), dx, dx])}px) scale(${keyframes(e, [0, 0.26, 0.88, 1], [1, 0.92, 1.12, 0.4])})`,
              };
            } else {
              const t = clamp01((frame - M) / ms(320));
              wrap = {
                opacity: 1 - t,
                transform: `scale(${1 - 0.8 * t}) rotate(${120 * t}deg)`,
              };
            }
          }

          if (!isEmoji) {
            return (
              <div key={i} style={{ position: 'relative', width: px(PLUS_W), height: px(54), ...wrap }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: px(64),
                    height: px(64),
                    marginLeft: -px(32),
                    marginTop: -px(32),
                    borderRadius: '50%',
                    ...glass(px(32), 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONTS.display,
                    fontSize: px(42),
                    lineHeight: 1,
                    color: COLORS.yellow,
                    textShadow: `0 0 ${px(18)}px rgba(255,201,60,0.7)`,
                  }}
                >
                  <svg width={px(30)} height={px(30)} viewBox="0 0 30 30">
                    <rect x="12" y="2" width="6" height="26" rx="3" fill={COLORS.yellow} />
                    <rect x="2" y="12" width="26" height="6" rx="3" fill={COLORS.yellow} />
                  </svg>
                </div>
              </div>
            );
          }

          // .ei float: 2.4 s alternate ease-in-out, starts 230 ms after the spring
          const ft = (frame - (s0 + ms(230))) / ms(2400);
          let pos = 0;
          if (ft > 0) {
            const cyc = Math.floor(ft);
            const e = cssEaseInOut(ft - cyc);
            pos = cyc % 2 === 0 ? e : 1 - e;
          }

          return (
            <div
              key={i}
              style={{
                position: 'relative',
                width: px(340),
                height: px(340),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...wrap,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: px(318),
                  height: px(318),
                  ...glass(px(44), 0.09),
                  boxShadow: `0 ${px(26)}px ${px(60)}px rgba(0,0,0,0.5), 0 0 ${px(60)}px ${theme[0]}55, inset 0 1px 0 rgba(255,255,255,0.22)`,
                }}
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: px(236),
                  height: px(236),
                  transform: `translateY(${-px(10) * pos}px) rotate(${2.5 * pos}deg)`,
                  filter: `drop-shadow(0 ${px(18)}px ${px(22)}px rgba(0,0,0,0.55))`,
                }}
              >
                <Img
                  src={clueSrc(item.src as string)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <Ring frame={frame} start={s0 + ms(300)} />
            </div>
          );
        })}
      </div>

      {/* ---------- letter blanks: perspective 700px container, 3D flip-up ---------- */}
      <div
        style={{
          position: 'absolute',
          top: S.blanksTop,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: S.blankGap,
          perspective: px(700),
        }}
      >
        {letters.map((letter, k) => {
          const inAt = plan.blanksStart + k * ms(50);
          const e = htmlEase(clamp01((frame - inAt) / ms(550)));
          const endFlip = plan.flips + k * ms(50);
          const free = plan.free.find((f) => f.index === k);
          const flipAt = free ? free.at : endFlip;
          const rev = frame >= flipAt;

          let opacity = frame < inAt ? 0 : e;
          let transform = `translateY(${(1 - e) * px(60)}px) rotateX(${(1 - e) * 70}deg)`;

          const ft = (frame - flipAt) / ms(560);
          if (rev && ft < 1) {
            const fe = htmlEase(clamp01(ft));
            transform = `rotateX(${keyframes(fe, [0, 0.7, 1], [-80, 0, 0])}deg) scale(${keyframes(fe, [0, 0.7, 1], [0.85, 1.14, 1])})`;
            opacity = Math.max(opacity, clamp01(ft * 6));
          } else if (rev) {
            transform = 'none';
          }
          // an already-open letter pulses when the rest flip (HTML: scale 1 -> 1.2 -> 1, 420 ms)
          if (free && frame >= endFlip && (frame - endFlip) / ms(420) < 1) {
            transform = `scale(${keyframes((frame - endFlip) / ms(420), [0, 0.5, 1], [1, 1.2, 1])})`;
          }

          // exit: opacity 1 -> 0 and translateY(40px), 340 ms, 20 ms stagger
          const xt = (frame - (plan.exit + k * ms(20))) / ms(340);
          if (xt > 0) {
            opacity = 1 - clamp01(xt);
            transform = `translateY(${clamp01(xt) * px(40)}px)`;
          }

          return (
            <div
              key={k}
              style={{
                width: S.blankW,
                height: S.blankH,
                borderRadius: px(14),
                background: rev
                  ? `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow} 55%, ${COLORS.yellowDeep})`
                  : 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
                border: rev ? `${px(2)}px solid rgba(255,255,255,0.75)` : `${px(2)}px solid rgba(255,255,255,0.22)`,
                boxShadow: rev
                  ? `0 0 ${px(30)}px rgba(255,201,60,0.55), 0 ${px(12)}px ${px(22)}px rgba(0,0,0,0.4), inset 0 ${px(2)}px 0 rgba(255,255,255,0.7)`
                  : `0 ${px(10)}px ${px(22)}px rgba(0,0,0,0.38), inset 0 ${px(-4)}px 0 rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.22)`,
                backdropFilter: `blur(${px(6)}px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.display,
                fontWeight: 400,
                fontSize: S.blankFont,
                color: COLORS.inkDark,
                opacity,
                transform,
              }}
            >
              {rev ? letter : ''}
            </div>
          );
        })}
      </div>

      {/* ---------- flash ---------- */}
      <Flash frame={frame} start={R0} />

      {/* ---------- result card (HTML #res): rays + image frame, spring entrance ---------- */}
      {frame >= R0 ? <ResultCard frame={frame} start={R0} exit={plan.exit} word={q.word} index={index} clueA={q.clueA} clueB={q.clueB} /> : null}

      {/* ---------- clock bar, number badge, bulbs ---------- */}
      {timerVisible ? (
        <div
          style={{
            position: 'absolute',
            left: S.timerLeft,
            width: S.timerWidth,
            bottom: S.timerBottom,
            height: px(70),
            opacity: frame >= flipsEnd ? 1 - timerOut : timerIn,
            transform:
              frame >= flipsEnd
                ? `translateY(${timerOut * px(30)}px)`
                : `translateY(${(1 - timerIn) * px(40)}px)`,
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
              background: 'rgba(255,255,255,0.10)',
              border: `${px(1.5)}px solid rgba(255,255,255,0.18)`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformOrigin: 'left',
                transform: `scaleX(${1 - clamp01(clockT)})`,
                background: low
                  ? `linear-gradient(90deg, ${COLORS.red}, ${COLORS.redSoft})`
                  : `linear-gradient(90deg, ${COLORS.yellowDeep}, ${COLORS.yellow} 70%, ${COLORS.yellowSoft})`,
                borderRadius: px(12),
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 calc(100%/${T} - ${px(1)}px), rgba(0,0,0,0.4) calc(100%/${T} - ${px(1)}px) calc(100%/${T}))`,
              }}
            />
          </div>

          {/* number badge rides the end of the bar */}
          <div
            style={{
              position: 'absolute',
              left: -px(31),
              top: px(4),
              width: px(62),
              height: px(62),
              transform: `translateX(${(1 - clamp01(clockT)) * S.timerWidth}px)`,
            }}
          >
            <div
              style={{
                width: px(62),
                height: px(62),
                borderRadius: '50%',
                background: low ? COLORS.red : '#fff',
                color: low ? '#fff' : COLORS.inkDark,
                border: `${px(3)}px solid ${low ? '#fff' : 'rgba(255,255,255,0.9)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.display,
                fontWeight: 400,
                fontSize: px(34),
                boxShadow: low
                  ? `0 0 ${px(30)}px ${COLORS.red}`
                  : `0 0 ${px(26)}px rgba(255,214,10,0.8), 0 ${px(8)}px ${px(16)}px rgba(0,0,0,0.4)`,
                transform: `scale(${1.4 - 0.4 * pop})`,
              }}
            >
              {nShown}
            </div>
          </div>

          {/* 💡 bulbs at 2/3 and 1/3 of the bar */}
          {settings.timer.bulbFractions.map((f, j) => {
            const x = S.timerWidth * f;
            const litAt = timerStart + plan.timerFrames * (1 - f);
            const flareAt = timerEnd + j * ms(160);
            const inE = htmlEase(clamp01((frame - timerStart) / ms(500)));
            const lit = frame >= litAt;

            let opacity = 0.5 * inE;
            let scale = 0.4 + 0.6 * inE;
            let ty = -(1 - inE) * px(10);
            let filter = 'grayscale(1) brightness(0.85)';
            if (lit) {
              const le = htmlEase(clamp01((frame - litAt) / ms(600)));
              opacity = keyframes(le, [0, 0.5, 1], [0.5, 1, 1]);
              scale = keyframes(le, [0, 0.5, 1], [1, 1.5, 1]);
              ty = 0;
              const gt = (frame - litAt) / ms(700);
              const cyc = Math.floor(gt);
              const ge = cssEaseInOut(gt - cyc);
              const gp = cyc % 2 === 0 ? ge : 1 - ge;
              filter = `drop-shadow(0 0 ${px(5 + 9 * gp)}px #ffd60a) drop-shadow(0 0 ${px(26 * gp)}px #ffb800)`;
            }
            const ft = (frame - flareAt) / ms(900);
            if (ft >= 0 && ft < 1) {
              const fe = htmlEase(ft);
              scale = keyframes(fe, [0, 0.4, 1], [1, 1.8, 1]);
              const w = keyframes(fe, [0, 0.4, 1], [0, 1, 0]);
              filter = `brightness(${keyframes(fe, [0, 0.4, 1], [1, 1.8, 1.1])}) drop-shadow(0 0 ${px(30 * w)}px rgba(255,243,160,${w}))`;
            }
            const pingAt = (s: number, a: number, b: number, dur: number) => {
              const t = (frame - s) / ms(dur);
              if (t < 0 || t >= 1) return null;
              const e = cssEaseOut(t);
              return (
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: px(66),
                    width: px(46),
                    height: px(46),
                    borderRadius: '50%',
                    border: `${px(3)}px solid ${COLORS.yellow}`,
                    zIndex: 2,
                    pointerEvents: 'none',
                    opacity: 0.95 * (1 - e),
                    transform: `translate(-50%, -50%) scale(${a + (b - a) * e})`,
                  }}
                />
              );
            };

            return (
              <React.Fragment key={j}>
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: px(46),
                    width: px(40),
                    marginLeft: -px(20),
                    textAlign: 'center',
                    fontFamily: FONTS.emoji,
                    fontSize: px(30),
                    lineHeight: `${px(40)}px`,
                    zIndex: 3,
                    opacity,
                    filter,
                    transform: `translateY(${ty}px) scale(${scale})`,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -px(6),
                      width: px(3),
                      height: px(10),
                      marginLeft: -px(1),
                      background: COLORS.yellow,
                      boxShadow: `0 0 ${px(10)}px ${COLORS.yellow}`,
                      borderRadius: px(2),
                    }}
                  />
                  💡
                </div>
                {lit ? pingAt(litAt, 0.3, 2.6, 800) : null}
                {pingAt(flareAt, 0.3, 4, 900)}
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      {/* ---------- ✔ CORRECT ANSWER chip / did-you-know card ---------- */}
      {!showFact && frame >= afterMerge + ms(250) ? (
        <ChipBox frame={frame} start={afterMerge + ms(250)} exit={plan.exit} />
      ) : null}
      {showFact && frame >= afterMerge + ms(700) ? (
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
            ...glass(px(22), 0.08),
            color: '#fff',
            ...riseStyle(frame, afterMerge + ms(700), 500, px(30)),
            ...(frame >= plan.exit ? { opacity: 1 - clamp01((frame - plan.exit) / ms(280)) } : {}),
          }}
        >
          <b style={{ display: 'block', color: COLORS.yellow, fontSize: px(15), letterSpacing: px(3) }}>
            {settings.text.factEyebrow}
          </b>
          {plan.fact}
        </div>
      ) : null}

      {/* ---------- confetti: merge burst, plus a bigger one on every 5th question ---------- */}
      <Confetti frame={frame} start={R0} count={26} seed={index * 7 + 3} />
      {index % 5 === 4 ? <Confetti frame={frame} start={afterMerge} count={40} seed={index * 7 + 5} /> : null}
    </>
  );
};

const ChipBox: React.FC<{ frame: number; start: number; exit: number }> = ({ frame, start, exit }) => {
  const e = bounceEase(clamp01((frame - start) / ms(500)));
  const fade = frame >= exit ? 1 - clamp01((frame - exit) / ms(280)) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: S.chipBottom,
        left: '50%',
        marginLeft: -px(280),
        width: S.chipW,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        padding: `${px(9)}px 0`,
        borderRadius: px(40),
        background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow})`,
        color: COLORS.inkDark,
        fontFamily: FONTS.body,
        fontWeight: 800,
        fontSize: px(22),
        letterSpacing: px(4),
        boxShadow: `0 0 ${px(34)}px rgba(255,214,10,0.6)`,
        opacity: clamp01(e) * fade,
        transform: `translateY(${(1 - e) * px(30)}px) scale(${0.6 + 0.4 * e})`,
      }}
    >
      {settings.text.correctChip}
    </div>
  );
};

/** HTML #res: sun-rays + the image frame; spring(res, 0, 950, 30, -10), rings at 0 and +160 ms. */
const ResultCard: React.FC<{
  frame: number;
  start: number;
  exit: number;
  word: string;
  index: number;
  clueA: string;
  clueB: string;
}> = ({ frame, start, exit, word, index, clueA, clueB }) => {
  const showImage = settings.images.enabled && hasImage(index);
  const sp = springStyle(frame, start, 950, px(30), -10);
  let style: React.CSSProperties = sp;
  if (frame >= exit) {
    const e = cssEaseIn(clamp01((frame - exit) / ms(380)));
    style = {
      opacity: 1 - e,
      transform: `translateY(${-e * px(70)}px) scale(${1 - 0.6 * e})`,
    };
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: S.resultTop,
        width: S.resultW,
        height: S.resultH,
        marginLeft: -px(400),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: px(640),
          height: px(640),
          margin: `${-px(320)}px 0 0 ${-px(320)}px`,
          borderRadius: '50%',
          background: 'repeating-conic-gradient(rgba(255,214,10,0.333) 0 7deg, rgba(0,0,0,0) 7deg 18deg)',
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
          borderRadius: px(30),
          overflow: 'hidden',
          background: 'linear-gradient(160deg, rgba(20,22,52,0.92), rgba(8,9,28,0.92))',
          border: `${px(3)}px solid ${COLORS.yellow}`,
          boxShadow: `0 0 0 ${px(8)}px rgba(255,255,255,0.06), 0 ${px(30)}px ${px(60)}px rgba(0,0,0,0.7), 0 0 ${px(80)}px rgba(255,201,60,0.45)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showImage ? (
          <Img src={imageSrc(index)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(14),
              width: '100%',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: px(22) }}>
              <Img src={clueSrc(clueA)} style={{ width: px(120), height: px(120), objectFit: 'contain' }} />
              <svg width={px(34)} height={px(34)} viewBox="0 0 30 30">
                <rect x="3" y="7" width="24" height="5.5" rx="2.75" fill={COLORS.muted} />
                <rect x="3" y="18" width="24" height="5.5" rx="2.75" fill={COLORS.muted} />
              </svg>
              <Img src={clueSrc(clueB)} style={{ width: px(120), height: px(120), objectFit: 'contain' }} />
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: word.length > 9 ? px(92) : px(118),
                lineHeight: 1,
                letterSpacing: px(8),
                color: COLORS.yellow,
                textShadow: `0 0 ${px(40)}px rgba(255,201,60,0.55), 0 ${px(6)}px 0 rgba(0,0,0,0.45)`,
              }}
            >
              {word}
            </div>
          </div>
        )}
      </div>
      <Ring frame={frame} start={start} />
      <Ring frame={frame} start={start + ms(160)} />
    </div>
  );
};
