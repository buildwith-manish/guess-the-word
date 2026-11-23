/**
 * CardScene (NFL, task 3a): one scouting card from "Card n." to the end of its reveal slot.
 *
 *   <CardScene card={card} at={0} />
 *
 * `at` is the tick, on the clock of the enclosing <Sequence>, where this card's first tick sits. The scene's own clock is
 * `useNflFrame() - at`, so 0 = segment start. Normal use mounts it in a Sequence that starts at the segment, with at = 0.
 *
 * Layers, back to front: level background, ScoreHud (top band), card + clues (WalletCard with ClueStack, wrapped in
 * TwoMinuteWarning on cards 5, 15, 25), PointsPill + red edge glow, RuleChips (first card only).
 * From the silence beat after clue 5 the card is handed to RevealEngine, with the clue stack frozen at clue 5 as `frozen`.
 *
 * Nothing here is content or a duration: card text, points, names, labels and counts come from data.ts, every tick from
 * the card's segment in timing.ts (clip lengths once measured), motion lengths from the spring presets in system.ts.
 * Duration: cardTicks(card) / cardFrames(card).
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Card } from '../data';
import { cards, tmwLabel } from '../data';
import { ClueStack } from '../components/ClueStack';
import { pointsPillMath } from '../components/PointsPill';
import { PointsPill, PointsPillGlow } from '../components/PointsPill';
import { RevealEngine } from '../components/RevealEngine';
import { RuleChips } from '../components/Chips';
import { ScoreHud } from '../components/ScoreHud';
import { TwoMinuteWarning, tmwFlipTicks } from '../components/TwoMinuteWarning';
import { WALLET_LAYOUT, WalletCard } from '../components/WalletCard';
import { SPRINGS, colors, levelBackground, px } from '../system';
import { FPS, chipStaggerSec, levelNames, secToTicks, segments, ticksToFrames, useNflFrame } from '../timing';

const segmentOf = (card: Card) => {
  const seg = segments.find((s) => s.kind === 'card' && s.card.n === card.n);
  if (!seg || seg.kind !== 'card') throw new Error(`CardScene: no timeline segment for card ${card.n}`);
  return seg;
};

/** Length of the card's segment in design ticks (30 fps) and in render frames (60 fps). */
export const cardTicks = (card: Card): number => {
  const seg = segmentOf(card);
  return seg.to - seg.from;
};
export const cardFrames = (card: Card): number => ticksToFrames(cardTicks(card));

/** Top band above the card (reference units): the card starts at SAFE.top, so the HUD and the pill live in the 72 above it. */
export const BAND_TOP = 4;
/** A start tick so far back that every entrance spring has settled: the state the hook leaves the card in. */
const ENTERED = -1e6;
/** Top row (iOS-6): watermark, points pill and ring chip share one height and one centre line (y 36). */
export const TOP_ROW = { top: 12, h: 48 } as const;
const PILL = { w: 200, h: TOP_ROW.h } as const;

/** The clue stack is laid out inside the card's clue field, so its box is relative to the field. */
const FIELD_BOX = { left: 0, top: 0, width: WALLET_LAYOUT.field.w, height: WALLET_LAYOUT.field.h };

/** The answer panel in absolute reference units (the "?" face, empty during the clues): home of the rule chips. */
export const ANSWER_BOX = {
  left: WALLET_LAYOUT.card.left + WALLET_LAYOUT.answer.left,
  top: WALLET_LAYOUT.card.top + WALLET_LAYOUT.answer.top,
  width: WALLET_LAYOUT.answer.w,
  height: WALLET_LAYOUT.answer.h,
};

export type CardSceneProps = {
  card: Card;
  /** Tick, on the enclosing Sequence's clock, where this card's segment starts (default 0). */
  at?: number;
  /** Jersey number for the open face. cards.json has no jersey field yet: undefined leaves it out. */
  jersey?: string | number;
  /** Card 1 only: the hook already showed the card, the HUD and the rule chips, so this scene continues from them without a new entrance (no card spring-in, no chip pop-in). */
  fromHook?: boolean;
};

export const CardScene: React.FC<CardSceneProps> = ({ card, at = 0, jersey, fromHook = false }) => {
  const f = useNflFrame() - at;
  const seg = segmentOf(card);
  const { phases } = seg;

  // every tick below is local to the card: 0 = seg.from
  const starts = phases.clues.map((r) => r.from - seg.from);
  const clueEnd = phases.clues[phases.clues.length - 1].to - seg.from;
  const beatFrom = phases.beat.from - seg.from;
  const revealOpen = phases.reveal.from - seg.from;
  const introFrom = phases.intro.from - seg.from;
  const clue1End = phases.clues[0].to - seg.from;

  const flipTicks = tmwFlipTicks(card);
  const clueStack = (frame: number) => <ClueStack card={card} frame={frame} starts={starts} box={FIELD_BOX} flipTicks={flipTicks} />;

  const pm = pointsPillMath(f, starts, clueEnd);
  const guessAt = (_f: number) => (pm.live ? { points: card.points[pm.idx], fill: pm.fill } : undefined);

  const inReveal = f >= beatFrom;
  const content = inReveal ? (
    <RevealEngine card={card} frame={f - beatFrom} frozen={clueStack(clueEnd)} jersey={jersey} />
  ) : (
    <WalletCard card={card} state="blank" frame={f} since={fromHook ? ENTERED : introFrom} jersey={jersey} guess={guessAt(f)}>
      {clueStack(f)}
    </WalletCard>
  );

  const first = card.n === cards[0].n;

  return (
    <AbsoluteFill style={{ background: levelBackground[card.level], overflow: 'hidden' }}>
      {/* rings fill with cards completed: card n-1 before the lock opens, n after (not the viewer's score) */}
      <ScoreHud done={card.n} from={card.n - 1} frame={f} at={revealOpen} top={TOP_ROW.top} side="left" compact tag={levelNames[card.level]} tagColor={colors.level[card.level]} />

      <TwoMinuteWarning card={card} frame={f} starts={starts} end={clueEnd} label={tmwLabel}>
        {content}
      </TwoMinuteWarning>

      {/* points pill: Dynamic Island position, centred in the top band, only while a clue is live */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: px(TOP_ROW.top), display: 'flex', justifyContent: 'center' }}>
        <PointsPill frame={f} starts={starts} end={clueEnd} values={card.points} level={card.level} width={PILL.w} height={PILL.h} />
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <PointsPillGlow frame={f} starts={starts} end={clueEnd} />
      </div>

      {/* scoring rules, card 1 only: on the "?" panel from the intro through clue 1 */}
      {first && (
        <RuleChips
          box={ANSWER_BOX}
          frame={f}
          at={fromHook ? ENTERED : introFrom}
          dur={clue1End - (fromHook ? ENTERED : introFrom)}
          outTicks={Math.round(SPRINGS.snappy * FPS)}
          stagger={secToTicks(chipStaggerSec)}
        />
      )}
    </AbsoluteFill>
  );
};
