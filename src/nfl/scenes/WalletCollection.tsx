/**
 * WalletCollection (NFL, task 3c): after card 30's reveal, the 30 solved cards land one by one in a Wallet-style pile
 * (each card a strip lower than the one before, the newest in front), hold, then fan out into two arcs of 15 and hold.
 * The segment then ends and the next scene cuts in (no fade).
 *
 * Spoiler-free for a rewatch: a card shows ONLY its number (data.ts `card.n`) and its level colour. No names, no clues, no
 * art, no team marks. Nothing is typed here: the count and the numbers come from data.ts, every length from timing.ts
 * (`collectionBeats`, `collectionSec`), motion lengths from the spring presets in system.ts. 1280x720 units through px().
 * `WalletCollection` reads the Sequence clock (like CardScene, `at` = tick the segment starts); `WalletCollectionView` takes `frame`.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { cards, type Card } from '../data';
import { cue, type SfxCue } from '../sfx';
import { clamp01 } from '../shared/fade';
import { FRAME, SPRINGS, colors, levelBackground, px, radius, springAt, textStyle } from '../system';
import { FPS, collectionBeats, secToTicks, useNflFrame } from '../timing';

/** Mini card, pile and fan geometry in reference units. The fan is two arcs so every number stays on a visible sliver. */
const CARD = { w: 240, h: 135 } as const;
const PILE_STEP = 8;
const FAN = { stepX: 54, rowTop: [172, 372], sag: 26, tiltDeg: 12 } as const;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const n = cards.length;
const rowSizes = [Math.ceil(n / 2), n - Math.ceil(n / 2)] as const;

/** Marks in ticks from the segment start. Exported so the frame list and the cues read the same numbers. */
export const collectionMarks = () => {
  const b = collectionBeats;
  const stackAt = secToTicks(b.stackAt);
  const stackStagger = secToTicks(b.stackStagger);
  const fanAt = secToTicks(b.fanAt);
  const fanStagger = secToTicks(b.fanStagger);
  const gentle = Math.round(SPRINGS.gentle * FPS);
  const slow = Math.round(SPRINGS.slow * FPS);
  return {
    stackAt,
    stackStagger,
    stackDone: stackAt + (n - 1) * stackStagger + gentle,
    fanAt,
    fanStagger,
    fanDone: fanAt + (n - 1) * fanStagger + slow,
  };
};

/** SFX cues in design ticks from the start of the video: a wallet-stack sound as the cards start to land, and again as the fan opens. */
export const walletCollectionCues = (start: number): SfxCue[] => {
  const m = collectionMarks();
  return [cue('wallet-stack', start + m.stackAt), cue('wallet-stack', start + m.fanAt)];
};

/** Card k (0-based): where it rests in the pile and in the fan, as top-left corner and tilt. */
const place = (k: number) => {
  const pileH = CARD.h + (n - 1) * PILE_STEP;
  const pile = { left: (FRAME.w - CARD.w) / 2, top: (FRAME.h - pileH) / 2 + k * PILE_STEP, rot: 0 };
  const row = k < rowSizes[0] ? 0 : 1;
  const c = row === 0 ? k : k - rowSizes[0];
  const mid = (rowSizes[row] - 1) / 2;
  const u = mid > 0 ? (c - mid) / mid : 0; // -1 .. 1 across the arc
  const fan = { left: FRAME.w / 2 + (c - mid) * FAN.stepX - CARD.w / 2, top: FAN.rowTop[row] + FAN.sag * u * u, rot: u * FAN.tiltDeg };
  return { pile, fan };
};

/** Number and level colour only. */
const MiniCard: React.FC<{ card: Card }> = ({ card }) => {
  const color = colors.level[card.level];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: px(radius.md),
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${color} 0%, ${color}D9 100%)`,
        border: `${px(1)}px solid ${colors.hairline}`,
        boxShadow: `0 ${px(6)}px ${px(16)}px ${colors.shadow}`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%)' }} />
      <div style={{ ...textStyle('name'), fontSize: px(36), fontWeight: 800, color: colors.onAccent, position: 'absolute', left: px(14), top: px(8) }}>{card.n}</div>
    </div>
  );
};

export const WalletCollectionView: React.FC<{ frame: number }> = ({ frame }) => {
  const m = collectionMarks();
  const sa = (at: number, preset: keyof typeof SPRINGS): number => (frame < at ? 0 : springAt(frame, at, preset));
  const bg = cards[n - 1].level;

  return (
    <AbsoluteFill style={{ background: levelBackground[bg], overflow: 'hidden' }}>
      {cards.map((card, k) => {
        const landAt = m.stackAt + k * m.stackStagger;
        if (frame < landAt) return null;
        const { pile, fan } = place(k);
        const land = sa(landAt, 'gentle');
        const open = sa(m.fanAt + k * m.fanStagger, 'slow');
        // landing: rises from below the frame onto its place in the pile with a small tilt that settles
        const tilt = (k % 2 === 0 ? -6 : 6) * (1 - clamp01(land));
        const top = lerp(lerp(FRAME.h + CARD.h, pile.top, land), fan.top, open);
        const left = lerp(pile.left, fan.left, open);
        const rot = lerp(tilt, fan.rot, open);
        return (
          <div
            key={card.n}
            style={{
              position: 'absolute',
              left: px(left),
              top: px(top),
              width: px(CARD.w),
              height: px(CARD.h),
              transform: `rotate(${rot}deg)`,
              transformOrigin: 'center',
            }}
          >
            <MiniCard card={card} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const WalletCollection: React.FC<{ at?: number }> = ({ at = 0 }) => <WalletCollectionView frame={useNflFrame() - at} />;
