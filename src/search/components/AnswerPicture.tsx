import React from 'react';
import { Img, staticFile } from 'remotion';
import { COLORS, FONTS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Picture-only reveal: the answer's picture, as large as the slot allows, with nothing around it (no card, no frame).
 * Behind it a soft spotlight in the level accent. Optionally the name under it (`showName`, from settings reveal.showName).
 *
 * `at` is the tick the picture appears (design ticks, local to the scene). It pops in from a larger size with a little
 * overshoot, then floats slowly. The block is `size` wide and size / ASPECT tall (3:2 landscape pictures); with a name
 * the picture takes the top PICTURE_SHARE of it and the name the rest.
 *
 * `image` is a file name in public/search/answers (listed in src/search/answer-images.json).
 */

/** Motion constants. Times in seconds, scales and gains as proportions. */
const FADE_SECONDS = 0.12;
const POP_SECONDS = 0.38;
const POP_FROM = 1.3;
const FLOAT = 0.006; // share of the block size
const FLOAT_SECONDS = 3;
const SPOTLIGHT_SECONDS = 0.5;
const SPOTLIGHT_PERCENT = 34; // strength of the accent spotlight
/** Width / height of the picture block. The pictures are 3:2 landscape. */
const ASPECT = 3 / 2;
/** Share of the block height the picture takes when the name is shown. */
const PICTURE_SHARE = 0.84;
/** Name size as a share of the block height, and the longest name that keeps that size before it shrinks. */
const NAME_SIZE = 0.11;
const NAME_FULL_CHARS = 12;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type AnswerPictureProps = {
  image: string;
  name: string;
  from: string;
  at: number;
  accent: string;
  /** Centre-x and top-y of the block, reference units. */
  place: { x: number; y: number };
  /** Block width, reference units (its height is size / 3 * 2). */
  size: number;
  showName?: boolean;
};

export const AnswerPicture: React.FC<AnswerPictureProps> = ({ image, name, from, at, accent, place, size, showName = false }) => {
  const frame = useDesignFrame();
  if (frame < at) return null;

  const S = px(size); // block width
  const B = S / ASPECT; // block height
  const picH = showName ? B * PICTURE_SHARE : B;
  const t = clamp01((frame - at) / (POP_SECONDS * FPS));
  const back = 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const scale = POP_FROM + (1 - POP_FROM) * back;
  const opacity = clamp01((frame - at) / (FADE_SECONDS * FPS));
  const float = Math.sin(((frame - at) / (FLOAT_SECONDS * FPS)) * Math.PI * 2) * B * FLOAT;
  const spot = clamp01((frame - at) / (SPOTLIGHT_SECONDS * FPS));
  const nameFont = B * NAME_SIZE * Math.min(1, NAME_FULL_CHARS / Math.max(1, name.length));

  return (
    <div style={{ position: 'absolute', left: px(place.x) - S / 2, top: px(place.y), width: S, height: B, opacity }}>
      {/* spotlight */}
      <div
        style={{
          position: 'absolute',
          left: -S * 0.1,
          top: -B * 0.1,
          width: S * 1.2,
          height: picH * 1.2,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, color-mix(in srgb, ${accent} ${(SPOTLIGHT_PERCENT * spot).toFixed(1)}%, transparent), transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Img
        src={staticFile(`search/answers/${image}`)}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: S,
          height: picH,
          objectFit: 'contain',
          transform: `translateY(${float}px) scale(${scale})`,
          transformOrigin: 'center center',
          filter: `drop-shadow(0 ${B * 0.02}px ${B * 0.035}px rgba(0,0,0,0.5))`,
        }}
      />
      {showName ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: picH,
            width: S,
            height: B - picH,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: nameFont * 0.15,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: nameFont,
              lineHeight: 1,
              color: COLORS.ink,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              textShadow: `0 0 ${nameFont * 0.3}px ${accent}`,
            }}
          >
            {name}
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: nameFont * 0.4, color: COLORS.muted, whiteSpace: 'nowrap' }}>{from}</div>
        </div>
      ) : null}
    </div>
  );
};
