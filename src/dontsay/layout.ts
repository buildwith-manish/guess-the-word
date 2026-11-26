/**
 * layout.ts: the ONE place for round-screen zones (task F3).
 *
 * Reference units: 1280x720, drawn at 2560x1440 through px() in each component.
 * Pure data and pure functions: no React, no remotion, no fonts, so scripts/dontsay_layout_check.ts can
 * import it in plain Node. Nothing here comes from a round except what ruleLayout() reads from the Round
 * it is given (rule type, banned / swatch / icon counts, clarification chip, heavy flag).
 *
 * Time-exclusive things (they never share the screen, so they are not checked against each other):
 *  - bubbleLarge only exists after the rule area (ruleZone) and the prompt card have faded out.
 *  - Round 45 is the exception: its own banned box sits at the bottom of ruleZone, below bubbleLarge.
 */
import type { Round } from './data';

export const REF = { w: 1280, h: 720 } as const;
/** Centre 80%: prompt text stays in x 128..1152. */
export const SAFE_X = 128;

export type Zone = { top: number; bottom: number; left?: number; right?: number };

/** Left edge of the top-left HUD (hearts pill, round counter). */
export const HUD_LEFT = 64;
/** Right margin of the watermark. */
export const HUD_RIGHT = 64;

export const layout = {
  /** One row, y 42-98: hearts pill (left), countdown pill (centre), watermark (right). */
  hudTopRow: { top: 42, bottom: 98 },
  /** Hearts pill. 44 high (HeartsPill compact). `right` is an UPPER BOUND on its width (HeartsPill was not read). */
  hudHearts: { top: 48, bottom: 92, left: HUD_LEFT, right: HUD_LEFT + 300 },
  /** Round counter "N OF 45", directly under the hearts pill. `right` is an upper bound on its width. */
  hudCounter: { top: 98, bottom: 142, left: HUD_LEFT, right: HUD_LEFT + 200 },
  /** QUIZ MATRIX watermark (Watermark.tsx: top 42, height 56, right 64). `left` is an upper bound on its width. */
  hudWatermark: { top: 42, bottom: 98, left: REF.w - HUD_RIGHT - 260, right: REF.w - HUD_RIGHT },
  /** Countdown pill, top centre, same row as the hearts and the watermark: 150 x 56. */
  countdown: { top: 42, bottom: 98, left: (REF.w - 150) / 2, right: (REF.w + 150) / 2 },
  /** Prompt card: FIXED for every round. */
  prompt: { top: 160, bottom: 280, left: SAFE_X, right: REF.w - SAFE_X },
  /** Waveform, directly under the card. */
  waveform: { top: 296, bottom: 348, left: 300, right: 980 },
  /** Rule UI: anchored from its TOP edge. `bottom` is the hard maxBottom. x range keeps clear of bubbleSmall. */
  ruleZone: { top: 372, bottom: 640, left: 300, right: 980 },
  /** Sealed bubble, bottom-right, on screen from frame 0. Mirrors InkBubble's small state (not imported). */
  bubbleSmall: { top: 552, bottom: 644, left: 998.4, right: 1152 },
  /** Enlarged bubble, centre. Exists only after ruleZone and the prompt card have faded. */
  bubbleLarge: { top: 290, bottom: 590, left: 490, right: 790 },
  /** Round 45 callback banned box: the bottom strip of ruleZone, clear of bubbleLarge (ends 590). */
  round45Box: { top: 592, bottom: 640, left: 300, right: 980 },
} as const satisfies Record<string, Zone>;

export const RULE_MAX_BOTTOM = 640;
export const ruleZoneWidth = layout.ruleZone.right - layout.ruleZone.left;
export const ruleZoneHeight = layout.ruleZone.bottom - layout.ruleZone.top;
export const bubbleLargeCentre = { x: REF.w / 2, y: (layout.bubbleLarge.top + layout.bubbleLarge.bottom) / 2 } as const;

/* ---------- prompt text ---------- */
export const PROMPT_MAX_SIZE = 92;
export const PROMPT_PAD_X = 32;
export const promptWidth = layout.prompt.right - layout.prompt.left;
export const promptHeight = layout.prompt.bottom - layout.prompt.top;
/** Average glyph width in em used for every text-fit estimate (Inter 700-800, conservative). */
export const TEXT_EM = 0.6;
export const textWidth = (s: string, font: number): number => s.length * font * TEXT_EM;
/** Largest font (<= PROMPT_MAX_SIZE) at which the prompt stays on one line. */
export const promptFontSize = (prompt: string): number =>
  Math.min(PROMPT_MAX_SIZE, Math.floor((promptWidth - PROMPT_PAD_X * 2) / (Math.max(prompt.length, 1) * TEXT_EM)));

/* ---------- rule block metrics (shared by ExclusionChips and ruleBlockHeight) ---------- */
export const MIN_TEXT = 26;
export const HEADER_H = 40;
export const HEADER_GAP = 8;
export const HEADER_BLOCK = HEADER_H + HEADER_GAP;
export const ROW_MAX = 80;
export const ROW_MIN = 48;
export const CHIP_GAP = 14;
export const CLAR_GAP = 14;

export type ChipSource = { kind: 'swatch' | 'icon' | 'rule'; key: string; label: string };
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** What the chip styles show, in order. Same rules as the old buildChips, labels only. */
export const chipSource = (round: Round): ChipSource[] => {
  const heavy = round.ruleType === 'heavy';
  if (round.swatches?.length) return round.swatches.map((s) => ({ kind: 'swatch', key: s, label: cap(s) }));
  if (round.iconChips?.length) return round.iconChips.map((n) => ({ kind: 'icon', key: n, label: n }));
  if (heavy && round.banned?.length) return round.banned.map((n) => ({ kind: 'icon', key: n, label: n }));
  if (round.rule) return [{ kind: 'rule', key: 'rule', label: round.rule }];
  return [];
};

export type RulePlan =
  | { kind: 'none'; height: 0; width: 0; header: false; ruleBreak: false }
  | {
      kind: 'rows';
      height: number;
      width: number;
      header: true;
      ruleBreak: boolean;
      rowH: number;
      font: number;
      trackW: number;
      trackH: number;
      knob: number;
      words: string[];
    }
  | {
      kind: 'chips';
      height: number;
      width: number;
      header: boolean;
      /** Show the "Banned answers" label on the header row (banned / heavy styles). */
      headerLabel: boolean;
      ruleBreak: boolean;
      heavy: boolean;
      chips: ChipSource[];
      chipW: number;
      chipH: number;
      art: number;
      font: number;
      rows: number;
      clar?: { text: string; font: number; height: number };
    };

const NONE: RulePlan = { kind: 'none', height: 0, width: 0, header: false, ruleBreak: false };

export const ruleLayout = (round: Round): RulePlan => {
  const style = round.ruleType ?? 'none';
  if (style === 'none') return NONE;
  const W = ruleZoneWidth;
  const ruleBreak = Boolean(round.heavy);

  if (style === 'banned') {
    const words = round.banned ?? [];
    if (!words.length) return NONE;
    const rowH = Math.max(ROW_MIN, Math.min(ROW_MAX, Math.floor((ruleZoneHeight - HEADER_BLOCK) / words.length)));
    const trackH = Math.round((50 * rowH) / ROW_MAX);
    const trackW = Math.round((84 * rowH) / ROW_MAX);
    const knob = trackH - 8;
    const longest = Math.max(...words.map((w) => w.length));
    const room = W - 56 - trackW - 16;
    const font = Math.max(MIN_TEXT, Math.min(Math.floor(rowH * 0.575), Math.floor(room / (longest * TEXT_EM))));
    return { kind: 'rows', height: HEADER_BLOCK + words.length * rowH, width: W, header: true, ruleBreak, rowH, font, trackW, trackH, knob, words };
  }

  // filter + heavy: chips
  const chips = chipSource(round);
  if (!chips.length) return NONE;
  const heavy = style === 'heavy';
  const header = heavy || ruleBreak;
  const headerLabel = heavy;
  let chipW: number, chipH: number, art: number, font: number, rows: number, contentW: number;
  if (heavy) {
    art = 84;
    const perRowMax = Math.max(1, Math.floor((W + CHIP_GAP) / (130 + CHIP_GAP)));
    const perRow = Math.min(chips.length, perRowMax);
    rows = Math.ceil(chips.length / perRow);
    chipW = Math.max(130, Math.min(210, Math.floor((W - CHIP_GAP * (perRow - 1)) / perRow)));
    const longest = Math.max(...chips.map((c) => c.label.length));
    font = Math.max(MIN_TEXT, Math.min(34, Math.floor((chipW - 28) / (longest * TEXT_EM))));
    chipH = 14 * 2 + art + 8 + Math.ceil(font * 1.15);
    contentW = perRow * chipW + (perRow - 1) * CHIP_GAP;
  } else {
    art = 60;
    const longest = Math.max(...chips.map((c) => c.label.length));
    font = Math.max(MIN_TEXT, Math.min(40, Math.floor((W - 56 - art - 18) / (longest * TEXT_EM))));
    chipH = 14 * 2 + art;
    // greedy packing by estimated width
    const widths = chips.map((c) => 56 + art + 18 + Math.ceil(textWidth(c.label, font)));
    let rowsN = 1, run = 0;
    for (const w of widths) {
      if (run > 0 && run + CHIP_GAP + w > W) { rowsN += 1; run = w; } else { run += (run > 0 ? CHIP_GAP : 0) + w; }
    }
    rows = rowsN;
    chipW = Math.max(...widths);
    contentW = Math.min(W, widths.reduce((a, b) => a + b, 0) + CHIP_GAP * (chips.length - 1));
  }
  let height = (header ? HEADER_BLOCK : 0) + rows * chipH + (rows - 1) * CHIP_GAP;
  let clar: { text: string; font: number; height: number } | undefined;
  if (round.clarificationChip) {
    const text = round.clarificationChip;
    const cf = Math.max(MIN_TEXT, Math.min(36, Math.floor((W - 60) / (text.length * TEXT_EM))));
    const ch = 12 * 2 + Math.ceil(cf * 1.2);
    clar = { text, font: cf, height: ch };
    height += CLAR_GAP + ch;
  }
  const width = header ? W : contentW;
  return { kind: 'chips', height, width, header, headerLabel, ruleBreak, heavy, chips, chipW, chipH, art, font, rows, clar };
};

/** Height the rule UI needs for this round, in reference units. 0 when the round has no rule. */
export const ruleBlockHeight = (round: Round): number => ruleLayout(round).height;
/** Width the rule UI needs (centred on x 640). */
export const ruleBlockWidth = (round: Round): number => ruleLayout(round).width;
