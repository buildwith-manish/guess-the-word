import React from 'react';
import type { Card } from '../data';
import { colors, px, radius, springAt, textStyle } from '../system';
import { DEFAULT_BOX, ROW, clueFit } from './clueFit';
import type { Box } from './clueFit';

export type ClueStackProps = {
  card: Card;
  /** Local design frame (30 fps ticks). */
  frame: number;
  /** Local tick each clue row flips in (five numbers, from timing.ts). */
  starts: readonly number[];
  /** Area the stack is centred in, 1280x720 reference units. Default: the safe box below the HUD. */
  box?: Box;
};

const DIM = 0.4; // earlier rows lose this much opacity

/**
 * Five clue rows on the card field. Row k flips in (spring, small rotateX) at starts[k]. Earlier rows stay,
 * dimmed a little, so viewers can re-read. Every row shows its point value (card.points) in a chip.
 * Row text is card.clues only; points are card.points. One text size for all rows (see clueFit.ts), so slots
 * never reflow when a row appears.
 */
export const ClueStack: React.FC<ClueStackProps> = ({ card, frame, starts, box = DEFAULT_BOX }) => {
  const fit = clueFit(card, box);
  const n = card.clues.length;
  const stackH = n * fit.slotH + (n - 1) * ROW.gap;
  const y0 = box.top + (box.height - stackH) / 2;
  const accent = colors.level[card.level];

  return (
    <div style={{ position: 'absolute', inset: 0, perspective: px(1400), pointerEvents: 'none' }}>
      {card.clues.map((_, k) => {
        const at = starts[k];
        if (at === undefined || frame < at) return null;
        const p = springAt(frame, at, 'gentle');
        const next = starts[k + 1];
        const dim = next === undefined ? 0 : springAt(frame, next, 'gentle');
        const opacity = Math.min(1, p * 2) * (1 - DIM * dim);
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: px(box.left),
              top: px(y0 + k * (fit.slotH + ROW.gap)),
              width: px(box.width),
              height: px(fit.slotH),
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              borderRadius: px(radius.lg),
              background: `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
              border: `${px(1)}px solid ${colors.hairline}`,
              opacity,
              transformOrigin: '50% 0%',
              transform: `translateY(${(1 - p) * px(10)}px) rotateX(${(1 - p) * -28}deg)`,
            }}
          >
            <div
              style={{
                ...textStyle('caption'),
                flex: 'none',
                width: px(ROW.chipW),
                height: px(ROW.chipH),
                marginLeft: px(ROW.chipGap),
                boxSizing: 'border-box',
                borderRadius: px(ROW.chipH / 2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: px(28),
                fontWeight: 700,
                lineHeight: 1,
                color: colors.ink,
                background: `${accent}33`,
                border: `${px(1.5)}px solid ${accent}`,
              }}
            >
              {card.points[k]}
            </div>
            <div
              style={{
                ...textStyle('clue'),
                fontSize: px(fit.size),
                lineHeight: ROW.lineHeight,
                fontVariantNumeric: 'normal',
                fontFeatureSettings: 'normal',
                flex: 1,
                marginRight: px(ROW.chipW + 2 * ROW.chipGap),
                textAlign: 'center',
                color: colors.ink,
              }}
            >
              {fit.lines[k].map((line, i) => (
                <div key={i} style={{ whiteSpace: 'nowrap' }}>{line}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
