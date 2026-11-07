/**
 * bonus-icons.tsx — PNG icon system for the bonus rounds.
 *
 * Replaces the old emoji-glyph tiles (🍎, 🐸, 🕐 …) with transparent 1280×1280
 * PNGs from public/bonus-icons/. One folder, one naming convention, one
 * component: <BonusIcon name="apple" size={100} />.
 *
 * The bonus engine (src/bonus-engine.ts) stores icon *names* (strings like
 * 'apple', 'clock1') on every puzzle. This module is the only place that knows
 * how a name turns into a URL + a human-readable label, so the engine data
 * stays serializable and the rendering stays in one spot.
 *
 * PNG source: bonus-icons.zip — every file is a transparent 1280×1280 PNG on
 * the same canvas / margin as the normal-round clue icons. bell.png, key.png
 * and car.png are copies of the repo's Q05_B_Cowbell.png, Q12_A_Keyhole.png
 * and Q21_A_Carsick.png, so the whole set lives in one folder.
 */
import React from 'react';
import { staticFile } from 'remotion';

export type IconName =
  | 'apple' | 'banana' | 'carrot' | 'grapes'
  | 'frog' | 'snake' | 'lizard' | 'turtle' | 'crocodile'
  | 'penguin'
  | 'star' | 'car'
  | 'key' | 'pizza' | 'clock1' | 'clock2'
  | 'trophy' | 'balloon' | 'guitar' | 'sunflower' | 'bell';

/**
 * The single source of truth: icon name → { src, label }.
 *  - src:   path under public/ (served by Remotion's staticFile())
 *  - label: short readable name, used in on-screen answer text and alt text.
 *           Kept short so the voiceover can read it inside the reveal hold.
 */
export const BONUS_ICONS: Record<IconName, { src: string; label: string }> = {
  apple:     { src: staticFile('bonus-icons/apple.png'),     label: 'apple' },
  banana:    { src: staticFile('bonus-icons/banana.png'),    label: 'banana' },
  carrot:    { src: staticFile('bonus-icons/carrot.png'),    label: 'carrot' },
  grapes:    { src: staticFile('bonus-icons/grapes.png'),    label: 'grapes' },
  frog:      { src: staticFile('bonus-icons/frog.png'),      label: 'frog' },
  snake:     { src: staticFile('bonus-icons/snake.png'),     label: 'snake' },
  lizard:    { src: staticFile('bonus-icons/lizard.png'),    label: 'lizard' },
  turtle:    { src: staticFile('bonus-icons/turtle.png'),    label: 'turtle' },
  crocodile: { src: staticFile('bonus-icons/crocodile.png'), label: 'crocodile' },
  penguin:   { src: staticFile('bonus-icons/penguin.png'),   label: 'penguin' },
  star:      { src: staticFile('bonus-icons/star.png'),      label: 'star' },
  car:       { src: staticFile('bonus-icons/car.png'),       label: 'car' },
  key:       { src: staticFile('bonus-icons/key.png'),       label: 'key' },
  pizza:     { src: staticFile('bonus-icons/pizza.png'),     label: 'pizza' },
  clock1:    { src: staticFile('bonus-icons/clock1.png'),    label: '1:00' },
  clock2:    { src: staticFile('bonus-icons/clock2.png'),    label: '2:00' },
  trophy:    { src: staticFile('bonus-icons/trophy.png'),    label: 'trophy' },
  balloon:   { src: staticFile('bonus-icons/balloon.png'),   label: 'balloon' },
  guitar:    { src: staticFile('bonus-icons/guitar.png'),    label: 'guitar' },
  sunflower: { src: staticFile('bonus-icons/sunflower.png'), label: 'sunflower' },
  bell:      { src: staticFile('bonus-icons/bell.png'),      label: 'bell' },
};

/** Resolve a name to its PNG URL. Throws on unknown names so a typo fails loud. */
export const iconSrc = (name: IconName): string => {
  const m = BONUS_ICONS[name];
  if (!m) throw new Error(`bonus-icons: unknown icon name "${name}"`);
  return m.src;
};

/** Resolve a name to its readable label (used in answer strings + alt text). */
export const iconLabel = (name: IconName): string => {
  const m = BONUS_ICONS[name];
  if (!m) throw new Error(`bonus-icons: unknown icon name "${name}"`);
  return m.label;
};

/**
 * <BonusIcon> — renders one PNG icon at a given pixel size.
 * The PNG is 1280×1280 with transparent margins, so objectFit: 'contain'
 * keeps the art centred and never clips. `size` is the box edge in CSS px
 * (already passed through px() by the caller).
 */
export const BonusIcon: React.FC<{
  name: IconName;
  size: number;
  style?: React.CSSProperties;
}> = ({ name, size, style }) => {
  const meta = BONUS_ICONS[name];
  if (!meta) {
    if (typeof name === 'string') {
      // graceful fallback: render the name as text so the render never crashes
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            fontSize: size * 0.3,
            color: '#fff',
            ...style,
          }}
        >
          {name}
        </span>
      );
    }
    return null;
  }
  return (
    <img
      src={meta.src}
      alt={meta.label}
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
    />
  );
};
