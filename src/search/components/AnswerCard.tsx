import React from 'react';
import { px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import { IOS, iosSurface, spring } from '../../ios';

/**
 * Text answer card, iOS style: a frosted card that settles in on the shared spring (from slightly smaller, fading
 * in) with the name in bold Inter and where they are from under it. No stamp, shake, flash, ring or confetti.
 *
 * `at` is the tick it appears (scene-local, on the clock `frame` gives; omit `frame` only when `at` is global).
 * `accent` and `anticipate` are kept so callers do not change; the card is neutral.
 */

/** Motion constants. */
const SETTLE_SECONDS = 0.45;
const START_SCALE = 0.94;
/** Layout: card height as a share of its width, and the share of one glyph's width used to fit the name. */
const CARD_HEIGHT_SHARE = 0.42;
const GLYPH_WIDTH = 0.52;

export type AnswerCardProps = {
  /** Character name. */
  name: string;
  /** Where they are from (smaller line under the name). */
  from: string;
  /** Stamp tick. */
  at: number;
  /** Scene-local tick that `at` is measured on. Omit only when `at` is on the global timeline. */
  frame?: number;
  /** Border and glow colour. */
  accent: string;
  /** Centre-x and top-y of the card, reference units. */
  place: { x: number; y: number };
  /** Card width, reference units. */
  size: number;
  /** Draw the empty glowing outline just before the stamp. Default true. */
  anticipate?: boolean;
};

/** Card height in reference units for a card of width `size`. */
export const answerCardHeight = (size: number): number => size * CARD_HEIGHT_SHARE;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Shrinks a one-line text until its measured width fits `avail` (px). Self-corrects when the font loads. */
const useFit = (avail: number) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState(1);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || avail <= 0) return;
    const w = el.offsetWidth; // layout width: not affected by the card's scale transform
    if (w <= 0) return;
    const next = Math.min(1, (fit * avail) / w);
    if (Math.abs(next - fit) > 0.002) setFit(next);
  });
  return { ref, fit };
};

export const AnswerCard: React.FC<AnswerCardProps> = ({ name, from, at, place, size, frame: frameProp }) => {
  const ownFrame = useDesignFrame();
  const frame = frameProp ?? ownFrame;

  const W = px(size);
  const H = W * CARD_HEIGHT_SHARE;
  const pad = W * 0.06;
  const nameFit = useFit(W - 2 * pad);
  const fromFit = useFit(W - 2 * pad);

  if (frame < at) return null;

  const t = clamp01((frame - at) / (SETTLE_SECONDS * FPS));
  const k = spring(t);
  const scale = START_SCALE + (1 - START_SCALE) * k;
  const opacity = Math.min(1, k * 1.4);

  const nameBase = Math.min(H * 0.46, (W - 2 * pad) / (Math.max(1, name.length) * GLYPH_WIDTH));
  const nameFont = nameBase * nameFit.fit;
  const fromFont = Math.min(H * 0.17, nameBase * 0.42) * fromFit.fit;

  return (
    <div
      style={{
        position: 'absolute',
        left: px(place.x) - W / 2,
        top: px(place.y),
        width: W,
        height: H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: H * 0.07,
        padding: `0 ${pad}px`,
        ...iosSurface(H * 0.2),
        fontFamily: IOS.font,
      }}
    >
      <div
        ref={nameFit.ref}
        style={{
          fontSize: nameFont,
          fontWeight: IOS.weight.bold,
          lineHeight: 1,
          letterSpacing: -nameFont * 0.02,
          color: IOS.color.label,
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </div>
      <div
        ref={fromFit.ref}
        style={{ fontSize: fromFont, fontWeight: IOS.weight.medium, color: IOS.color.secondary, whiteSpace: 'nowrap' }}
      >
        {from}
      </div>
    </div>
  );
};
