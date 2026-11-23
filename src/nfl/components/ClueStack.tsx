import React from 'react';
import type { Card } from '../data';
import { colors, px, radius, springAt, springOver, textStyle } from '../system';
import { DEFAULT_BOX, ROW, wrap } from './clueFit';
import type { Box } from './clueFit';

export type ClueStackProps = {
  card: Card;
  /** Local design frame (30 fps ticks). */
  frame: number;
  /** Local tick each clue row flips in (five numbers, from timing.ts). */
  starts: readonly number[];
  /** Area the stack lives in, 1280x720 reference units. Default: the safe box below the HUD. */
  box?: Box;
  /** Flip length in ticks. Default: the `gentle` spring preset. Two-Minute Warning cards pass `tmwFlipTicks(card)`. */
  flipTicks?: number;
};

/**
 * Notification-stack layout. The newest clue is a large row at the top of the box; every earlier clue is a compact row
 * below it, newest first, a little dimmer and narrower the older it is (like stacked Lock Screen notifications).
 * Nothing is drawn outside `box` (the wrapper clips), so rows can never run over the card header.
 *
 * Sizes are chosen per clue number so everything always fits the box: compact rows try 22 units and step down to 18,
 * the newest clue takes the rest of the height at 40 units down to 30. Widths come from clueFit's Inter metrics, so the
 * wrap does not depend on the DOM. Text is left-aligned beside the points chip, so lines get the whole row width.
 * When a new clue arrives, rows glide to their new slot and each row cross-fades between its two layouts.
 */
const GAP = 6;
const ACTIVE = { max: 40, min: 30, padY: 8 } as const;
const COMPACT = { max: 22, min: 18, padY: 4 } as const;
const CHIP = { activeW: 56, activeH: 44, compactW: 40, compactH: 30, col: 56 } as const;
const ENTER_DROP = 28; // the new row starts this far above its slot
const DIM_STEP = 0.14;
const DIM_FIRST = 0.8;
const DIM_FLOOR = 0.35;
const SHRINK_STEP = 0.02; // older rows are a touch narrower

type Text = { size: number; lines: string[] };
type Layout = { active: Text; activeH: number; compact: Text[]; compactH: number[] };
type Geom = { y: number; h: number; rank: number; text: Text };

const textWOf = (box: Box): number => box.width - ROW.chipGap * 2 - CHIP.col - 16;
const heightOf = (t: Text, padY: number): number => t.lines.length * t.size * ROW.lineHeight + 2 * padY;

export const layoutOf = (card: Card, m: number, box: Box): Layout => {
  const textW = textWOf(box);
  let best: Layout | undefined;
  for (let cs = COMPACT.max; cs >= COMPACT.min; cs--) {
    const compact = card.clues.slice(0, m).map((c): Text => ({ size: cs, lines: wrap(c, cs, textW) }));
    const compactH = compact.map((t) => heightOf(t, COMPACT.padY));
    const rem = box.height - compactH.reduce((a, b) => a + b, 0) - m * GAP;
    for (let s = ACTIVE.max; s >= ACTIVE.min; s--) {
      const active: Text = { size: s, lines: wrap(card.clues[m], s, textW) };
      const h = heightOf(active, ACTIVE.padY);
      const layout = { active, activeH: h, compact, compactH };
      best = layout;
      if (h <= rem && active.lines.length <= 3) return layout;
    }
  }
  return best as Layout;
};

/** Where clue j sits when clue m is the newest: y from the top of the box, height, recency rank (0 = newest), its text. */
const geomOf = (L: Layout, m: number, j: number): Geom => {
  if (j === m) return { y: 0, h: L.activeH, rank: 0, text: L.active };
  let y = L.activeH + GAP;
  for (let q = m - 1; q > j; q--) y += L.compactH[q] + GAP;
  return { y, h: L.compactH[j], rank: m - j, text: L.compact[j] };
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const dimOf = (rank: number): number => (rank === 0 ? 1 : Math.max(DIM_FLOOR, DIM_FIRST - DIM_STEP * (rank - 1)));
const sameText = (a: Text, b: Text): boolean => a.size === b.size && a.lines.length === b.lines.length && a.lines.every((l, i) => l === b.lines[i]);

const TextBlock: React.FC<{ t: Text; opacity: number }> = ({ t, opacity }) => (
  <div
    style={{
      ...textStyle('clue'),
      position: 'absolute',
      left: px(ROW.chipGap * 2 + CHIP.col),
      right: px(16),
      top: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      fontSize: px(t.size),
      lineHeight: ROW.lineHeight,
      fontVariantNumeric: 'normal',
      fontFeatureSettings: 'normal',
      textAlign: 'left',
      color: colors.ink,
      opacity,
    }}
  >
    {t.lines.map((line, i) => (
      <div key={i} style={{ whiteSpace: 'nowrap' }}>{line}</div>
    ))}
  </div>
);

export const ClueStack: React.FC<ClueStackProps> = ({ card, frame, starts, box = DEFAULT_BOX, flipTicks }) => {
  const accent = colors.level[card.level];
  const flip = (at: number) => (flipTicks === undefined ? springAt(frame, at, 'gentle') : springOver(frame, at, flipTicks));

  // newest clue on screen: the last one whose start has passed
  let m = -1;
  starts.forEach((s, k) => {
    if (s !== undefined && frame >= s && k < card.clues.length) m = k;
  });
  if (m < 0) return null;

  const p = flip(starts[m]);
  const now = layoutOf(card, m, box);
  const prev = m > 0 ? layoutOf(card, m - 1, box) : undefined;

  return (
    <div style={{ position: 'absolute', left: px(box.left), top: px(box.top), width: px(box.width), height: px(box.height), overflow: 'hidden', pointerEvents: 'none' }}>
      {card.clues.slice(0, m + 1).map((_, j) => {
        const g1 = geomOf(now, m, j);
        const isNew = j === m;
        const g0 = isNew || !prev ? undefined : geomOf(prev, m - 1, j);
        const y = isNew ? lerp(-ENTER_DROP, 0, p) : lerp(g0!.y, g1.y, p);
        const h = isNew ? g1.h : lerp(g0!.h, g1.h, p);
        const rank = g0 ? lerp(g0.rank, g1.rank, p) : 0;
        const opacity = isNew ? Math.min(1, p * 2) : lerp(dimOf(g0!.rank), dimOf(g1.rank), p);
        const act = isNew ? 1 : lerp(g0!.rank === 0 ? 1 : 0, g1.rank === 0 ? 1 : 0, p);
        const chipW = lerp(CHIP.compactW, CHIP.activeW, act);
        const chipH = lerp(CHIP.compactH, CHIP.activeH, act);
        const scale = 1 - SHRINK_STEP * Math.min(rank, 4);
        const crossfade = g0 !== undefined && !sameText(g0.text, g1.text);
        return (
          <div
            key={j}
            style={{
              position: 'absolute',
              left: 0,
              top: px(y),
              width: '100%',
              height: px(h),
              boxSizing: 'border-box',
              borderRadius: px(radius.lg),
              background: `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
              border: `${px(1.5)}px solid ${act > 0.5 ? accent : colors.hairline}`,
              opacity,
              transformOrigin: '50% 0%',
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: px(ROW.chipGap),
                top: '50%',
                width: px(CHIP.col),
                height: px(chipH),
                marginTop: -px(chipH) / 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  ...textStyle('caption'),
                  width: px(chipW),
                  height: px(chipH),
                  boxSizing: 'border-box',
                  borderRadius: px(chipH / 2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: px(lerp(20, 28, act)),
                  fontWeight: 700,
                  lineHeight: 1,
                  color: colors.ink,
                  background: `${accent}33`,
                  border: `${px(1.5)}px solid ${accent}`,
                }}
              >
                {card.points[j]}
              </div>
            </div>
            {crossfade ? <TextBlock t={g0!.text} opacity={1 - p} /> : null}
            <TextBlock t={g1.text} opacity={crossfade ? p : 1} />
          </div>
        );
      })}
    </div>
  );
};
