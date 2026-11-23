/**
 * Validates src/nfl/data.ts (which imports docs/nfl/cards.json and picks.json).
 * Run: npx tsx scripts/check_nfl_data.ts
 * Exit 1 on any failure. Warnings (sourceName null, null pick fields) do not fail.
 */
import { cards, picks, sourceName } from '../src/nfl/data';

const MAX_WORDS = 10;
const MAX_WORDS_TMW = 6;

const failures: string[] = [];
const warnings: { what: string; where: string }[] = [];
const fail = (m: string) => failures.push(m);
const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const tag = (n: number) => `card ${n}`;

if (cards.length !== 30) fail(`card count is ${cards.length}, expected 30`);
if (cards.some((c, i) => c.n !== i + 1)) fail('card numbers are not exactly 1..30 in order');

for (const c of cards) {
  if (!Array.isArray(c.clues) || c.clues.length !== 5 || c.clues.some((s) => typeof s !== 'string' || s.trim() === '')) {
    fail(`${tag(c.n)}: needs exactly 5 non-empty clues (has ${c.clues?.length ?? 0}${Array.isArray(c.clues) ? ', or an empty one' : ''})`);
  }
  if (!Array.isArray(c.points) || c.points.join(',') !== '5,4,3,2,1') fail(`${tag(c.n)}: points are [${c.points}], expected 5,4,3,2,1`);
  if (!c.name || c.name.trim() === '') fail(`${tag(c.n)}: empty name`);

  const limit = c.twoMinuteWarning ? MAX_WORDS_TMW : MAX_WORDS;
  (c.clues ?? []).forEach((s, i) => {
    if (typeof s !== 'string') return;
    const w = words(s);
    if (w > limit) fail(`${tag(c.n)} clue ${i + 1}: ${w} words, limit ${limit}${c.twoMinuteWarning ? ' (Two-Minute Warning)' : ''}: "${s}"`);
  });
}

const tmw = cards.filter((c) => c.twoMinuteWarning).map((c) => c.n);
if (tmw.join(',') !== '5,15,25') fail(`Two-Minute Warning cards are [${tmw}], expected exactly 5,15,25`);

const finals = cards.filter((c) => c.final).map((c) => c.n);
if (finals.join(',') !== '30') fail(`final cards are [${finals}], expected exactly 30`);

const lv = (l: string) => cards.filter((c) => c.level === l).length;
const lvCounts = [lv('rookie'), lv('starter'), lv('hof')];
if (lvCounts.join('/') !== '10/10/10') fail(`levels rookie/starter/hof are ${lvCounts.join('/')}, expected 10/10/10`);
const unknown = cards.filter((c) => !['rookie', 'starter', 'hof'].includes(c.level)).map((c) => c.n);
if (unknown.length) fail(`unknown level on card(s) ${unknown}`);

if (sourceName === null || String(sourceName).trim() === '') warnings.push({ what: 'sourceName is null (QA must fail until it is set)', where: 'docs/nfl/cards.json meta.sourceName' });
for (const p of picks) {
  if (p.matchup === null) warnings.push({ what: 'matchup is null', where: `docs/nfl/picks.json pick ${p.pick}` });
  if (p.kickoffET === null) warnings.push({ what: 'kickoffET is null', where: `docs/nfl/picks.json pick ${p.pick}` });
}

console.log(`cards ${cards.length} | levels ${lvCounts.join('/')} | two-minute warning [${tmw}] | final [${finals}] | max clue words ${Math.max(...cards.flatMap((c) => c.clues.map(words)))}`);
console.log(`\nWarnings (${warnings.length}):`);
if (warnings.length) console.table(warnings);
else console.log('  none');

if (failures.length) {
  console.error(`\nFAIL (${failures.length}):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nOK: all checks passed');
