/**
 * Icon.tsx — the video's own icon set, replacing system emoji.
 *
 * Why: emoji are drawn by whatever emoji font the render machine has, so they look different on
 * Windows / macOS / the GitHub Actions Linux runner, and they ignore the video's neon look.
 * These are SVG icons in the video's palette (gold, flame orange, red, cyan, green) with a soft
 * glow and a small ambient animation, so every render looks identical.
 *
 *   <Icon name="fire" size={px(20)} />            a single icon (size in px, or '1em' to follow the text)
 *   <Rich size="1.1em">LEGEND 👑</Rich>             any emoji inside a string becomes its icon automatically
 *
 * Unknown emoji are left as normal text. Add a new icon: draw it in ICONS and map it in EMOJI_ICON.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from './style';

export type IconName = 'fire' | 'cross' | 'bolt' | 'crown' | 'check' | 'bulb' | 'bell' | 'thumb' | 'sprout' | 'chevrons' | 'arrowDown';

/** emoji (or symbol) -> icon */
export const EMOJI_ICON: Record<string, IconName> = {
  '🔥': 'fire',
  '❌': 'cross',
  '⚡': 'bolt',
  '👑': 'crown',
  '✔': 'check',
  '✓': 'check',
  '💡': 'bulb',
  '🔔': 'bell',
  '👍': 'thumb',
  '🌱': 'sprout',
  '💪': 'chevrons', // KEEP GOING rank: climbing chevrons read better than a tiny arm
  '👇': 'arrowDown',
  '⬇': 'arrowDown',
};

const sine = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);

type Def = { glow: string; glowPx: number; draw: (t: number) => React.ReactNode };

// userSpaceOnUse: a perfectly straight vertical stroke has a zero-width bounding box, which would hide it
const stroke = (id: string, a: string, b: string) => (
  <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="64">
    <stop offset="0" stopColor={a} />
    <stop offset="1" stopColor={b} />
  </linearGradient>
);

const ICONS: Record<IconName, Def> = {
  // flame: outer + inner tongue flicker at different speeds
  fire: {
    glow: '#FF9F1C',
    glowPx: 5,
    draw: (t) => {
      const f1 = sine(t, 2.3);
      const f2 = sine(t, 3.4, 0.3);
      const f3 = sine(t, 4.6, 0.6);
      return (
        <>
          <defs>
            <linearGradient id="ic-fire-o" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF4D6A" />
              <stop offset="0.5" stopColor="#FF9F1C" />
              <stop offset="1" stopColor="#FFC93C" />
            </linearGradient>
            {stroke('ic-fire-i', '#FFF3C4', '#FFC93C')}
          </defs>
          <g transform={`translate(32 60) scale(${1 + 0.03 * f2} ${1 + 0.06 * f1}) skewX(${2.2 * f3}) translate(-32 -60)`}>
            <path d="M32 3 C34 14 47 20 49 35 C51 49 43 61 32 61 C21 61 13 51 15 38 C16 31 20 27 24 21 C25 28 28 30 30 29 C31 21 29 11 32 3Z" fill="url(#ic-fire-o)" />
          </g>
          <g transform={`translate(32 59) scale(${1 + 0.05 * f3} ${1 + 0.1 * f2}) translate(-32 -59)`}>
            <path d="M32 28 C34 36 41 40 41 48 C41 55 37 59 32 59 C27 59 23 55 23 49 C23 43 29 40 32 28Z" fill="url(#ic-fire-i)" />
          </g>
        </>
      );
    },
  },

  // X: thick rounded strokes in the video's red, with a small pop
  cross: {
    glow: COLORS.red,
    glowPx: 5,
    draw: (t) => {
      const s = 1 + 0.03 * sine(t, 1.1);
      return (
        <>
          <defs>{stroke('ic-cross', COLORS.redSoft, COLORS.red)}</defs>
          <g transform={`translate(32 32) scale(${s}) translate(-32 -32)`}>
            <path d="M16 16 L48 48 M48 16 L16 48" stroke="url(#ic-cross)" strokeWidth="11" strokeLinecap="round" fill="none" />
            <path d="M16 16 L48 48 M48 16 L16 48" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4" strokeLinecap="round" fill="none" transform="translate(-1.2 -1.6)" />
          </g>
        </>
      );
    },
  },

  // lightning bolt: gold gradient, gentle pulse
  bolt: {
    glow: COLORS.yellow,
    glowPx: 6,
    draw: (t) => {
      const s = 1 + 0.045 * sine(t, 1.8);
      return (
        <>
          <defs>{stroke('ic-bolt', '#FFE27A', '#FF9F1C')}</defs>
          <g transform={`translate(32 32) scale(${s}) translate(-32 -32)`}>
            <path d="M37 3 L13 37 H29 L24 61 L51 25 H35 L37 3Z" fill="url(#ic-bolt)" stroke="#FFE9A8" strokeWidth="1.6" strokeLinejoin="round" />
          </g>
        </>
      );
    },
  },

  // crown: gold body, jewel tips, a highlight that sweeps across
  crown: {
    glow: COLORS.yellow,
    glowPx: 6,
    draw: (t) => {
      const shift = ((t * 0.55) % 1) * 2.4 - 1.2;
      const body = 'M7 50 L7 21 L22 34 L32 12 L42 34 L57 21 L57 50 Z';
      return (
        <>
          <defs>
            <linearGradient id="ic-crown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={COLORS.yellowSoft} />
              <stop offset="0.45" stopColor={COLORS.yellow} />
              <stop offset="1" stopColor={COLORS.yellowDeep} />
            </linearGradient>
            <linearGradient id="ic-crown-s" x1="0" y1="0" x2="1" y2="0" gradientTransform={`translate(${shift} 0)`}>
              <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
              <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={body} fill="url(#ic-crown)" stroke="#FFE9A8" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="7" y="50" width="50" height="9" rx="3.5" fill="url(#ic-crown)" stroke="#FFE9A8" strokeWidth="2" />
          <path d={body} fill="url(#ic-crown-s)" />
          <circle cx="7" cy="20" r="4" fill={COLORS.cyan} />
          <circle cx="32" cy="10" r="4.5" fill={COLORS.red} />
          <circle cx="57" cy="20" r="4" fill={COLORS.cyan} />
          <circle cx="32" cy="54.5" r="2.4" fill={COLORS.inkDark} opacity="0.55" />
        </>
      );
    },
  },

  // tick: thick rounded green stroke
  check: {
    glow: COLORS.green,
    glowPx: 5,
    draw: (t) => {
      const s = 1 + 0.03 * sine(t, 1.1);
      return (
        <>
          <defs>{stroke('ic-check', '#8CF0C7', COLORS.green)}</defs>
          <g transform={`translate(32 32) scale(${s}) translate(-32 -32)`}>
            <path d="M12 34 L26 48 L52 17" stroke="url(#ic-check)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M12 34 L26 48 L52 17" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(-1 -1.6)" />
          </g>
        </>
      );
    },
  },

  // light bulb: glass glows, filament pulses
  bulb: {
    glow: COLORS.yellow,
    glowPx: 7,
    draw: (t) => {
      const p = 0.78 + 0.22 * sine(t, 1.3);
      return (
        <>
          <defs>
            <radialGradient id="ic-bulb" cx="0.5" cy="0.4" r="0.65">
              <stop offset="0" stopColor="#FFF8D6" />
              <stop offset="0.55" stopColor={COLORS.yellow} />
              <stop offset="1" stopColor={COLORS.yellowDeep} />
            </radialGradient>
          </defs>
          <path d="M32 4 C20 4 12 13 12 24 C12 32 17 36 20 41 C22 44 22 46 22 48 H42 C42 46 42 44 44 41 C47 36 52 32 52 24 C52 13 44 4 32 4Z" fill="url(#ic-bulb)" stroke="#FFF3C4" strokeWidth="2" strokeLinejoin="round" opacity={0.9 + 0.1 * p} />
          <path d="M26 40 L26 31 L32 25 L38 31 L38 40" stroke={COLORS.inkDark} strokeOpacity={0.55 * p} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="23" y="51" width="18" height="5.5" rx="2.7" fill="#9AA3C7" />
          <rect x="26" y="58" width="12" height="4" rx="2" fill="#6E769B" />
        </>
      );
    },
  },

  // bell: swings from the top
  bell: {
    glow: COLORS.yellow,
    glowPx: 5,
    draw: (t) => {
      const swing = 13 * sine(t, 1.5) * (0.55 + 0.45 * Math.abs(sine(t, 0.35)));
      return (
        <>
          <defs>{stroke('ic-bell', COLORS.yellowSoft, COLORS.yellowDeep)}</defs>
          <g transform={`rotate(${swing} 32 6)`}>
            <circle cx="32" cy="7" r="3.6" fill={COLORS.yellow} />
            <path d="M32 9 C22 9 16.5 17 16.5 27 V37 C16.5 43 13 45 11 48.5 H53 C51 45 47.5 43 47.5 37 V27 C47.5 17 42 9 32 9Z" fill="url(#ic-bell)" stroke="#FFF3C4" strokeWidth="2" strokeLinejoin="round" />
            <path d="M24 51 A8 8 0 0 0 40 51 Z" fill={COLORS.yellowDeep} />
            <path d="M23 20 C21.5 24 21.5 30 22 35" stroke="rgba(255,255,255,0.6)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </g>
        </>
      );
    },
  },

  // thumbs up: green, bounces
  thumb: {
    glow: COLORS.green,
    glowPx: 5,
    draw: (t) => {
      const y = -2.5 * Math.abs(sine(t, 0.9));
      return (
        <>
          <defs>{stroke('ic-thumb', '#8CF0C7', '#1FAE7A')}</defs>
          <g transform={`translate(0 ${y})`}>
            <rect x="6" y="28" width="13" height="28" rx="3.5" fill="url(#ic-thumb)" stroke="#CFFBE8" strokeWidth="1.8" />
            <path d="M23 29 L33 6 C38 6 41 10 40 15 L38 24 H52 C56 24 58.5 28 57.5 32 L53 50 C52 54 49 56 45 56 H23 Z" fill="url(#ic-thumb)" stroke="#CFFBE8" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M28 33 L35 15" stroke="rgba(255,255,255,0.5)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </g>
        </>
      );
    },
  },

  // sprout: two leaves, sways
  sprout: {
    glow: COLORS.green,
    glowPx: 5,
    draw: (t) => {
      const sway = 4 * sine(t, 0.7);
      return (
        <>
          <defs>{stroke('ic-sprout', '#9CF5CF', '#1FAE7A')}</defs>
          <ellipse cx="32" cy="59" rx="16" ry="3.6" fill="#7A5A2B" opacity="0.85" />
          <g transform={`rotate(${sway} 32 58)`}>
            <path d="M32 58 V32" stroke="#34D399" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M32 38 C19 40 10 31 10 17 C24 17 32 24 32 38Z" fill="url(#ic-sprout)" stroke="#CFFBE8" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M32 31 C32 17 41 8 56 8 C56 23 47 33 32 31Z" fill="url(#ic-sprout)" stroke="#CFFBE8" strokeWidth="1.6" strokeLinejoin="round" />
          </g>
        </>
      );
    },
  },

  // double chevrons that climb: KEEP GOING
  chevrons: {
    glow: '#FB7185',
    glowPx: 5,
    draw: (t) => {
      const o1 = 0.55 + 0.45 * Math.max(0, sine(t, 1.2, 0.25));
      const o2 = 0.55 + 0.45 * Math.max(0, sine(t, 1.2, 0));
      const up = -2 * sine(t, 1.2);
      return (
        <>
          <defs>{stroke('ic-chev', '#FF9DB0', '#FF3D63')}</defs>
          <g transform={`translate(0 ${up})`}>
            <path d="M13 31 L32 12 L51 31" stroke="url(#ic-chev)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={o1} />
            <path d="M13 53 L32 34 L51 53" stroke="url(#ic-chev)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={o2} />
          </g>
        </>
      );
    },
  },

  // arrow that nudges down: replaces the pointing hand
  arrowDown: {
    glow: COLORS.cyan,
    glowPx: 5,
    draw: (t) => {
      const y = 3.5 * (0.5 + 0.5 * sine(t, 1.1));
      return (
        <>
          <defs>{stroke('ic-arrow', '#B6F3FF', COLORS.cyan)}</defs>
          <g transform={`translate(0 ${y})`}>
            <path d="M32 8 V48" stroke="url(#ic-arrow)" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M13 31 L32 51 L51 31" stroke="url(#ic-arrow)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </>
      );
    },
  },
};

export const Icon: React.FC<{
  name: IconName;
  /** px number, or a CSS size like '1em' to follow the surrounding text */
  size?: number | string;
  /** shifts the ambient animation so several icons on screen do not move in lockstep */
  phase?: number;
  /** turn the idle animation off (frozen pose) */
  still?: boolean;
  /** 'dark' = ink silhouette for icons on yellow chips, 'light' = white silhouette for icons on hot red/orange badges */
  tone?: 'dark' | 'light';
  style?: React.CSSProperties;
}> = ({ name, size = '1em', phase = 0, still = false, tone, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = still ? 0 : frame / fps + phase;
  const def = ICONS[name];
  const g = def.glowPx * (1 + 0.2 * sine(t, 1.2, phase));
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        overflow: 'visible',
        flex: 'none',
        filter:
          tone === 'dark'
            ? 'brightness(0) opacity(0.86)'
            : tone === 'light'
              ? 'brightness(0) invert(1) drop-shadow(0 0 3px rgba(255,255,255,0.55))'
              : `drop-shadow(0 0 ${g}px ${def.glow}) drop-shadow(0 0 ${g * 0.35}px ${def.glow})`,
        ...style,
      }}
      aria-hidden
    >
      {def.draw(t)}
    </svg>
  );
};

const KEYS = Object.keys(EMOJI_ICON);
const SPLIT = new RegExp(`(${KEYS.join('|')})\\uFE0F?`, 'g');

/** Renders text with every known emoji swapped for its icon. Non-string children pass through. */
export const Rich: React.FC<{ children?: React.ReactNode; size?: number | string; tone?: 'dark' | 'light'; style?: React.CSSProperties }> = ({
  children,
  size = '1.08em',
  tone,
  style,
}) => {
  let n = 0;
  const convert = (node: React.ReactNode, keyBase: string): React.ReactNode => {
    if (typeof node === 'number') return node;
    if (typeof node !== 'string') return node;
    const parts = node.split(SPLIT);
    return parts.map((p, i) => {
      const name = EMOJI_ICON[p];
      if (!name) return <React.Fragment key={`${keyBase}-${i}`}>{p}</React.Fragment>;
      n += 1;
      return (
        <Icon
          key={`${keyBase}-${i}`}
          name={name}
          size={size}
          phase={n * 0.17}
          tone={tone}
          style={{ verticalAlign: '-0.16em', margin: '0 0.1em', ...style }}
        />
      );
    });
  };
  return <>{React.Children.map(children, (c, i) => convert(c, `r${i}`))}</>;
};
