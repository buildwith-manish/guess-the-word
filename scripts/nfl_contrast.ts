/**
 * WCAG contrast report for the NFL card text (task iOS-4). Run: node scripts/nfl_contrast.mjs
 * Colours, sizes and dimming come from src/nfl (system.ts, ClueStack.tsx, TwoMinuteWarning, FrostCard), nothing is typed twice
 * except the layer model below, which mirrors how WalletCard / ClueStack / RevealEngine stack their surfaces:
 *   page   levelBackground, lightest gradient stop (the card sits over it; its blur averages the gradient)
 *   card   white 20% -> 7% (+ level colour 0x14 at the far corner) over page      [WalletCard chrome]
 *   row    ROW_BASE black 34%, then glassStrong 16% -> glass 10%, over card        [ClueStack row]
 *          older rows fade only this surface (dimOf); their text keeps textDimOf opacity
 * Light text is judged on the LIGHTEST surface of each pair (white 20% + 16%), the worst case.
 * Required ratio: 4.5, or 3.0 when the text is 24 reference units or larger.
 */
import { cards } from '../src/nfl/data';
import type { Level } from '../src/nfl/data';
import { colors, levelBackground, type } from '../src/nfl/system';
import { CHIP, COMPACT, DIM_FIRST, DIM_FLOOR, DIM_STEP, ROW_BASE, TEXT_DIM_FLOOR, dimOf, layoutOf, textDimOf } from '../src/nfl/components/ClueStack';
import { WALLET_LAYOUT } from '../src/nfl/components/WalletCard';

type RGB = [number, number, number];
type RGBA = [number, number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const rgba = (s: string): RGBA => {
  if (s.startsWith('#')) return [...hex(s), 1];
  const m = s.match(/rgba?\(([^)]+)\)/)!;
  const v = m[1].split(',').map(Number);
  return [v[0], v[1], v[2], v[3] ?? 1];
};
const over = (top: RGBA, under: RGB): RGB => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] * t + b[i] * (1 - t)) as RGB;
const lum = (c: RGB): number => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a: RGB, b: RGB): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const stops = (lv: Level): RGB[] => (levelBackground[lv].match(/#[0-9A-Fa-f]{6}/g) as string[]).map(hex);
const lightest = (lv: Level): RGB => stops(lv).sort((a, b) => lum(b) - lum(a))[0];

const WHITE: RGB = [255, 255, 255];
const ink = rgba(colors.ink);
const muted = rgba(colors.muted);
const glassStrong = rgba(colors.glassStrong);
const glass = rgba(colors.glass);
const lp = hex(colors.lowPower);
const TMW_ALPHA = 0.16; // shared/LowPowerTint peak (TwoMinuteWarning breathes 0.16 -> 0.08)

export type Row = { element: string; level: string; size: number; need: number; ratio: number };
const rows: Row[] = [];
const add = (element: string, level: string, size: number, text: RGB, bg: RGB) => {
  const need = size >= 24 ? 3 : 4.5;
  rows.push({ element, level, size, need, ratio: ratio(text, bg) });
};

for (const lv of ['rookie', 'starter', 'hof'] as Level[]) {
  const accent = hex(colors.level[lv]);
  const page = lightest(lv);
  const cardA = over([...WHITE, 0.2] as RGBA, page); // lightest card surface
  const cardB = over([...accent, 0x14 / 255] as RGBA, over([...WHITE, 0.07] as RGBA, page)); // far corner: level tint
  const card = lum(cardA) > lum(cardB) ? cardA : cardB;
  const rowBg = over(glassStrong, over(rgba(ROW_BASE), card));
  const rowBase = over(rgba(ROW_BASE), card); // darkest part of the row (the glass gradient ends at 10%)
  const inkOn = (bg: RGB): RGB => over(ink, bg);
  const chipBg = (bg: RGB): RGB => over([...accent, 0x33 / 255] as RGBA, bg);

  // clue text: active row, then dimmed rows (row opacity fades text AND row glass over the card)
  add('clue text (newest)', lv, type.clue.size, inkOn(rowBg), rowBg);
  const olderSurface = (rank: number): RGB => mix(rowBg, card, dimOf(rank));
  const olderText = (rank: number, bg: RGB): RGB => mix(inkOn(bg), bg, textDimOf(rank));
  for (const rank of [1, 2, 3, 4]) {
    const bg = olderSurface(rank);
    add(`clue text (older, rank ${rank}, text ${textDimOf(rank).toFixed(2)})`, lv, COMPACT.min, olderText(rank, bg), bg);
  }
  // point chips: ink on level colour 20% over the row surface
  add('point chip (newest)', lv, CHIP.activeFont, inkOn(chipBg(rowBg)), chipBg(rowBg));
  for (const rank of [1, 4]) {
    const bg = chipBg(olderSurface(rank));
    add(`point chip (older, rank ${rank})`, lv, CHIP.compactFont, olderText(rank, bg), bg);
  }
  add('name on reveal', lv, 88, inkOn(card), card);
  add('reveal line', lv, type.body.size, over(muted, card), card);
  add('source line', lv, type.caption.size, over(muted, card), card);
  // did-you-know card: FrostCard tint 0x26 -> glass over the page (the stack has left the centre)
  const dykBg = over([...accent, 0x26 / 255] as RGBA, page);
  add('did-you-know text', lv, type.body.size, inkOn(dykBg), dykBg);
  add('did-you-know label (accent)', lv, type.caption.size, accent, dykBg);
  // Two-Minute Warning: yellow overlay at its peak sits ABOVE the content, so text and surface both shift
  const tint = (c: RGB): RGB => over([...lp, TMW_ALPHA] as RGBA, c);
  add('TMW clue text (newest)', lv, type.clue.size, tint(inkOn(rowBg)), tint(rowBg));
  add(`TMW clue text (older, rank 4)`, lv, COMPACT.min, tint(olderText(4, olderSurface(4))), tint(olderSurface(4)));
  add('TMW point chip (newest)', lv, CHIP.activeFont, tint(inkOn(chipBg(rowBg))), tint(chipBg(rowBg)));
}

const pad = (s: string, n: number) => s.padEnd(n);
console.log(pad('element', 46) + pad('level', 9) + pad('size', 6) + pad('need', 6) + pad('ratio', 8) + 'result');
for (const r of rows) console.log(pad(r.element, 46) + pad(r.level, 9) + pad(String(r.size), 6) + pad(String(r.need), 6) + pad(r.ratio.toFixed(2), 8) + (r.ratio >= r.need ? 'ok' : 'FAIL'));
const fails = rows.filter((r) => r.ratio < r.need);
console.log(`\n${fails.length} of ${rows.length} below the requirement`);

// smallest clue text size the layout really uses, over every card and every clue count
const f = WALLET_LAYOUT.field;
const box = { left: 0, top: 0, width: f.w, height: f.h };
let smallestActive = 99, smallestCompact = 99, worst = '';
const lines: Record<number, number> = {};
for (const c of cards) for (let m = 0; m < c.clues.length; m++) {
  const L = layoutOf(c, m, box);
  smallestActive = Math.min(smallestActive, L.active.size);
  for (const t of L.compact) if (t.size < smallestCompact) { smallestCompact = t.size; worst = `card ${c.n} clue count ${m + 1}`; }
  const total = L.activeH + L.compactH.reduce((a, b) => a + b, 0) + m * 6;
  lines[c.n] = Math.max(lines[c.n] ?? 0, total);
}
console.log(`smallest clue size used: newest ${smallestActive}, older ${smallestCompact} (${worst}); chip text ${CHIP.compactFont}`);
console.log(`field height ${f.h}; tallest stack ${Math.max(...Object.values(lines)).toFixed(0)}`);
console.log(`older text opacity floor ${TEXT_DIM_FLOOR}; dim: first ${DIM_FIRST}, step ${DIM_STEP}, floor ${DIM_FLOOR}; compact sizes ${COMPACT.max} down to ${COMPACT.min}`);
