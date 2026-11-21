import React from 'react';
import { px } from '../../style';
import { FPS, TIME_SCALE } from '../../timing';
import { ROUNDS, getRound } from '../search-data';
import { LEVELS, RECENT_VISIBLE, buildRoundPlan } from '../search-timing';
import answerImages from '../answer-images.json';
import { SearchStage } from '../components/SearchStage';
import { SearchBar } from '../components/SearchBar';
import { TimerBar } from '../components/TimerBar';
import { HintClue } from '../components/HintClue';
import { AnswerCard, answerCardHeight } from '../components/AnswerCard';
import { AnswerPicture } from '../components/AnswerPicture';
import settings from '../search-settings.json';
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
 * Question phase: search bar and recent list in the middle, four searches typed at plan.searchAt (each slides
 * into the list, which keeps the last RECENT_VISIBLE), hint pair under the list, timer at the bottom.
 * Reveal phase: everything else fades out (question side, HUD pill, dots). If answer-images.json has a picture for the
 * round, only that picture is shown, large (AnswerPicture; the name only when settings reveal.showName is true).
 * Without a picture the text answer card stamps in instead.
 */

/** How far the search bar travels while it slides in, in 1280x720 reference units. Motion constant. */
const SLIDE_IN_DISTANCE = 60;

/** At the reveal the question side (search, list, hint, timer) fades out over DIM_SECONDS, so the answer stands alone.
 *  The answer card is not drawn at all before the reveal. Motion constant. */
const DIM_SECONDS = 0.25;
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
  const searchOpacity = slideK * (1 - dimK);
  const answerImage = (answerImages as Record<string, string>)[String(round.id)];
  // With a picture, the reveal is the picture alone: the HUD pill and the dots clear as well.
  const chromeOpacity = answerImage ? 1 - dimK : 1;

  // Tension (task 8c): an accent vignette that builds over the clock, scaled by how hard the level is
  // (first level = 0, last level = 1), and gone once the answer lands.
  const levelWeight = LEVELS.length > 1 ? Math.max(0, LEVELS.findIndex((l) => l.name === level.name)) / (LEVELS.length - 1) : 0;
  const clockProgress = clamp01((frame - shift(plan.clockStart)) / Math.max(1, plan.clockFrames));
  const tension = levelWeight * clockProgress * clockProgress * (1 - dimK);

  // Progress dots: the current round pulses until the reveal, then counts as finished.
  const dotsIndex = frame >= revealAt ? index + 1 : index;
  const colorOfRound = (i: number) => (LEVELS.find((l) => l.name === ROUNDS[i].level) ?? level).accent;

  return (
    <SearchStage
      theme={level.theme}
      accent={level.accent}
      hud={hud}
      tension={tension}
      hudOpacity={chromeOpacity}
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
              recentCount={RECENT_VISIBLE}
            />
          </div>
        ),
      }}
      timer={{
        children: (rect) => (
          <div style={{ position: 'absolute', inset: 0, opacity: 1 - dimK }}>
            <TimerBar
              from={shift(plan.clockStart)}
              duration={plan.clockFrames}
              accent={level.accent}
              size={rect.w}
              at={{ x: rect.x, y: rect.y }}
            />
          </div>
        ),
      }}
      hint={{
        children: (rect) => (
          <div style={{ position: 'absolute', inset: 0, opacity: 1 - dimK }}>
            <HintClue
              roundId={round.id}
              revealAt={revealAt}
              emoji={round.hint}
              from={shift(plan.hintAt)}
              at={{ x: rect.x, y: rect.y + rect.h / 2 }}
              size={Math.min(rect.w / HINT_PAIR_WIDTHS, rect.h * 0.9)}
              accent={level.accent}
            />
          </div>
        ),
      }}
      answer={{
        children: (rect) => (
          <>
            <Flash frame={frame} start={revealAt} />
            {answerImage ? (
              <AnswerPicture
                image={answerImage}
                name={round.name}
                from={round.from}
                at={revealAt}
                accent={level.accent}
                place={{ x: rect.x, y: rect.y }}
                size={rect.h}
                showName={settings.reveal.showName}
              />
            ) : (
              <AnswerCard
                name={round.name}
                from={round.from}
                at={revealAt}
                accent={level.accent}
                place={{ x: rect.x, y: rect.y + (rect.h - answerCardHeight(rect.w)) / 2 }}
                size={rect.w}
                anticipate={false}
              />
            )}
          </>
        ),
      }}
      dots={{
        children: (rect) => (
          <div style={{ position: 'absolute', inset: 0, opacity: chromeOpacity }}>
            <ProgressDots
              index={dotsIndex}
              total={ROUNDS.length}
              levelOf={colorOfRound}
              at={{ x: rect.x, y: rect.y }}
              size={rect.w}
            />
          </div>
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
