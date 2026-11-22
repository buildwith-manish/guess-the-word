/**
 * QuestionShell: the layout every look sits inside.
 *
 * Layers, back to front: level background, the look (inside Shake, which is idle unless `shakeLook`), ScoreHud, TimerRing slot, SpoilerBadge,
 * DidYouKnowCard slot, NotificationBanner slot, EdgeGlow.
 *
 * Phases are read from the item's own segment in timing.ts (`segments`), shifted to local ticks (0 = start of
 * the item). Nothing about timing is written here: the last-3-seconds window is `URGENT_SECONDS` (timerMath)
 * counted back from the end of the timer phase.
 *
 * `start` is the absolute design tick at which the item begins (its segment `from`, or any offset the caller
 * wants). `localFrame` = `useGta6Frame() - start`.
 *
 * Voice (ids from audioMap.ts, lengths from timing.ts, played only when the clips have been measured):
 *   question clip   at the start of the read phase (when the look starts bringing the options in); the timer ring
 *                   starts at `phases.timer.from`, after the question phase
 *   reveal clip     when the hold ends (`revealClipTick`), while the elimination plays; the correct option expands at
 *                   the later of the elimination end and 0.6 s after the clip starts (`expandStartTick`)
 *   did-you-know    clip starts `dykLeadSec` after the reveal clip ends, the card with it; the card is meant to stay until
 *                   the clip ends + 0.2 s (no 3 s limit) but the dyk phase ends with the clip, so the item cuts it there
 *   banner          unchanged: bonus banner at the start of the item, `bannerSec`
 *
 * Text: question, options, did-you-know and the bonus banner title come from `item`. The spoiler text has no
 * field in data.ts, so it is passed as `labels.spoiler` and the badge is not drawn without it.
 */
import React, { useContext } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { audioOf } from '../audioMap';
import { byLevel, items } from '../data';
import type { Item, Level } from '../data';
import { FRAME, SAFE, levelBackground, u } from '../system';
import { FPS, RENDER_FPS, clipPath, dykLeadSec, clipSec, isFullReveal, secToTicks, segments, ticksToFrames, useGta6Frame } from '../timing';
import type { ItemPhases, Range } from '../timing';
import { DidYouKnowCard } from './DidYouKnowCard';
import { EdgeGlow } from './EdgeGlow';
import { NotificationBanner } from './NotificationBanner';
import { ScoreHud } from './ScoreHud';
import { Gta6WatermarkCorner } from './Watermark';
import { HUD_TEXT, hudCounts } from './hudCounts';
import { Shake } from './Shake';
import { TimerRing } from './TimerRing';
import { URGENT_SECONDS } from './timerMath';
import { SpoilerBadge } from './badges';
import { revealClipTick } from './RevealEngine';
import { ShellVoiceContext } from '../voiceContext';
import type { RevealMode } from './RevealEngine';

export type ShellPhase = 'banner' | 'read' | 'timer' | 'hold' | 'reveal' | 'dyk';

/** Item phases in local ticks (0 = start of the item). Same shape as timing.ts `ItemPhases`. */
export type LocalPhases = ItemPhases;

/** Everything the look renderer receives. */
export type ShellContext = {
  item: Item;
  level: Level;
  phase: ShellPhase;
  /** Ticks since the item started (fractional, 30 fps). */
  localFrame: number;
  phases: LocalPhases;
  /** Pass to RevealEngine as `from` (the reveal engine starts at the hold phase). */
  revealFrom: number;
  /** Pass to RevealEngine as `mode`. */
  revealMode: RevealMode;
  /** Local tick at which the last-3-seconds effects begin. */
  urgentFrom: number;
};

export type ShellLabels = {
  /** Text of the spoiler badge. Not drawn when omitted. */
  spoiler?: string;
  /** Blurred title in the bonus banner. Default: item.n. */
  banner?: string;
  /** Words of the QUIZ MATRIX watermark, drawn in the top-right corner when given. */
  watermark?: { quiz: string; matrix: string };
};

/** Slot positions, reference units (1920x1080). */
export const SLOTS = {
  timerRing: { left: SAFE.x, top: SAFE.top, size: 200 },
  spoiler: { left: SAFE.x, bottom: SAFE.bottom },
  /** Width of the island (pill) timer on hard items, reference units (the pill is 0.3 of this high). */
  islandW: 260,
  /** Score counter in the top-left corner: distance from the left edge and size (1 = full). */
  hud: { left: 56, scale: 0.8 },
  /**
   * Timer ring beside the options, per look (centre of the ring; the ring shows until the reveal). Each look keeps its
   * options in a different place, so each gets its own free spot:
   *   messages       right of the answer column (chips 1000 wide from SAFE.x, bottom-aligned)
   *   maps           in the middle of the free band left of the 2x2 tile grid (grid is 824 wide, flush right, bottom-aligned)
   *   photos         right of the centred 2x2 photo grid
   *   controlCenter  no ring: the brightness slider is the timer (QuestionScene passes showTimer={false})
   */
  timerBeside: {
    messages: { left: 1340, centerY: FRAME.h - SAFE.bottom - (4 * 112 + 3 * 16) / 2, size: 240 },
    // centred (a little left) in the free band between the left safe edge and the tile grid: x 96 to 1000, so the ring
    // is ~360 clear of the tiles, below the question card and the score counter, and the sea-side of the map
    maps: { left: Math.round((SAFE.x + (FRAME.w - SAFE.x - 824)) / 2 - 28 - 120), centerY: FRAME.h - SAFE.bottom - 252, size: 240 },
    photos: { left: 1490, centerY: 612, size: 240 },
  },
  /** Left edge for a question card that sits in the top row, right of the score counter in the top-left corner. */
  questionLeft: 56 + 334 * 0.8 + 26,
  dyk: { left: FRAME.w - SAFE.x - 640, top: FRAME.h / 2 - 120, width: 640 },
  /**
   * Did-you-know card where the default `dyk` slot would cover the options (messages and safari keep `dyk`):
   *   maps           left of the tile grid, under the route pin
   *   photos         right of the centred photo grid (narrow: the gap is ~400 wide)
   *   controlCenter  top-right band beside the question card (the right column below holds the score badge and slider)
   */
  dykByLook: {
    maps: { left: 150, top: 640, width: 640 },
    photos: { left: 1440, top: 470, width: 384 },
    controlCenter: { left: 1380, top: 190, width: 444 },
  },
} as const;

/** ScoreHud props for the top-left corner (spread into every ScoreHud so all scenes agree). */
export const HUD_CORNER = { side: 'left', inset: SLOTS.hud.left, scale: SLOTS.hud.scale } as const;

export type QuestionShellProps = {
  item: Item;
  /** Absolute design tick at which the item starts. */
  start: number;
  /** Look renderer: gets the phase and local frame. */
  children: (ctx: ShellContext) => React.ReactNode;
  labels?: ShellLabels;
  /** Pass false to leave out the timer, e.g. for a look that draws its own. */
  showTimer?: boolean;
  /** Pass false to leave out the score counter, e.g. when a scene (the hook) draws its own. Default true. */
  hud?: boolean;
  /** Shake the whole look in the last 3 s. Off by default: a still question reads cleaner; urgency comes from the timer ring and the edge glow. */
  shakeLook?: boolean;
};

const shift = (r: Range, by: number): Range => ({ from: r.from - by, to: r.to - by });

/** Phases of `item` in local ticks, from its segment in timing.ts. Throws if the item is not in the timeline. */
export const localPhases = (item: Item): LocalPhases => {
  const seg = segments.find((s) => s.kind === 'item' && s.item.order === item.order);
  if (!seg || seg.kind !== 'item') throw new Error(`QuestionShell: item ${item.n} (order ${item.order}) is not in the timeline`);
  const p = seg.phases;
  return {
    banner: p.banner && shift(p.banner, seg.from),
    read: shift(p.read, seg.from),
    timer: shift(p.timer, seg.from),
    hold: shift(p.hold, seg.from),
    reveal: shift(p.reveal, seg.from),
    dyk: p.dyk && shift(p.dyk, seg.from),
  };
};

/** The phase on screen at local tick `f`. Before the item: first phase. After the reveal: `dyk`. */
export const phaseAt = (f: number, p: LocalPhases): ShellPhase => {
  if (p.banner && f < p.banner.to) return 'banner';
  if (f < p.read.to) return 'read';
  if (f < p.timer.to) return 'timer';
  if (f < p.hold.to) return 'hold';
  if (f < p.reveal.to || !p.dyk) return 'reveal';
  return 'dyk';
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The did-you-know card stays this long after its clip ends. */
const DYK_TAIL_SEC = 0.2;

/** One voice clip starting at local tick `at` (the item starts at absolute tick `start`). Nothing without a measured clip. */
const Voice: React.FC<{ id: string; at: number; start: number }> = ({ id, at, start }) => {
  const own = useContext(ShellVoiceContext); // false inside GTA6-Full: Gta6Audio places every clip
  const sec = clipSec(id);
  if (!own || sec === undefined) return null;
  return (
    <Sequence from={ticksToFrames(start + at)} durationInFrames={Math.ceil(sec * RENDER_FPS) + 2} layout="none">
      <Audio src={staticFile(clipPath(id))} />
    </Sequence>
  );
};

export const QuestionShell: React.FC<QuestionShellProps> = ({ item, start, children, labels, showTimer = true, hud = true, shakeLook = false }) => {
  const localFrame = useGta6Frame() - start;
  const phases = localPhases(item);
  const level = item.level;
  const phase = phaseAt(localFrame, phases);
  const urgentFrom = Math.max(phases.timer.from, phases.timer.to - URGENT_SECONDS * FPS);
  const urgentLen = phases.timer.to - urgentFrom;

  const ctx: ShellContext = {
    item,
    level,
    phase,
    localFrame,
    phases,
    revealFrom: phases.hold.from,
    revealMode: isFullReveal(item) ? 'full' : 'fast',
    urgentFrom,
  };

  // Edge glow builds from urgentFrom and fades out over the first ticks of the hold/reveal.
  const glowOpacity = 1 - clamp01((localFrame - phases.timer.to) / 8);
  const island = level === 'hard';
  const dykSlot = SLOTS.dykByLook[item.look as keyof typeof SLOTS.dykByLook] ?? SLOTS.dyk;
  const beside = SLOTS.timerBeside[item.look as keyof typeof SLOTS.timerBeside] ?? SLOTS.timerBeside.messages;

  const au = audioOf(item);
  const revealMode = ctx.revealMode;
  const dykSecLen = clipSec(au.dykId);
  // card length: the clip plus its tail (the spring-out runs inside the tail); without a measured clip, the dyk phase
  // clip and card start together, dykLeadSec after the dyk phase starts (without a measured clip: at the phase start)
  const dykAt = phases.dyk ? phases.dyk.from + (dykSecLen !== undefined ? secToTicks(dykLeadSec) : 0) : 0;
  const dykTicks = phases.dyk ? (dykSecLen !== undefined ? secToTicks(dykSecLen + DYK_TAIL_SEC) : phases.dyk.to - phases.dyk.from) : 0;

  return (
    <AbsoluteFill style={{ background: levelBackground[level], overflow: 'hidden' }}>
      <Shake frame={localFrame} at={urgentFrom} dur={shakeLook ? urgentLen : 0} seed={item.order} style={{ position: 'absolute', inset: 0 }}>
        {children(ctx)}
      </Shake>

      {hud ? (
        <ScoreHud
          {...HUD_CORNER}
          {...hudCounts(item)}
          frame={localFrame}
          at={0}
        />
      ) : null}

      {hud && item.kind === 'bonus' ? (
        <div style={{ position: 'absolute', left: u(HUD_CORNER.inset), top: u(SAFE.top + 132 * HUD_CORNER.scale + 14) }}>
          <SpoilerBadge text={HUD_TEXT.bonus} frame={localFrame} at={phases.banner ? phases.banner.from : phases.read.from} />
        </div>
      ) : null}

      {showTimer && localFrame < phases.reveal.from ? (
        <div
          style={{
            position: 'absolute',
            ...(island
              ? { top: u(SLOTS.timerRing.top), left: 0, right: 0, display: 'flex', justifyContent: 'center' }
              : { top: u(beside.centerY - beside.size / 2), left: u(beside.left) }),
          }}
        >
          <TimerRing
            frame={localFrame}
            at={phases.timer.from}
            dur={phases.timer.to - phases.timer.from}
            variant={island ? 'island' : 'ring'}
            level={level}
            size={island ? SLOTS.islandW : beside.size}
          />
        </div>
      ) : null}

      {labels?.watermark ? (
        <Gta6WatermarkCorner globalFrame={localFrame} since={-300} quiz={labels.watermark.quiz} matrix={labels.watermark.matrix} />
      ) : null}

      {labels?.spoiler ? (
        <div style={{ position: 'absolute', left: u(SLOTS.spoiler.left), bottom: u(SLOTS.spoiler.bottom) }}>
          <SpoilerBadge text={labels.spoiler} frame={localFrame} at={phases.read.from} outAt={phases.reveal.from} />
        </div>
      ) : null}

      {phases.dyk && item.didYouKnow ? (
        <DidYouKnowCard
          text={item.didYouKnow}
          frame={localFrame}
          at={dykAt}
          dur={dykTicks}
          outTicks={dykSecLen !== undefined ? secToTicks(DYK_TAIL_SEC) : undefined}
          level={level}
          left={dykSlot.left}
          top={dykSlot.top}
          width={dykSlot.width}
        />
      ) : null}

      {phases.banner && localFrame < phases.banner.to ? (
        <NotificationBanner
          title={labels?.banner ?? item.n}
          frame={localFrame}
          at={phases.banner.from}
          dur={phases.banner.to - phases.banner.from}
          level={level}
        />
      ) : null}

      <Voice id={au.questionId} at={phases.read.from} start={start} />
      <Voice id={au.revealId} at={revealClipTick(phases.hold.from)} start={start} />
      {phases.dyk && au.dykId ? <Voice id={au.dykId} at={dykAt} start={start} /> : null}

      {glowOpacity > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: glowOpacity, pointerEvents: 'none' }}>
          <EdgeGlow frame={localFrame} at={urgentFrom} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
