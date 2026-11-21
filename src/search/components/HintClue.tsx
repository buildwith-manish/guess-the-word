import React, { useState } from 'react';
import { Img, staticFile } from 'remotion';
import { COLORS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import hintImages from '../hint-images.json';
import { HintEmoji, HintEmojiProps } from './HintEmoji';

/**
 * Task 8b. The hint pair for a round: two picture icons when src/search/hint-images.json lists two files
 * for the round, otherwise the emoji pair (HintEmoji, unchanged).
 *
 * Same props as HintEmoji plus `roundId`. Same footprint (two S x S boxes, gap 0.3 S, centred on `at`)
 * and the same pop / ping / bounce timing, so layout and sound cues do not change.
 * The manifest only lists files that exist (src/search/hint-images.json, written by scripts/search-hints-cut.py).
 * If an image still fails to load, this component switches to the emoji instead of crashing the render.
 */

/** Motion constants: copied from HintEmoji.tsx (fractions of a second). Keep in step with it. */
const POP_SECONDS = 0.6;
const STAGGER_SECONDS = 0.2;
const PING_SECONDS = 0.7;
const DAMP = 5;
const WOBBLE = 2.2;

/** Picture size inside its glass card, as a fraction of the card (the card is the S x S box HintEmoji uses). */
const IMAGE_FILL = 0.74;
/** Glass card. Light frosted glass, so dark picture outlines read on the dark background. Percentages of COLORS.ink / accent. */
const CARD_RADIUS = 0.24; // fraction of S
const CARD_TOP_PERCENT = 36;
const CARD_BOTTOM_PERCENT = 14;
const RIM_PERCENT = 70;
const GLOW_PERCENT = 34;
const CARD_SHADOW_PERCENT = 60;
const IMAGE_SHADOW_PERCENT = 75;
/** One shine sweep across each card after it lands. */
const SHINE_DELAY_SECONDS = 0.3;
const SHINE_SECONDS = 0.8;
const SHINE_PERCENT = 34;
/** Gentle float once landed: loop length in seconds, travel as a fraction of S. */
const FLOAT_SECONDS = 3.2;
const FLOAT_AMOUNT = 0.02;
/** At the reveal the pair steps back so the answer card takes the focus. */
const SETTLE_SECONDS = 0.35;
const SETTLE_SCALE = 0.88;
const SETTLE_OPACITY = 0.55;

const MANIFEST = hintImages as Record<string, string[]>;

export type HintClueProps = HintEmojiProps & {
  /** Round id (1-50), the key in hint-images.json. */
  roundId: number;
  /** Scene tick of the reveal. From here the pair eases back (smaller, dimmer). Omit to keep it full. */
  revealAt?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** 0 at t=0, overshoots, settles at 1 at t=1. */
const bounce = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-DAMP * t) * Math.cos(Math.PI * WOBBLE * t);
};

const mixAlpha = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** The two picture files for a round, or null when the round has none (or not exactly two). */
export const hintFilesFor = (roundId: number): [string, string] | null => {
  const files = MANIFEST[String(roundId)];
  return Array.isArray(files) && files.length === 2 && files.every((f) => typeof f === 'string' && f)
    ? [files[0], files[1]]
    : null;
};

export const HintClue: React.FC<HintClueProps> = ({ roundId, emoji, from, at, size, accent, revealAt }) => {
  const frame = useDesignFrame();
  const [failed, setFailed] = useState(false);
  const files = hintFilesFor(roundId);

  const settleK = revealAt === undefined ? 0 : easeOutCubic(clamp01((frame - revealAt) / (SETTLE_SECONDS * FPS)));
  const settle = (children: React.ReactNode) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 1 - (1 - SETTLE_OPACITY) * settleK,
        transform: `scale(${1 - (1 - SETTLE_SCALE) * settleK})`,
        transformOrigin: `${px(at.x)}px ${px(at.y)}px`,
      }}
    >
      {children}
    </div>
  );

  if (!files || failed) {
    return settle(<HintEmoji emoji={emoji} from={from} at={at} size={size} accent={accent} />);
  }
  if (frame < from) return null;

  const S = px(size);
  const gap = S * 0.3;
  const glowColor = accent || COLORS.yellow;
  const radius = S * CARD_RADIUS;

  return settle(
    <div
      style={{
        position: 'absolute',
        left: px(at.x),
        top: px(at.y),
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        gap,
      }}
    >
      {files.map((file, i) => {
        const t0 = from + i * STAGGER_SECONDS * FPS;
        const t = (frame - t0) / (POP_SECONDS * FPS);
        const pingT = clamp01((frame - t0) / (PING_SECONDS * FPS));
        const visible = frame >= t0;
        const scale = visible ? bounce(t) : 0;
        const floatY = visible ? Math.sin(((frame - t0) / (FLOAT_SECONDS * FPS)) * Math.PI * 2) * S * FLOAT_AMOUNT * clamp01(t) : 0;
        const shineT = clamp01((frame - t0 - SHINE_DELAY_SECONDS * FPS) / (SHINE_SECONDS * FPS));
        return (
          <div key={i} style={{ position: 'relative', width: S, height: S }}>
            {visible && pingT < 1 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: radius,
                  border: `${px(3)}px solid ${COLORS.ink}`,
                  boxSizing: 'border-box',
                  transform: `scale(${0.6 + pingT * 1.1})`,
                  opacity: 1 - pingT,
                }}
              />
            )}
            <div style={{ position: 'absolute', inset: 0, transform: `translateY(${floatY}px) scale(${scale})` }}>
              {/* frosted glass card: light, accent rim, soft glow, one shine sweep */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: radius,
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  background: `linear-gradient(155deg, ${mixAlpha(COLORS.ink, CARD_TOP_PERCENT)} 0%, ${mixAlpha(
                    COLORS.ink,
                    CARD_BOTTOM_PERCENT,
                  )} 100%)`,
                  border: `${px(2)}px solid ${mixAlpha(glowColor, RIM_PERCENT)}`,
                  boxShadow: `0 ${px(12)}px ${px(30)}px ${mixAlpha(COLORS.base, CARD_SHADOW_PERCENT)}, 0 0 ${S * 0.3}px ${mixAlpha(
                    glowColor,
                    GLOW_PERCENT,
                  )}`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 50% 42%, ${mixAlpha(glowColor, GLOW_PERCENT)} 0%, transparent 68%)`,
                  }}
                />
                {shineT > 0 && shineT < 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-30%',
                      height: '160%',
                      width: '38%',
                      left: `${-45 + shineT * 170}%`,
                      transform: 'skewX(-18deg)',
                      background: `linear-gradient(90deg, transparent, ${mixAlpha(COLORS.ink, SHINE_PERCENT)}, transparent)`,
                    }}
                  />
                )}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Img
                  src={staticFile(`search/hints/${file}`)}
                  onError={() => setFailed(true)}
                  style={{
                    width: S * IMAGE_FILL,
                    height: S * IMAGE_FILL,
                    objectFit: 'contain',
                    filter: `drop-shadow(0 ${px(6)}px ${px(10)}px ${mixAlpha(COLORS.base, IMAGE_SHADOW_PERCENT)})`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>,
  );
};
