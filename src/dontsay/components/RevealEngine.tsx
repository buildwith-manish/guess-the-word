/**
 * RevealEngine (task 2g): beat -> second lock click -> ink dissolve -> answer -> ResultBeat.
 *
 * Mount it inside the round's Sequence from local tick 0 (it owns the InkBubble, so the sealed
 * bubble is on screen from the first frame of the round, small in the corner, and slides to centre).
 *
 *   start                 beat begins: everything else is frozen, the lock shakes (shake cue)
 *   start + beatSec       second lock click, shackle snaps open, ink starts to dissolve (left to right)
 *   + (revealSec-beatSec) ink gone, answer fully visible, name-reveal chime
 *   + revealSecFor(round) ResultBeat starts (resultSec long)
 *
 * Every duration comes from timing.ts. Every sound id comes from the audio map (sfx.ts).
 * The answer is `round.answer`, passed to InkBubble as a prop; the text is never typed here and is
 * never mounted while the ink is intact. Sizes are 1280x720 reference units through px().
 */
import React from 'react';
import { Audio, Sequence } from 'remotion';
import { sfxSrc, type SfxId } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import { colours, SYSTEM } from '../system';
import { beatSec, revealSec, revealSecFor, secToTicks, TIME_SCALE, WIDTH } from '../timing';
import type { Round } from '../data';
import { InkBubble } from './InkBubble';
import { ResultBeat, type ResultOutcome } from './ResultBeat';

const REF_W = 1280;
const px = (v: number): number => Math.round(v * (WIDTH / REF_W) * 100) / 100;

/** Same default centre and bubble height as InkBubble's large state (reference units). */
const CENTRE = { x: REF_W / 2, y: 372 } as const;
const BUBBLE_HALF_H = 150;
const LOCK = { w: 54, h: 44, gap: 40 } as const;

/**
 * Sounds used by the reveal. The audio map has no `lock-shake` or `name-reveal` id yet, so those two
 * are stand-ins from existing ids. Replace the ids here when task 1d adds them; nothing else changes.
 */
export const REVEAL_SFX = {
  shake: { id: 'lock-click', volume: 0.35 },
  click: { id: 'lock-click', volume: 0.9 },
  dissolve: { id: 'ink-dissolve', volume: 0.8 },
  chime: { id: 'callback-chime-1', volume: 0.6 },
} as const satisfies Record<string, { id: SfxId; volume: number }>;

export type RevealCue = { name: keyof typeof REVEAL_SFX; id: SfxId; tick: number; volume: number };

/** All reveal moments as local design ticks (30 fps), relative to the round's Sequence. */
export const revealTimes = (card: Round, start: number) => {
  const beat = secToTicks(beatSec);
  const dissolve = secToTicks(revealSec - beatSec);
  const revealFrom = start + beat;
  const answerFull = revealFrom + dissolve;
  const resultAt = revealFrom + secToTicks(revealSecFor(card));
  return { beatFrom: start, beatTicks: beat, revealFrom, dissolveTicks: dissolve, answerFull, resultAt };
};

/** Sound cues for this reveal. The ink-dissolve file is stereo with its pan baked in. */
export const revealCues = (card: Round, start: number): RevealCue[] => {
  const t = revealTimes(card, start);
  const cue = (name: keyof typeof REVEAL_SFX, tick: number): RevealCue => ({
    name,
    id: REVEAL_SFX[name].id,
    tick,
    volume: REVEAL_SFX[name].volume,
  });
  return [cue('shake', t.beatFrom), cue('click', t.revealFrom), cue('dissolve', t.revealFrom), cue('chime', t.answerFull)];
};

const easeInOut = (x: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

/** Drawn lock (not an SF Symbol): body, keyhole, shackle that lifts when `open` goes 0 -> 1. */
const LockIcon: React.FC<{ open: number; colour: string }> = ({ open, colour }) => (
  <svg width={px(LOCK.w)} height={px(LOCK.h + 22)} viewBox="0 0 54 66" style={{ display: 'block', overflow: 'visible' }}>
    <g style={{ transformOrigin: '38px 24px', transform: `translateY(${-6 * open}px) rotate(${-24 * open}deg)` }}>
      <path d="M14 26 V18 a13 13 0 0 1 26 0 V26" fill="none" stroke={colour} strokeWidth="5" strokeLinecap="round" />
    </g>
    <rect x="3" y="24" width="48" height="40" rx="11" fill={colour} />
    <circle cx="27" cy="41" r="4.5" fill="#000" fillOpacity="0.35" />
    <rect x="25" y="43" width="4" height="9" rx="2" fill="#000" fillOpacity="0.35" />
  </svg>
);

export type RevealEngineProps = {
  /** The round (the card). `card.answer` is the only source of the answer text. */
  round: Round;
  /** Local design tick where the 0.5 s beat starts (phases.beat.from minus the round start). */
  start: number;
  outcome: ResultOutcome;
  /** Level accent for the ink glow. */
  accent?: string;
  /** Forwarded to InkBubble (its own lock clicks at tick 0 and at the slide). */
  sfx?: boolean;
  /** Centre of the large bubble, reference units. */
  centre?: { x: number; y: number };
  /** Local design tick; defaults to the current clock. */
  frame?: number;
};

export const RevealEngine: React.FC<RevealEngineProps> = ({
  round,
  start,
  outcome,
  accent,
  sfx = true,
  centre = CENTRE,
  frame,
}) => {
  const clock = useDesignFrame();
  const t = frame ?? clock;
  const tm = revealTimes(round, start);

  // Ink dissolve: 0 until the second click, then one slow left-to-right sweep.
  const dissolve = easeInOut((t - tm.revealFrom) / tm.dissolveTicks);

  // Beat: damped shake of the lock, a fixed number of cycles over exactly beatSec.
  const beatP = clamp01((t - tm.beatFrom) / tm.beatTicks);
  const inBeat = t >= tm.beatFrom && t < tm.revealFrom;
  const decay = Math.pow(1 - beatP, 1.5);
  const wave = Math.sin(beatP * Math.PI * 2 * 4);
  const shakeX = inBeat ? wave * 7 * decay : 0;
  const shakeRot = inBeat ? wave * 9 * decay : 0;

  // Second click: shackle snaps open over 4 ticks, then the lock fades as the ink goes.
  const open = clamp01((t - tm.revealFrom) / 4);
  const lockOpacity = t < tm.revealFrom ? 1 : 1 - clamp01((t - tm.revealFrom - 4) / 8);
  const showLock = t >= tm.beatFrom && lockOpacity > 0;

  const lockY = centre.y - BUBBLE_HALF_H - LOCK.gap - LOCK.h;

  return (
    <>
      <InkBubble
        answer={round.answer}
        state="auto"
        dissolve={dissolve}
        seed={round.n}
        accent={accent}
        sfx={sfx}
        centre={centre}
      />

      {showLock ? (
        <div
          style={{
            position: 'absolute',
            left: px(centre.x - LOCK.w / 2),
            top: px(lockY),
            opacity: lockOpacity,
            transform: `translateX(${px(shakeX)}px) rotate(${shakeRot}deg)`,
            transformOrigin: '50% 100%',
            filter: `drop-shadow(0 ${px(4)}px ${px(10)}px ${colours.shadow})`,
          }}
        >
          <LockIcon open={open} colour={open > 0 ? SYSTEM.blue : colours.ink} />
        </div>
      ) : null}

      {revealCues(round, start).map((c) => (
        <Sequence key={c.name} from={Math.round(c.tick * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}

      <ResultBeat round={round} outcome={outcome} at={tm.resultAt} anchor={centre} frame={t} />
    </>
  );
};
