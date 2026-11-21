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

/** The picture fills this much of its S x S box (HintEmoji's glyph is 0.82). */
const IMAGE_FILL = 0.9;
/** Glow behind each picture: extends this far past the box, as a fraction of S. */
const GLOW_REACH = 0.22;
/** Strength of the light backing and the accent glow, in percent. Picture outlines are dark, so they need a light backing. */
const BACKING_PERCENT = 20;
const GLOW_PERCENT = 38;
const SHADOW_PERCENT = 75;

const MANIFEST = hintImages as Record<string, string[]>;

export type HintClueProps = HintEmojiProps & {
  /** Round id (1-50), the key in hint-images.json. */
  roundId: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

export const HintClue: React.FC<HintClueProps> = ({ roundId, emoji, from, at, size, accent }) => {
  const frame = useDesignFrame();
  const [failed, setFailed] = useState(false);
  const files = hintFilesFor(roundId);

  if (!files || failed) {
    return <HintEmoji emoji={emoji} from={from} at={at} size={size} accent={accent} />;
  }
  if (frame < from) return null;

  const S = px(size);
  const gap = S * 0.3;
  const glowColor = accent || COLORS.yellow;

  return (
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
        return (
          <div key={i} style={{ position: 'relative', width: S, height: S }}>
            {visible && pingT < 1 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `${px(3)}px solid ${COLORS.ink}`,
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
                transform: `scale(${scale})`,
              }}
            >
              {/* light backing + accent glow, so dark outlines read on the dark background */}
              <div
                style={{
                  position: 'absolute',
                  inset: -S * GLOW_REACH,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${mixAlpha(COLORS.ink, BACKING_PERCENT)} 0%, ${mixAlpha(
                    glowColor,
                    GLOW_PERCENT,
                  )} 42%, transparent 72%)`,
                }}
              />
              <Img
                src={staticFile(`search/hints/${file}`)}
                onError={() => setFailed(true)}
                style={{
                  position: 'relative',
                  width: S * IMAGE_FILL,
                  height: S * IMAGE_FILL,
                  objectFit: 'contain',
                  filter: `drop-shadow(0 ${px(6)}px ${px(10)}px ${mixAlpha(COLORS.base, SHADOW_PERCENT)})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
