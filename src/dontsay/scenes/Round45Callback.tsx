/**
 * Round 45 callback (task 3c).
 *
 * The standard round (RoundScene) with a 4.2 s intro instead of 1.2 s. In the intro the earlier
 * fruit answers (round.callbackFrom -> rounds[n].answer) float into a banned box one by one, each
 * landing as a small crossed-out card. The sealed bubble is held in the corner one extra second
 * (sealedSlideSec + 1 s = 2.5 s from the round start), then slides to centre; the timer starts when
 * the intro ends (timing.ts). Reveal and result are the standard ones; the next segment in
 * timing.ts is the Voice Only bonus, so the scene ends on a hard cut (no fade out).
 *
 * Everything shown or spoken comes from data.ts / timing.ts. Sizes are 1280x720 reference units
 * through px(). Nothing here animates a heart.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import '../shared/fonts';
import { Shake } from '../shared/Shake';
import { rounds, type Round } from '../data';
import { sfxFrames, sfxSrc, type SfxId } from '../sfx';
import { colours, fontHeadline, glassSurface, SYSTEM, springAt, STAGGER } from '../system';
import {
  sealedSlideSec,
  secToTicks,
  ticksToFrames,
  useDontSayFrame,
  WIDTH,
} from '../timing';
import { RoundScene, roundFrames, roundSegment, defaultOutcome } from './RoundScene';
import type { ResultOutcome } from '../components/ResultBeat';

const REF_W = 1280;
const px = (v: number): number => (v * WIDTH) / REF_W;

/* ---------- timing (design ticks at 30 fps, local to the round) ---------- */
/** Extra hold for the small sealed bubble in this round, seconds. */
export const SEALED_EXTRA_HOLD_SEC = 1;
/** Local tick where the sealed bubble slides to centre: (sealedSlideSec + 1 s). */
export const round45SlideTick = (): number => secToTicks(sealedSlideSec + SEALED_EXTRA_HOLD_SEC);
/** First card leaves at this tick; each next card follows STAGGER.arrival (4) ticks later. */
export const CARD_FIRST_TICK = STAGGER.arrival * 3;
export const CARD_STEP_TICKS = STAGGER.arrival;
/** Flight length: the card's spring ('smooth') is treated as landed after this many ticks. */
export const CARD_FLIGHT_TICKS = 14;
/** Strike-through draws over this many ticks after landing. */
const STRIKE_TICKS = 6;

export const cardLaunchTick = (i: number): number => CARD_FIRST_TICK + i * CARD_STEP_TICKS;
export const cardLandTick = (i: number): number => cardLaunchTick(i) + CARD_FLIGHT_TICKS;

/* ---------- layout (reference units, 1280x720) ---------- */
const SAFE_X = 128; // centre 80%: x 128..1152
const BOX = { left: SAFE_X, width: REF_W - SAFE_X * 2, top: 592, height: 60, radius: 30, pad: 4, gap: 12 } as const;
const CARD_FONT = 30;

/* ---------- data helpers ---------- */
/** The round that calls back (round.callback in data.ts). */
export const callbackRound = (): Round => {
  const r = rounds.find((x) => x.callback);
  if (!r) throw new Error('Round45Callback: no round with callback:true in data.ts');
  return r;
};

/** Answers of the earlier rounds, in callbackFrom order. */
export const callbackAnswers = (r: Round): string[] =>
  (r.callbackFrom ?? []).map((n) => {
    const src = rounds.find((x) => x.n === n);
    if (!src) throw new Error(`Round45Callback: callbackFrom round ${n} not in data.ts`);
    return src.answer;
  });

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const numberWord = (n: number): string =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;

/** Spoken intro line, built from data: "Round forty-five. Name a fruit. Not banana, orange, kiwi, grapes." */
export const round45VoiceText = (r: Round): string =>
  `Round ${numberWord(r.n)}. ${r.prompt}. Not ${(r.banned ?? []).map((b) => b.toLowerCase()).join(', ')}.`;

/** Callback chime ids, one pitch higher each (callback-chime-1 .. -4). */
export const chimeId = (i: number): SfxId => `callback-chime-${Math.min(i + 1, 4)}` as SfxId;

export type CallbackCue = { name: string; id: SfxId; tick: number; volume: number };
/** Sound cues for the callback intro (local ticks). Chime plays when the card lands. */
export const round45Cues = (r: Round = callbackRound()): CallbackCue[] =>
  callbackAnswers(r).map((a, i) => ({ name: `land-${a}`, id: chimeId(i), tick: cardLandTick(i), volume: 0.6 }));

/* ---------- one card ---------- */
const slotLeft = (i: number, n: number): number => {
  const inner = BOX.width - BOX.pad * 2 - BOX.gap * (n - 1);
  const w = inner / n;
  return BOX.left + BOX.pad + i * (w + BOX.gap);
};
const slotWidth = (n: number): number => (BOX.width - BOX.pad * 2 - BOX.gap * (n - 1)) / n;

const FruitCard: React.FC<{ label: string; i: number; n: number; t: number }> = ({ label, i, n, t }) => {
  const launch = cardLaunchTick(i);
  const land = cardLandTick(i);
  const flight = springAt(t, launch, 'smooth'); // 0 -> 1 (may overshoot slightly)
  const appear = Math.min(1, Math.max(0, (t - launch) / 5));
  const rest = 1 - flight; // distance still to travel, 1 -> 0
  const dir = i % 2 === 0 ? 1 : -1;
  // float: a small sideways bob while in flight, gone on landing
  const bob = Math.sin((t - launch) * 0.55) * 10 * Math.max(0, rest);
  const strike = Math.min(1, Math.max(0, (t - land) / STRIKE_TICKS));
  const settled = Math.min(1, Math.max(0, (t - land) / 8));
  const w = slotWidth(n);

  return (
    <div
      style={{
        position: 'absolute',
        left: px(slotLeft(i, n)),
        top: px(BOX.top + BOX.pad),
        width: px(w),
        height: px(BOX.height - BOX.pad * 2),
        opacity: appear,
        transform: `translate(${px(bob)}px, ${px(-170 * rest)}px) rotate(${dir * 7 * rest}deg) scale(${1 + 0.35 * rest})`,
        transformOrigin: 'center',
      }}
    >
      <Shake frame={t} at={land} dur={6} amp={1.5} seed={i + 1} style={{ width: '100%', height: '100%' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            ...glassSurface((BOX.height - BOX.pad * 2) / 2 * (1920 / REF_W)),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            opacity: 1 - 0.22 * settled,
          }}
        >
          <span
            style={{
              position: 'relative',
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: px(CARD_FONT),
              letterSpacing: '-0.01em',
              color: colours.ink,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
            {/* hand-drawn strike: a red line across the word, drawn left to right after landing */}
            <span
              style={{
                position: 'absolute',
                left: px(-8),
                top: '52%',
                height: px(4),
                width: `calc(${strike * 100}% + ${px(16) * strike}px)`,
                borderRadius: px(2),
                background: SYSTEM.red,
                transform: 'rotate(-4deg)',
                transformOrigin: 'left center',
              }}
            />
          </span>
        </div>
      </Shake>
    </div>
  );
};

/* ---------- overlay ---------- */
const Overlay: React.FC<{ round: Round }> = ({ round }) => {
  const t = useDontSayFrame();
  const seg = roundSegment(round.n);
  const fadeFrom = seg.phases.sealed.from - seg.from; // box gives way when the answer takes the stage
  const boxFade = Math.min(1, Math.max(0, 1 - (t - fadeFrom) / 8));
  const boxIn = Math.min(1, springAt(t, STAGGER.arrival, 'gentle'));
  const answers = callbackAnswers(round);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {boxFade > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: boxFade }}>
          {/* the banned box */}
          <div
            style={{
              position: 'absolute',
              left: px(BOX.left),
              top: px(BOX.top),
              width: px(BOX.width),
              height: px(BOX.height),
              ...glassSurface(BOX.radius * (1920 / REF_W)),
              opacity: boxIn,
              transform: `scale(${0.96 + 0.04 * boxIn})`,
            }}
          />
          {answers.map((a, i) => (
            <FruitCard key={`${a}-${i}`} label={a} i={i} n={answers.length} t={t} />
          ))}
        </div>
      ) : null}

      {round45Cues(round).map((c) => (
        <Sequence key={c.name} from={ticksToFrames(c.tick)} durationInFrames={sfxFrames(c.id)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/* ---------- scene ---------- */
export type Round45CallbackProps = {
  round?: Round;
  /** Tick (30 fps) in the enclosing clock where the round starts. Default 0. */
  at?: number;
  outcome?: ResultOutcome;
};

export const Round45Callback: React.FC<Round45CallbackProps> = ({ round = callbackRound(), at = 0, outcome }) => (
  <Sequence from={ticksToFrames(at)} durationInFrames={roundFrames(round.n)}>
    <RoundScene round={round} outcome={outcome ?? defaultOutcome(round)} slideAt={round45SlideTick()} chips={false} />
    <Overlay round={round} />
  </Sequence>
);

export const round45Frames = (): number => roundFrames(callbackRound().n);
