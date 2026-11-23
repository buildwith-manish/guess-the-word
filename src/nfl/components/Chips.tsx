/**
 * Chips (NFL, task 2e): small system-toast chips that pop in with a little bounce and pop out again.
 *
 * - StreakChip: "CARD N OF 30 DONE" on cards 5, 10, 15, 20, 25. There is no wrong answer in this video, so there is
 *   no "N IN A ROW" anywhere. `streakCards` lists the card numbers; the scene asks `isStreakCard(card)`.
 * - DidYouKnowChip: on every card that has a `didYouKnow` in data.ts (cards 3, 6, 9, 12, 15, 18, 22, 24, 27, 30).
 *   NOTE: the task says "every third card"; the data skips 21 and adds 22, so the data wins and this follows it.
 * - SourceLine: small line under the reveal, text from data.sourceName. If sourceName is null it THROWS (build error)
 *   and draws nothing, so a video can never ship without its source. Set meta.sourceName in docs/nfl/cards.json.
 * - RuleChips: "5 POINTS FOR CLUE 1", "1 POINT FOR CLUE 5", "SCORE OUT OF 150", all built from data.ts.
 *
 * Every number and name comes from data.ts. Every start tick (`at`), length (`dur`) and exit length (`outTicks`) is a
 * required prop that the scene takes from timing.ts: no durations live here. Frames are local design ticks (30 fps).
 * Everything is a pure function of `frame`; nothing here uses timers or Math.random. Text is never below type.caption (24).
 * Imports: src/nfl/ only.
 */
import React from 'react';
import { cards, maxPoints, sourceName } from '../data';
import type { Card, Level } from '../data';
import { clamp01 } from '../shared/fade';
import { presence } from '../shared/presence';
import { SAFE, blurPx, colors, radius, safeBox, textStyle, type, px } from '../system';

/* ---------- helpers ---------- */

/** Streak chips are shown every STREAK_EVERY cards, never on the final card (it has its own staging). */
export const STREAK_EVERY = 5;
export const isStreakCard = (card: Card): boolean => card.n % STREAK_EVERY === 0 && !card.final;
export const streakCards: number[] = cards.filter(isStreakCard).map((c) => c.n);

/** The three rule lines, built from data.ts (points for clue 1, points for the last clue, max score). */
export const ruleLines = (): string[] => {
  const pts = cards[0].points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const word = (n: number) => (n === 1 ? 'POINT' : 'POINTS');
  return [`${first} ${word(first)} FOR CLUE 1`, `${last} ${word(last)} FOR CLUE ${pts.length}`, `SCORE OUT OF ${maxPoints}`];
};

/* ---------- toast base ---------- */

type Timing = {
  /** Local tick the chip starts to pop in. */
  at: number;
  /** Ticks the chip stays, counted from `at` to the end of its exit (from timing.ts). */
  dur: number;
  /** Ticks of the exit at the end of `dur`. */
  outTicks: number;
  /** Local design frame (30 fps ticks). */
  frame: number;
};

type ToastProps = Timing & {
  /** Accent dot colour. Level colour or neutral; never a team colour. */
  accent?: string;
  maxWidth?: number;
  children: React.ReactNode;
};

/** Pop: the iOS spring plus a small extra bounce (scale peaks about 6% over mid-way, ends exactly at 1). */
const Toast: React.FC<ToastProps> = ({ frame, at, dur, outTicks, accent, maxWidth, children }) => {
  const p = presence(frame, at, dur, outTicks);
  if (p <= 0.001) return null;
  const s = clamp01(p);
  const scale = 0.8 + 0.2 * p + 0.06 * Math.sin(Math.PI * s);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: px(14),
        maxWidth: maxWidth === undefined ? undefined : px(maxWidth),
        padding: `${px(14)}px ${px(26)}px ${px(14)}px ${px(20)}px`,
        borderRadius: px(radius.xl),
        background: colors.glassStrong,
        border: `${px(1)}px solid ${colors.hairline}`,
        backdropFilter: `blur(${px(blurPx)}px) saturate(1.4)`,
        boxShadow: `0 ${px(8)}px ${px(22)}px ${colors.shadow}`,
        opacity: s,
        transform: `translateY(${px(-22 * (1 - p))}px) scale(${scale})`,
        transformOrigin: 'top center',
      }}
    >
      {accent ? <div style={{ width: px(14), height: px(14), borderRadius: px(7), background: accent, flexShrink: 0 }} /> : null}
      {children}
    </div>
  );
};

const chipText = {
  ...textStyle('caption'),
  fontSize: px(type.caption.size),
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: colors.ink,
  whiteSpace: 'nowrap',
} as const;

/** Centres a chip horizontally inside the safe box at `top` (reference units). */
const Row: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
  <div style={{ position: 'absolute', left: px(safeBox.left), width: px(safeBox.w), top: px(top), display: 'flex', justifyContent: 'center' }}>
    {children}
  </div>
);

/* ---------- StreakChip ---------- */

export type StreakChipProps = Timing & {
  /** The card just completed. */
  card: Card;
  /** Top edge in reference units. */
  top: number;
};

/** "CARD N OF 30 DONE". Renders null on cards that are not streak cards. */
export const StreakChip: React.FC<StreakChipProps> = ({ card, top, ...t }) => {
  if (!isStreakCard(card)) return null;
  return (
    <Row top={top}>
      <Toast {...t} accent={colors.level[card.level as Level]}>
        <div style={chipText}>{`CARD ${card.n} OF ${cards.length} DONE`}</div>
      </Toast>
    </Row>
  );
};

/* ---------- DidYouKnowChip ---------- */

export type DidYouKnowChipProps = Timing & {
  card: Card;
  top: number;
};

/** Label + fact, from card.didYouKnow. Renders null when the card has none. */
export const DidYouKnowChip: React.FC<DidYouKnowChipProps> = ({ card, top, ...t }) => {
  if (!card.didYouKnow) return null;
  return (
    <Row top={top}>
      <Toast {...t} accent={colors.level[card.level as Level]} maxWidth={safeBox.w}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <div style={{ ...chipText, color: colors.muted }}>DID YOU KNOW?</div>
          <div style={{ ...textStyle('body'), color: colors.ink, fontWeight: 600, whiteSpace: 'normal' }}>{card.didYouKnow}</div>
        </div>
      </Toast>
    </Row>
  );
};

/* ---------- SourceLine ---------- */

export type SourceLineProps = {
  frame: number;
  at: number;
  /** Fade-in length in ticks (from timing.ts). */
  inTicks: number;
  top: number;
};

/** Throws a build error when data.sourceName is null. Call it from QA too. */
export const assertSourceName = (): string => {
  if (sourceName === null || sourceName.trim() === '') {
    throw new Error('SourceLine: docs/nfl/cards.json meta.sourceName is null. Set it to the site the facts were checked against before rendering.');
  }
  return sourceName;
};

/** Small line under the reveal: "Source: <sourceName>". Nothing is drawn, and the build fails, if sourceName is null. */
export const SourceLine: React.FC<SourceLineProps> = ({ frame, at, inTicks, top }) => {
  const name = assertSourceName();
  const o = clamp01((frame - at) / Math.max(1, inTicks));
  if (o <= 0) return null;
  return (
    <Row top={top}>
      <div style={{ ...textStyle('caption'), fontSize: px(type.caption.size), color: colors.muted, opacity: o, whiteSpace: 'nowrap' }}>{`Source: ${name}`}</div>
    </Row>
  );
};

/* ---------- RuleChips ---------- */

export type RuleChipsProps = Timing & {
  /** Top edge in reference units; the chips are centred across the safe box. Ignored when `box` is given. */
  top?: number;
  /** Centre the stack in this box (reference units) instead, e.g. the answer panel of the card. */
  box?: { left: number; top: number; width: number; height: number };
  /** Ticks between one chip and the next (from timing.ts). */
  stagger: number;
};

/** Three rule chips stacked in the centre, popping in one after another. Each has its own pop-in; all leave together. */
export const RuleChips: React.FC<RuleChipsProps> = ({ top = CHIP_TOP_MIN, box, stagger, at, dur, outTicks, frame }) => {
  const lines = ruleLines();
  const accents = [colors.green, colors.amber, colors.red];
  const stack = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(12) }}>
      {lines.map((line, i) => (
        <Toast key={line} frame={frame} at={at + i * stagger} dur={dur - i * stagger} outTicks={outTicks} accent={accents[i % accents.length]}>
          <div style={chipText}>{line}</div>
        </Toast>
      ))}
    </div>
  );
  if (box) {
    return (
      <div style={{ position: 'absolute', left: px(box.left), top: px(box.top), width: px(box.width), height: px(box.height), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {stack}
      </div>
    );
  }
  return <Row top={top}>{stack}</Row>;
};

/** Lowest top edge (reference units) that keeps a chip inside the safe box. */
export const CHIP_TOP_MIN = SAFE.top;
