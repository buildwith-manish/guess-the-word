import React from 'react';
import { COLORS, FONTS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Two large emoji that pop in one after the other with a ping and a scale-bounce.
 * Emoji glyphs come from the Noto Color Emoji face that src/fonts.ts loads (FONTS.emoji).
 * `from` is the hint tick (design ticks, local to the scene). Nothing is drawn before it.
 */

/** Motion constants, as fractions of a second. */
const POP_SECONDS = 0.6;
const STAGGER_SECONDS = 0.2;
const PING_SECONDS = 0.7;
/** Spring feel: higher DAMP settles faster, higher WOBBLE rings more. */
const DAMP = 5;
const WOBBLE = 2.2;

export type HintEmojiProps = {
  /** The two emoji. */
  emoji: [string, string];
  /** Hint tick: when the first emoji pops in. */
  from: number;
  /** Centre of the pair, reference units. */
  at: { x: number; y: number };
  /** Emoji size in reference units. */
  size: number;
  /** Ping ring colour. */
  accent?: string;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0 at t=0, overshoots, settles at 1 at t=1. */
const bounce = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-DAMP * t) * Math.cos(Math.PI * WOBBLE * t);
};

export const HintEmoji: React.FC<HintEmojiProps> = ({ emoji, from, at, size, accent = COLORS.yellow }) => {
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
        const t = (frame - t0) / (POP_SECONDS * FPS);
        const pingT = clamp01((frame - t0) / (PING_SECONDS * FPS));
        const visible = frame >= t0;
        return (
          <div key={i} style={{ position: 'relative', width: S, height: S }}>
            {visible && pingT < 1 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `${px(3)}px solid ${accent}`,
                  boxSizing: 'border-box',
                  transform: `scale(${0.6 + pingT * 1.1})`,
                  opacity: 1 - pingT,
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: S * 0.82,
                lineHeight: 1,
                transform: `scale(${visible ? bounce(t) : 0})`,
              }}
            >
              {e}
            </div>
          </div>
        );
      })}
    </div>
  );
};
