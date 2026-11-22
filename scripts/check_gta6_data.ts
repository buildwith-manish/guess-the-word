/**
 * Validates src/gta6/data.ts (which imports docs/gta6/questions.json) and prints every item with `verify` set.
 * Run: npx tsx scripts/check_gta6_data.ts   (exit code 1 when any check fails)
 */
import { byLevel, items } from '../src/gta6/data';

const problems: string[] = [];
const fail = (m: string) => problems.push(m);
const tag = (i: { n: string; order: number }) => `item ${i.n} (order ${i.order})`;

const questions = items.filter((i) => i.kind === 'q');
const bonuses = items.filter((i) => i.kind === 'bonus');

if (items.length !== 45) fail(`item count is ${items.length}, expected 45`);
if (questions.length !== 42) fail(`question count is ${questions.length}, expected 42`);
if (bonuses.length !== 3) fail(`bonus count is ${bonuses.length}, expected 3`);

// 15/15/12 counts questions per level (45 items cannot split 15/15/12; bonuses are counted separately).
const qPerLevel = (l: 'easy' | 'medium' | 'hard') => byLevel[l].filter((i) => i.kind === 'q').length;
const lv = [qPerLevel('easy'), qPerLevel('medium'), qPerLevel('hard')];
if (lv.join('/') !== '15/15/12') fail(`questions per level easy/medium/hard are ${lv.join('/')}, expected 15/15/12`);

const orders = items.map((i) => i.order);
if (orders.some((o, k) => o !== k + 1)) fail('order values are not exactly 1..45 without gaps or repeats');

for (const i of items) {
  if (!Array.isArray(i.options) || i.options.length !== 4) {
    fail(`${tag(i)}: has ${i.options?.length ?? 0} options, expected 4`);
    continue;
  }
  if (!Number.isInteger(i.answer) || i.answer < 0 || i.answer > 3) {
    fail(`${tag(i)}: answer ${i.answer} is not a valid index 0-3`);
    continue;
  }
  const norm = i.options.map((o) => String(o).trim().toLowerCase());
  const seen = new Set<string>();
  norm.forEach((o, k) => {
    if (seen.has(o)) fail(`${tag(i)}: option text "${i.options[k]}" is duplicated`);
    seen.add(o);
  });
  norm.forEach((o, k) => {
    if (k !== i.answer && o === norm[i.answer]) fail(`${tag(i)}: option ${k} equals the answer "${i.options[i.answer]}"`);
  });
}

// did-you-know: exactly one per consecutive group of three questions (play order) => 14 of 42.
const dyk = questions.filter((q) => q.didYouKnow);
if (dyk.length !== questions.length / 3) fail(`didYouKnow count is ${dyk.length}, expected ${questions.length / 3} (one per three questions)`);
for (let g = 0; g < questions.length; g += 3) {
  const grp = questions.slice(g, g + 3);
  const c = grp.filter((q) => q.didYouKnow).length;
  if (c !== 1) fail(`questions ${grp.map((q) => q.n).join(', ')} have ${c} didYouKnow lines, expected 1`);
}

console.log('Items with `verify` set:\n');
console.table(
  items.filter((i) => i.verify).map((i) => ({ order: i.order, n: i.n, level: i.level, kind: i.kind, verify: i.verify })),
);
console.log(`\nitems ${items.length} | questions ${questions.length} | bonuses ${bonuses.length} | per level (q) ${lv.join('/')} | didYouKnow ${dyk.length}`);

if (problems.length) {
  console.error(`\nFAILED (${problems.length}):`);
  problems.forEach((p) => console.error(' - ' + p));
  process.exit(1);
}
console.log('\nOK: all checks passed');
