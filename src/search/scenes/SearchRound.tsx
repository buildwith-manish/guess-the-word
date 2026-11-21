import React from 'react';
import { px } from '../../style';
import { FPS, TIME_SCALE } from '../../timing';
import { ROUNDS, getRound } from '../search-data';
import { LEVELS, buildRoundPlan } from '../search-timing';
import { SearchStage } from '../components/SearchStage';
import { SearchBar } from '../components/SearchBar';
import { TimerBar } from '../components/TimerBar';
import { HintEmoji } from '../components/HintEmoji';
import { AnswerCard } from '../components/AnswerCard';
import { ProgressDots } from '../components/ProgressDots';
import { Flash } from '../../Fx';
import { useDesignFrame } from '../../clock';

/**
 * One search round (task 3a, skeleton).
 *
 * Props:
 *  - frame: scene-local tick (design frames, 30 per second; the caller passes `local` from locate()).
 *  - index: 0-based round index into ROUNDS.
 *  - lead: frames of this round that already played inside the previous wipe (RoundSegment.lead).
 *
 * The plan from buildRoundPlan counts from the start INCLUDING the lead, so every plan tick is
 * shifted by -lead to become a scene-local tick (the children read their own local clock).
 *
 * Phases built here: stage-in (bar slides in), four searches typed at plan.searchAt (each slides
 * into the history), timer over the whole clock.
 * NOT built (task 3b): hint, reveal/answer, exit. See the TODO(3b) markers.
 */

/** How far the search bar travels while it slides in, in 1280x720 reference units. Motion constant. */
const SLIDE_IN_DISTANCE = 60;

/** The searches dim to this opacity at the reveal, over DIM_SECONDS. Motion constants. */
const DIM_TO = 0.25;
const DIM_SECONDS = 0.3;
/** The hint pair is about 2.3 emoji wide (HintEmoji spaces them 0.3 apart): size so the pair fits the slot width. */
const HINT_PAIR_WIDTHS = 2.6;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export type SearchRoundProps = { frame: number; index: number; lead: number };

export const SearchRound: React.FC<SearchRoundProps> = ({ frame, index, lead }) => {
  const plan = buildRoundPlan(index);
  const round = getRound(index);
  const { level } = plan;

  // HUD: the round's place within its level, "n of <rounds in the level>".
  const inLevel = ROUNDS.filter((r) => r.level === round.level);
  const hud = {
    label: level.name,
    number: inLevel.findIndex((r) => r.id === round.id) + 1,
    total: inLevel.length,
  };

  const shift = (tick: number) => tick - lead; // plan tick -> scene-local tick
  const typeTicks = plan.typeTicks; // one value per search, fitted to its slot
  const starts = plan.searchAt.map(shift);

  // Stage-in: the bar slides in over the title-in window, plan tick 0 .. plan.clockStart.
  const slideT = clamp01((frame - shift(0)) / Math.max(1, plan.clockStart));
  const slideK = easeOutCubic(slideT);

  // Reveal: the searches dim from plan.revealAt.
  const revealAt = shift(plan.revealAt);
  const dimK = easeOutCubic(clamp01((frame - revealAt) / (DIM_SECONDS * FPS)));
  const searchOpacity = slideK * (1 - (1 - DIM_TO) * dimK);

  // Progress dots: the current round pulses until the reveal, then counts as finished.
  const dotsIndex = frame >= revealAt ? index + 1 : index;
  const colorOfRound = (i: number) => (LEVELS.find((l) => l.name === ROUNDS[i].level) ?? level).accent;

  return (
    <SearchStage
      theme={level.theme}
      accent={level.accent}
      hud={hud}
      search={{
        children: (rect) => (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: searchOpacity,
              transform: `translateY(${(1 - slideK) * px(SLIDE_IN_DISTANCE)}px)`,
            }}
          >
            <SearchBar
              searches={[...round.searches]}
              starts={starts}
              typeTicks={typeTicks}
              accent={level.accent}
              size={rect.w}
              at={{ x: rect.x, y: rect.y }}
            />
          </div>
        ),
      }}
      timer={{
        children: (rect) => (
          <TimerBar
            from={shift(plan.clockStart)}
            duration={plan.clockFrames}
            accent={level.accent}
            size={rect.w}
            at={{ x: rect.x, y: rect.y }}
          />
        ),
      }}
      hint={{
        children: (rect) => (
          <HintEmoji
            emoji={round.hint}
            from={shift(plan.hintAt)}
            at={{ x: rect.x, y: rect.y + rect.h / 2 }}
            size={Math.min(rect.w / HINT_PAIR_WIDTHS, rect.h * 0.9)}
            accent={level.accent}
          />
        ),
      }}
      answer={{
        children: (rect) => (
          <>
            <Flash frame={frame} start={revealAt} />
            <AnswerCard
              name={round.name}
              from={round.from}
              at={revealAt}
              accent={level.accent}
              place={{ x: rect.x, y: rect.y }}
              size={rect.w}
            />
          </>
        ),
      }}
      dots={{
        children: (rect) => (
          <ProgressDots
            index={dotsIndex}
            total={ROUNDS.length}
            levelOf={colorOfRound}
            at={{ x: rect.x, y: rect.y }}
            size={rect.w}
          />
        ),
      }}
      // The hold (plan.holdFrames: settings minimum, stretched by a voiceover clip) is part of the scene
      // duration, so the card simply stays up until the scene ends.
      // TODO(3c): exit over plan.exitFrames (nothing leaves the screen yet; the next wipe covers it).
    />
  );
};

/** Studio preview of one round on its own (composition "SH-Round"): reads the clock itself, no lead. */
export const SearchRoundPreview: React.FC<{ index: number }> = ({ index }) => {
  const frame = useDesignFrame();
  return <SearchRound frame={frame} index={index} lead={0} />;
};

/** Length of one round at 60 fps for the preview composition (index clamped into range). */
export const roundPreviewFrames = (index: number): number =>
  Math.round(buildRoundPlan(Math.max(0, Math.min(ROUNDS.length - 1, index))).duration * TIME_SCALE);
