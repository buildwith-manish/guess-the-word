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
 * Time: `frame` = design ticks (30 per second) since the segment started. `duration` is the segment length
 * (a voiceover clip can stretch it); default bonusBaseFrames(slot).
 * Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../../../Background';
import { Rich } from '../../../Icon';
import { COLORS, FONTS, K, S, glass, px } from '../../../style';
import { prog, slamIn, revealIn, bounceEase, cssEaseOut, mix, clamp01 } from '../../../anim';
import { backOut, expoOut, linear } from '../../../gsap-helpers';
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
/** The slate: backdrop, HUD pill, exit fade, and the children. The last 3 seconds of the clock pulse the backdrop. */
export const BonusStage: React.FC<{ frame: number; puzzle: BonusPuzzle; T: BonusTimes; children: React.ReactNode }> = ({
  frame,
  puzzle,
  T,
  children,
}) => {
  const exitP = prog(frame, T.dur - 12, 12, linear);
  // red heartbeat pulse on the last 3 seconds, like the word quiz
  const beatPhase = (((frame - (T.clockEnd - 3 * FPS)) % 22) + 22) % 22;
  const pulse = frame > T.clockEnd - 3 * FPS && frame < T.clockEnd ? Math.max(0, 1 - beatPhase / 14) * 0.55 : 0;
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={BONUS_THEME} pulse={pulse} />
      <AbsoluteFill style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.04 * exitP})` }}>{children}</AbsoluteFill>
      <StateHudPill hud={{ label: 'BONUS', number: puzzle.slot + 1, total: BONUS_PUZZLES.length, erases: 0 }} />
    </AbsoluteFill>
  );
};

/** Pre-roll banner: "BONUS n / N, BONUS ROUND, <kind label>". */
export const BonusBanner: React.FC<{ frame: number; puzzle: BonusPuzzle; pre: number }> = ({ frame, puzzle, pre }) => {
  if (frame >= pre) return null;
  const out = prog(frame, pre - 8, 10, linear);
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255,122,24,0.69), rgba(42,16,0,0.95))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: 1 - out,
        transform: `scale(${1 - 0.05 * out})`,
      }}
    >
      <div style={{ ...slamIn(frame, 0, 14), fontFamily: FONTS.body, fontWeight: 800, fontSize: px(22), letterSpacing: px(10), color: 'rgba(255,255,255,0.87)' }}>
        BONUS {puzzle.slot + 1} / {BONUS_PUZZLES.length}
      </div>
      <div
        style={{
          ...slamIn(frame, 4, 15),
          fontFamily: FONTS.display,
          fontSize: px(170),
          lineHeight: 0.92,
          letterSpacing: px(6),
          color: COLORS.yellow,
          textShadow: `0 ${px(8)}px 0 rgba(0,0,0,0.47), 0 0 ${px(60)}px rgba(255,184,0,0.53)`,
          margin: `${px(12)}px 0 ${px(14)}px`,
        }}
      >
        BONUS
        <br />
        ROUND
      </div>
      <div style={{ ...revealIn(frame, 14, 14), fontFamily: FONTS.body, fontWeight: 800, fontSize: px(26), letterSpacing: px(8), color: '#fff' }}>
        {BONUS_KIND_LABEL[puzzle.kind]}
      </div>
    </AbsoluteFill>
  );
};

/** The yellow "BONUS n / N" badge, top centre, once the banner is gone. */
export const BonusBadge: React.FC<{ frame: number; puzzle: BonusPuzzle; at: number }> = ({ frame, puzzle, at }) => {
  if (frame < at) return null;
  const p = prog(frame, at, 16, backOut);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: px(BONUS_LAYOUT.badgeTop),
        transform: `translate3d(-50%, ${(1 - p) * -20 * K}px, 0) scale(${0.7 + 0.3 * p})`,
        opacity: clamp01(p),
        padding: `${px(6)}px ${px(26)}px`,
        borderRadius: px(40),
        background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow})`,
        color: COLORS.inkDark,
        fontFamily: FONTS.display,
        fontSize: px(26),
        letterSpacing: px(6),
        whiteSpace: 'nowrap',
        boxShadow: `0 0 ${px(30)}px rgba(255,214,10,0.55)`,
      }}
    >
      BONUS {puzzle.slot + 1} / {BONUS_PUZZLES.length}
    </div>
  );
};

/** The question line under the badge. `hideAt` fades it out (the reveal replaces it). */
export const BonusPrompt: React.FC<{ frame: number; text: string; at: number; hideAt?: number }> = ({ frame, text, at, hideAt }) => {
  if (frame < at) return null;
  const r = revealIn(frame, at, 14, 16);
  const hide = hideAt === undefined ? 0 : prog(frame, hideAt, 8, linear);
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
          ...glass(px(26), 0.1),
          padding: `${px(10)}px ${px(30)}px`,
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(28),
          letterSpacing: px(1),
          color: COLORS.ink,
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
  /** 0..1 strength of the stacked-stroke halo (no SVG filter) */
  glow?: number;
  glowColor?: string;
};

const MAP_LOOK = {
  edge: 0.9,
  baseFill: 0.1,
  baseEdge: 0.5,
  halo: [
    { k: 7, a: 0.1 },
    { k: 4, a: 0.18 },
    { k: 2, a: 0.3 },
  ],
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
            fill={m?.fill ?? COLORS.ink}
            fillOpacity={m?.fillOpacity ?? MAP_LOOK.baseFill}
            stroke={m?.edge ?? COLORS.ink}
            strokeOpacity={m?.edgeOpacity ?? MAP_LOOK.baseEdge}
            strokeWidth={MAP_LOOK.edge}
            strokeLinejoin="round"
          />
        );
      })}
      {paths.map((p) => {
        const m = marks[p.key];
        if (!m || !m.glow || m.glow <= 0) return null;
        return MAP_LOOK.halo.map((h, i) => (
          <path
            key={`g-${p.key}-${i}`}
            d={p.d}
            fill="none"
            stroke={m.glowColor ?? COLORS.yellow}
            strokeOpacity={h.a * m.glow * (m.opacity ?? 1)}
            strokeWidth={MAP_LOOK.edge * h.k}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ));
      })}
      {children}
    </svg>
  );
};

/** Four option chips (A-D) under the map. After `revealAt` the correct one lights up and the rest dim. */
export const BonusOptions: React.FC<{
  frame: number;
  options: string[];
  correctIndex: number;
  at: number;
  revealAt: number;
}> = ({ frame, options, correctIndex, at, revealAt }) => {
  const L = BONUS_LAYOUT;
  const revealed = frame >= revealAt;
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
        const p = prog(frame, at + i * 3, 14, backOut);
        if (frame < at + i * 3) return <div key={i} style={{ width: px(L.chipW), height: px(L.chipH) }} />;
        const win = revealed && i === correctIndex;
        const dim = revealed && i !== correctIndex;
        const pop = win ? 1 + 0.06 * prog(frame, revealAt, 10, backOut) : 1;
        return (
          <div
            key={i}
            style={{
              ...glass(px(26), 0.1),
              width: px(L.chipW),
              height: px(L.chipH),
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: px(12),
              padding: `0 ${px(14)}px`,
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(19),
              color: win ? COLORS.inkDark : COLORS.ink,
              whiteSpace: 'nowrap',
              opacity: clamp01(p) * (dim ? 0.35 : 1),
              transform: `translate3d(0, ${(1 - p) * 24 * K}px, 0) scale(${(0.8 + 0.2 * p) * pop})`,
              ...(win
                ? {
                    background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow})`,
                    border: `${px(2)}px solid #fff`,
                    boxShadow: `0 0 ${px(34)}px rgba(255,214,10,0.7)`,
                  }
                : {}),
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
                fontFamily: FONTS.display,
                fontSize: px(18),
                background: win ? COLORS.inkDark : 'rgba(255,255,255,0.16)',
                color: win ? COLORS.yellow : COLORS.ink,
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

/** Clock bar with the seconds disc (red in the last three seconds), from `clockStart - 8` to the reveal. */
export const BonusTimer: React.FC<{ frame: number; T: BonusTimes }> = ({ frame, T }) => {
  if (!(frame >= T.clockStart - 8 && frame < T.clockEnd + 6)) return null;
  const clockP = Math.min(1, Math.max(0, (frame - T.clockStart) / T.clockFrames));
  const secondsLeft = Math.max(1, Math.ceil((T.clockFrames - (frame - T.clockStart)) / FPS));
  const hot = secondsLeft <= 3;
  return (
    <div
      style={{
        position: 'absolute',
        left: S.timerLeft,
        width: S.timerWidth,
        bottom: S.timerBottom,
        height: px(70),
        opacity: prog(frame, T.clockStart - 8, 14, expoOut) * (1 - prog(frame, T.clockEnd, 8, linear)),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(26),
          height: S.timerTrackH,
          borderRadius: px(10),
          background: 'rgba(255,255,255,0.10)',
          border: `${px(1.5)}px solid rgba(255,255,255,0.18)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left',
            transform: `scaleX(${1 - clockP})`,
            background: `linear-gradient(90deg, ${COLORS.yellowDeep} 0%, ${COLORS.yellow} 70%, ${COLORS.yellowSoft} 100%)`,
          }}
        />
      </div>
      <div style={{ position: 'absolute', left: -px(31) + (1 - clockP) * S.timerWidth, top: px(4), width: px(62), height: px(62) }}>
        <div
          style={{
            width: px(62),
            height: px(62),
            borderRadius: '50%',
            background: hot ? COLORS.red : '#fff',
            color: hot ? '#fff' : COLORS.inkDark,
            border: `${px(3)}px solid ${hot ? '#fff' : 'rgba(255,255,255,0.9)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONTS.display,
            fontSize: px(34),
            boxShadow: `0 0 ${px(26)}px rgba(255,214,10,0.8)`,
          }}
        >
          {secondsLeft}
        </div>
      </div>
    </div>
  );
};

/** "NAIL IT -> ERASE 1 WRONG" chip (root settings text.eraseChip), `answerChipDelayFrames` after the reveal. */
export const BonusEraseChip: React.FC<{ frame: number; revealAt: number }> = ({ frame, revealAt }) => {
  const at = revealAt + rootSettings.bonus.answerChipDelayFrames;
  if (frame < at) return null;
  const p = prog(frame, at, 16, backOut);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: px(68),
        left: '50%',
        marginLeft: -px(320),
        width: px(640),
        textAlign: 'center',
        padding: `${px(9)}px 0`,
        borderRadius: px(40),
        background: `linear-gradient(180deg, ${COLORS.yellowSoft}, ${COLORS.yellow})`,
        color: COLORS.inkDark,
        fontFamily: FONTS.body,
        fontWeight: 800,
        fontSize: px(20),
        letterSpacing: px(3),
        boxShadow: `0 0 ${px(34)}px rgba(255,214,10,0.6)`,
        opacity: clamp01(p),
        transform: `translate3d(0, ${(1 - p) * 30 * K}px, 0) scale(${0.6 + 0.4 * p})`,
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
  const p = prog(frame, at, 16, expoOut);
  return (
    <div style={{ position: 'absolute', left: R.x, top: R.y, width: R.w, height: R.h, opacity: clamp01(p * 1.5), transform: `translate3d(0, ${(1 - p) * 30 * K}px, 0)` }}>
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

/** The removed state coming back: drops in from above, big and transparent, snaps into place, then glows. */
const FlyBack: React.FC<{ stateKey: string; frame: number; at: number; dur: number }> = ({ stateKey, frame, at, dur }) => {
  if (frame < at) return null;
  const g = getShape(stateKey);
  const [cx, cy] = g.miniCentroid;
  const accent = levelAccent(stateKey);
  const p = prog(frame, at, dur, bounceEase); // overshoots 1 a little = the snap
  const s = mix(2.6, 1, p);
  const dy = mix(-MINI_BOX[1] * 0.55, 0, p);
  const glow = prog(frame, at + dur, 10, cssEaseOut);
  return (
    <g transform={`translate(0 ${dy}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} opacity={clamp01(p * 3)}>
      {MAP_LOOK.halo.map((h, i) => (
        <path key={i} d={g.mini} fill="none" stroke={accent} strokeOpacity={h.a * 2 * glow} strokeWidth={MAP_LOOK.edge * h.k} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      <path d={g.mini} fill={accent} fillOpacity={0.92} stroke="#fff" strokeOpacity={0.85} strokeWidth={MAP_LOOK.edge * 1.6} strokeLinejoin="round" />
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
        fontFamily: FONTS.display,
        fontSize: px(64),
        letterSpacing: px(6),
        color: COLORS.yellow,
        textShadow: `0 ${px(6)}px 0 rgba(0,0,0,0.47), 0 0 ${px(40)}px rgba(255,184,0,0.5)`,
        whiteSpace: 'pre',
      }}
    >
      {Array.from(name.toUpperCase()).map((ch, k) => {
        const p = prog(frame, at + k * step, 8, backOut);
        return (
          <span key={k} style={{ display: 'inline-block', opacity: clamp01(p * 2), transform: `translate3d(0, ${(1 - p) * 18 * K}px, 0) scale(${0.6 + 0.4 * p})` }}>
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
    [puzzle.subject]: { opacity: 1 - prog(frame, M.fadeAt, M.fadeDur, linear) },
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
