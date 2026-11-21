/**
 * StateRound (tasks 3a + 3b + 3c): one question of "Guess the US State from Its Shape".
 *
 * Phases, all from buildQuestionPlan (ticks of the question's own plan, 30 per second):
 *   stage-in   plan.drawStart .. +drawFrames    the neon outline draws in (StateShape progress 0 -> 1)
 *   clock      plan.timerStart .. +timerFrames  the TimerRing runs for the level time
 *   hints      plan.hintAt[0] / [1]             fractions of the clock from states-settings.json (hints.fractions)
 *   reveal     plan.revealStart .. plan.stamp   the shape fills, the hidden half / pixels resolve
 *   stamp      plan.stamp                       flash + AnswerCard + stamp sound
 *   hold       plan.stamp .. plan.exit          minimum hold from settings (reveal.minHoldSeconds), stretched by a
 *                                               reveal voiceover clip in the manifest (both already inside the plan)
 *   fly-in     plan.exit .. plan.duration       the shape flies into the MiniMap, the card fades out
 * Sound for these phases is in ./stateRoundCues.ts (same plan ticks).
 *
 * Tier by level (states-data.ts / state-timing QUESTIONS carry the per-state values):
 *   EASY    plain neon outline (StateShape)
 *   MEDIUM  the same, inside a CropMask hiding the half named by the state's cropSide (reveal slides it open)
 *   HARD    StateShape and EmojiFill rotated by the state's rotation (FlyIn un-rotates it)
 *   EXPERT  PixelReveal: 12 -> 24 -> 48 cells with the clock, cross-fade to the outline at plan.revealStart
 * Hints (every tier): emoji grid (EmojiFill) at plan.hintAt[0]; Census-region glow on the MiniMap at plan.hintAt[1].
 * The MiniMap shows the states answered so far (video order before `index`). It deliberately gets no
 * `current` state: that pulsing outline would mark the answer. The current state joins the map by FlyIn.
 *
 * Extras: streak banner (label + call to action from settings.streak) on the milestone questions,
 * "FASTEST GUESS" badge (settings.fastest.label) on the fast questions.
 *
 * Mount inside a <Sequence from={seg.from}>: `frame` is the local design tick of that sequence
 * (useDesignFrame() there). The question starts `lead` ticks earlier (it overlaps the previous colour
 * wipe), so plan tick = frame + lead.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { useDesignFrame } from '../../clock';
import { prog, cssEaseInOut, cssEaseOut } from '../../anim';
import { COLORS, FONTS, S, SAFE_Y, glass, px } from '../../style';
import { Flash } from '../../Fx';
import { TIME_SCALE, buildQuestionPlan, LEVELS, QUESTIONS } from '../state-timing';
import type { StateQuestionPlan } from '../state-timing';
import { STATES, getState } from '../states-data';
import settings from '../states-settings.json';
import { STAGE_LAYOUT, StateStage } from '../components/StateStage';
import { StateShape } from '../components/StateShape';
import { TimerRing } from '../components/TimerRing';
import { EmojiFill } from '../components/EmojiFill';
import { CropMask } from '../components/CropMask';
import { PixelReveal } from '../components/PixelReveal';
import { MiniMap } from '../components/MiniMap';
import { AnswerCard } from '../components/AnswerCard';
import { FlyIn } from '../components/FlyIn';
import { isStreakMilestone, stateRoundCues, streakAt } from './stateRoundCues';

export interface StateRoundProps {
  /** local design tick of the enclosing Sequence */
  frame: number;
  /** 0-based question index (video order) */
  index: number;
  /** ticks of this question already played inside the previous wipe (segment.lead), default 0 */
  lead?: number;
  /** must match what the timeline used for this question (buildQuestionPlan's second argument), default false */
  withTitle?: boolean;
}

const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 };

/** "5 / IN A ROW / DROP YOUR COUNT": bottom left, pops in at streakAt and stays to the end of the hold. */
const StreakBanner: React.FC<{ f: number; plan: StateQuestionPlan }> = ({ f, plan }) => {
  const at = streakAt(plan);
  if (f < at) return null;
  const t = prog(f, at, plan.stamp - plan.revealStart, cssEaseOut);
  return (
    <div
      style={{
        ...glass(px(36)),
        position: 'absolute',
        left: S.hudLeft,
        bottom: SAFE_Y,
        padding: `${px(14)}px ${px(36)}px`,
        border: `${px(2)}px solid ${COLORS.yellow}`,
        opacity: t,
        transform: `translateY(${(1 - t) * px(40)}px)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(20) }}>
        <span style={{ fontFamily: FONTS.display, fontSize: px(110), lineHeight: 1, color: COLORS.yellow }}>{plan.id}</span>
        <span style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(38), letterSpacing: px(4), color: COLORS.ink }}>
          {settings.streak.label}
        </span>
      </div>
      <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(28), letterSpacing: px(3), color: COLORS.yellowSoft }}>
        {settings.streak.cta}
      </div>
    </div>
  );
};

/** "FASTEST GUESS": top centre pill on the fast questions (short clock). */
const FastBadge: React.FC = () => (
  <div
    style={{
      ...glass(px(40)),
      padding: `${px(10)}px ${px(34)}px`,
      border: `${px(2)}px solid ${COLORS.yellow}`,
      fontFamily: FONTS.body,
      fontWeight: 800,
      fontSize: px(30),
      letterSpacing: px(5),
      color: COLORS.yellow,
      whiteSpace: 'nowrap',
    }}
  >
    {settings.fastest.label}
  </div>
);

export const StateRound: React.FC<StateRoundProps> = ({ frame, index, lead = 0, withTitle = false }) => {
  const plan = buildQuestionPlan(index, withTitle);
  const level = LEVELS[plan.levelIndex];
  const q = QUESTIONS[index];
  const info = getState(plan.key);
  const f = frame + lead; // plan tick
  const L = STAGE_LAYOUT;
  const size = L.shape.w;

  // stage-in: the outline draws and its glow comes up with it
  const draw = prog(f, plan.drawStart, plan.drawFrames, cssEaseInOut);
  // clock progress 0 -> 1 (EXPERT grid resolution)
  const clock = prog(f, plan.timerStart, plan.timerFrames);
  // reveal build 0 -> 1: fill, hidden half opens, emoji clue fades out
  const reveal = prog(f, plan.revealStart, plan.stamp - plan.revealStart, cssEaseInOut);
  // fly-in: starts when the hold ends, lasts until the end of the round
  const flyAt = plan.exit;
  const flyDur = plan.duration - plan.exit;

  if (q.level === 'MEDIUM' && q.cropSide === undefined) throw new Error(`${q.key}: MEDIUM state without cropSide`);
  if (q.level === 'HARD' && q.rotation === undefined) throw new Error(`${q.key}: HARD state without rotation`);
  const rotation = q.level === 'HARD' ? (q.rotation as number) : 0;

  // hints: emoji at hintAt[0], region glow at hintAt[1]
  const region = f >= plan.hintAt[1] ? info.region : undefined;
  const emoji = (
    <div style={fill}>
      <EmojiFill stateKey={plan.key} size={size} at={plan.hintAt[0]} rotation={rotation} opacity={1 - reveal} frame={f} />
    </div>
  );

  let shapeSlot: React.ReactNode;
  if (q.level === 'EXPERT') {
    shapeSlot = (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ ...fill, opacity: draw }}>
          <PixelReveal
            stateKey={plan.key}
            size={size}
            progress={clock}
            accent={level.accent}
            at={plan.revealStart}
            dur={plan.stamp - plan.revealStart}
            frame={f}
          />
        </div>
        {emoji}
      </div>
    );
  } else {
    const layers = (
      <>
        <div style={fill}>
          <StateShape
            stateKey={plan.key}
            size={size}
            progress={draw}
            fill={reveal}
            glow={draw}
            rotation={rotation}
            accent={level.accent}
          />
        </div>
        {emoji}
      </>
    );
    shapeSlot =
      q.level === 'MEDIUM' ? (
        <CropMask side={q.cropSide as NonNullable<typeof q.cropSide>} reveal={reveal} size={size}>
          {layers}
        </CropMask>
      ) : (
        <div style={{ position: 'relative', width: size, height: size }}>{layers}</div>
      );
  }

  return (
    <StateStage
      level={level.name}
      number={plan.id}
      frame={f}
      slots={{
        // fast questions: the badge is up from stage-in, so the viewer knows the clock is short
        title: plan.fast ? { at: plan.drawStart, children: <FastBadge /> } : undefined,
        // the stage shape hands over to FlyIn at flyAt
        shape: { children: f < flyAt ? shapeSlot : null },
        // the ring goes when the clock has run out
        ring: {
          at: plan.timerStart,
          children:
            f < plan.revealStart ? (
              <TimerRing
                from={plan.timerStart}
                duration={plan.timerFrames}
                accent={level.accent}
                size={L.ring.w}
                frame={f}
              />
            ) : null,
        },
        miniMap: {
          children: (rect) => (
            <MiniMap
              answered={STATES.slice(0, index).map((s) => s.key)}
              highlightRegion={region}
              size={rect.w}
              frame={f}
            />
          ),
        },
        overlay: {
          fade: false,
          children: (
            <>
              <Flash frame={f} start={plan.stamp} />
              {f >= flyAt ? (
                <FlyIn
                  stateKey={plan.key}
                  from={L.shape}
                  to={L.miniMap}
                  at={flyAt}
                  dur={flyDur}
                  accent={level.accent}
                  rotation={rotation}
                  mode="outline"
                  frame={f}
                />
              ) : null}
              {isStreakMilestone(plan.id) ? <StreakBanner f={f} plan={plan} /> : null}
            </>
          ),
        },
        card: {
          children: <AnswerCard stateKey={plan.key} at={plan.stamp} accent={level.accent} exit={plan.exit} frame={f} />,
        },
      }}
    />
  );
};

// ---------------------------------------------------------------- Studio preview
export type StateRoundPreviewProps = { index: number };

/** Round `index` on its own with its sound cues, for the "ST-Round" composition (Studio scrubbing). */
export const StateRoundPreview: React.FC<StateRoundPreviewProps> = ({ index }) => {
  const frame = useDesignFrame();
  return (
    <AbsoluteFill>
      <StateRound frame={frame} index={index} />
      {stateRoundCues(index).map((c, i) => (
        <Sequence key={i} from={Math.round(c.frame * TIME_SCALE)} layout="none">
          <Audio src={staticFile(`sounds/${c.sfx}.wav`)} playbackRate={c.rate ?? 1} volume={c.volume ?? 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
