/**
 * RoundScene (task 3a): the standard round layout for rounds 1-45.
 *
 * Layers, back to front: level wallpaper, ExclusionChips (the round's rule), ListeningGlow, prompt card,
 * CountdownNumber, HeartsPill (static), round counter "N OF 45", RevealEngine (owns the InkBubble).
 *
 * Time: every phase comes from the round's segment in timing.ts. Data (prompt, rule, answer, level, counter total)
 * comes from data.ts. No prompt, answer, rule, number, points or duration is written here.
 * Sizes are 1280x720 reference units through px(). Prompt and answer text sits in the centre 80% (x 128..1152).
 * Hearts: HeartsPill is static; it springs in once, and only on the first round of a level. Nothing here animates a heart.
 * The wallpaper follows the LEVEL, never hearts.
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import '../shared/fonts';
import { levelColors, rounds, type Round } from '../data';
import { ExclusionChips } from '../components/ExclusionChips';
import { CountdownNumber } from '../components/CountdownNumber';
import { HeartsPill } from '../components/HeartsPill';
import { ListeningGlow } from '../components/ListeningGlow';
import { RevealEngine } from '../components/RevealEngine';
import type { ResultOutcome } from '../components/ResultBeat';
import { colours, fontHeadline, fontNumeric, glassSurface, levelBackground, springAt, STAGGER, tabular } from '../system';
import { FPS, segments, ticksToFrames, useDontSayFrame, WIDTH, type Range, type RoundPhases, type Segment } from '../timing';

const REF_W = 1280;
const px = (v: number): number => (v * WIDTH) / REF_W;

/* ---------- layout, reference units (1280x720) ---------- */
const SAFE_X = 128; // 10% margin each side: text stays in x 128..1152
const TOP_ROW = 72;
const ROW_H = 64; // same height as HeartsPill
const PROMPT = { left: SAFE_X, top: 150, width: REF_W - SAFE_X * 2, height: 124, radius: 44 } as const;
const PROMPT_MAX_SIZE = 64;
const PROMPT_FIT_WIDTH = PROMPT.width - 80; // inner width for the one-line fit
/** Countdown is the Dynamic Island: a black capsule at the top centre. */
const COUNTDOWN_TOP = 14;
/** Dictation capsule (bottom centre, above the home indicator). Only while the timer runs. */
const DICTATION = { width: 360, height: 72, top: 576 } as const;
/** Centre of the enlarged ink bubble. ResultBeat puts its chip 150 units below this. */
const BUBBLE_CENTRE = { x: REF_W / 2, y: 440 } as const;
/** The small bubble is 12% of the width, right-aligned to the safe edge (InkBubble). The counter sits left of it. */
const COUNTER_RIGHT_EDGE = REF_W - SAFE_X - Math.round(0.12 * REF_W) - 18;

/* ---------- segment lookup ---------- */
export type RoundSegment = Extract<Segment, { kind: 'round' }>;
export const roundSegment = (n: number): RoundSegment => {
  const s = segments.find((x): x is RoundSegment => x.kind === 'round' && x.round.n === n);
  if (!s) throw new Error(`RoundScene: no round ${n} in timing.ts segments`);
  return s;
};
/** Round length in render frames (60 fps), straight from timing.ts. */
export const roundFrames = (n: number): number => {
  const s = roundSegment(n);
  return ticksToFrames(s.to) - ticksToFrames(s.from);
};

/** Outcome shown by the result chip. data.ts has no per-round outcome; default is derived from the odds. */
export const defaultOutcome = (r: Round): ResultOutcome => (r.collision === 'High' ? 'collision' : 'safe');

const isLevelFirst = (r: Round): boolean => rounds.find((x) => x.level === r.level)?.n === r.n;

/** Phase range as ticks local to the round. */
const local = (r: Range, from: number): Range => ({ from: r.from - from, to: r.to - from });

const fadeOut = (t: number, at: number, ticks: number): number => Math.min(1, Math.max(0, 1 - (t - at) / ticks));

/** Drawn mic (not an SF Symbol). */
const MicIcon: React.FC = () => (
  <svg width={px(26)} height={px(34)} viewBox="0 0 26 34" style={{ display: 'block' }}>
    <rect x="8" y="1" width="10" height="19" rx="5" fill={colours.ink} />
    <path d="M3 15 a10 10 0 0 0 20 0" fill="none" stroke={colours.ink} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M13 25 V31" stroke={colours.ink} strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const Body: React.FC<{ round: Round; outcome: ResultOutcome; slideAt?: number; chips: boolean }> = ({ round, outcome, slideAt, chips }) => {
  const t = useDontSayFrame();
  const seg = roundSegment(round.n);
  const ph = seg.phases;
  const base = seg.from;
  const timer = local(ph.timer, base);
  const sealed = local(ph.sealed, base);
  const beat = local(ph.beat, base);
  const style = levelColors[round.level];

  // wallpaper: dark level base with one faint accent light (levelBackground)
  const background = levelBackground[round.level];

  // prompt card: arrives early, stays through the timer and the sealed slide, gives way to the lock at the beat
  const promptIn = Math.min(1, springAt(t, STAGGER.arrival, 'snappy'));
  const promptOut = fadeOut(t, beat.from - 2, 6);
  const fit = Math.min(PROMPT_MAX_SIZE, Math.floor(PROMPT_FIT_WIDTH / (Math.max(round.prompt.length, 1) * 0.6)));

  // rule chips: fade away when the answer takes the stage
  const chipsOpacity = fadeOut(t, sealed.from, 8);
  // countdown: only while the timer runs (+ a short fade)
  const showCountdown = t < timer.to + 6;
  const countdownOpacity = fadeOut(t, timer.to, 6);

  const counterIn = Math.min(1, springAt(t, STAGGER.arrival * 2, 'gentle'));

  // Aurora wallpaper: two faint orbs in the level accent only (13%), one slow loop per minute.
  // Phase comes from the video clock (round start + local tick) so it carries across rounds.
  const DRIFT_LOOP_TICKS = 60 * FPS;
  const drift = (ph: number, amp: number): number =>
    Math.sin(((base + t) / DRIFT_LOOP_TICKS) * Math.PI * 2 + ph) * amp;
  const orbs = [
    { x: 16 + drift(0, 6), y: 86 + drift(1, 5), size: 980, colour: style.accent, a: 0.13 },
    { x: 86 + drift(2, 6), y: 30 + drift(3, 6), size: 860, colour: style.accent, a: 0.13 },
  ];
  const dictIn = Math.min(1, springAt(t, STAGGER.arrival * 3, 'gentle')) * fadeOut(t, timer.to, 6);

  return (
    <AbsoluteFill style={{ background, overflow: 'hidden' }}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: px((o.x / 100) * REF_W - o.size / 2),
            top: px((o.y / 100) * 720 - o.size / 2),
            width: px(o.size),
            height: px(o.size),
            borderRadius: '50%',
            background: `radial-gradient(circle, ${o.colour}${Math.round(o.a * 255).toString(16).padStart(2, '0')} 0%, transparent 68%)`,
          }}
        />
      ))}
      {chips && chipsOpacity > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: chipsOpacity }}>
          <ExclusionChips round={round} at={STAGGER.arrival * 2} />
        </div>
      ) : null}

      <ListeningGlow
        round={round.n}
        wakeAt={timer.from}
        dimAt={timer.to}
        offAt={sealed.to}
        card={{ left: PROMPT.left, top: PROMPT.top, width: PROMPT.width, height: PROMPT.height, radius: PROMPT.radius }}
      />

      {/* the prompt, as text (it is also spoken) */}
      <div
        style={{
          position: 'absolute',
          left: px(PROMPT.left),
          top: px(PROMPT.top),
          width: px(PROMPT.width),
          height: px(PROMPT.height),
          ...glassSurface(PROMPT.radius * (1920 / REF_W), { level: round.level }),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(2),
          opacity: promptIn * promptOut,
          transform: `translateY(${(1 - promptIn) * px(14) + Math.sin(t / 45) * px(3)}px) scale(${1 + Math.sin(t / 60) * 0.004})`,
        }}
      >
        <span
          style={{
            fontFamily: fontHeadline,
            fontWeight: 600,
            fontSize: px(20),
            letterSpacing: '0.14em',
            color: colours.muted,
          }}
        >
          LEVEL {round.level}
        </span>
        <span
          style={{
            fontFamily: fontHeadline,
            fontWeight: 800,
            fontSize: px(fit),
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            color: colours.ink,
            textAlign: 'center',
            padding: `0 ${px(40)}px`,
          }}
        >
          {round.prompt}
        </span>
      </div>

      {showCountdown ? (
        <div style={{ position: 'absolute', inset: 0, opacity: countdownOpacity }}>
          <CountdownNumber level={round.level} at={timer.from} top={COUNTDOWN_TOP} />
        </div>
      ) : null}

      <HeartsPill at={isLevelFirst(round) ? 0 : undefined} left={SAFE_X} top={TOP_ROW} />

      {/* round counter, top right, left of the small bubble; one line */}
      <div
        style={{
          position: 'absolute',
          right: px(REF_W - COUNTER_RIGHT_EDGE),
          top: px(TOP_ROW),
          height: px(ROW_H),
          ...glassSurface(40, { level: round.level }),
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${px(24)}px`,
          opacity: counterIn,
          transform: `translateY(${(1 - counterIn) * px(-16)}px)`,
          transformOrigin: 'right top',
        }}
      >
        <span
          style={{
            fontFamily: fontNumeric,
            fontWeight: 800,
            fontSize: px(28),
            letterSpacing: '0.04em',
            color: colours.ink,
            whiteSpace: 'nowrap',
            ...tabular,
          }}
        >
          {round.n} OF {rounds.length}
        </span>
      </div>

      {/* dictation capsule: drawn mic + label, only while the timer runs */}
      {dictIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: px((REF_W - DICTATION.width) / 2),
            top: px(DICTATION.top),
            width: px(DICTATION.width),
            height: px(DICTATION.height),
            ...glassSurface(40, { level: round.level }),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(14),
            opacity: dictIn,
            transform: `translateY(${(1 - dictIn) * px(18)}px)`,
          }}
        >
          <MicIcon />
          <span style={{ fontFamily: fontHeadline, fontWeight: 600, fontSize: px(28), color: colours.ink }}>Listening…</span>
        </div>
      ) : null}

      {/* owns the InkBubble: small from tick 0, enlarges at the sealed phase, then beat, dissolve, answer, result */}
      <RevealEngine
        round={round}
        start={beat.from}
        outcome={outcome}
        accent={style.accent}
        centre={BUBBLE_CENTRE}
        slideAt={slideAt ?? sealed.from}
      />
    </AbsoluteFill>
  );
};

export type RoundSceneProps = {
  round: Round;
  /** Tick (30 fps) in the enclosing clock where this round starts. Default 0. */
  at?: number;
  /** Result chip. Default derived from round.collision (data.ts has no per-round outcome). */
  outcome?: ResultOutcome;
  /** Local tick (inside the round) where the sealed bubble slides to centre. Default: phases.sealed.from. */
  slideAt?: number;
  /** Draw the standard exclusion chips. Default true; Round45Callback draws its own banned box. */
  chips?: boolean;
};

export const RoundScene: React.FC<RoundSceneProps> = ({ round, at = 0, outcome, slideAt, chips = true }) => (
  <Sequence from={ticksToFrames(at)} durationInFrames={roundFrames(round.n)}>
    <Body round={round} outcome={outcome ?? defaultOutcome(round)} slideAt={slideAt} chips={chips} />
  </Sequence>
);

export type { RoundPhases };
