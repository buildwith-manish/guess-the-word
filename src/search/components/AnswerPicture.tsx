import React from 'react';
import { Img, staticFile } from 'remotion';
import { px } from '../../style';
import { IOS, iosSurface, spring, easeOut } from '../../ios';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';

/**
 * Reveal: the answer's picture on a rounded card with a hairline edge, and under it a frosted answer box with the name
 * and where they are from (`showName`, from settings reveal.showName; without it the picture stands alone).
 * Behind it a soft spotlight in the level accent.
 *
 * `at` is the tick the picture appears (design ticks, local to the scene). The picture card settles in from slightly
 * smaller on the shared spring (no stamp, no overshoot, no float); the answer box rises in just after it. The picture card is `size` wide
 * and size / ASPECT tall (3:2 landscape pictures); the answer box sits under it, BOX_GAP and BOX_HEIGHT as shares of `size`.
 *
 * `image` is a file name in public/search/answers (listed in src/search/answer-images.json).
 */

/** Motion constants. Times in seconds, scales and gains as proportions. */
const FADE_SECONDS = 0.12;
const POP_SECONDS = 0.45;
const POP_FROM = 0.94; // the card settles from slightly smaller, on the shared spring
const SPOTLIGHT_SECONDS = 0.5;
const SPOTLIGHT_PERCENT = 14; // strength of the soft accent light behind the card
/** Width / height of the picture block. The pictures are 3:2 landscape. */
const ASPECT = 3 / 2;
/** Layout, as shares of the picture width. */
const RADIUS = 0.05; // corner radius of the picture card
const BOX_GAP = 0.035;
const BOX_HEIGHT = 0.15;
const BOX_RADIUS = 0.04;
const BORDER_PX = 1; // reference units: a hairline
/** Name size as a share of the box height, and the longest name that keeps that size before it shrinks. */
const NAME_SIZE = 0.46;
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
  const scale = POP_FROM + (1 - POP_FROM) * Math.min(1, spring(t));
  const opacity = easeOut((frame - at) / (FADE_SECONDS * FPS));
  const spot = easeOut((frame - at) / (SPOTLIGHT_SECONDS * FPS));
  const boxT = clamp01((frame - at - BOX_DELAY_SECONDS * FPS) / (BOX_RISE_SECONDS * FPS));
  const boxK = Math.min(1, spring(boxT));
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
          border: `${border}px solid ${IOS.color.fillStrong}`,
          boxShadow: `0 ${px(8)}px ${px(28)}px rgba(0,0,0,0.30)`, // same soft shadow as iosSurface
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          background: IOS.color.bgRaised,
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
            ...iosSurface(S * BOX_RADIUS),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: nameFont * 0.5,
            padding: `0 ${S * 0.03}px`,
          }}
        >
          <div
            style={{
              fontFamily: IOS.font,
              fontWeight: IOS.weight.semibold,
              fontSize: nameFont,
              lineHeight: 1,
              color: IOS.color.label,
              whiteSpace: 'nowrap',
              letterSpacing: -nameFont * 0.01,
            }}
          >
            {name}
          </div>
          <div style={{ fontFamily: IOS.font, fontWeight: IOS.weight.medium, fontSize: nameFont * 0.55, color: IOS.color.secondary, whiteSpace: 'nowrap' }}>{from}</div>
        </div>
      ) : null}
    </div>
  );
};
