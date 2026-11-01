import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, S, px } from './style';
import { BONUS_CLOCK_START, FPS, themeForQuestion } from './timing';
import { prog, slamIn, revealIn } from './anim';
import { backOut, elasticOut, expoOut, linear } from './gsap-helpers';
import { makeConfetti } from './util';
import type { BonusPuzzle } from './bonus-engine';
import { Background } from './Background';
import { Hud } from './Hud';
import settings from '../settings.json';

const B = settings.bonus;

/**
 * Bonus round = pre-roll banner -> tile board -> clock -> reveal -> answer.
 * The board is built by seed (see bonus.ts) so this component stays pure.
 */
export const Bonus: React.FC<{ frame: number; puzzle: BonusPuzzle; index: number }> = ({
  frame,
  puzzle,
  index,
}) => {
  const pre = B.preRollFrames;
  const buildEnd = pre + B.buildFrames;
  const clockStart = BONUS_CLOCK_START();
  const clockFrames = Math.round(puzzle.seconds * FPS);
  const clockEnd = clockStart + clockFrames;
  const revealAt = clockEnd;
  const dur = clockEnd + B.revealHoldFrames;

  const bannerOut = prog(frame, pre - 8, 10, linear);
  const boardIn = prog(frame, pre + 2, 16, expoOut);
  const clockP = Math.min(1, Math.max(0, (frame - clockStart) / clockFrames));
  const secondsLeft = Math.max(1, Math.ceil((clockFrames - (frame - clockStart)) / FPS));
  const revealed = frame >= revealAt;
  const exitP = prog(frame, dur - 12, 12, linear);

  // red heartbeat pulse on the last 3 seconds (like the HTML's beat())
  const beatPhase = ((frame - (clockEnd - 3 * FPS)) % 22 + 22) % 22;
  const pulse =
    frame > clockEnd - 3 * FPS && frame < clockEnd ? Math.max(0, 1 - beatPhase / 14) * 0.55 : 0;

  const confetti = makeConfetti(index + 31, 34, { x: 960, y: 560 });
  const answerIn = prog(frame, revealAt + B.answerChipDelayFrames, 16, backOut);
  const chipIn = prog(frame, revealAt + 26, 16, backOut);

  return (
    <>
      <Background frame={frame} theme={themeForQuestion(index)} pulse={pulse} />
      <Hud
        label="BONUS"
        number={index + 1}
        total={B.after.length}
        erases={index}
        frame={frame}
      />

      {/* ---------- pre-roll banner ---------- */}
      {frame < pre ? (
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255,122,24,0.69), rgba(42,16,0,0.95))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            opacity: 1 - bannerOut,
            transform: `scale(${1 - 0.05 * bannerOut})`,
          }}
        >
          <div
            style={{
              ...slamIn(frame, 0, 14),
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(22),
              letterSpacing: px(10),
              color: 'rgba(255,255,255,0.87)',
            }}
          >
            BONUS {index + 1} / {B.after.length}
          </div>
          <div
            style={{
              ...slamIn(frame, 4, 15),
              fontFamily: FONTS.display,
              fontSize: px(170),
              lineHeight: 0.92,
              letterSpacing: px(6),
              color: COLORS.yellow,
              textShadow: `0 ${px(8)}px 0 rgba(0,0,0,0.47), 0 0 ${px(60)}px rgba(255,184,0,0.53)`,
              margin: `${px(12)}px 0 ${px(14)}px`,
            }}
          >
            BONUS
            <br />
            ROUND
          </div>
          <div
            style={{
              ...revealIn(frame, 14, 14),
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(26),
              letterSpacing: px(8),
              color: '#fff',
            }}
          >
            {puzzle.name}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* ---------- title ---------- */}
      {frame >= pre ? (
        <div
          style={{
            position: 'absolute',
            top: BONUS_TITLE_TOP,
            width: '100%',
            textAlign: 'center',
            fontFamily: FONTS.display,
            fontSize: px(48),
            lineHeight: 1.05,
            letterSpacing: px(4),
            opacity: boardIn * (1 - exitP),
            transform: `translate3d(0, ${(1 - boardIn) * 30}px, 0)`,
            color: '#fff',
          }}
        >
          <small
            style={{
              display: 'block',
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(17),
              letterSpacing: px(7),
              color: COLORS.yellow,
              marginBottom: px(6),
            }}
          >
            BONUS ROUND · {puzzle.name}
          </small>
          {puzzle.question}
        </div>
      ) : null}

      {/* ---------- board ---------- */}
      {frame >= pre ? (
        <div
          style={{
            position: 'absolute',
            top: S.bonusBoardTop,
            width: '100%',
            height: S.bonusBoardH,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: px(20),
            alignContent: 'center',
            padding: `0 ${px(110)}px`,
            opacity: (1 - exitP) * boardIn,
          }}
        >
          <Board puzzle={puzzle} frame={frame} start={pre + 2} revealed={revealed} revealAt={revealAt} />
        </div>
      ) : null}

      {/* ---------- comment prompt (bonus rounds only, as in the reference) ---------- */}
      {frame >= clockStart - 8 && frame < clockEnd + 6 ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            marginLeft: -px(400),
            top: S.commentTop,
            width: px(800),
            textAlign: 'center',
            padding: `${px(10)}px 0`,
            borderRadius: px(40),
            background: 'rgba(0,0,0,0.67)',
            border: `${px(2)}px solid rgba(255,214,10,0.53)`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(20),
            letterSpacing: px(3),
            color: '#fff',
            opacity:
              prog(frame, clockStart - 8, 12, expoOut) * (1 - prog(frame, clockEnd, 8, linear)),
          }}
        >
          {settings.text.comment}
        </div>
      ) : null}

      {/* ---------- clock ---------- */}
      {frame >= clockStart - 8 && frame < clockEnd + 6 ? (
        <div
          style={{
            position: 'absolute',
            left: S.timerLeft,
            width: S.timerWidth,
            bottom: S.timerBottom,
            height: px(70),
            opacity: prog(frame, clockStart - 8, 14, expoOut) * (1 - prog(frame, clockEnd, 8, linear)),
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
                background: secondsLeft <= 3 ? COLORS.red : '#fff',
                color: secondsLeft <= 3 ? '#fff' : '#8a0010',
                border: `${px(3)}px solid ${secondsLeft <= 3 ? '#fff' : COLORS.yellow}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.display,
                fontSize: px(34),
                boxShadow: `0 0 ${px(26)}px rgba(255,214,10,0.8)`,
              }}
            >
              {secondsLeft}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- answer + erase chip ---------- */}
      {revealed ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: px(524),
              width: px(900),
              marginLeft: -px(450),
              transform: `translate3d(0, ${(1 - answerIn) * 20}px, 0) scale(${0.94 + 0.06 * answerIn})`,
              opacity: answerIn,
              background: 'rgba(0,0,0,0.67)',
              border: `${px(2)}px solid rgba(255,255,255,0.2)`,
              borderRadius: px(20),
              padding: `${px(12)}px ${px(22)}px`,
              textAlign: 'center',
              fontFamily: FONTS.body,
              fontWeight: 600,
              fontSize: px(22),
              color: '#fff',
            }}
          >
            <b style={{ color: COLORS.yellow, fontSize: px(15), letterSpacing: px(3), display: 'block' }}>
              ANSWER
            </b>
            {puzzle.answer}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: S.chipBottom,
              left: '50%',
              marginLeft: -px(320),
              width: px(640),
              textAlign: 'center',
              padding: `${px(9)}px 0`,
              borderRadius: px(40),
              background: COLORS.yellow,
              color: COLORS.inkDark,
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(20),
              letterSpacing: px(3),
              boxShadow: `0 0 ${px(34)}px rgba(255,214,10,0.6)`,
              opacity: chipIn,
              transform: `translate3d(0, ${(1 - chipIn) * 30}px, 0) scale(${0.6 + 0.4 * chipIn})`,
            }}
          >
            {settings.text.eraseChip}
          </div>
          {confetti.map((c) => {
            const start = revealAt + c.delay;
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
                  transform: `translate3d(${c.dx * p}px, ${c.dy * Math.min(1, p / 0.45) + 300 * Math.max(0, p - 0.45)}px, 0) rotate(${c.spin * p}deg)`,
                }}
              />
            );
          })}
        </>
      ) : null}
    </>
  );
};

const BONUS_TITLE_TOP = px(62);

/** switch on puzzle kind — each board is a pure render of the seed data */
const Board: React.FC<{
  puzzle: BonusPuzzle;
  frame: number;
  start: number;
  revealed: boolean;
  revealAt: number;
}> = ({ puzzle, frame, start, revealed, revealAt }) => {
  const d = puzzle.data;
  if (puzzle.kind === 'odd') {
    return (
      <div style={{ display: 'flex', gap: px(20), flexWrap: 'wrap', justifyContent: 'center' }}>
        {d.tiles.map((t: string, i: number) => {
          const seat = prog(frame, start + i * 1.5, 20, backOut);
          const win = revealed && i === d.answerIndex;
          const dim = revealed && i !== d.answerIndex;
          return (
            <div
              key={i}
              style={{
                width: d.small ? S.bonusTileSm : S.bonusTile,
                height: d.small ? S.bonusTileSm : S.bonusTile,
                borderRadius: px(32),
                background: win ? COLORS.green : 'linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
                border: `${px(3)}px solid ${win ? '#fff' : 'rgba(255,255,255,0.33)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.emoji,
                fontSize: d.small ? px(78) : px(100),
                lineHeight: 1,
                opacity: (dim ? 0.25 : 1) * seat,
                transform: `scale(${(win ? 1.12 : dim ? 0.9 : 1) * (0.6 + 0.4 * seat)})`,
                boxShadow: win ? `0 0 ${px(60)}px rgba(48,209,88,0.67)` : undefined,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    );
  }

  if (puzzle.kind === 'count') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: px(10),
          width: px(900),
          justifyContent: 'center',
        }}
      >
        {d.cells.map((c: { ch: string; hit: boolean }, i: number) => {
          const seat = prog(frame, start + i * 0.8, 16, backOut);
          const win = revealed && c.hit;
          const dim = revealed && !c.hit;
          return (
            <div
              key={i}
              style={{
                height: px(60),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.emoji,
                fontSize: px(44),
                lineHeight: 1,
                borderRadius: px(12),
                background: win ? 'rgba(48,209,88,0.35)' : undefined,
                opacity: (dim ? 0.16 : 1) * seat,
                transform: `scale(${(win ? 1.25 : 1) * (0.7 + 0.3 * seat)})`,
                boxShadow: win ? `0 0 ${px(20)}px rgba(48,209,88,0.6)` : undefined,
              }}
            >
              {c.ch}
            </div>
          );
        })}
      </div>
    );
  }

  if (puzzle.kind === 'scramble') {
    const word: string = d.word;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(14) }}>
        {d.hint ? (
          <div style={{ fontFamily: FONTS.display, fontSize: px(54), color: '#fff' }}>
            HINT: <span style={{ fontFamily: FONTS.emoji }}>{d.hint}</span>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: px(10) }}>
          {Array.from(d.scrambled as string).map((ch: string, i: number) => {
            const seat = prog(frame, start + i * 1.2, 18, backOut);
            const flipP = prog(frame, revealAt + i * 2, 14, backOut);
            const win = frame >= revealAt + i * 2;
            return (
              <div
                key={i}
                style={{
                  width: S.bonusLetterW,
                  height: S.bonusLetterH,
                  borderRadius: px(20),
                  background: win
                    ? COLORS.green
                    : 'linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
                  border: `${px(3)}px solid ${win ? '#fff' : 'rgba(255,255,255,0.33)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONTS.display,
                  fontSize: px(72),
                  color: win ? '#fff' : COLORS.yellow,
                  opacity: seat,
                  transform: `translateY(${(1 - seat) * 40}px) perspective(600px) rotateX(${win ? (1 - flipP) * -90 : 0}deg)`,
                }}
              >
                {win ? word[i] : ch}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (puzzle.kind === 'math') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(14), alignItems: 'center' }}>
        {d.rows.map((row: { icons: string[]; value: string }, ri: number) => {
          const seat = prog(frame, start + ri * 3, 18, backOut);
          const isAsk = ri === d.askRow;
          const solved = isAsk && frame >= revealAt;
          return (
            <div
              key={ri}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: px(12),
                fontFamily: FONTS.display,
                fontSize: px(d.fontSize),
                lineHeight: 1.15,
                color: '#fff',
                opacity: seat,
                transform: `translateY(${(1 - seat) * 24}px) scale(${solved ? 1 + 0.12 * (1 - prog(frame, revealAt, 16, elasticOut)) : 1})`,
              }}
            >
              {row.icons.map((icon, k) => (
                <span key={k} style={{ fontFamily: FONTS.emoji, fontSize: px(d.fontSize * 0.92) }}>{icon}</span>
              ))}
              <span style={{ margin: `0 ${px(6)}px` }}>=</span>
              <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{solved ? d.answer : row.value}</b>
            </div>
          );
        })}
      </div>
    );
  }

  // spot the difference
  const grid = (cells: string[], side: number) => (
    <div
      key={side}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: px(6),
        padding: px(14),
        borderRadius: px(26),
        background: 'rgba(0,0,0,0.4)',
        border: `${px(3)}px solid rgba(255,255,255,0.27)`,
      }}
    >
      {cells.map((e, i) => {
        const seat = prog(frame, start + (side * 9 + i) * 0.9, 16, backOut);
        const win = revealed && i === d.index && side === 1;
        return (
          <div
            key={i}
            style={{
              width: S.bonusCell,
              height: S.bonusCell,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONTS.emoji,
              fontSize: px(60),
              lineHeight: 1,
              borderRadius: px(20),
              background: win ? COLORS.green : undefined,
              opacity: seat,
              transform: `scale(${(win ? 1.12 : 1) * (0.6 + 0.4 * seat)})`,
              boxShadow: win ? `0 0 ${px(30)}px rgba(48,209,88,0.67)` : undefined,
            }}
          >
            {e}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(28) }}>
      {grid(d.left, 0)}
      <div style={{ fontFamily: FONTS.display, fontSize: px(44), color: COLORS.yellow, letterSpacing: px(3) }}>
        VS
      </div>
      {grid(d.right, 1)}
    </div>
  );
};
