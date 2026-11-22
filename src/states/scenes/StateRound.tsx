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
 *   map-out    plan.exit .. plan.duration       the answer map shrinks back to the corner, the card fades out
 * Sound for these phases is in ./stateRoundCues.ts (same plan ticks).
 *
 * Tier by level (states-data.ts / state-timing QUESTIONS carry the per-state values):
 *   EASY    plain neon outline (StateShape)
 *   MEDIUM  the outline traces itself over the clock (settings.tiers.trace), closing during the reveal
 *   HARD    StateShape and EmojiFill rotated by the state's rotation 
 *   EXPERT  blurred solid silhouette sharpening over the clock (settings.tiers.blur), cross-fade to the outline in the reveal
 * Hint (every tier): Census-region glow on the MiniMap at plan.hintAt[1].
 * The corner MiniMap shows the states answered so far (video order before `index`) until the reveal; then the
 * answer map (same MiniMap, grown to the right column next to the card) takes over, adds the current state
 * at the stamp and shrinks back to the corner at the exit.
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
import { prog, mix } from '../../anim';
import { S, SAFE_X, SAFE_Y, px } from '../../style';
import { IOS } from '../../ios';
import { enter, iosOut, sprFit } from '../motion';
import { RADIUS, glassPanel } from '../look';
import { Watermark } from '../../Watermark';
import { HEIGHT, WIDTH, TIME_SCALE, buildQuestionPlan, LEVELS, QUESTIONS } from '../state-timing';
import type { StateQuestionPlan } from '../state-timing';
import { STATES, getState } from '../states-data';
import settings from '../states-settings.json';
import { STAGE_LAYOUT, StateStage } from '../components/StateStage';
import { StateShape } from '../components/StateShape';
import { StateTitleLockup } from '../components/StateTitleLockup';
import { TimerLead, timerLeadStart } from '../components/TimerLead';
import { MiniMap, miniMapHeight } from '../components/MiniMap';
import { AnswerCard } from '../components/AnswerCard';
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
  const e = enter(f, at, 'normal', 18);
  const t = e.t;
  return (
    <div
      style={{
        ...glassPanel(px(RADIUS.chip), IOS.color.orange),
        position: 'absolute',
        left: S.hudLeft,
        bottom: SAFE_Y,
        padding: `${px(14)}px ${px(36)}px`,
        fontFamily: IOS.font,
        opacity: e.opacity,
        transform: e.transform,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: px(20) }}>
        <span style={{ fontWeight: IOS.weight.bold, fontSize: px(84), lineHeight: 1, color: IOS.color.label }}>{plan.id}</span>
        <span style={{ fontWeight: IOS.weight.semibold, fontSize: px(34), color: IOS.color.label }}>{settings.streak.label}</span>
      </div>
      <div style={{ fontWeight: IOS.weight.medium, fontSize: px(26), color: IOS.color.secondary }}>{settings.streak.cta}</div>
    </div>
  );
};

/** "FASTEST GUESS": top centre pill on the fast questions (short clock). */
const FastBadge: React.FC = () => (
  <div
    style={{
      ...glassPanel(px(RADIUS.pill), IOS.color.orange, 0.4),
      padding: `${px(10)}px ${px(34)}px`,
      fontFamily: IOS.font,
      fontWeight: IOS.weight.semibold,
      fontSize: px(28),
      color: IOS.color.label,
      whiteSpace: 'nowrap',
    }}
  >
    {settings.fastest.label}
  </div>
);

/** answer screen: the card sits in the left column, the map grows into the right one (fractions of the frame width) */
const REVEAL = { cardW: 0.38, mapW: 0.5 };

/** left-side clock: diameter in px (1280x720 reference, doubled by px()) */
const TIMER_SIZE = px(190);

export const StateRound: React.FC<StateRoundProps> = ({ frame, index, lead = 0, withTitle = false }) => {
  const plan = buildQuestionPlan(index, withTitle);
  const level = LEVELS[plan.levelIndex];
  const q = QUESTIONS[index];
  const info = getState(plan.key);
  const f = frame + lead; // plan tick
  const L = STAGE_LAYOUT;
  const size = L.shape.w;

  // stage-in: the outline draws and its glow comes up with it
  const draw = sprFit(f, plan.drawStart, plan.drawFrames, 'normal');
  // clock progress 0 -> 1 (EXPERT grid resolution)
  const clock = prog(f, plan.timerStart, plan.timerFrames);
  // reveal build 0 -> 1: fill, hidden half opens, emoji clue fades out
  const reveal = sprFit(f, plan.revealStart, plan.stamp - plan.revealStart, 'normal');
  // fly-in: starts when the hold ends, lasts until the end of the round
  const flyAt = plan.exit;
  const flyDur = plan.duration - plan.exit;

  // answer map: grows from the corner map to the right column at the reveal, shrinks back to the corner at flyAt
  const bigW = WIDTH * REVEAL.mapW;
  const big = { x: WIDTH - SAFE_X - bigW, y: L.shape.y + L.shape.h / 2 - miniMapHeight(bigW) / 2, w: bigW };
  const mapIn = sprFit(f, plan.revealStart, plan.stamp - plan.revealStart, 'normal');
  const mapOut = sprFit(f, flyAt, flyDur, 'normal');
  const mapK = mapIn * (1 - mapOut);
  const answerMap = { x: mix(L.miniMap.x, big.x, mapK), y: mix(L.miniMap.y, big.y, mapK), w: mix(L.miniMap.w, big.w, mapK) };

  if (q.level === 'HARD' && q.rotation === undefined) throw new Error(`${q.key}: HARD state without rotation`);
  const rotation = q.level === 'HARD' ? (q.rotation as number) : 0;

  // hints: emoji at hintAt[0], region glow at hintAt[1]
  const region = f >= plan.hintAt[1] ? info.region : undefined;

  const tiers = settings.tiers;
  // MEDIUM: the outline traces itself over the clock, then closes during the reveal
  const trace = f < plan.revealStart
    ? tiers.trace.from + (tiers.trace.to - tiers.trace.from) * clock
    : tiers.trace.to + (1 - tiers.trace.to) * reveal;
  const shapeProgress = q.level === 'MEDIUM' ? (f < plan.timerStart ? draw * tiers.trace.from : trace) : draw;

  let shapeSlot: React.ReactNode;
  if (q.level === 'EXPERT') {
    // EXPERT: a blurred solid silhouette sharpens over the clock, then cross-fades to the neon outline
    const blur = size * (tiers.blur.start + (tiers.blur.end - tiers.blur.start) * clock);
    shapeSlot = (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ ...fill, opacity: draw * (1 - reveal), filter: `blur(${blur}px)` }}>
          <StateShape stateKey={plan.key} size={size} progress={1} fill={1} glow={0} mode="filled" accent={level.accent} />
        </div>
        <div style={{ ...fill, opacity: reveal }}>
          <StateShape stateKey={plan.key} size={size} progress={1} fill={reveal} glow={reveal} accent={level.accent} />
        </div>
      </div>
    );
  } else {
    shapeSlot = (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={fill}>
          <StateShape
            stateKey={plan.key}
            size={size}
            progress={shapeProgress}
            fill={reveal}
            glow={draw}
            rotation={rotation}
            accent={level.accent}
          />
        </div>
      </div>
    );
  }

  return (
    <StateStage
      level={level.name}
      number={plan.id}
      frame={f}
      slots={{
        // the GUESS THE STATE title stays on screen through the whole question (static, as in the wipes)
        title: { fade: false, children: <StateTitleLockup frame={f} animate={false} /> },
        // the stage shape fades out as the answer map takes over
        shape: {
          children:
            f < plan.stamp ? (
              <div style={{ opacity: 1 - iosOut((f - plan.revealStart) / ((plan.stamp - plan.revealStart) * 0.5)) }}>{shapeSlot}</div>
            ) : null,
        },
        miniMap: {
          children: (rect) =>
            f < plan.revealStart ? (
              <MiniMap answered={STATES.slice(0, index).map((s) => s.key)} highlightRegion={region} size={rect.w} frame={f} />
            ) : null,
        },
        overlay: {
          fade: false,
          children: (
            <>
              <Watermark />
              {plan.fast ? (
                <div
                  style={{
                    position: 'absolute',
                    left: L.title.x,
                    width: L.title.w,
                    top: L.title.y + L.title.h + px(24),
                    display: 'flex',
                    justifyContent: 'center',
                    opacity: enter(f, plan.drawStart, 'quick', 12).opacity,
                    transform: enter(f, plan.drawStart, 'quick', 12).transform,
                  }}
                >
                  <FastBadge />
                </div>
              ) : null}
              {f >= plan.revealStart ? (
                <div style={{ position: 'absolute', left: answerMap.x, top: answerMap.y }}>
                  <MiniMap
                    answered={STATES.slice(0, f >= plan.stamp ? index + 1 : index).map((s) => s.key)}
                    current={f >= plan.stamp && f < flyAt ? plan.key : undefined}
                    size={answerMap.w}
                    frame={f}
                  />
                </div>
              ) : null}
              {f >= timerLeadStart(plan.questionVo, plan.readyStart) && f < plan.revealStart ? (
                <div
                  style={{
                    position: 'absolute',
                    left: SAFE_X,
                    top: (HEIGHT - TIMER_SIZE) / 2,
                  }}
                >
                  <TimerLead
                    frame={f}
                    voice={plan.questionVo}
                    readyStart={plan.readyStart}
                    timerStart={plan.timerStart}
                    timerFrames={plan.timerFrames}
                    accent={level.accent}
                    size={TIMER_SIZE}
                  />
                </div>
              ) : null}
              {isStreakMilestone(plan.id) ? <StreakBanner f={f} plan={plan} /> : null}
            </>
          ),
        },
        card: {
          children: <AnswerCard stateKey={plan.key} at={plan.stamp} nameAt={plan.nameAt} capitalAt={plan.capitalAt} voice={plan.vo} accent={level.accent} box={{ x: SAFE_X, w: WIDTH * REVEAL.cardW }} exit={plan.exit} frame={f} />,
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
