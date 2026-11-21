import React from 'react';
import { COLORS, FONTS, glass, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import { Img, staticFile } from 'remotion';
import { Flash, Ring } from '../../Fx';
import '../../fonts';

/**
 * Reveal card: the character name very large, a smaller "from" line under it.
 *
 * The moment, in order:
 *   1. anticipation: from ANTICIPATION_SECONDS before `at` the card's edge glow builds (an empty outline)
 *   2. stamp-in at `at`: big and fast down to full size (it LANDS at at + STAMP_SECONDS, unchanged)
 *   3. on landing: a damped shake, one Flash (Fx), a Ring (Fx) and a small burst of confetti in `accent`
 * With `image` (a file name in public/search/answers) the card is taller: the picture on top, name and "from" under it.
 * Without it the card is the text block alone. Nothing is drawn for a missing picture.
 * Built here because src/states does not exist on this branch.
 *
 * `at` is the stamp tick (design ticks, local to the scene). Only the anticipation outline is drawn before it.
 * The 'stamp' sound is cued on `at`; the landing tick, at + STAMP_SECONDS * FPS, is the same as before this change.
 * Names and "from" lines are measured and shrunk until they fit inside the card.
 *
 * The confetti is a small local burst, not Fx's Confetti: that one has a fixed palette and no colour prop,
 * and it falls 560 units, which is far more than a small burst.
 */

/** Motion constants. Times in seconds, scales and gains as proportions. */
const ANTICIPATION_SECONDS = 0.25;
const STAMP_SECONDS = 0.18;
const STAMP_FROM_SCALE = 2.4;
const SHAKE_SECONDS = 0.35;
const SHAKE_GAIN = 0.014; // peak shake as a share of card width
const SHAKE_WAVES = 3;
const FLASH_SECONDS = 0.25;
const FLASH_PEAK = 0.6;
const FLASH_PEAK_AT = 0.05; // share of the flash at which it peaks (fast rise)
const GLOW_FLARE = 1.2; // extra edge glow right after landing, as a multiple of the resting glow
const GLOW_FLARE_SECONDS = 0.4;
const RING_SHARE = 0.45; // Ring base size as a share of the card width (it grows to 2.3 x that)
/** Confetti burst. */
const BURST_COUNT = 18;
const BURST_SECONDS = 0.7;
const BURST_REACH = 0.6; // furthest distance as a share of the card width
const BURST_FALL = 0.12; // gravity drop as a share of the card width
const BURST_SIZE = 0.016; // piece width as a share of the card width
/** Card proportions as shares of the card width: the text block, and the picture area on top of it. */
const TEXT_SHARE = 0.42;
const IMAGE_SHARE = 0.56;
/** Picture entrance: scale-up from IMG_FROM with a little overshoot, then a slow float. */
const IMG_POP_SECONDS = 0.4;
const IMG_FROM = 0.8;
const IMG_FLOAT = 0.006; // share of the card width
const IMG_FLOAT_SECONDS = 3;
/** Rough average glyph width of the display face, as a share of font size (first guess; measured fit corrects it). */
const GLYPH_WIDTH = 0.5;

export type AnswerCardProps = {
  /** Character name. */
  name: string;
  /** Where they are from (smaller line under the name). */
  from: string;
  /** Stamp tick. */
  at: number;
  /** Border and glow colour. */
  accent: string;
  /** Centre-x and top-y of the card, reference units. */
  place: { x: number; y: number };
  /** Card width, reference units. */
  size: number;
  /** Picture file name inside public/search/answers (from answer-images.json). Omit for the text-only card. */
  image?: string;
  /** Draw the empty glowing outline just before the stamp. Default true. */
  anticipate?: boolean;
};

/** Card height in reference units for a card of width `size`, so the caller can centre it. */
export const answerCardHeight = (size: number, hasImage: boolean): number =>
  size * (TEXT_SHARE + (hasImage ? IMAGE_SHARE : 0));

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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

export const AnswerCard: React.FC<AnswerCardProps> = ({ name, from, at, accent, place, size, image, anticipate = true }) => {
  const frame = useDesignFrame();

  const W = px(size);
  const textH = W * TEXT_SHARE;
  const imgH = image ? W * IMAGE_SHARE : 0;
  const H = textH + imgH;
  const pad = W * 0.06;
  const nameFit = useFit(W - 2 * pad);
  const fromFit = useFit(W - 2 * pad);

  const anticipation = ANTICIPATION_SECONDS * FPS;
  if (frame < at - (anticipate ? anticipation : 0)) return null;

  const stampTicks = STAMP_SECONDS * FPS;
  const land = at + stampTicks;
  const t = clamp01((frame - at) / stampTicks);
  const scale = 1 + (STAMP_FROM_SCALE - 1) * Math.pow(1 - t, 2);
  const opacity = clamp01(t * 3);

  // Anticipation: the edge glow builds before the stamp (accelerating).
  const build = Math.pow(clamp01((frame - (at - anticipation)) / anticipation), 2);

  // Shake after landing: damped, x and y out of phase.
  const s = clamp01((frame - land) / (SHAKE_SECONDS * FPS));
  const amp = frame >= land ? W * SHAKE_GAIN * Math.pow(1 - s, 2) : 0;
  const dx = amp * Math.sin(s * Math.PI * 2 * SHAKE_WAVES);
  const dy = amp * Math.cos(s * Math.PI * 2 * SHAKE_WAVES) * 0.6;

  // Edge glow: full at rest, flares right after landing.
  const flare = frame >= land ? GLOW_FLARE * Math.pow(1 - clamp01((frame - land) / (GLOW_FLARE_SECONDS * FPS)), 2) : 0;
  const glow = px(36) * (1 + flare);

  // Fit the name on one line: as big as the card height allows, shrunk for long names, then measured.
  const nameBase = Math.min(textH * 0.5, (W - 2 * pad) / (Math.max(1, name.length) * GLYPH_WIDTH));
  const nameFont = nameBase * nameFit.fit;
  const fromFont = Math.min(textH * 0.16, nameBase * 0.4) * fromFit.fit;
  const radius = Math.min(H * 0.18, W * 0.09);

  // Picture: pops in with a little overshoot when the card appears, then floats slowly.
  const imgT = clamp01((frame - at) / (IMG_POP_SECONDS * FPS));
  const back = 1 + 2.70158 * Math.pow(imgT - 1, 3) + 1.70158 * Math.pow(imgT - 1, 2);
  const imgScale = IMG_FROM + (1 - IMG_FROM) * back;
  const imgFloat = frame >= land ? Math.sin(((frame - land) / (IMG_FLOAT_SECONDS * FPS)) * Math.PI * 2) * W * IMG_FLOAT : 0;

  const box: React.CSSProperties = { position: 'absolute', left: px(place.x) - W / 2, top: px(place.y), width: W, height: H };

  return (
    <>
      {/* anticipation: an empty outline whose glow builds; the card takes over at the same place when it lands */}
      {anticipate && frame < land ? (
        <div
          style={{
            ...box,
            boxSizing: 'border-box',
            borderRadius: radius,
            border: `${px(3)}px solid ${accent}`,
            boxShadow: `0 0 ${px(36) * (0.3 + 1.2 * build)}px ${accent}`,
            opacity: build,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {frame >= at ? (
        <div
          style={{
            ...box,
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
            transformOrigin: 'center center',
            opacity,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: textH * 0.06,
              padding: `0 ${pad}px`,
              ...glass(radius, 0.1),
              border: `${px(3)}px solid ${accent}`,
              boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.5), 0 0 ${glow}px ${accent}88`,
              background: COLORS.glassStrong,
            }}
          >
            {image ? (
              <div
                style={{
                  width: '100%',
                  height: imgH,
                  boxSizing: 'border-box',
                  padding: `${pad * 0.9}px 0 0`,
                  marginBottom: -textH * 0.06,
                  background: `radial-gradient(ellipse 60% 55% at 50% 58%, ${accent}33, transparent 72%)`,
                }}
              >
                <Img
                  src={staticFile(`search/answers/${image}`)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `translateY(${imgFloat}px) scale(${imgScale})`,
                    filter: `drop-shadow(0 ${W * 0.02}px ${W * 0.035}px rgba(0,0,0,0.45))`,
                  }}
                />
              </div>
            ) : null}
            <div
              ref={nameFit.ref}
              style={{
                fontFamily: FONTS.display,
                fontSize: nameFont,
                lineHeight: 1,
                color: COLORS.ink,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                textShadow: `0 0 ${nameFont * 0.25}px ${accent}`,
              }}
            >
              {name}
            </div>
            <div
              ref={fromFit.ref}
              style={{
                fontFamily: FONTS.body,
                fontSize: fromFont,
                color: COLORS.muted,
                whiteSpace: 'nowrap',
              }}
            >
              {from}
            </div>
          </div>

          {/* one Flash on impact, clipped to the rounded card */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none' }}>
            <Flash frame={frame} start={land} ms={FLASH_SECONDS * 1000} peak={FLASH_PEAK} at={FLASH_PEAK_AT} />
          </div>

          {/* one Ring from the card centre, in the accent */}
          <Ring frame={frame} start={land} size={size * RING_SHARE} style={{ border: `${px(2.5)}px solid ${accent}` }} />

          {/* small confetti burst in the accent */}
          {Array.from({ length: BURST_COUNT }, (_, i) => {
            const bt = (frame - land) / (BURST_SECONDS * FPS);
            if (bt < 0 || bt >= 1) return null;
            const angle = ((i + hash(i * 3.1)) / BURST_COUNT) * Math.PI * 2;
            const reach = W * BURST_REACH * (0.55 + 0.45 * hash(i * 7.7));
            const ease = 1 - Math.pow(1 - bt, 3);
            const x = Math.cos(angle) * reach * ease;
            const y = Math.sin(angle) * reach * ease * 0.6 + W * BURST_FALL * bt * bt;
            const w = W * BURST_SIZE * (0.7 + 0.6 * hash(i * 1.9));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: w,
                  height: w * 1.6,
                  marginLeft: -w / 2,
                  marginTop: -w * 0.8,
                  background: accent,
                  borderRadius: hash(i * 5.3) > 0.5 ? '50%' : '2%',
                  opacity: 1 - bt * bt,
                  transform: `translate(${x}px, ${y}px) rotate(${bt * 540 * (hash(i * 2.3) - 0.5) * 2}deg)`,
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </div>
      ) : null}
    </>
  );
};
