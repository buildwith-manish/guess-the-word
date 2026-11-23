/**
 * Validates src/dontsay/data.ts (which imports docs/dontsay/rounds.json + poll.json).
 * Exits 1 on any failure. Warnings never fail. Run: npx tsx scripts/check_dontsay_data.ts
 */
import { bonuses, heartCheckIn, pollRounds, ranks, rounds, sourceName } from '../src/dontsay/data';
import pollJson from '../docs/dontsay/poll.json';

const failures: string[] = [];
const warnings: { check: string; where: string; detail: string }[] = [];
const fail = (m: string) => failures.push(m);
const warn = (check: string, where: string, detail: string) => warnings.push({ check, where, detail });

// --- failures ---
if (rounds.length !== 45) fail(`expected 45 rounds, got ${rounds.length}`);

const perLevel = [1, 2, 3, 4, 5].map((l) => rounds.filter((r) => r.level === l).length);
if (perLevel.join('/') !== '9/9/9/9/9') fail(`levels must be 9/9/9/9/9, got ${perLevel.join('/')}`);

const afters = bonuses.map((b) => b.afterRound);
if (bonuses.length !== 5 || afters.join(',') !== '9,18,27,36,45') {
  fail(`bonuses must be after rounds 9,18,27,36,45, got [${afters.join(',')}] (${bonuses.length} bonuses)`);
}

for (const r of rounds.filter((x) => x.heavy)) {
  const has = (a?: string[]) => Array.isArray(a) && a.length > 0;
  if (!has(r.banned) && !has(r.swatches) && !has(r.iconChips)) {
    fail(`round ${r.n} is heavy but has no banned/swatches/iconChips`);
  }
}

if (!(heartCheckIn.afterRound === 23 && heartCheckIn.beforeRound === 24)) {
  fail(`heart check-in must sit between rounds 23 and 24, got after ${heartCheckIn.afterRound} / before ${heartCheckIn.beforeRound}`);
}

const sorted = [...ranks].sort((a, b) => a.min - b.min);
if (sorted.length === 0 || sorted[0].min !== 0) fail('ranks must start at 0');
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i].min !== sorted[i - 1].max + 1) {
    fail(`ranks gap/overlap between ${sorted[i - 1].name} (max ${sorted[i - 1].max}) and ${sorted[i].name} (min ${sorted[i].min})`);
  }
}
if (sorted.length && sorted[sorted.length - 1].max !== 50) fail(`ranks must end at 50, got ${sorted[sorted.length - 1].max}`);

// --- warnings ---
if (sourceName === null) warn('sourceName', 'meta', 'sourceName is null');

const polled = new Set<number>(pollRounds);
const pollJsonRounds = new Set<number>([
  ...(pollJson.rounds as { n: number }[]).map((r) => r.n),
  ...(pollJson.regionSensitiveRounds as { n: number }[]).map((r) => r.n),
]);
for (const n of [...pollJsonRounds].sort((a, b) => a - b)) {
  if (!polled.has(n)) warn('poll round missing', `round ${n}`, 'in poll.json but not in pollRounds');
}
const expectedPoll = [1, 5, 6, 14, 25, 28, 30, 33, 36, 41, 42, 43, 45];
if (expectedPoll.join(',') !== [...pollRounds].join(',')) {
  warn('pollRounds differ from brief', 'pollRounds', `got [${pollRounds.join(',')}], brief says [${expectedPoll.join(',')}]`);
}
for (const n of pollRounds) if (!rounds.some((r) => r.n === n)) warn('poll round unknown', `round ${n}`, 'not in rounds');

const WESTERN = ['liam', 'olivia', 'toyota', 'tennis', 'basketball', 'batman'];
for (const r of rounds.filter((x) => x.regionSensitive)) {
  if (WESTERN.includes(r.answer.trim().toLowerCase())) {
    warn('Western default', `round ${r.n}`, `answer "${r.answer}" on a regionSensitive round (${r.prompt})`);
  }
}

// --- report ---
console.log(`rounds ${rounds.length} | levels ${perLevel.join('/')} | bonuses after [${afters.join(',')}] | ranks ${sorted.map((r) => `${r.name} ${r.min}-${r.max}`).join(', ')}`);

console.log(`\nWARNINGS (${warnings.length})`);
if (warnings.length) {
  const w = (s: string, n: number) => s.padEnd(n);
  const cw = Math.max(5, ...warnings.map((x) => x.check.length));
  const ww = Math.max(5, ...warnings.map((x) => x.where.length));
  console.log(`${w('check', cw)} | ${w('where', ww)} | detail`);
  console.log(`${'-'.repeat(cw)}-+-${'-'.repeat(ww)}-+-------`);
  for (const x of warnings) console.log(`${w(x.check, cw)} | ${w(x.where, ww)} | ${x.detail}`);
}

console.log('\nLONG PROMPTS (> 8 words), first 30 chars');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const long: string[] = [];
for (const r of rounds) if (words(r.prompt) > 8) long.push(`round ${r.n}: ${r.prompt.slice(0, 30)}`);
for (const b of bonuses) if (words(b.prompt) > 8) long.push(`bonus ${b.n}: ${b.prompt.slice(0, 30)}`);
console.log(long.length ? long.join('\n') : '(none)');

if (failures.length) {
  console.error(`\nFAILED (${failures.length})`);
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('\nOK: all hard checks pass');
