import React from 'react';
import { px } from '../../style';
import cfg from '../search-settings.json';
import { ROUNDS, getRound } from '../search-data';
import { buildRoundPlan } from '../search-timing';
import { SearchStage } from '../components/SearchStage';
import { SearchBar } from '../components/SearchBar';
import { TimerBar } from '../components/TimerBar';
import { typeTicksFor } from './searchRoundCues';

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
  const typeTicks = typeTicksFor(round.searches, cfg.typing);
  const starts = plan.searchAt.map(shift);

  // Stage-in: the bar slides in over the title-in window, plan tick 0 .. plan.clockStart.
  const slideT = clamp01((frame - shift(0)) / Math.max(1, plan.clockStart));
  const slideK = easeOutCubic(slideT);

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
              opacity: slideK,
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
      // TODO(3b): hint slot. Show <HintEmoji emoji={round.hint} from={shift(plan.hintAt)} .../> in SLOTS.hint
      //           (hint={{ at: shift(plan.hintAt), children: ... }}).
      // TODO(3b): answer slot. Reveal round.name and round.from at shift(plan.revealAt), hold plan.holdFrames,
      //           then exit over plan.exitFrames. The timer is already empty at plan.revealAt.
      // TODO(3b): ProgressDots slot (dots), only if 3b wants it.
    />
  );
};
