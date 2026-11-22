/**
 * look.ts: the material of the States video (Video 4). States-only: the shared style.ts / ios tokens are not changed.
 * Step 3 adds the glass panel here; Steps 4-5 (soft light, colour tokens) and 7 (type scale) extend this file.
 *
 * glassPanel(radius, accent?, depth?) is the ONE panel style of the States video: a translucent white fill over the dark
 * theme, a backdrop blur, a 1 px light inner border, a second faint accent border, a soft large shadow and a top-edge
 * highlight (a white gradient that fades out in the first third of the panel). Everything is static CSS, so it is
 * deterministic in a Remotion render (no animation, no randomness); the entrance transforms live in motion.ts.
 *
 * KNOBS: GLASS (material) and RADIUS (one radius scale) below.
 */
import type { CSSProperties } from 'react';
import { px } from '../style';

export const GLASS = {
  /** translucent fill: white over the dark theme (6-9%) */
  fill: 0.07,
  /** top-edge highlight: white at the top fading to 0 over the first `highlightEnd` of the height */
  highlight: 0.1,
  highlightEnd: 0.35,
  /** backdrop blur (ref px) and saturation */
  blur: 22,
  saturate: 1.15,
  /** 1 px hairline border, white (10-14%); the rim light below brightens its top-left edge */
  borderAlpha: 0.12,
  /** second, faint border in the accent colour (percent of the accent colour) */
  accentRing: 22,
  /** soft large shadow (ref px offset / blur, black alpha) at depth 1 */
  shadowY: 24,
  shadowBlur: 60,
  shadowAlpha: 0.35,
} as const;

/**
 * Rim light (round two, Step 5): a brighter 1 px edge at the top-left fading to a faint one at the bottom-right. Built from
 * two inset shadows (no images, no mask): `start` white at the top-left, `end` white at the bottom-right. Both are 1 px
 * and sit on the glass edge, never over the text.
 */
export const RIM = { start: 0.3, end: 0.08, width: 1 } as const;

/**
 * Continuous corners (round two, Step 5): `corner-shape: squircle` on panels and cards (not on fully round pills), with the
 * normal border-radius as the fallback where the property is not supported (an unknown property is simply ignored).
 * KNOB: set `squircle` to false to keep plain radii.
 */
export const CORNERS = { squircle: true } as const;

/** One radius scale (ref px). Cards and panels 28-40; pills are fully round. */
export const RADIUS = {
  card: 36,
  panel: 32,
  chip: 28,
  pill: 999,
} as const;

/**
 * The glass panel. `radius` in px (use px(RADIUS.x)); `accent` adds the faint accent border; `depth` scales the shadow
 * (1 for cards, about 0.4 for small pills and chips so they do not float too far off the backdrop).
 */
export const glassPanel = (radius: number, accent?: string, depth = 1): CSSProperties => ({
  ...(CORNERS.squircle && radius < px(RADIUS.pill) * 0.5 ? ({ cornerShape: 'squircle' } as CSSProperties) : {}),
  background: `linear-gradient(180deg, rgba(255,255,255,${GLASS.highlight}) 0%, rgba(255,255,255,0) ${GLASS.highlightEnd * 100}%), rgba(255,255,255,${GLASS.fill})`,
  borderRadius: Math.min(radius, 99999),
  backdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
  WebkitBackdropFilter: `blur(${px(GLASS.blur)}px) saturate(${GLASS.saturate})`,
  border: `${px(1)}px solid rgba(255,255,255,${GLASS.borderAlpha})`,
  boxShadow: [
    `inset ${px(RIM.width)}px ${px(RIM.width)}px 0 rgba(255,255,255,${RIM.start})`,
    `inset ${-px(RIM.width)}px ${-px(RIM.width)}px 0 rgba(255,255,255,${RIM.end})`,
    accent ? `inset 0 0 0 ${px(1)}px color-mix(in srgb, ${accent} ${GLASS.accentRing}%, transparent)` : undefined,
    `0 ${px(GLASS.shadowY) * depth}px ${px(GLASS.shadowBlur) * depth}px rgba(0,0,0,${GLASS.shadowAlpha})`,
  ]
    .filter(Boolean)
    .join(', '),
  boxSizing: 'border-box',
});

/**
 * Soft light (Step 4): glow is two wide, low-opacity layers instead of one tight strong one, like
 * `0 0 40px accent 25%` + `0 0 120px accent 10%`. Sizes are multiples of the shape's crisp core stroke (SVG units), so
 * the glow scales with the shape. Glow only ever sits behind shapes and map outlines, never behind text, so it cannot
 * reduce text contrast; the card border is a separate element (look.ts glassPanel) the glow never touches.
 */
export const SOFT_GLOW = {
  /** closer layer: stroke width, Gaussian sigma (x core) and opacity at glow = 1 */
  near: { width: 4, blur: 8, alpha: 0.2 },
  /** far, very wide layer */
  far: { width: 10, blur: 24, alpha: 0.09 },
} as const;

/** Mini-map "current state" halo: how much the 900 ms pulse lifts the halo (0 = none). Was 1.0 (halo doubled at the peak). */
export const MINI_PULSE = { lift: 0.2 } as const;

/**
 * Colour tokens (Step 5). One accent per level (states-settings.json levels[].accent), one neutral white, one secondary
 * grey. GOLD is only the word STATE in the title and rare highlights (the streak banner, the top scoreboard rank);
 * nothing else is gold (the MEDIUM level accent is sky blue for that reason). No hex values in components: use these.
 *
 * Level accents (round two, Step 7) are the iOS dark-mode system colours, set in states-settings.json: EASY green #30D158,
 * MEDIUM blue #0A84FF, HARD red #FF453A (the orange #FF9F0A is only 6 degrees from gold, QA check 11), EXPERT purple #BF5AF2.
 * Each level's bg / theme are dark tints (14% / 62%) of its accent. On HARD the accent equals COLOR.alert, so the last-3-seconds
 * red is not a visible change there (the digit keeps its alert colour).
 *
 * Text: primary white at 92%, labels at 60%, hints at 45%. scripts/states-qa.js check 11 measures their contrast over every
 * backdrop colour (primary >= 7:1, labels >= 4.5:1, hints >= 3:1) and checks where gold is used.
 */
export const COLOR = {
  text: {
    primary: 'rgba(255,255,255,0.92)',
    label: 'rgba(255,255,255,0.60)',
    hint: 'rgba(255,255,255,0.45)',
  },
  /** hairline fills for rings, discs and chips */
  fill: 'rgba(255,255,255,0.10)',
  fillStrong: 'rgba(255,255,255,0.16)',
  /** the rare highlight: title word STATE, streak banner, top scoreboard rank */
  gold: '#FFD60A', // iOS system yellow (was #F5C84C)
  /** the bonus rounds' accent (matches their orange backdrop) */
  bonus: '#FF8A3D',
  /** the clock and ring in the last 3 seconds; the subscribe pill */
  alert: '#FF453A',
  /** the softer tone the timer ring, head and digit shift to in the last 3 seconds: a lighter alert, same hue family (about 3 degrees, 40 from gold) */
  alertSoft: '#FF7B72',
  /** the true neighbour on the borders bonus */
  positive: '#30D158',
  /** text on an accent-filled chip (dark) and on the alert pill (white) */
  onAccent: '#0B0B12',
  onAlert: '#FFFFFF',
  black: '#000000',
} as const;

/** Backdrop colours the text sits on (black, the raised dark, the level backgrounds are added from the settings by the QA). */
export const BACKDROP = { black: '#000000', raised: '#0B0B12' } as const;

/** Alpha helpers for the atmosphere layers (Step 6): white light and black shade at a given alpha (0..1). */
export const whiteA = (a: number): string => `rgba(255,255,255,${a})`;
export const blackA = (a: number): string => `rgba(0,0,0,${a})`;

/**
 * Typography (Step 7): ONE family. FONT.display and FONT.sans are both Inter (bundled in public/fonts/ios); titles (the title lockup and the
 * level name) are Inter bold with tight tracking. Emoji glyphs fall back to the bundled Noto Color
 * Emoji through the stacks; that is a glyph set, not a third text face. No component names a family: use these.
 *
 * KNOB: to bring Anton back, set FONT.display to an Anton stack and the title weights back to WEIGHT.regular.
 */
const SANS = '"Inter", -apple-system, "SF Pro Text", system-ui, "Noto Color Emoji", sans-serif';
export const FONT = { sans: SANS, display: SANS } as const; // one family: Inter (Anton dropped, was the "font fight"); display = bold Inter

/** Weights: 700 for labels and values, 500 / 400 for secondary text. Inter ships 400, 500, 600, 700 (no 800). */
export const WEIGHT = { regular: 400, medium: 500, strong: 700 } as const;

/** Type scale (reference px, pass through px()): caption, label, body, title, hero, display numeral. */
export const TYPE = { xs: 20, sm: 26, md: 32, lg: 56, xl: 92, xxl: 150 } as const;

/** Letter-spacing: uppercase labels get 0.14em (inside the 0.12-0.2em range); big titles are pulled in a little. */
export const TRACKING = { label: '0.14em', title: '-0.02em' } as const;

/**
 * Brand badge (round two, Step 1): the QUIZ MATRIX pill, top right. Inter, label colour, 0.14em tracking, a thin neutral
 * stroke icon and a glass pill; no gold, no mono. All sizes are reference px (pass through px()).
 */
export const BADGE = {
  top: 40,
  right: 68,
  fontSize: 17,
  gap: 12,
  padX: 20,
  padY: 10,
  /**
   * The QUIZ MATRIX logo: a still bulb (no rays, no sparkles, no loop), public/images/states/quiz-matrix-bulb.png, one
   * 128 px cell (cols 1, rows 1, frames 1), drawn on a frosted-glass disc (src/ios/QuizMatrixBadge.tsx). `size` is the logo
   * box in ref px; `overhang` lets it stand that many ref px above and below the pill's text row without making the pill taller.
   */
  logo: { file: 'images/states/quiz-matrix-bulb.png', cols: 1, rows: 1, frames: 1, fps: 30, size: 52, overhang: 10 },
  /** glassPanel depth for the pill */
  depth: 0.4,
} as const;

/**
 * Timer ring (round two, Step 2), proportions as fractions of the ring diameter. stroke was 0.016; the digit was 0.24 in
 * label grey and is now 1.3x larger (0.312) in the primary text colour (red only in the last 3 s).
 */
export const TIMER = {
  /** round four: 1.5x thicker (0.013 -> 0.0195 of the diameter) */
  stroke: 0.0195,
  /** arc gradient: start of the arc is the accent mixed with this share of white (about 20%), the head is the full accent */
  arcTint: 20,
  /** head dot: diameter as a multiple of the stroke, and the gain on SOFT_GLOW's two layers (blur radius in head diameters) */
  headScale: 1.4,
  headGlowGain: 1.75,
  headGlowBlur: 1.2,
  /** last 3 seconds: ring and head cross-fade to alertSoft over this many ticks; each whole second the timer scales up to alertPeak (<= SETTLE.maxPeak 1.03) and settles back inside the second */
  /** tick marks: one per second inside the ring (inset and length are fractions of the diameter), dim to tickDim as the head passes, fade tickFade ticks, thinned above tickMax */
  tickInset: 0.025,
  tickLen: 0.03,
  tickDim: 0.25,
  tickFade: 6,
  tickMax: 12,
  /** time up: a single soft highlight sweeps round the ring (flashTicks long, starting flashLead ticks before the clock ends, peak alpha flashAlpha of white), then the whole timer dissolves (opacity to 0, scale to 1 + dissolveScale) over the window up to the reveal */
  flashTicks: 8,
  flashLead: 2,
  flashAlpha: 0.2,
  flashWidth: 70,
  dissolveScale: 0.04,
  /** digit change: blur (ref px) of the digit that leaves, shared by the ring and the bonus bar */
  digitBlur: 4,
  alertFade: 6,
  alertPeak: 1.025,
  alertSettle: 24,
  /** the faint outer glow breathes once per second in the last 3: alpha is SOFT_GLOW.far.alpha x this, blur radius in ring diameters */
  breatheGain: 1.5,
  breatheBlur: 0.22,
  /** round four: digit is the hero, 1.3x the round-two size (0.312 -> 0.40 of the ring diameter) */
  digitSize: 0.4,
  digitBelowGap: 0.06,
  /** round four: glass disc inside the ring; clear gap between the disc and the ring's inner edge, fraction of the diameter (10-14%) */
  discGap: 0.12,
  /** the disc is a small glass piece: shadow depth (0.5 per the brief) */
  discDepth: 0.5,
} as const;

/**
 * Map readability (round two, Step 3): unanswered states are a lifted white fill (about 9%) with a 0.75 px hairline at 14%
 * white, so they read on the dark backdrop; answered states keep the level accent. Used by MiniMap, which draws both the
 * corner map and the big answer-card map, so the two keep the same relationship. Hairline width is in map units (975 wide).
 */
export const MAP = {
  unansweredFill: 0.16,
  unansweredEdge: 0.30,
  unansweredEdgeWidth: 0.75,
} as const;

/**
 * Glass backdrop blobs (round two, Step 5): 2-3 very soft lights in the level accent (8-14%) so the glass has something to
 * blur. Positions and sizes are percent of the frame; they sit behind the HUD pill, the shape tile and the answer card.
 * Drift is a seeded sine of the global frame, at most `driftPx` reference px, on a long loop. No new colours.
 */
export const BLOBS = {
  driftPx: 8,
  loopSeconds: [41, 53, 67] as const,
  items: [
    /** behind the HUD pill (top left) */
    { x: 14, y: 14, size: 26, alpha: 0.1 },
    /** behind the shape tile (centre) */
    { x: 50, y: 56, size: 34, alpha: 0.12 },
    /** behind the answer card (left, lower) */
    { x: 24, y: 66, size: 30, alpha: 0.09 },
  ],
} as const;

/**
 * Grouped list (round two, Step 8): the scoreboard rows live in ONE glass container, separated by 1 px hairlines inset from
 * the left like iOS Settings. Reference px (pass through px()); all on the 8-pt scale. Numbers use tabular-nums.
 */
export const LIST = {
  rowH: 64,
  padX: 24,
  gap: 16,
  iconSize: 34,
  /** hairline starts here: the row's left padding + the icon + the gap */
  separatorInset: 24 + 34 + 16,
  /** fixed width of the score range so the numbers line up in a column */
  rangeW: 96,
} as const;

/**
 * Icons and small details (round two, Step 10). ICON: UI icons are thin, rounded SF-Symbols-style strokes (1.75 px at the
 * reference size, round caps and joins, label colour). VOICE: the speaking bars are rounded and at 70%. HAIRLINE: every
 * hairline is 1 px at 10-14% white (no 2 px borders); the guide ring for the YouTube subscribe element keeps its alert colour.
 */
export const ICON = { stroke: 1.75 } as const;
export const VOICE = { barAlpha: 0.7 } as const;
export const HAIRLINE = { width: 1 } as const;
