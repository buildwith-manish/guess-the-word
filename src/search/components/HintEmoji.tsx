import React from 'react';
import { FONTS, px } from '../../style';
import { IOS, iosSurface, spring } from '../../ios';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Two emoji in frosted iOS tiles that settle in one after the other on the shared spring (no ping, no bounce).
 * Emoji glyphs come from the Noto Color Emoji face that src/fonts.ts loads (FONTS.emoji).
 * `from` is the hint tick (design ticks, local to the scene). Nothing is drawn before it.
 */

/** Motion constants, as fractions of a second. One shared iOS spring, no ping. */
const POP_SECONDS = 0.4;
const STAGGER_SECONDS = 0.12;
/** Scale the tile grows from. */
const START_SCALE = 0.92;
/** Emoji size inside its frosted tile, fraction of the tile. */
const EMOJI_FILL = 0.56;

export type HintEmojiProps = {
  /** The two emoji. */
  emoji: [string, string];
  /** Hint tick: when the first emoji pops in. */
  from: number;
  /** Centre of the pair, reference units. */
  at: { x: number; y: number };
  /** Emoji size in reference units. */
  size: number;
  /** Level accent. Kept for API compatibility; the tiles are neutral. */
  accent?: string;
};


export const HintEmoji: React.FC<HintEmojiProps> = ({ emoji, from, at, size }) => {
  const frame = useDesignFrame();
  if (frame < from) return null;

  const S = px(size);
  const gap = S * 0.3;

  return (
    <div
      style={{
        position: 'absolute',
        left: px(at.x),
        top: px(at.y),
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        gap,
        fontFamily: FONTS.emoji,
      }}
    >
      {emoji.map((e, i) => {
        const t0 = from + i * STAGGER_SECONDS * FPS;
        const k = spring((frame - t0) / (POP_SECONDS * FPS));
        const visible = frame >= t0;
        return (
          <div
            key={i}
            style={{
              ...iosSurface(S * 0.24, 0.8),
              width: S,
              height: S,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: S * EMOJI_FILL,
              lineHeight: 1,
              color: IOS.color.label,
              opacity: visible ? Math.min(1, k * 1.4) : 0,
              transform: `scale(${START_SCALE + (1 - START_SCALE) * (visible ? k : 0)})`,
            }}
          >
            {e}
          </div>
        );
      })}
    </div>
  );
};
