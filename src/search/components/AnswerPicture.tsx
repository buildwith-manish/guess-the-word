import React from 'react';
import { Img, staticFile } from 'remotion';
import { COLORS, FONTS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Reveal: the answer's picture on a rounded card with an accent border, and under it a rounded answer box with the name
 * and where they are from (`showName`, from settings reveal.showName; without it the picture stands alone).
 * Behind it a soft spotlight in the level accent.
 *
 * `at` is the tick the picture appears (design ticks, local to the scene). The picture card pops in from a larger size
 * with a little overshoot, then floats slowly; the answer box rises in just after it. The picture card is `size` wide
 * and size / ASPECT tall (3:2 landscape pictures); the answer box sits under it, BOX_GAP and BOX_HEIGHT as shares of `size`.
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
/** Layout, as shares of the picture width. */
const RADIUS = 0.05; // corner radius of the picture card
const BOX_GAP = 0.035;
const BOX_HEIGHT = 0.15;
const BOX_RADIUS = 0.04;
const BORDER_PX = 3; // reference units
/** Name size as a share of the box height, and the longest name that keeps that size before it shrinks. */
const NAME_SIZE = 0.5;
const NAME_FULL_CHARS = 14;
/** The answer box starts this long after the picture, and rises over BOX_RISE_SECONDS. */
const BOX_DELAY_SECONDS = 0.18;
const BOX_RISE_SECONDS = 0.3;
/** Share of the block height the whole block (picture + gap + box) takes, used by callers to size it. */
export const answerPictureHeightShare = (showName: boolean) => 1 / ASPECT + (showName ? BOX_GAP + BOX_HEIGHT : 0);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type AnswerPictureProps = {
  image: string;
  name: string;
  from: string;
  at: number;
  /** Scene-local tick that `at` is measured on. Omit only when `at` is on the global timeline. */
  frame?: number;
  accent: string;
  /** Centre-x and top-y of the block, reference units. */
  place: { x: number; y: number };
  /** Picture card width, reference units (its height is size / 3 * 2). */
  size: number;
  showName?: boolean;
};

export const AnswerPicture: React.FC<AnswerPictureProps> = ({ image, name, from, at, accent, place, size, showName = false, frame: frameProp }) => {
  const ownFrame = useDesignFrame();
  const frame = frameProp ?? ownFrame;
  if (frame < at) return null;

  const S = px(size); // picture card width
  const H = S / ASPECT; // picture card height
  const boxTop = H + S * BOX_GAP;
  const boxH = S * BOX_HEIGHT;
  const t = clamp01((frame - at) / (POP_SECONDS * FPS));
  const back = 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const scale = POP_FROM + (1 - POP_FROM) * back;
  const opacity = clamp01((frame - at) / (FADE_SECONDS * FPS));
  const float = Math.sin(((frame - at) / (FLOAT_SECONDS * FPS)) * Math.PI * 2) * H * FLOAT;
  const spot = clamp01((frame - at) / (SPOTLIGHT_SECONDS * FPS));
  const boxT = clamp01((frame - at - BOX_DELAY_SECONDS * FPS) / (BOX_RISE_SECONDS * FPS));
  const boxK = 1 - Math.pow(1 - boxT, 3);
  const nameFont = boxH * NAME_SIZE * Math.min(1, NAME_FULL_CHARS / Math.max(1, name.length));
  const border = px(BORDER_PX);

  return (
    <div style={{ position: 'absolute', left: px(place.x) - S / 2, top: px(place.y), width: S, height: showName ? boxTop + boxH : H, opacity }}>
      {/* spotlight */}
      <div
        style={{
          position: 'absolute',
          left: -S * 0.1,
          top: -H * 0.1,
          width: S * 1.2,
          height: H * 1.2,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, color-mix(in srgb, ${accent} ${(SPOTLIGHT_PERCENT * spot).toFixed(1)}%, transparent), transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* picture card: rounded, accent border */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: S,
          height: H,
          borderRadius: S * RADIUS,
          overflow: 'hidden',
          boxSizing: 'border-box',
          border: `${border}px solid ${accent}`,
          boxShadow: `0 ${H * 0.03}px ${H * 0.07}px rgba(0,0,0,0.55), 0 0 ${H * 0.08}px color-mix(in srgb, ${accent} 45%, transparent)`,
          transform: `translateY(${float}px) scale(${scale})`,
          transformOrigin: 'center center',
          background: COLORS.ink,
        }}
      >
        <Img
          src={staticFile(`search/answers/${image}`)}
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {/* answer box */}
      {showName ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: boxTop + (1 - boxK) * boxH * 0.4,
            width: S,
            height: boxH,
            opacity: boxK,
            boxSizing: 'border-box',
            borderRadius: S * BOX_RADIUS,
            border: `${border}px solid ${accent}`,
            background: 'rgba(8, 8, 28, 0.82)',
            boxShadow: `0 0 ${boxH * 0.35}px color-mix(in srgb, ${accent} 40%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: nameFont * 0.5,
            padding: `0 ${S * 0.03}px`,
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
          <div style={{ fontFamily: FONTS.body, fontSize: nameFont * 0.5, color: COLORS.muted, whiteSpace: 'nowrap' }}>{from}</div>
        </div>
      ) : null}
    </div>
  );
};
