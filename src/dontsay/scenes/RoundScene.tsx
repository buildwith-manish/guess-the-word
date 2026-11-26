/**
 * RoundScene (task 3a): the standard round layout for rounds 1-45.
 *
 * Layers, back to front: level wallpaper, ExclusionChips (the round's rule), ListeningGlow (waveform only,
 * the one on-screen sign of listening), prompt card (thin accent edge + soft low glow, one accent colour),
 * CountdownNumber (plain glass pill, under the waveform), HeartsPill (static after level start), round
 * counter "N OF 45", RevealEngine (owns the InkBubble).
 *
 * Time: every phase comes from the round's segment in timing.ts. Data (prompt, rule, answer, level, counter total)
 * comes from data.ts. No prompt, answer, rule, number, points or duration is written here.
 * Sizes are 1280x720 reference units through px(). Prompt and answer text sits in the centre 80% (x 128..1152).
 * Hearts: HeartsPill is static; it springs in once, and only on the first round of a level. Nothing here animates a heart.
 * The wallpaper follows the LEVEL, never hearts.
 *
 * Composition: every zone is in src/dontsay/layout.ts (hud row, counter, prompt card, waveform, ruleZone, bubbles).
 * HUD (hearts, counter, countdown) is drawn above the RevealEngine layer so its backdrop blur never softens it.
 * The enlarged ink bubble is y 290-590 at the sealed phase: the prompt eases up and fades out
 * before the bubble's growing footprint reaches that range (see promptAwayAt below), and the waveform and
 * countdown are both gone (faded 4 ticks after timer.to) well before the sealed slide.
 */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import '../shared/fonts';
import { levelColors, rounds, type Round } from '../data';
import { ExclusionChips } from '../components/ExclusionChips';
import { CountdownNumber, EdgeBeat } from '../components/CountdownNumber';
import { HeartsPill, PILL_RADIUS_1920 } from '../components/HeartsPill';
import { ListeningGlow } from '../components/ListeningGlow';
import { AuroraWallpaper } from '../components/AuroraWallpaper';
import { RevealEngine } from '../components/RevealEngine';
import type { ResultOutcome } from '../components/ResultBeat';
import { HUD_LEFT, REF, bubbleLargeCentre, layout, promptFontSize, promptHeight, promptWidth } from '../layout';
import { colours, fontHeadline, easeOut, glassSurface, springAt, STAGGER, tabular } from '../system';
import { segments, ticksToFrames, useDontSayFrame, WIDTH, type Range, type RoundPhases, type Segment } from '../timing';

const REF_W = REF.w;
const px = (v: number): number => (v * WIDTH) / REF_W;

/* ---------- layout: every position comes from src/dontsay/layout.ts ---------- */
const ROW_H = layout.hudCounter.bottom - layout.hudCounter.top; // counter pill height (44)
/** Prompt card: one FIXED rect for every round. */
const PROMPT = { left: layout.prompt.left, top: layout.prompt.top, width: promptWidth, height: promptHeight, radius: 44 } as const;
/** Light blur behind the large bubble, reference units. */
const BACKDROP_BLUR = 6;
/** Prompt exit length in ticks: shorter than its entrance. */
const PROMPT_EXIT_TICKS = 8;
/** Glow behind the prompt card: about 60% of the frame width, 16% accent at the centre. */
const PROMPT_GLOW = { w: 0.6 * REF_W, h: 360, alphaHex: '29', midHex: '14' } as const;
/** Centre of the enlarged ink bubble. ResultBeat puts its chip 150 units below this. */
const BUBBLE_CENTRE = bubbleLargeCentre;

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

/** Phase range as ticks local to the round. */
const local = (r: Range, from: number): Range => ({ from: r.from - from, to: r.to - from });

const fadeOut = (t: number, at: number, ticks: number): number => Math.min(1, Math.max(0, 1 - (t - at) / ticks));

const Body: React.FC<{ round: Round; outcome: ResultOutcome; slideAt?: number; chips: boolean }> = ({ round, outcome, slideAt, chips }) => {
  const t = useDontSayFrame();
  const seg = roundSegment(round.n);
  const ph = seg.phases;
  const base = seg.from;
  const timer = local(ph.timer, base);
  const sealed = local(ph.sealed, base);
  const beat = local(ph.beat, base);
  const style = levelColors[round.level];
  // first round of its level: HeartsPill springs in once here, static (no `at`) on every other round
  const roundIdx = rounds.findIndex((r) => r.n === round.n);
  const isLevelFirst = roundIdx <= 0 || rounds[roundIdx - 1].level !== round.level;

  // prompt card: arrives early, stays through the timer and the sealed slide, gives way to the lock at the beat
  const promptIn = Math.min(1, springAt(t, STAGGER.arrival, 'soft'));
  // The prompt eases away STAGGER.base ticks BEFORE the bubble starts to grow (slide start comes from
  // timing.ts: phases.sealed.from, or the `slideAt` override). If a scene slides the bubble during the
  // timer (Round 45), the prompt stays until the beat, as before.
  const slideTick = slideAt ?? sealed.from;
  const promptAwayAt = slideTick >= timer.to ? slideTick - STAGGER.base : beat.from - 2;
  const promptAway = easeOut((t - promptAwayAt) / PROMPT_EXIT_TICKS);
  const promptOut = 1 - promptAway;
  const fit = promptFontSize(round.prompt);

  // rule chips: fade away when the answer takes the stage
  const chipsOpacity = fadeOut(t, sealed.from, 8);
  // countdown: only while the timer runs (+ a 4-tick exit)
  const showCountdown = t >= timer.from && t < timer.to + 4;
  const countdownOpacity = fadeOut(t, timer.to, 4);

  const counterIn = Math.min(1, springAt(t, STAGGER.arrival * 2, 'soft'));

  // prompt card: the same glass recipe as the pills (bright inner top rim, soft shadow, faint level tint,
  // thin hairline border). No ring, no coloured outline.
  const promptCardStyle: React.CSSProperties = glassSurface(PROMPT.radius * (1920 / REF_W), { level: round.level });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* wallpaper: shared with the bonus screens; phase from the video clock so the drift carries across rounds */}
      <AuroraWallpaper level={round.level} clock={base + t} />
      {/* soft accent glow centred behind the prompt card: static, no hard edge, frame corners stay dark */}
      <div
        style={{
          position: 'absolute',
          left: px(REF_W / 2 - PROMPT_GLOW.w / 2),
          top: px(PROMPT.top + PROMPT.height / 2 - PROMPT_GLOW.h / 2),
          width: px(PROMPT_GLOW.w),
          height: px(PROMPT_GLOW.h),
          background: `radial-gradient(ellipse closest-side at 50% 50%, ${style.accent}${PROMPT_GLOW.alphaHex} 0%, ${style.accent}${PROMPT_GLOW.midHex} 45%, transparent 100%)`,
          opacity: promptIn * promptOut,
          pointerEvents: 'none',
        }}
      />
      {chips && chipsOpacity > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: chipsOpacity }}>
          <ExclusionChips round={round} at={STAGGER.arrival * 2} />
        </div>
      ) : null}

      <ListeningGlow
        round={round.n}
        accent={style.accent}
        wakeAt={timer.from}
        dimAt={timer.to}
        offAt={sealed.to}
      />

      {/* the prompt, as text (it is also spoken). One thin accent edge + a soft, low accent glow: the
          listening state itself is shown only by the waveform above, not by this card. */}
      <div
        style={{
          position: 'absolute',
          left: px(PROMPT.left),
          top: px(PROMPT.top),
          width: px(PROMPT.width),
          height: px(PROMPT.height),
          ...promptCardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: promptIn * promptOut,
          transform: `translateY(${(1 - promptIn) * px(14) - promptAway * px(12)}px)`,
        }}
      >
        <span
          style={{
            fontFamily: fontHeadline,
            fontWeight: 700,
            fontSize: px(fit),
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: colours.ink,
            textAlign: 'center',
            padding: `0 ${px(32)}px`,
          }}
        >
          {round.prompt}
        </span>
      </div>

      {/* red edge pulse stays under the bubble, as before; the pill itself is in the HUD layer below */}
      {showCountdown ? (
        <div style={{ position: 'absolute', inset: 0, opacity: countdownOpacity }}>
          <EdgeBeat level={round.level} at={timer.from} />
        </div>
      ) : null}

      {/* owns the InkBubble: small from tick 0, enlarges at the sealed phase, then beat, dissolve, answer, result */}
      <RevealEngine
        round={round}
        start={beat.from}
        outcome={outcome}
        accent={style.accent}
        centre={BUBBLE_CENTRE}
        slideAt={slideTick}
        backdropBlur={BACKDROP_BLUR}
      />

      {/* HUD layer: drawn AFTER (above) the RevealEngine, whose backdrop blur softens only what is drawn before it.
          Hearts pill, round counter and countdown pill stay sharp. (The watermark is mounted above everything in Full.tsx.) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        {showCountdown ? (
          <div style={{ position: 'absolute', inset: 0, opacity: countdownOpacity }}>
            <CountdownNumber level={round.level} at={timer.from} edge={false} />
          </div>
        ) : null}

        {/* static except on the level's first round, where it springs in once */}
        <HeartsPill compact level={round.level} left={HUD_LEFT} top={layout.hudHearts.top} at={isLevelFirst ? STAGGER.arrival : undefined} />

        {/* round counter, directly under the hearts pill; one line */}
        <div
          style={{
            position: 'absolute',
            left: px(HUD_LEFT),
            top: px(layout.hudCounter.top),
            height: px(ROW_H),
            ...glassSurface(PILL_RADIUS_1920, { level: round.level }),
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${px(18)}px`,
            opacity: counterIn,
            transform: `translateY(${(1 - counterIn) * px(-12)}px)`,
            transformOrigin: 'left top',
          }}
        >
          <span
            style={{
              fontFamily: fontHeadline,
              fontWeight: 800,
              fontSize: px(26),
              letterSpacing: '0.06em',
              color: colours.ink,
              opacity: 0.9,
              whiteSpace: 'nowrap',
              ...tabular,
            }}
          >
            {round.n} OF {rounds.length}
          </span>
        </div>
      </div>
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
