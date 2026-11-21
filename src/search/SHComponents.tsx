import React from 'react';
import { Sequence } from 'remotion';
import { HEIGHT, WIDTH, TIME_SCALE, LEVELS, buildRoundPlan, FPS } from './search-timing';
import { ROUNDS } from './search-data';
import cfg from './search-settings.json';
import { SearchStage } from './components/SearchStage';
import { SearchBar } from './components/SearchBar';
import { TimerBar } from './components/TimerBar';
import { HintEmoji } from './components/HintEmoji';
import { ProgressDots } from './components/ProgressDots';
import { AnswerCard } from './components/AnswerCard';

/**
 * "SH-Components": a one-frame sheet of every search component, for the three levels side by side.
 * Round 1 (EASY), round 11 (MEDIUM), round 21 (HARD), real data. Each panel is a full 2560x1440
 * stage scaled down to a third of the width.
 *
 * One frame cannot show every moment, so each component sits in a Sequence with a negative `from`:
 * it sees its own design tick (the "freeze" prop), chosen to show it at its best.
 */

const PANELS = [0, 10, 20]; // 0-based round indices: rounds 1, 11, 21

/** Show `children` frozen at scene tick `tick` (design ticks). */
const Freeze: React.FC<{ tick: number; children: React.ReactNode }> = ({ tick, children }) => (
  <Sequence from={-Math.round(tick * TIME_SCALE)} layout="none">
    {children}
  </Sequence>
);

const Panel: React.FC<{ index: number; red: boolean }> = ({ index, red }) => {
  const round = ROUNDS[index];
  const plan = buildRoundPlan(index);
  const accent = plan.level.accent;
  const typeTicks = cfg.typing.ticksPerChar;
  const sameLevel = ROUNDS.filter((r) => r.level === round.level);
  const numberInLevel = sameLevel.indexOf(round) + 1;
  const levelOf = (i: number) => LEVELS.find((l) => l.name === ROUNDS[i].level)?.accent ?? accent;

  // SearchBar mid-typing: halfway through the third search.
  const typingTick = plan.searchAt[2] + typeTicks * Math.ceil(round.searches[2].length / 2);
  // TimerBar: halfway through the clock, or half a second before the end for the red state.
  const timerTick = red ? plan.revealAt - FPS / 2 : plan.clockStart + plan.clockFrames / 2;
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
            <TimerBar from={plan.clockStart} duration={plan.clockFrames} accent={accent} size={r.w} at={{ x: r.x, y: r.y }} />
          </Freeze>
        ),
      }}
      hint={{
        children: (r) => (
          <Freeze tick={hintTick}>
            <HintEmoji emoji={round.hint} from={plan.hintAt} at={{ x: r.x, y: r.y + r.h / 2 }} size={r.w * 0.4} accent={accent} />
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
  const cellW = WIDTH / PANELS.length;
  const scale = 1 / PANELS.length;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      {PANELS.map((idx, i) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: i * cellW,
            top: (HEIGHT - HEIGHT * scale) / 2,
            width: WIDTH,
            height: HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden',
          }}
        >
          <Panel index={idx} red={i === PANELS.length - 1} />
        </div>
      ))}
    </div>
  );
};

