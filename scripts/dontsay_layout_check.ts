/**
 * Layout check for the round screen (task F3). Run: npx tsx scripts/dontsay_layout_check.ts
 *
 * For EVERY round in data.ts it builds the rectangles (reference units, 1280x720) of the HUD (hearts pill, round
 * counter, watermark), the countdown pill, the prompt card, the waveform, the rule block (height from
 * ruleBlockHeight) and the small bubble, prints a table, and exits 1 if any two rectangles overlap or any
 * rectangle leaves the frame. It also checks the prompt text fits one line at its font size.
 *
 * Estimates (not measured): hearts pill / counter / watermark widths are upper bounds taken from layout.ts;
 * text widths use TEXT_EM (0.6 em per glyph); the small bubble mirrors InkBubble's small state. Nothing is rendered.
 */
import { rounds } from '../src/dontsay/data';
import {
  MIN_TEXT, REF, RULE_MAX_BOTTOM, SAFE_X, TEXT_EM, layout, promptFontSize, promptWidth, PROMPT_PAD_X,
  ruleBlockHeight, ruleBlockWidth, ruleLayout, textWidth,
} from '../src/dontsay/layout';

type Rect = { name: string; l: number; t: number; r: number; b: number };
const rect = (name: string, l: number, t: number, r: number, b: number): Rect => ({ name, l, t, r, b });
const overlap = (a: Rect, b: Rect): boolean => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const inFrame = (a: Rect): boolean => a.l >= 0 && a.t >= 0 && a.r <= REF.w && a.b <= REF.h;
const f = (n: number): string => (Math.round(n * 10) / 10).toString();

const problems: string[] = [];
const rows: string[][] = [['round', 'rule', 'block h', 'block bottom', 'slack to 640', 'prompt px', 'prompt w/inner']];
let worst = { n: 0, h: -1 };

const fixed = (): Rect[] => {
  const L = layout;
  const wfW = 7 * 16 + 6 * 14; // 7 bars is the maximum ListeningGlow draws
  return [
    rect('hearts', L.hudHearts.left, L.hudHearts.top, L.hudHearts.right, L.hudHearts.bottom),
    rect('counter', L.hudCounter.left, L.hudCounter.top, L.hudCounter.right, L.hudCounter.bottom),
    rect('watermark', L.hudWatermark.left, L.hudWatermark.top, L.hudWatermark.right, L.hudWatermark.bottom),
    rect('countdown', L.countdown.left, L.countdown.top, L.countdown.right, L.countdown.bottom),
    rect('prompt', L.prompt.left, L.prompt.top, L.prompt.right, L.prompt.bottom),
    rect('waveform', REF.w / 2 - wfW / 2, L.waveform.top, REF.w / 2 + wfW / 2, L.waveform.bottom),
    rect('bubbleSmall', L.bubbleSmall.left, L.bubbleSmall.top, L.bubbleSmall.right, L.bubbleSmall.bottom),
  ];
};

for (const round of rounds) {
  const rs = fixed();
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

// the longest prompt, stated explicitly
const longest = rounds.reduce((a, b) => (b.prompt.length > a.prompt.length ? b : a));
const lSize = promptFontSize(longest.prompt);

const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
for (const r of rows) console.log(r.map((v, c) => v.padEnd(widths[c])).join('  '));
console.log('');
console.log(`rounds checked: ${rounds.length}  (rect names per round: hearts, counter, watermark, countdown, prompt, waveform, rule, bubbleSmall)`);
console.log(`worst-case rule block: round ${worst.n}, ${f(worst.h)} units (zone ${layout.ruleZone.top}..${RULE_MAX_BOTTOM} = ${RULE_MAX_BOTTOM - layout.ruleZone.top})`);
console.log(`longest prompt: round ${longest.n} "${longest.prompt}" (${longest.prompt.length} chars) -> ${lSize}px, est. width ${f(textWidth(longest.prompt, lSize))} of ${promptWidth - PROMPT_PAD_X * 2} (${TEXT_EM} em per glyph)`);
console.log('zones (reference units):');
for (const [k, z] of Object.entries(layout)) console.log(`  ${k.padEnd(12)} top ${z.top} bottom ${z.bottom}` + ('left' in z ? `  left ${(z as { left: number }).left} right ${(z as { right: number }).right}` : ''));

if (problems.length) {
  console.error(`\nFAIL: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('\nOK: no overlaps, nothing leaves the frame, prompts fit one line.');
