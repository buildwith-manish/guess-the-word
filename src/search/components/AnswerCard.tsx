import React from 'react';
import { COLORS, FONTS, glass, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';
import '../../fonts';

/**
 * Reveal card: the character name very large, a smaller "from" line under it.
 * The card stamps in (big and fast down to full size), then shakes briefly and flashes on impact.
 * No image. Built here because src/states does not exist on this branch.
 * `at` is the stamp tick (design ticks, local to the scene). Nothing is drawn before it.
 */

/** Motion constants. Times in seconds, scales and gains as proportions. */
const STAMP_SECONDS = 0.18;
const STAMP_FROM_SCALE = 2.4;
const SHAKE_SECONDS = 0.35;
const SHAKE_GAIN = 0.014; // peak shake as a share of card width
const SHAKE_WAVES = 3;
const FLASH_SECONDS = 0.25;
const FLASH_PEAK = 0.6;
/** Rough average glyph width of the display face, as a share of font size (used to fit the name). */
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
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const AnswerCard: React.FC<AnswerCardProps> = ({ name, from, at, accent, place, size }) => {
  const frame = useDesignFrame();
  if (frame < at) return null;

  const W = px(size);
  const H = W * 0.42;
  const pad = W * 0.06;

  const stampTicks = STAMP_SECONDS * FPS;
  const t = clamp01((frame - at) / stampTicks);
  const land = at + stampTicks;
  const scale = 1 + (STAMP_FROM_SCALE - 1) * Math.pow(1 - t, 2);
  const opacity = clamp01(t * 3);

  // Shake after landing: damped, x and y out of phase.
  const s = clamp01((frame - land) / (SHAKE_SECONDS * FPS));
  const amp = frame >= land ? W * SHAKE_GAIN * Math.pow(1 - s, 2) : 0;
  const dx = amp * Math.sin(s * Math.PI * 2 * SHAKE_WAVES);
  const dy = amp * Math.cos(s * Math.PI * 2 * SHAKE_WAVES) * 0.6;

  // Flash on impact.
  const f = clamp01((frame - land) / (FLASH_SECONDS * FPS));
  const flash = frame >= land ? FLASH_PEAK * Math.pow(1 - f, 2) : 0;

  // Fit the name on one line: as big as the card height allows, shrunk for long names.
  const nameFont = Math.min(H * 0.5, (W - 2 * pad) / (Math.max(1, name.length) * GLYPH_WIDTH));
  const fromFont = Math.min(H * 0.16, nameFont * 0.4);

  return (
    <div
      style={{
        position: 'absolute',
        left: px(place.x) - W / 2,
        top: px(place.y),
        width: W,
        height: H,
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
          gap: H * 0.06,
          padding: `0 ${pad}px`,
          ...glass(H * 0.18, 0.1),
          border: `${px(3)}px solid ${accent}`,
          boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.5), 0 0 ${px(36)}px ${accent}88`,
          background: COLORS.glassStrong,
        }}
      >
        <div
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: H * 0.18,
          background: COLORS.ink,
          opacity: flash,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
