/**
 * Layout check for the round screen (task F3). Run: npx tsx scripts/dontsay_layout_check.ts
 *
 * For EVERY round in data.ts it builds the rectangles (reference units, 1280x720) of the HUD (hearts pill, round
 * counter, watermark), the countdown pill, the prompt card, the waveform, the rule block (height from
 * ruleBlockHeight) and the small bubble, prints a table, and exits 1 if any two rectangles overlap or any
 * rectangle leaves the frame. The waveform rectangle is the one ListeningGlow really draws (glowRect in layout.ts, shared with
 * ListeningGlow); it must not overlap ruleZone or the prompt card and must sit at least MIN_WAVE_GAP above ruleZone. It also checks the prompt text fits one line at its font size, and that the gap between
 * the round counter pill and the prompt card is at least MIN_COUNTER_GAP.
 *
 * Estimates (not measured): hearts pill / counter / watermark widths are upper bounds taken from layout.ts;
 * text widths use TEXT_EM (0.6 em per glyph); the small bubble mirrors InkBubble's small state. Nothing is rendered.
 */
import { bonuses, rounds } from '../src/dontsay/data';
import {
  BONUS_CHIP_TOP, BONUS_MIN_CHIP_GAP, BONUS_STAGE_TOP, CHAIN_LAYOUT, MIN_TEXT, REF, RULE_MAX_BOTTOM, SAFE_X, TEXT_EM, glowRect, layout, promptFontSize, promptWidth, PROMPT_PAD_X,
  bonusChipHeight, mindReaderStripRect, ruleBlockHeight, ruleBlockWidth, ruleLayout, textWidth,
} from '../src/dontsay/layout';

type Rect = { name: string; l: number; t: number; r: number; b: number };
const rect = (name: string, l: number, t: number, r: number, b: number): Rect => ({ name, l, t, r, b });
const overlap = (a: Rect, b: Rect): boolean => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const inFrame = (a: Rect): boolean => a.l >= 0 && a.t >= 0 && a.r <= REF.w && a.b <= REF.h;
const f = (n: number): string => (Math.round(n * 10) / 10).toString();

/** Minimum vertical gap, reference units, between the round counter pill and the prompt card. */
const MIN_COUNTER_GAP = 12;
/** Minimum vertical gap, reference units, between the waveform ListeningGlow draws and ruleZone. */
const MIN_WAVE_GAP = 16;

const problems: string[] = [];
const counterGap = layout.prompt.top - layout.hudCounter.bottom;
if (counterGap < MIN_COUNTER_GAP) {
  problems.push(`gap between counter pill (bottom ${layout.hudCounter.bottom}) and prompt card (top ${layout.prompt.top}) is ${counterGap}, minimum ${MIN_COUNTER_GAP}`);
}
const rows: string[][] = [['round', 'rule', 'block h', 'block bottom', 'slack to 640', 'prompt px', 'prompt w/inner']];
let worst = { n: 0, h: -1 };
let minWaveGap = Infinity;

const fixed = (roundN: number): Rect[] => {
  const L = layout;
  // the rectangle ListeningGlow really draws on the round screen (same constants it renders with, from layout.ts)
  const g = glowRect(roundN);
  return [
    rect('hearts', L.hudHearts.left, L.hudHearts.top, L.hudHearts.right, L.hudHearts.bottom),
    rect('counter', L.hudCounter.left, L.hudCounter.top, L.hudCounter.right, L.hudCounter.bottom),
    rect('watermark', L.hudWatermark.left, L.hudWatermark.top, L.hudWatermark.right, L.hudWatermark.bottom),
    rect('countdown', L.countdown.left, L.countdown.top, L.countdown.right, L.countdown.bottom),
    rect('prompt', L.prompt.left, L.prompt.top, L.prompt.right, L.prompt.bottom),
    rect('waveform', g.left, g.top, g.right, g.bottom),
    rect('bubbleSmall', L.bubbleSmall.left, L.bubbleSmall.top, L.bubbleSmall.right, L.bubbleSmall.bottom),
  ];
};

for (const round of rounds) {
  const rs = fixed(round.n);
  const plan = ruleLayout(round);
  let h = 0, bottom = 0;
  if (round.callback) {
    // Round 45 draws its own banned box (Round45Callback) instead of ExclusionChips.
    const b = layout.round45Box;
    rs.push(rect('rule(box)', b.left, b.top, b.right, b.bottom));
    h = b.bottom - b.top; bottom = b.bottom;
    if (b.top < layout.ruleZone.top || b.bottom > RULE_MAX_BOTTOM || b.left < layout.ruleZone.left || b.right > layout.ruleZone.right) {
      problems.push(`round ${round.n}: callback box leaves ruleZone`);
    }
  } else if (plan.kind !== 'none') {
    h = ruleBlockHeight(round);
    const w = ruleBlockWidth(round);
    const l = REF.w / 2 - w / 2;
    const top = layout.ruleZone.top;
    bottom = top + h;
    rs.push(rect('rule', l, top, l + w, bottom));
    if (bottom > RULE_MAX_BOTTOM) problems.push(`round ${round.n}: rule block bottom ${f(bottom)} > maxBottom ${RULE_MAX_BOTTOM}`);
    if (l < layout.ruleZone.left - 0.01 || l + w > layout.ruleZone.right + 0.01) problems.push(`round ${round.n}: rule block x ${f(l)}..${f(l + w)} leaves ruleZone x`);
    // text sizes inside the rule block
    if (plan.kind === 'rows') {
      if (plan.font < MIN_TEXT) problems.push(`round ${round.n}: row text ${plan.font} < ${MIN_TEXT}`);
      const room = plan.width - 56 - plan.trackW - 16;
      for (const wd of plan.words) if (textWidth(wd, plan.font) > room) problems.push(`round ${round.n}: banned word "${wd}" too wide for its row`);
    } else if (plan.kind === 'chips') {
      if (plan.font < MIN_TEXT) problems.push(`round ${round.n}: chip text ${plan.font} < ${MIN_TEXT}`);
      if (plan.clar && plan.clar.font < MIN_TEXT) problems.push(`round ${round.n}: clarification text < ${MIN_TEXT}`);
      if (plan.heavy) for (const c of plan.chips) if (textWidth(c.label, plan.font) > plan.chipW - 28) problems.push(`round ${round.n}: chip "${c.label}" too wide`);
    }
  }
  if (h > worst.h) worst = { n: round.n, h };

  for (const a of rs) if (!inFrame(a)) problems.push(`round ${round.n}: ${a.name} leaves the frame (${f(a.l)},${f(a.t)},${f(a.r)},${f(a.b)})`);
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    if (overlap(rs[i], rs[j])) problems.push(`round ${round.n}: ${rs[i].name} overlaps ${rs[j].name}`);
  }
  // waveform (what ListeningGlow draws) vs the prompt card and ruleZone: no overlap, and at least MIN_WAVE_GAP above ruleZone
  const wf = glowRect(round.n);
  const wfRect = rect('waveform', wf.left, wf.top, wf.right, wf.bottom);
  const zone = layout.ruleZone;
  if (overlap(wfRect, rect('ruleZone', zone.left, zone.top, zone.right, zone.bottom))) problems.push(`round ${round.n}: waveform (bottom ${f(wf.bottom)}) overlaps ruleZone (top ${zone.top})`);
  if (overlap(wfRect, rect('prompt', layout.prompt.left, layout.prompt.top, layout.prompt.right, layout.prompt.bottom))) problems.push(`round ${round.n}: waveform (top ${f(wf.top)}) overlaps the prompt card (bottom ${layout.prompt.bottom})`);
  const waveGap = zone.top - wf.bottom;
  if (waveGap < MIN_WAVE_GAP) problems.push(`round ${round.n}: gap from waveform (bottom ${f(wf.bottom)}) to ruleZone (top ${zone.top}) is ${f(waveGap)}, minimum ${MIN_WAVE_GAP}`);
  minWaveGap = Math.min(minWaveGap, waveGap);
  // prompt card: centre 80% and one line
  const pc = layout.prompt;
  if (pc.left < SAFE_X || pc.right > REF.w - SAFE_X) problems.push(`round ${round.n}: prompt card outside the centre 80%`);
  const size = promptFontSize(round.prompt);
  const w = textWidth(round.prompt, size);
  const inner = promptWidth - PROMPT_PAD_X * 2;
  if (w > inner) problems.push(`round ${round.n}: prompt "${round.prompt}" needs ${f(w)} at ${size}px, inner width ${inner}`);
  if (size < MIN_TEXT) problems.push(`round ${round.n}: prompt font ${size} < ${MIN_TEXT}`);
  if (size * 1.05 > layout.prompt.bottom - layout.prompt.top) problems.push(`round ${round.n}: prompt line taller than the card`);

  rows.push([String(round.n), round.callback ? 'callback box' : plan.kind === 'none' ? '-' : plan.kind + (round.heavy ? '+heavy' : ''),
    f(h), h ? f(bottom) : '-', h ? f(RULE_MAX_BOTTOM - bottom) : '-', String(size), `${f(w)}/${inner}`]);
}

// ---------- bonus screens: bubbleSmall clearance and header chip -> first row gap ----------
const bs = layout.bubbleSmall;
const bubbleRect = rect('bubbleSmall', bs.left, bs.top, bs.right, bs.bottom);
const strip = mindReaderStripRect();
const stripRect = rect('mind-reader lock strip', strip.left, strip.top, strip.right, strip.bottom);
if (overlap(stripRect, bubbleRect)) problems.push(`bonus 1: lock strip (x ${f(strip.left)}..${f(strip.right)}, y ${f(strip.top)}..${f(strip.bottom)}) overlaps bubbleSmall (x ${bs.left}..${bs.right})`);
const stripGap = bs.left - strip.right;
if (stripGap < BONUS_MIN_CHIP_GAP) problems.push(`bonus 1: lock strip right end ${f(strip.right)} is ${f(stripGap)} from bubbleSmall x ${bs.left}, minimum ${BONUS_MIN_CHIP_GAP}`);
const chainRowTop = BONUS_STAGE_TOP + CHAIN_LAYOUT.cardTop;
const chainRowBottom = chainRowTop + CHAIN_LAYOUT.cardH;
const chainRow = rect('chain word cards', REF.w * 0.1, chainRowTop, REF.w * 0.9, chainRowBottom);
if (overlap(chainRow, bubbleRect)) problems.push('bonus 3: word-card row overlaps bubbleSmall');
const chainRule = rect('chain rule', REF.w * 0.1, BONUS_STAGE_TOP + CHAIN_LAYOUT.ruleTop, REF.w * 0.9, BONUS_STAGE_TOP + CHAIN_LAYOUT.ruleTop + 36 * 1.2);
if (overlap(chainRule, bubbleRect)) problems.push('bonus 3: rule line overlaps bubbleSmall');
if (overlap(chainRow, chainRule)) problems.push('bonus 3: word-card row overlaps the rule line');
const chipGaps: string[] = [];
for (const b of bonuses) {
  const chipBottom = BONUS_CHIP_TOP + bonusChipHeight(Boolean(b.onScreenNote));
  // the first mechanic row: bonus 3 has its card row; the others start at the stage top
  const rowTop = b.name === 'chain-reaction' ? chainRowTop : BONUS_STAGE_TOP;
  const gap = rowTop - chipBottom;
  chipGaps.push(`bonus ${b.n} (${b.name}): chip bottom ${f(chipBottom)} -> first row ${f(rowTop)} = ${f(gap)}`);
  if (b.name === 'chain-reaction' && gap < BONUS_MIN_CHIP_GAP) problems.push(`bonus ${b.n}: header chip bottom ${f(chipBottom)} to chip row top ${f(rowTop)} is ${f(gap)}, minimum ${BONUS_MIN_CHIP_GAP}`);
}

// the longest prompt, stated explicitly
const longest = rounds.reduce((a, b) => (b.prompt.length > a.prompt.length ? b : a));
const lSize = promptFontSize(longest.prompt);

const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
for (const r of rows) console.log(r.map((v, c) => v.padEnd(widths[c])).join('  '));
console.log('');
console.log(`rounds checked: ${rounds.length}  (rect names per round: hearts, counter, watermark, countdown, prompt, waveform, rule, bubbleSmall)`);
console.log(`worst-case rule block: round ${worst.n}, ${f(worst.h)} units (zone ${layout.ruleZone.top}..${RULE_MAX_BOTTOM} = ${RULE_MAX_BOTTOM - layout.ruleZone.top})`);
console.log(`longest prompt: round ${longest.n} "${longest.prompt}" (${longest.prompt.length} chars) -> ${lSize}px, est. width ${f(textWidth(longest.prompt, lSize))} of ${promptWidth - PROMPT_PAD_X * 2} (${TEXT_EM} em per glyph)`);
console.log(`counter pill -> prompt card gap: ${counterGap} units (minimum ${MIN_COUNTER_GAP})`);
console.log(`waveform (ListeningGlow, drawn) -> ruleZone gap: ${f(minWaveGap)} units over all rounds (minimum ${MIN_WAVE_GAP}); waveform y ${glowRect(1).top}..${glowRect(1).bottom}`);
console.log(`bonus 1 lock strip right end ${f(strip.right)} -> bubbleSmall x ${bs.left}: gap ${f(stripGap)} (minimum ${BONUS_MIN_CHIP_GAP})`);
for (const g of chipGaps) console.log('  ' + g);
console.log('zones (reference units):');
for (const [k, z] of Object.entries(layout)) console.log(`  ${k.padEnd(12)} top ${z.top} bottom ${z.bottom}` + ('left' in z ? `  left ${(z as { left: number }).left} right ${(z as { right: number }).right}` : ''));

if (problems.length) {
  console.error(`\nFAIL: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('\nOK: no overlaps, nothing leaves the frame, prompts fit one line.');
