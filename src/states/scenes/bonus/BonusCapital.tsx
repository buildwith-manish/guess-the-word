/**
 * BonusCapital (task 4c): bonus kind "capital". The subject state's shape sits in the centre, four option chips
 * (the capitals) and the clock run, then the correct chip lights up and an AnswerCard-style stamp slams in with
 * the answer. Adapted from BonusMissing (4b): same banner, badge, prompt, chips, timer and erase chip.
 *
 * THIS FILE ALSO HOLDS THE SCENE BonusNickname SHARES: `BonusShapeScene`, `shapeBonusTimes`, `shapeBonusCues`.
 * The two kinds differ only in the caption on the stamp (the answer text itself is `options[correctIndex]`).
 *
 * Timeline (ticks from the start of the bonus segment; preRoll / clock come from state-timing via bonusTimes):
 *   0 .. preRoll              banner (BonusBanner)
 *   preRoll+2                 prompt in, shape outline draws (drawDur ticks)
 *   preRoll+10                chips appear one by one
 *   clockStart .. clockEnd    clock runs (ticks, thumps, drumroll: bonusCommonCues)
 *   revealAt = clockEnd       correct chip lights, shape fills and glows, stamp slams in, short shake
 *   revealAt + answerChipDelayFrames   erase chip
 *   duration - 12             exit (BonusStage)
 *
 * Time: `frame` = design ticks (30 per second) since the segment started. Not rendered or viewed.
 */
import React from 'react';
import { COLORS, FONTS, glass, px } from '../../../style';
import { prog, slamIn, cssEaseInOut, mix, clamp01 } from '../../../anim';
import { WIDTH } from '../../state-timing';
import { getState } from '../../states-data';
import { StateShape } from '../../components/StateShape';
import { levelAccent } from '../../components/MiniMap';
import type { BonusPuzzle } from '../../bonus-engine';
import type { StateCue, StateSfx } from '../stateRoundCues';
import {
  BonusBadge,
  BonusBanner,
  BonusEraseChip,
  BonusOptions,
  BonusPrompt,
  BonusStage,
  BonusTimer,
  bonusCommonCues,
  bonusTimes,
  sortCues,
} from './BonusMissing';

// ------------------------------------------------------------------ shared: layout, timing, cues
/** Reference px (1280x720, px() scales it). The shape box is square, centred, between the prompt and the chips. */
const SHAPE_LAYOUT = {
  top: 124,
  size: 340,
  /** stamp band, overlaps the lower edge of the shape box a little */
  stampTop: 440,
  stampMaxW: 1000,
  stampMaxFont: 84,
  /** Anton is about this wide per em, used to shrink long answers to fit stampMaxW */
  glyphEm: 0.52,
};

/** Copy for the stamp caption (not data). */
export const BONUS_SHAPE_CAPTION = {
  capital: 'CAPITAL',
  nickname: 'NICKNAME',
} as const;
export type ShapeBonusKind = keyof typeof BONUS_SHAPE_CAPTION;

/** Beats of a shape bonus in ticks from the start of the segment. */
export const shapeBonusTimes = (puzzle: BonusPuzzle, duration?: number) => {
  const T = bonusTimes(puzzle, duration);
  return {
    ...T,
    promptAt: T.pre + 2,
    shapeIn: T.pre + 2,
    drawDur: 20,
    chipsAt: T.pre + 10,
    stampAt: T.revealAt,
    stampDur: 14,
    shakeDur: 12,
    /** shape fill and glow ramp after the reveal */
    litDur: 12,
  };
};

/** Cues of a shape bonus, ticks from the start of the segment (absolute tick = seg.from + cue.frame). */
export const shapeBonusCues = (puzzle: BonusPuzzle): StateCue[] => {
  const M = shapeBonusTimes(puzzle);
  const cues = bonusCommonCues(puzzle);
  const add = (frame: number, sfx: StateSfx, extra: Partial<StateCue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  add(M.shapeIn, 'whoosh', { rate: 0.9, volume: 0.6 });
  add(M.shapeIn + M.drawDur, 'thump', { volume: 0.5 });
  add(M.stampAt, 'boom');
  return sortCues(cues);
};

/** Cues of the capital bonus (ticks from the start of the segment). */
export const bonusCapitalCues = (puzzle: BonusPuzzle): StateCue[] => shapeBonusCues(puzzle);

// ------------------------------------------------------------------ shared: parts
/** The state shape in the centre: outline draws, then fills and glows on the reveal. */
const CenterShape: React.FC<{ frame: number; puzzle: BonusPuzzle; at: number; drawDur: number; revealAt: number; litDur: number }> = ({
  frame,
  puzzle,
  at,
  drawDur,
  revealAt,
  litDur,
}) => {
  if (frame < at) return null;
  const size = px(SHAPE_LAYOUT.size);
  const draw = prog(frame, at, drawDur, cssEaseInOut);
  const lit = prog(frame, revealAt, litDur, cssEaseInOut);
  return (
    <div
      style={{
        position: 'absolute',
        left: (WIDTH - size) / 2,
        top: px(SHAPE_LAYOUT.top),
        width: size,
        height: size,
        opacity: clamp01(draw * 2),
      }}
    >
      <StateShape
        stateKey={puzzle.subject}
        size={size}
        progress={draw}
        fill={mix(0.15, 0.7, lit)}
        glow={mix(0.25 * draw, 1, lit)}
        accent={levelAccent(puzzle.subject)}
      />
    </div>
  );
};

/** AnswerCard-style stamp: "<CAPTION> OF <STATE>" pill over the answer in big Anton, slam-in then a short decaying shake. */
const AnswerStamp: React.FC<{ frame: number; puzzle: BonusPuzzle; caption: string; at: number; dur: number; shakeDur: number }> = ({
  frame,
  puzzle,
  caption,
  at,
  dur,
  shakeDur,
}) => {
  if (frame < at) return null;
  const answer = puzzle.options[puzzle.correctIndex];
  const accent = levelAccent(puzzle.subject);
  const stateName = getState(puzzle.subject).name;
  const L = SHAPE_LAYOUT;
  const fontRef = Math.min(L.stampMaxFont, L.stampMaxW / (Math.max(1, answer.length) * L.glyphEm));
  const t = frame - (at + dur);
  const decay = t > 0 && t < shakeDur ? 1 - t / shakeDur : 0;
  const shakeX = Math.sin(t * 2.1) * decay * px(7);
  const shakeY = Math.cos(t * 2.9) * decay * px(4);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: px(L.stampTop),
        display: 'flex',
        justifyContent: 'center',
        transform: `translate3d(${shakeX}px, ${shakeY}px, 0)`,
      }}
    >
      <div style={{ ...slamIn(frame, at, dur), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8) }}>
        <div
          style={{
            padding: `${px(4)}px ${px(20)}px`,
            borderRadius: px(30),
            background: accent,
            color: COLORS.inkDark,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(18),
            letterSpacing: px(4),
            whiteSpace: 'nowrap',
          }}
        >
          {caption} OF {stateName.toUpperCase()}
        </div>
        <div
          style={{
            ...glass(px(22), 0.18),
            padding: `${px(6)}px ${px(36)}px`,
            border: `${px(3)}px solid ${accent}`,
            boxShadow: `0 0 ${px(44)}px ${accent}`,
            fontFamily: FONTS.display,
            fontSize: px(fontRef),
            lineHeight: 1.05,
            letterSpacing: px(3),
            color: COLORS.yellow,
            textShadow: `0 ${px(6)}px 0 rgba(0,0,0,0.47)`,
            whiteSpace: 'nowrap',
          }}
        >
          {answer.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

/** Prompt that lifts in with the shape (BonusPrompt wrapper kept local so both kinds share one timing). */
export const BonusShapeScene: React.FC<{ frame: number; puzzle: BonusPuzzle; duration?: number; kind: ShapeBonusKind }> = ({
  frame,
  puzzle,
  duration,
  kind,
}) => {
  const M = shapeBonusTimes(puzzle, duration);
  return (
    <BonusStage frame={frame} puzzle={puzzle} T={M}>
      <BonusBanner frame={frame} puzzle={puzzle} pre={M.pre} />
      <BonusBadge frame={frame} puzzle={puzzle} at={M.pre} />
      <BonusPrompt frame={frame} text={puzzle.prompt} at={M.promptAt} />
      <CenterShape frame={frame} puzzle={puzzle} at={M.shapeIn} drawDur={M.drawDur} revealAt={M.revealAt} litDur={M.litDur} />
      <BonusOptions frame={frame} options={puzzle.options} correctIndex={puzzle.correctIndex} at={M.chipsAt} revealAt={M.revealAt} />
      <AnswerStamp frame={frame} puzzle={puzzle} caption={BONUS_SHAPE_CAPTION[kind]} at={M.stampAt} dur={M.stampDur} shakeDur={M.shakeDur} />
      <BonusTimer frame={frame} T={M} />
      <BonusEraseChip frame={frame} revealAt={M.revealAt} />
    </BonusStage>
  );
};

export const BonusCapital: React.FC<{ frame: number; puzzle: BonusPuzzle; duration?: number }> = ({ frame, puzzle, duration }) => (
  <BonusShapeScene frame={frame} puzzle={puzzle} duration={duration} kind="capital" />
);
