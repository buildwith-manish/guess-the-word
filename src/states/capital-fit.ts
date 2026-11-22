/**
 * capital-fit: pure layout maths for the "CAPITAL  <city>" row on the answer card. No DOM, no React: the text
 * measurement is injected (`measure`), so the card measures with @remotion/layout-utils measureText in the render and
 * scripts/states-qa.js measures the same font files with fontkit, and both run THIS function.
 *
 * Rule: the row is one line (label + margin + value). If that is wider than the card's inner width it is scaled down,
 * but never below `minScale` of the normal size. If it still does not fit, it is stacked: a small "CAPITAL" label on
 * its own line and the city below it at the largest size that fits (never above the normal size). Letter-spacing and
 * the label margin scale with the font size, so the whole row is exactly linear in the size.
 */
import { px } from '../style';

export interface MeasureOpts {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  /** css px */
  letterSpacing: number;
}
export type MeasureFn = (text: string, o: MeasureOpts) => number;

/** Reference values (1280x720 grid, through px()) for the capital row. */
export const CAPITAL_LOOK = {
  /** normal size, ref px */
  font: 44,
  /** smallest scale of the inline row before it stacks */
  minScale: 0.6,
  /** label style (at normal size) */
  /** 0.14em at the normal size (44 ref px): uppercase label tracking, same as TRACKING.label */
  labelSpacing: 6.16,
  labelMargin: 14,
  labelWeight: 500,
  valueWeight: 700,
  /** stacked: label size as a fraction of the normal size, gap between the two lines as a fraction of the value size */
  stackLabelScale: 0.56,
  stackGap: 0.12,
  /** line height multiplier for every capital line */
  lineHeight: 1.25,
  /** width kept free so sub-pixel / rounding differences between measuring and painting can never touch the border */
  safety: 0.98,
};

export interface CapitalFit {
  mode: 'inline' | 'stacked';
  /** font size of the value (px, native canvas) */
  valueSize: number;
  /** font size of the label (px); equals valueSize when inline */
  labelSize: number;
  labelSpacing: number;
  /** inline only: gap between label and value (px) */
  labelMargin: number;
  /** gap between the stacked lines (px), 0 inline */
  stackGap: number;
  /** valueSize / normal size (inline: the row scale; stacked: the value's scale) */
  scale: number;
  /** measured width of the widest line at the fitted size (px) */
  width: number;
  /** height the row reserves (px): constant for a state, so the card never jumps while it animates in */
  height: number;
}

export interface CapitalFitInput {
  label: string;
  capital: string;
  /** card width minus both paddings (px) */
  innerW: number;
  fontFamily: string;
  measure: MeasureFn;
}

/** Width of the inline row at font size `size` (label + margin + value), measured. */
export const inlineRowWidth = (i: Pick<CapitalFitInput, 'label' | 'capital' | 'fontFamily' | 'measure'>, size: number): number => {
  const k = size / px(CAPITAL_LOOK.font);
  const ls = px(CAPITAL_LOOK.labelSpacing) * k;
  const l = i.measure(i.label, { fontFamily: i.fontFamily, fontWeight: CAPITAL_LOOK.labelWeight, fontSize: size, letterSpacing: ls });
  const v = i.measure(i.capital, { fontFamily: i.fontFamily, fontWeight: CAPITAL_LOOK.valueWeight, fontSize: size, letterSpacing: 0 });
  return l + px(CAPITAL_LOOK.labelMargin) * k + v;
};

/** Width of the stacked value line at `size`. */
export const valueWidth = (i: Pick<CapitalFitInput, 'capital' | 'fontFamily' | 'measure'>, size: number): number =>
  i.measure(i.capital, { fontFamily: i.fontFamily, fontWeight: CAPITAL_LOOK.valueWeight, fontSize: size, letterSpacing: 0 });

export const fitCapitalRow = (i: CapitalFitInput): CapitalFit => {
  const base = px(CAPITAL_LOOK.font);
  const avail = i.innerW * CAPITAL_LOOK.safety;

  // the row is linear in the size, so one measurement at the normal size gives the scale
  const w1 = inlineRowWidth(i, base);
  const s1 = Math.min(1, avail / w1);
  if (s1 >= CAPITAL_LOOK.minScale) {
    const size = base * s1;
    return {
      mode: 'inline',
      valueSize: size,
      labelSize: size,
      labelSpacing: px(CAPITAL_LOOK.labelSpacing) * s1,
      labelMargin: px(CAPITAL_LOOK.labelMargin) * s1,
      stackGap: 0,
      scale: s1,
      width: inlineRowWidth(i, size),
      height: size * CAPITAL_LOOK.lineHeight,
    };
  }

  // stacked: small label above, the city at the largest size that fits on its own line
  const v1 = valueWidth(i, base);
  const sv = Math.min(1, avail / v1);
  const size = base * sv;
  const labelSize = base * CAPITAL_LOOK.stackLabelScale;
  const labelSpacing = px(CAPITAL_LOOK.labelSpacing) * CAPITAL_LOOK.stackLabelScale;
  const labelW = i.measure(i.label, { fontFamily: i.fontFamily, fontWeight: CAPITAL_LOOK.labelWeight, fontSize: labelSize, letterSpacing: labelSpacing });
  const gap = size * CAPITAL_LOOK.stackGap;
  return {
    mode: 'stacked',
    valueSize: size,
    labelSize,
    labelSpacing,
    labelMargin: 0,
    stackGap: gap,
    scale: sv,
    width: Math.max(labelW, valueWidth(i, size)),
    height: labelSize * CAPITAL_LOOK.lineHeight + gap + size * CAPITAL_LOOK.lineHeight,
  };
};

/** Voice-bars box that fits between the (centred) key chip and the card's right padding without touching the chip. */
export const fitVoiceBars = (cardW: number, chipW: number, rightInset: number, wantW: number, gap: number): { width: number; show: boolean } => {
  const room = cardW / 2 - chipW / 2 - rightInset - gap;
  const width = Math.min(wantW, room);
  return { width: Math.max(0, width), show: width >= wantW * 0.4 };
};

/** State-name fitting: the name is set in Inter bold, sized from its real measured width instead of an average glyph width. */
export const NAME_LOOK = {
  /** largest size, ref px */
  max: 120,
  /** the name briefly scales up by this fraction during its glow flash, so it is fitted with that headroom */
  flash: 0,
};

export const fitNameSize = (name: string, innerW: number, fontFamily: string, measure: MeasureFn, fontWeight = 400): { size: number; width: number } => {
  const max = px(NAME_LOOK.max);
  const w1 = measure(name, { fontFamily, fontWeight, fontSize: max, letterSpacing: 0 });
  const size = Math.min(max, (max * innerW * CAPITAL_LOOK.safety) / (w1 * (1 + NAME_LOOK.flash)));
  return { size, width: measure(name, { fontFamily, fontWeight, fontSize: size, letterSpacing: 0 }) };
};

/** Largest font size (<= maxSize, >= minSize) at which `text` is at most `availW` wide, from its measured width. */
export const fitTextSize = (
  text: string,
  availW: number,
  maxSize: number,
  minSize: number,
  o: { fontFamily: string; fontWeight: number; letterSpacing?: number },
  measure: MeasureFn,
): { size: number; width: number; fits: boolean } => {
  const ls = o.letterSpacing ?? 0;
  const w1 = measure(text, { fontFamily: o.fontFamily, fontWeight: o.fontWeight, fontSize: maxSize, letterSpacing: ls * (maxSize / px(CAPITAL_LOOK.font)) });
  const size = Math.max(minSize, Math.min(maxSize, (maxSize * availW * CAPITAL_LOOK.safety) / w1));
  const width = measure(text, { fontFamily: o.fontFamily, fontWeight: o.fontWeight, fontSize: size, letterSpacing: ls * (size / px(CAPITAL_LOOK.font)) });
  return { size, width, fits: width <= availW };
};
