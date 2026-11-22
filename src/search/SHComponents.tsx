import React from 'react';
import { Sequence } from 'remotion';
import { HEIGHT, WIDTH, TIME_SCALE, LEVELS, buildRoundPlan, FPS } from './search-timing';
import { ROUNDS } from './search-data';
import { SearchStage } from './components/SearchStage';
import { SearchBar } from './components/SearchBar';
import { TimerBar } from './components/TimerBar';
import { HintClue } from './components/HintClue';
import { ProgressDots } from './components/ProgressDots';
import { AnswerCard } from './components/AnswerCard';

/**
 * "SH-Components": a one-frame sheet of every search component, in a 2x2 grid.
 * Round 1 (EASY), round 11 (MEDIUM), round 21 (HARD), and the round with the longest clue, frozen at the
 * moment that clue is fully typed (to check it stays within 2 lines). Real data. Each panel is a full
 * 2560x1440 stage scaled to half size.
 *
 * One frame cannot show every moment, so each component sits in a Sequence with a negative `from`:
 * it sees its own design tick (the "freeze" prop), chosen to show it at its best.
 */

/** Round index and search index of the longest clue in the data. */
const longest = (() => {
  let best = { round: 0, search: 0, length: 0 };
  ROUNDS.forEach((r, ri) =>
    r.searches.forEach((t, si) => {
      if (t.length > best.length) best = { round: ri, search: si, length: t.length };
    }),
  );
  return best;
})();

type PanelDef = { index: number; red: boolean; search?: number };
const PANELS: PanelDef[] = [
  { index: 0, red: false }, // round 1
  { index: 10, red: false }, // round 11
  { index: 20, red: true }, // round 21, timer in its red last second
  { index: longest.round, red: false, search: longest.search }, // longest clue, fully typed
];
const COLS = 2;
const ROWS = 2;

/** Show `children` frozen at scene tick `tick` (design ticks). */
const Freeze: React.FC<{ tick: number; children: React.ReactNode }> = ({ tick, children }) => (
  <Sequence from={-Math.round(tick * TIME_SCALE)} layout="none">
    {children}
  </Sequence>
);

const Panel: React.FC<PanelDef> = ({ index, red, search }) => {
  const round = ROUNDS[index];
  const plan = buildRoundPlan(index);
  const accent = plan.level.accent;
  const typeTicks = plan.typeTicks;
  const sameLevel = ROUNDS.filter((r) => r.level === round.level);
  const numberInLevel = sameLevel.indexOf(round) + 1;
  const levelOf = (i: number) => LEVELS.find((l) => l.name === ROUNDS[i].level)?.accent ?? accent;

  // SearchBar mid-typing: halfway through the third search; for the longest-clue panel, that clue fully typed.
  const typingTick =
    search === undefined
      ? plan.searchAt[2] + typeTicks[2] * Math.ceil(round.searches[2].length / 2)
      : plan.searchAt[search] + typeTicks[search] * round.searches[search].length;
  // TimerBar: halfway through the clock, or half a second before the end for the red state.
  const timerTick = red ? plan.revealAt - FPS / 2 : plan.thinkStart + plan.thinkFrames / 2;
  // Hint and answer settled (one second after they land).
  const hintTick = plan.hintAt + FPS;
  const answerTick = plan.revealAt + FPS;

  return (
    <SearchStage
      theme={plan.level.theme}
      accent={accent}
      hud={{ label: round.level, number: numberInLevel, total: sameLevel.length }}
      search={{
        children: (r) => (
          <Freeze tick={typingTick}>
            <SearchBar
              searches={round.searches}
              starts={plan.searchAt}
              typeTicks={typeTicks}
              accent={accent}
              size={r.w}
              at={{ x: r.x, y: r.y }}
            />
          </Freeze>
        ),
      }}
      timer={{
        children: (r) => (
          <Freeze tick={timerTick}>
            <TimerBar from={plan.thinkStart} duration={plan.thinkFrames} accent={accent} size={r.w} at={{ x: r.x, y: r.y }} />
          </Freeze>
        ),
      }}
      hint={{
        children: (r) => (
          <Freeze tick={hintTick}>
            <HintClue roundId={round.id} emoji={round.hint} from={plan.hintAt} at={{ x: r.x, y: r.y + r.h / 2 }} size={r.w * 0.4} accent={accent} />
          </Freeze>
        ),
      }}
      answer={{
        children: (r) => (
          <Freeze tick={answerTick}>
            <AnswerCard name={round.name} from={round.from} at={plan.revealAt} accent={accent} place={{ x: r.x, y: r.y }} size={r.w} />
          </Freeze>
        ),
      }}
      dots={{
        children: (r) => (
          <ProgressDots index={index} total={ROUNDS.length} levelOf={levelOf} at={{ x: r.x, y: r.y }} size={r.w} />
        ),
      }}
    />
  );
};

export const SHComponents: React.FC = () => {
  const cellW = WIDTH / COLS;
  const cellH = HEIGHT / ROWS;
  const scale = 1 / COLS;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      {PANELS.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: (i % COLS) * cellW,
            top: Math.floor(i / COLS) * cellH,
            width: WIDTH,
            height: HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden',
          }}
        >
          <Panel {...p} />
        </div>
      ))}
    </div>
  );
};
