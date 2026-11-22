/**
 * BonusMissing (task 4b): bonus kind "missing". The full US map appears, one state fades out, four option
 * chips and the clock run, then the state flies back in and its name is revealed letter by letter.
 * Adapted from src/BonusRound.tsx (pre-roll banner -> board -> clock -> reveal -> erase chip); nothing from
 * its word / icon boards is used.
 *
 * THIS FILE ALSO HOLDS THE PARTS BonusBorders (and the later capital / nickname scenes) SHARE:
 * `bonusTimes`, `bonusCommonCues`, `BonusBanner`, `BonusBadge`, `BonusPrompt`, `BonusMap` (the full map with
 * per-state marks), `BonusOptions`, `BonusTimer`, `BonusEraseChip`, `BonusStage`.
 *
 * Timeline (ticks from the start of the bonus segment; preRoll / build / clock / answer hold come from
 * state-timing BONUS_PHASE + the puzzle's clock):
 *   0 .. preRoll                 banner "BONUS n / N, BONUS ROUND, <kind label>"
 *   preRoll+2                    map slides in; chips appear one by one from preRoll+10
 *   preRoll+14 .. +12            the missing state fades out
 *   clockStart .. clockEnd       clock runs (tick each second, thump in the last three, drumroll)
 *   revealAt = clockEnd          the state flies back in (22 ticks), glows, the correct chip lights, the name
 *                                spells out, the erase chip follows (answerChipDelayFrames)
 *   duration - 12                exit
 *
 * iOS look (all four bonus kinds share these parts): calm backdrop with ONE accent (the iOS orange), Inter, frosted
 * chips on the shared spring, a thin clock bar whose number is grey and turns red only in the last 3 seconds; no
 * glow halos, slam-ins, backdrop pulse or gradient fills. Beats and cues are unchanged.
 *
 * Time: `frame` = design ticks (30 per second) since the segment started. `duration` is the segment length
 * (a voiceover clip can stretch it); default bonusBaseFrames(slot).
 * Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Rich } from '../../../Icon';
import { S, px } from '../../../style';
import { IOS, IosBackground } from '../../../ios';
import { prog, mix, clamp01, cssEaseOut } from '../../../anim';
import { DUR, SETTLE, enter, exitTicks, iosOut, leave, settle, settleTicks, spr, sprFit } from '../../motion';
import { rise } from '../../ios-rise';
import {RADIUS, glassPanel, COLOR, FONT, WEIGHT, TYPE, TRACKING, TIMER } from '../../look';
import { fitTextSize } from '../../capital-fit';
import { domMeasure, fallbackMeasure, useFontsReady } from '../../measure-dom';
import rootSettings from '../../../../settings.json';
import {
  bonusClockStart,
  BONUS_PHASE,
  BONUS_PUZZLES,
  BONUS_THEME,
  FPS,
  WIDTH,
  bonusBaseFrames,
  bonusClockFrames,
} from '../../state-timing';
import { STATES } from '../../states-data';
import { MINI_BOX, getShape } from '../../geo';
import { levelAccent, miniMapHeight } from '../../components/MiniMap';
import type { BonusPuzzle } from '../../bonus-engine';
import type { BonusKind } from '../../types';
import { StateHudPill } from '../StateIris';
import type { StateCue, StateSfx } from '../stateRoundCues';

// ------------------------------------------------------------------ shared: timing and cues
export type BonusTimes = {
  /** banner length */
  pre: number;
  clockStart: number;
  clockFrames: number;
  clockEnd: number;
  /** tick the answer is revealed (= clockEnd) */
  revealAt: number;
  /** segment length */
  dur: number;
};

export const bonusTimes = (puzzle: BonusPuzzle, duration?: number): BonusTimes => {
  const clockFrames = bonusClockFrames(puzzle.slot);
  const clockStart = bonusClockStart(puzzle.slot);
  const clockEnd = clockStart + clockFrames;
  return {
    pre: BONUS_PHASE.preRoll,
    clockStart,
    clockFrames,
    clockEnd,
    revealAt: clockEnd,
    dur: duration ?? bonusBaseFrames(puzzle.slot),
  };
};

/** Cues every bonus scene has (the word quiz's bonus cues): siren + whoosh, pop, clock ticks, drumroll, stamp, erase chime. */
export const bonusCommonCues = (puzzle: BonusPuzzle): StateCue[] => {
  const T = bonusTimes(puzzle);
  const cues: StateCue[] = [];
  const add = (frame: number, sfx: StateSfx, extra: Partial<StateCue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  add(0, 'siren');
  add(0, 'whoosh');
  add(T.pre + 2, 'pop');
  for (let k = 1; k < puzzle.seconds; k++) {
    const left = puzzle.seconds - k;
    add(T.clockStart + k * FPS, left <= 3 ? 'thump' : 'tick');
  }
  if (puzzle.seconds > 3) add(T.clockEnd - 2 * FPS, 'drumroll');
  add(T.clockEnd, 'stamp');
  add(T.clockEnd + rootSettings.bonus.answerChipDelayFrames, 'chime-erase');
  return cues;
};

export const sortCues = (cues: StateCue[]): StateCue[] => cues.slice().sort((a, b) => a.frame - b.frame);

/** Copy for the banner (not data). */
export const BONUS_KIND_LABEL: Record<BonusKind, string> = {
  missing: 'FIND THE MISSING STATE',
  borders: 'NAME THE NEIGHBOUR',
  capital: 'MATCH THE CAPITAL',
  nickname: 'MATCH THE NICKNAME',
};

// ------------------------------------------------------------------ shared: layout
/** Layout in 1280x720 reference px (px() scales it); the map width is a fraction of the frame width. */
export const BONUS_LAYOUT = {
  badgeTop: 22,
  promptTop: 70,
  mapTop: 132,
  mapW: 0.46,
  optionsTop: 512,
  chipW: 256,
  chipH: 52,
  chipGap: 14,
};

/** Map box on the frame: centred, `mapW` of the width. */
export const bonusMapRect = () => {
  const w = WIDTH * BONUS_LAYOUT.mapW;
  return { x: (WIDTH - w) / 2, y: px(BONUS_LAYOUT.mapTop), w, h: miniMapHeight(w) };
};

// ------------------------------------------------------------------ shared: parts
/** The one accent of the bonus screens. */
export const BONUS_ACCENT = COLOR.bonus;

/** The slate: calm backdrop, HUD pill, exit fade, and the children. */
export const BonusStage: React.FC<{ frame: number; puzzle: BonusPuzzle; T: BonusTimes; children: React.ReactNode }> = ({
  frame,
  puzzle,
  T,
  children,
}) => {
  // exit: about 70% of an entrance, iosOut, ends with the segment
  const exitLen = exitTicks(DUR.uiLong);
  const exitP = iosOut((frame - (T.dur - exitLen)) / exitLen);
  return (
    <AbsoluteFill style={{ fontFamily: FONT.sans }}>
      <IosBackground accent={BONUS_ACCENT} />
      <AbsoluteFill style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.02 * exitP})` }}>{children}</AbsoluteFill>
      <StateHudPill hud={{ label: 'BONUS', number: puzzle.slot + 1, total: BONUS_PUZZLES.length, erases: 0 }} />
    </AbsoluteFill>
  );
};

/** Pre-roll banner: "BONUS n / N, BONUS ROUND, <kind label>". */
export const BonusBanner: React.FC<{ frame: number; puzzle: BonusPuzzle; pre: number }> = ({ frame, puzzle, pre }) => {
  if (frame >= pre) return null;
  const out = iosOut((frame - (pre - 8)) / exitTicks(DUR.hero - 4));
  const e1 = rise(frame, 0, 14, 16);
  const e2 = rise(frame, 4, 32, 24, 'slow'); // hero: fully settled by tick 34, the banner leaves from tick 36
  const e3 = rise(frame, 4 + 2, 14, 16); // follows the title by 2 ticks
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT.sans,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: 1 - out,
        transform: `scale(${1 - 0.02 * out})`,
      }}
    >
      <IosBackground accent={BONUS_ACCENT} />
      <div style={{ ...e1, position: 'relative', fontWeight: WEIGHT.strong, fontSize: px(TYPE.sm), letterSpacing: TRACKING.label, color: COLOR.text.label }}>
        BONUS {puzzle.slot + 1} / {BONUS_PUZZLES.length}
      </div>
      <div
        style={{
          ...e2,
          position: 'relative',
          fontWeight: WEIGHT.strong,
          fontSize: px(TYPE.xxl),
          lineHeight: 0.98,
          letterSpacing: px(-3),
          color: COLOR.text.primary,
          margin: `${px(12)}px 0 ${px(16)}px`,
        }}
      >
        BONUS
        <br />
        <span style={{ color: BONUS_ACCENT }}>ROUND</span>
      </div>
      <div style={{ ...e3, position: 'relative', fontWeight: WEIGHT.medium, fontSize: px(TYPE.md), color: COLOR.text.label }}>{BONUS_KIND_LABEL[puzzle.kind]}</div>
    </AbsoluteFill>
  );
};

/** The "BONUS n / N" badge, top centre, once the banner is gone. */
export const BonusBadge: React.FC<{ frame: number; puzzle: BonusPuzzle; at: number }> = ({ frame, puzzle, at }) => {
  if (frame < at) return null;
  const r = rise(frame, at, 16, 16);
  return (
    <div
      style={{
        ...glassPanel(px(RADIUS.pill), BONUS_ACCENT, 0.4),
        position: 'absolute',
        left: '50%',
        top: px(BONUS_LAYOUT.badgeTop),
        transform: `translate(-50%, ${(1 - r.t) * -px(16)}px)`,
        opacity: r.opacity,
        padding: `${px(6)}px ${px(26)}px`,
        fontFamily: FONT.sans,
        fontWeight: WEIGHT.strong,
        fontSize: px(TYPE.sm),
        color: BONUS_ACCENT,
        whiteSpace: 'nowrap',
      }}
    >
      BONUS {puzzle.slot + 1} / {BONUS_PUZZLES.length}
    </div>
  );
};

/** The question line under the badge. `hideAt` fades it out (the reveal replaces it). */
export const BonusPrompt: React.FC<{ frame: number; text: string; at: number; hideAt?: number }> = ({ frame, text, at, hideAt }) => {
  if (frame < at) return null;
  const r = rise(frame, at, 14, 16);
  const hide = hideAt === undefined ? 0 : iosOut((frame - hideAt) / 8);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: px(BONUS_LAYOUT.promptTop),
        display: 'flex',
        justifyContent: 'center',
        opacity: r.opacity * (1 - hide),
        transform: r.transform,
      }}
    >
      <div
        style={{
          ...glassPanel(px(RADIUS.chip), undefined, 0.5),
          padding: `${px(10)}px ${px(30)}px`,
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.strong,
          fontSize: px(TYPE.sm),
          color: COLOR.text.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** How one state is drawn on the bonus map; anything not marked is a dim filled outline. */
export type MapMark = {
  opacity?: number;
  fill?: string;
  fillOpacity?: number;
  edge?: string;
  edgeOpacity?: number;
  /** 0..1 strength of the marked outline (a thicker hairline, no halo) */
  glow?: number;
  glowColor?: string;
};

const MAP_LOOK = {
  edge: 0.9,
  baseFill: 0.08,
  baseEdge: 0.4,
  /** extra stroke width of a marked state at full strength (map units) */
  markEdge: 1.4,
};

/** All 50 states from the `mini` paths (975x610 map units). `children` are drawn on top, in map units. */
export const BonusMap: React.FC<{ size: number; marks?: Record<string, MapMark>; children?: React.ReactNode }> = ({ size, marks = {}, children }) => {
  const paths = React.useMemo(() => STATES.map((s) => ({ key: s.key, d: getShape(s.key).mini })), []);
  const [W, H] = MINI_BOX;
  return (
    <svg width={size} height={miniMapHeight(size)} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {paths.map((p) => {
        const m = marks[p.key];
        return (
          <path
            key={p.key}
            d={p.d}
            opacity={m?.opacity ?? 1}
            fill={m?.fill ?? COLOR.text.primary}
            fillOpacity={m?.fillOpacity ?? MAP_LOOK.baseFill}
            stroke={m?.edge ?? COLOR.text.primary}
            strokeOpacity={m?.edgeOpacity ?? MAP_LOOK.baseEdge}
            strokeWidth={MAP_LOOK.edge + (m?.glow ? MAP_LOOK.markEdge * m.glow : 0)}
            strokeLinejoin="round"
          />
        );
      })}
      {children}
    </svg>
  );
};

/** Four option chips (A-D) under the map. After `revealAt` the correct one is marked and the rest dim. */
export const BonusOptions: React.FC<{
  frame: number;
  options: string[];
  correctIndex: number;
  at: number;
  revealAt: number;
}> = ({ frame, options, correctIndex, at, revealAt }) => {
  const L = BONUS_LAYOUT;
  const revealed = frame >= revealAt;
  const ready = useFontsReady('bonus chips fonts');
  // room for the text inside a chip: width minus padding, the A-D disc and the gaps
  const textW = px(L.chipW) - 2 * px(14) - px(30) - px(12);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: px(L.optionsTop),
        display: 'flex',
        justifyContent: 'center',
        gap: px(L.chipGap),
      }}
    >
      {options.map((text, i) => {
        if (frame < at + i * 3) return <div key={i} style={{ width: px(L.chipW), height: px(L.chipH) }} />;
        const r = rise(frame, at + i * 3, 14, 20);
        const win = revealed && i === correctIndex;
        const dim = revealed && i !== correctIndex;
        // long answers (nicknames, capitals) shrink to fit, down to 72% of the normal size, instead of being cut off
        const fontSize = fitTextSize(text, textW, px(19), px(19) * 0.72, { fontFamily: FONT.sans, fontWeight: WEIGHT.strong }, ready ? domMeasure : fallbackMeasure).size;
        return (
          <div
            key={i}
            style={{
              ...glassPanel(px(RADIUS.chip), undefined, 0.3),
              width: px(L.chipW),
              height: px(L.chipH),
              display: 'flex',
              alignItems: 'center',
              gap: px(12),
              padding: `0 ${px(14)}px`,
              fontFamily: FONT.sans,
              fontWeight: WEIGHT.strong,
              fontSize,
              color: COLOR.text.primary,
              whiteSpace: 'nowrap',
              opacity: r.opacity * (dim ? 0.6 : 1),
              transform: r.transform,
              ...(win ? { background: `color-mix(in srgb, ${BONUS_ACCENT} 24%, transparent)`, borderColor: BONUS_ACCENT } : {}),
            }}
          >
            <span
              style={{
                width: px(30),
                height: px(30),
                borderRadius: '50%',
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: WEIGHT.strong,
                fontSize: px(17),
                background: win ? BONUS_ACCENT : COLOR.fillStrong,
                color: win ? COLOR.onAccent : COLOR.text.label,
              }}
            >
              {'ABCD'[i]}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Thin clock bar with a glass disc at its head, from `clockStart - 8` to the reveal. Same rules as the question TimerRing
 * (look.ts TIMER): the digit is the hero (primary white, bold, tabular, iOS change: old digit rises and blurs out, new one
 * springs in), a gradient along the bar from the accent mixed with white to the full accent at the head, the last 3 seconds
 * cross-fade to the softer alert tone, and the disc settles up by at most 1.025 on each of those seconds. Accent is the
 * bonus orange. No timing is changed: the bar still appears at clockStart - 8 and leaves over exitTicks(DUR.uiLong).
 */
export const BonusTimer: React.FC<{ frame: number; T: BonusTimes }> = ({ frame, T }) => {
  if (!(frame >= T.clockStart - 8 && frame < T.clockEnd + 6)) return null;
  const clockP = Math.min(1, Math.max(0, (frame - T.clockStart) / T.clockFrames));
  const secondsLeft = Math.max(1, Math.ceil((T.clockFrames - (frame - T.clockStart)) / FPS));
  const total = Math.max(1, Math.round(T.clockFrames / FPS));
  const hot = secondsLeft <= 3;

  const alertT = prog(frame, T.clockStart + T.clockFrames - 3 * FPS, TIMER.alertFade, cssEaseOut);
  const tone = alertT > 0 ? `color-mix(in srgb, ${COLOR.alertSoft} ${alertT * 100}%, ${BONUS_ACCENT})` : BONUS_ACCENT;
  const tint = `color-mix(in srgb, ${tone} ${100 - TIMER.arcTint}%, white)`;

  const DISC = 84; // ref px: bigger than the old 62 so the hero digit has room
  const disc = px(DISC);
  const digitPx = px(TYPE.lg);
  // digit d is on screen while the remaining ticks are in ((d - 1) * FPS, d * FPS]
  const startOf = (d: number) => T.clockStart + T.clockFrames - d * FPS;
  const outTicks = exitTicks(settleTicks('quick'));
  const nowIn = secondsLeft >= total ? null : enter(frame, startOf(secondsLeft), 'quick', 12, 0.97);
  const prevLeave = secondsLeft >= total ? null : leave(frame, startOf(secondsLeft), outTicks, 12);
  const digitBox: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: FONT.sans,
    fontWeight: WEIGHT.strong,
    fontVariantNumeric: 'tabular-nums',
    fontSize: digitPx,
    lineHeight: 1,
  };
  const colorOf = (d: number) => (d <= 3 ? COLOR.alertSoft : COLOR.text.primary);
  const pulse = hot ? settle(frame, startOf(secondsLeft), TIMER.alertSettle, Math.min(TIMER.alertPeak, SETTLE.maxPeak)) : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: S.timerLeft,
        width: S.timerWidth,
        bottom: S.timerBottom,
        height: px(70),
        opacity: spr(frame, T.clockStart - 8, 'quick') * (1 - iosOut((frame - T.clockEnd) / exitTicks(DUR.uiLong))),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(32),
          height: px(6),
          borderRadius: px(6),
          background: COLOR.fill,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left',
            transform: `scaleX(${1 - clockP})`,
            background: `linear-gradient(90deg, ${tint}, ${tone})`,
          }}
        />
      </div>
      <div style={{ position: 'absolute', left: -disc / 2 + (1 - clockP) * S.timerWidth, top: px(35) - disc / 2, width: disc, height: disc }}>
        <div
          style={{
            ...glassPanel(px(RADIUS.pill), undefined, 0.3),
            position: 'relative',
            width: disc,
            height: disc,
            transform: pulse === 1 ? undefined : `scale(${pulse})`,
            borderColor: `color-mix(in srgb, ${COLOR.alertSoft} ${alertT * 100}%, ${COLOR.fillStrong})`,
          }}
        >
          {prevLeave && prevLeave.t < 1 && (
            <div
              style={{
                ...digitBox,
                color: colorOf(secondsLeft + 1),
                opacity: prevLeave.opacity,
                transform: prevLeave.transform,
                filter: `blur(${prevLeave.t * px(TIMER.digitBlur)}px)`,
              }}
            >
              {secondsLeft + 1}
            </div>
          )}
          <div style={{ ...digitBox, color: colorOf(secondsLeft), ...(nowIn ? { opacity: nowIn.opacity, transform: nowIn.transform } : null) }}>
            {secondsLeft}
          </div>
        </div>
      </div>
    </div>
  );
};

/** "NAIL IT -> ERASE 1 WRONG" chip (root settings text.eraseChip), `answerChipDelayFrames` after the reveal. */
export const BonusEraseChip: React.FC<{ frame: number; revealAt: number }> = ({ frame, revealAt }) => {
  const at = revealAt + rootSettings.bonus.answerChipDelayFrames;
  if (frame < at) return null;
  const r = rise(frame, at, 16, 24);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: px(68),
        left: '50%',
        marginLeft: -px(320),
        width: px(640),
        textAlign: 'center',
        padding: `${px(10)}px 0`,
        borderRadius: px(40),
        background: BONUS_ACCENT,
        color: COLOR.onAccent,
        fontFamily: FONT.sans,
        fontWeight: WEIGHT.strong,
        fontSize: px(TYPE.xs),
        opacity: r.opacity,
        transform: r.transform,
      }}
    >
      <Rich tone="dark">{rootSettings.text.eraseChip}</Rich>
    </div>
  );
};

/** The map block: slides in at `at`. */
export const BonusMapBlock: React.FC<{ frame: number; at: number; children: (size: number) => React.ReactNode }> = ({ frame, at, children }) => {
  if (frame < at) return null;
  const R = bonusMapRect();
  const r = rise(frame, at, 16, 24);
  return (
    <div style={{ position: 'absolute', left: R.x, top: R.y, width: R.w, height: R.h, opacity: r.opacity, transform: r.transform }}>
      {children(R.w)}
    </div>
  );
};

// ------------------------------------------------------------------ BonusMissing
/** Beats of the missing-state scene in ticks (from the start of the segment). */
export const missingTimes = (puzzle: BonusPuzzle, duration?: number) => {
  const T = bonusTimes(puzzle, duration);
  const flyDur = 22;
  return {
    ...T,
    mapIn: T.pre + 2,
    chipsAt: T.pre + 10,
    fadeAt: T.pre + 14,
    fadeDur: 12,
    flyAt: T.revealAt,
    flyDur,
    landAt: T.revealAt + flyDur,
    /** the name starts to spell out just before the state lands */
    nameAt: T.revealAt + flyDur - 4,
    letterStep: 1.4,
  };
};

/** Cues of the missing-state bonus, ticks from the start of the segment (absolute tick = seg.from + cue.frame). */
export const bonusMissingCues = (puzzle: BonusPuzzle): StateCue[] => {
  const M = missingTimes(puzzle);
  const cues = bonusCommonCues(puzzle);
  const add = (frame: number, sfx: StateSfx, extra: Partial<StateCue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  add(M.fadeAt, 'whoosh', { rate: 0.8, volume: 0.6 });
  add(M.flyAt + 2, 'whoosh');
  add(M.landAt, 'boom');
  Array.from(puzzle.options[puzzle.correctIndex]).forEach((_, k) => add(M.nameAt + k * M.letterStep, 'letter', { rate: (520 + k * 60) / 520 }));
  return sortCues(cues);
};

/** The removed state coming back: drops in from above, big and transparent, settles into place on the shared spring. */
const FlyBack: React.FC<{ stateKey: string; frame: number; at: number; dur: number }> = ({ stateKey, frame, at, dur }) => {
  if (frame < at) return null;
  const g = getShape(stateKey);
  const [cx, cy] = g.miniCentroid;
  const p = sprFit(frame, at, dur, 'normal'); // lands exactly at the end of its window
  const s = mix(2.6, 1, p);
  const dy = mix(-MINI_BOX[1] * 0.55, 0, p);
  return (
    <g transform={`translate(0 ${dy}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={clamp01(p * 3)}>
      <path d={g.mini} fill={BONUS_ACCENT} fillOpacity={0.85} stroke={COLOR.text.primary} strokeOpacity={0.9} strokeWidth={MAP_LOOK.edge * 1.6} strokeLinejoin="round" />
    </g>
  );
};

/** The name, letter by letter, where the prompt was. */
const NameReveal: React.FC<{ frame: number; name: string; at: number; step: number }> = ({ frame, name, at, step }) => {
  if (frame < at) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: px(BONUS_LAYOUT.promptTop - 10),
        display: 'flex',
        justifyContent: 'center',
        fontFamily: FONT.sans,
        fontWeight: WEIGHT.strong,
        fontSize: px(TYPE.lg),
        letterSpacing: TRACKING.label,
        color: COLOR.text.primary,
        whiteSpace: 'pre',
      }}
    >
      {Array.from(name.toUpperCase()).map((ch, k) => {
        const r = rise(frame, at + k * step, 8, 14);
        return (
          <span key={k} style={{ display: 'inline-block', opacity: r.opacity, transform: r.transform }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const BonusMissing: React.FC<{ frame: number; puzzle: BonusPuzzle; duration?: number }> = ({ frame, puzzle, duration }) => {
  const M = missingTimes(puzzle, duration);
  const name = puzzle.options[puzzle.correctIndex];
  // the missing state fades out before the clock and stays gone until it flies back (drawn by FlyBack)
  const marks: Record<string, MapMark> = {
    [puzzle.subject]: { opacity: 1 - prog(frame, M.fadeAt, M.fadeDur, iosOut) },
  };
  return (
    <BonusStage frame={frame} puzzle={puzzle} T={M}>
      <BonusBanner frame={frame} puzzle={puzzle} pre={M.pre} />
      <BonusBadge frame={frame} puzzle={puzzle} at={M.pre} />
      <BonusPrompt frame={frame} text={puzzle.prompt} at={M.pre + 2} hideAt={M.nameAt - 4} />
      <NameReveal frame={frame} name={name} at={M.nameAt} step={M.letterStep} />
      <BonusMapBlock frame={frame} at={M.mapIn}>
        {(size) => (
          <BonusMap size={size} marks={marks}>
            <FlyBack stateKey={puzzle.subject} frame={frame} at={M.flyAt} dur={M.flyDur} />
          </BonusMap>
        )}
      </BonusMapBlock>
      <BonusOptions frame={frame} options={puzzle.options} correctIndex={puzzle.correctIndex} at={M.chipsAt} revealAt={M.revealAt} />
      <BonusTimer frame={frame} T={M} />
      <BonusEraseChip frame={frame} revealAt={M.revealAt} />
    </BonusStage>
  );
};
