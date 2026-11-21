/**
 * BonusBorders (task 4b): bonus kind "borders", "Which of these borders <state>?". The target state glows on
 * the full map, four option chips (one true neighbour, three states that do not border it) and the clock run;
 * on the reveal the correct neighbour lights up and a line is drawn from the target to it, the correct chip
 * lights, then the erase chip follows.
 * Shares its parts (banner, badge, prompt, map, chips, clock, erase chip, stage) with BonusMissing.tsx.
 *
 * Timeline (ticks from the start of the bonus segment; preRoll / build / clock / answer hold from state-timing):
 *   0 .. preRoll                 banner
 *   preRoll+2                    map slides in; the target starts to glow at preRoll+8; chips from preRoll+10
 *   clockStart .. clockEnd       clock runs (tick each second, thump in the last three, drumroll)
 *   revealAt = clockEnd          correct chip lights; the neighbour lights at +6; the line draws from +8 over 14
 *   duration - 12                exit
 *
 * Time: `frame` = design ticks since the segment started; `duration` defaults to bonusBaseFrames(slot).
 * Not rendered or viewed.
 */
import React from 'react';
import { IOS } from '../../../ios';
import { prog, cssEaseInOut, cssEaseOut } from '../../../anim';
import type { BonusPuzzle } from '../../bonus-engine';
import { getShape } from '../../geo';
import { levelAccent } from '../../components/MiniMap';
import type { StateCue, StateSfx } from '../stateRoundCues';
import {
  BonusBadge,
  BonusBanner,
  BonusEraseChip,
  BonusMap,
  BonusMapBlock,
  BonusOptions,
  BonusPrompt,
  BonusStage,
  BonusTimer,
  bonusCommonCues,
  bonusTimes,
  sortCues,
} from './BonusMissing';
import type { MapMark } from './BonusMissing';

/** Beats of the borders scene in ticks (from the start of the segment). */
export const bordersTimes = (puzzle: BonusPuzzle, duration?: number) => {
  const T = bonusTimes(puzzle, duration);
  return {
    ...T,
    mapIn: T.pre + 2,
    glowAt: T.pre + 8,
    chipsAt: T.pre + 10,
    /** the true neighbour lights up */
    litAt: T.revealAt + 6,
    lineAt: T.revealAt + 8,
    lineDur: 14,
  };
};

/** Cues of the borders bonus, ticks from the start of the segment (absolute tick = seg.from + cue.frame). */
export const bonusBordersCues = (puzzle: BonusPuzzle): StateCue[] => {
  const B = bordersTimes(puzzle);
  const cues = bonusCommonCues(puzzle);
  const add = (frame: number, sfx: StateSfx) => cues.push({ frame: Math.round(frame), sfx });
  add(B.glowAt, 'ping-hi');
  add(B.litAt, 'flare');
  add(B.lineAt, 'rule-sweep');
  return sortCues(cues);
};

export const BonusBorders: React.FC<{ frame: number; puzzle: BonusPuzzle; duration?: number }> = ({ frame, puzzle, duration }) => {
  const B = bordersTimes(puzzle, duration);
  const target = puzzle.subject;
  const neighbour = puzzle.optionKeys[puzzle.correctIndex];
  const accent = levelAccent(target);

  // the target is outlined in the accent, the true neighbour lights green on the reveal
  const glowIn = prog(frame, B.glowAt, 12, cssEaseOut);
  const lit = prog(frame, B.litAt, 10, cssEaseOut);
  const marks: Record<string, MapMark> = {
    [target]: { fill: accent, fillOpacity: 0.3 + 0.5 * glowIn, edge: IOS.color.orange, edgeOpacity: 0.5 + 0.5 * glowIn, glow: glowIn },
  };
  if (lit > 0) {
    marks[neighbour] = { fill: IOS.color.green, fillOpacity: 0.85 * lit, edge: IOS.color.label, edgeOpacity: lit, glow: lit };
  }

  const a = getShape(target).miniCentroid;
  const b = getShape(neighbour).miniCentroid;
  const lineP = prog(frame, B.lineAt, B.lineDur, cssEaseInOut);

  return (
    <BonusStage frame={frame} puzzle={puzzle} T={B}>
      <BonusBanner frame={frame} puzzle={puzzle} pre={B.pre} />
      <BonusBadge frame={frame} puzzle={puzzle} at={B.pre} />
      <BonusPrompt frame={frame} text={puzzle.prompt} at={B.pre + 2} />
      <BonusMapBlock frame={frame} at={B.mapIn}>
        {(size) => (
          <BonusMap size={size} marks={marks}>
            {lineP > 0 ? (
              <>
                <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} pathLength={1} fill="none" stroke={IOS.color.orange} strokeWidth={3} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - lineP} />
                <circle cx={a[0]} cy={a[1]} r={4.5} fill={IOS.color.orange} />
                <circle cx={b[0]} cy={b[1]} r={4.5 * lineP} fill={IOS.color.label} />
              </>
            ) : null}
          </BonusMap>
        )}
      </BonusMapBlock>
      <BonusOptions frame={frame} options={puzzle.options} correctIndex={puzzle.correctIndex} at={B.chipsAt} revealAt={B.revealAt} />
      <BonusTimer frame={frame} T={B} />
      <BonusEraseChip frame={frame} revealAt={B.revealAt} />
    </BonusStage>
  );
};
