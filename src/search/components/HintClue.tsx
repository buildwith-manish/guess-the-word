import React, { useState } from 'react';
import { Img, staticFile } from 'remotion';
import { px } from '../../style';
import { IOS, iosSurface, spring } from '../../ios';
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

/** Motion constants (fractions of a second). Keep in step with HintEmoji.tsx. One shared iOS spring, no ping, shine or float. */
const POP_SECONDS = 0.4;
const STAGGER_SECONDS = 0.12;
const START_SCALE = 0.92;
/** Picture size inside its frosted tile, as a fraction of the tile (the tile is the S x S box HintEmoji uses). */
const IMAGE_FILL = 0.74;
const CARD_RADIUS = 0.24; // fraction of S
/** At the reveal the pair steps back so the answer card takes the focus. */
const SETTLE_SECONDS = 0.35;
const SETTLE_SCALE = 0.92;
const SETTLE_OPACITY = 0.5;

const MANIFEST = hintImages as Record<string, string[]>;

export type HintClueProps = HintEmojiProps & {
  /** Round id (1-50), the key in hint-images.json. */
  roundId: number;
  /** Scene tick of the reveal. From here the pair eases back (smaller, dimmer). Omit to keep it full. */
  revealAt?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

  const settleK = revealAt === undefined ? 0 : spring(clamp01((frame - revealAt) / (SETTLE_SECONDS * FPS)));
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
        const visible = frame >= t0;
        const k = visible ? spring((frame - t0) / (POP_SECONDS * FPS)) : 0;
        return (
          <div
            key={i}
            style={{
              ...iosSurface(radius, 0.8),
              background: IOS.color.fillStrong, // a touch lighter than the default surface so dark pictures read
              position: 'relative',
              width: S,
              height: S,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: visible ? Math.min(1, k * 1.4) : 0,
              transform: `scale(${START_SCALE + (1 - START_SCALE) * k})`,
            }}
          >
            <Img
              src={staticFile(`search/hints/${file}`)}
              onError={() => setFailed(true)}
              style={{ width: S * IMAGE_FILL, height: S * IMAGE_FILL, objectFit: 'contain' }}
            />
          </div>
        );
      })}
    </div>,
  );
};
