/**
 * Validates src/xmas/data.ts (which imports src/xmas/questions.json, a copy of docs/xmas/questions.json).
 * Run: npx tsx scripts/sync_xmas_data.ts && npx tsx scripts/check_xmas_data.ts
 * Exit 1 on any failure. Warnings (musicLicenseText null, long titles) do not fail.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bonuses, meta, movies, ranks, slots } from '../src/xmas/data';
import type { BonusSlot, ClueRef, Slot } from '../src/xmas/data';

const fails: string[] = [];
const fail = (m: string) => fails.push(m);

/* ---------- counts and positions ---------- */
if (slots.length !== 50) fail(`slots: ${slots.length}, expected 50`);
slots.forEach((s, i) => {
  if (s.slot !== i + 1) fail(`slot at index ${i} has number ${s.slot}, expected ${i + 1}`);
});
const bonusSlots = slots.filter((s) => s.kind === 'bonus').map((s) => s.slot);
const wantBonus = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);
if (bonusSlots.join() !== wantBonus.join()) fail(`bonuses are at slots [${bonusSlots}], expected [${wantBonus}]`);
if (movies.length !== 40) fail(`movies: ${movies.length}, expected 40`);
if (bonuses.length !== 10) fail(`bonuses: ${bonuses.length}, expected 10`);

/* ---------- stars ---------- */
const stars = slots.filter((s) => s.star).map((s) => s.slot);
const wantStars = [26, 29, 33, 39, 41, 48];
if (stars.join() !== wantStars.join()) fail(`star slots [${stars}], expected [${wantStars}]`);

/* ---------- movie fields ---------- */
const blank = (v: unknown) => typeof v !== 'string' || v.trim() === '';
for (const m of movies) {
  for (const k of ['clue1', 'clue2'] as const) {
    const c = m[k];
    if (!c) fail(`slot ${m.slot}: missing ${k}`);
    else {
      if (blank(c.id)) fail(`slot ${m.slot}: ${k} has no id`);
      if (blank(c.label)) fail(`slot ${m.slot}: ${k} has no label`);
    }
  }
  if (blank(m.answer)) fail(`slot ${m.slot}: no answer`);
}

/* ---------- baked-in text ---------- */
const baked: [number, 'clue1' | 'clue2', string][] = [
  [16, 'clue2', '34'],
  [24, 'clue1', 'FRED'],
  [33, 'clue1', 'NOEL'],
];
for (const [n, k, want] of baked) {
  const m = movies.find((x) => x.slot === n);
  const got = m?.[k]?.bakedText;
  if (got !== want) fail(`slot ${n} ${k} bakedText is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}

/* ---------- bonus 7 sequence ---------- */
const b = (n: number): BonusSlot | undefined => bonuses.find((x) => x.bonus === n);
const b7 = b(7);
if (!b7 || b7.key !== 'countLights') fail('bonus 7 is not countLights');
else {
  const reds = b7.sequence.filter((c) => c === 'r').length;
  if (b7.redCount !== 6) fail(`bonus 7 redCount is ${b7.redCount}, expected 6`);
  if (reds !== 6) fail(`bonus 7 sequence has ${reds} red entries, expected exactly 6`);
  if (reds !== b7.redCount) fail(`bonus 7 sequence has ${reds} red entries but redCount is ${b7.redCount}`);
}

/* ---------- bonus 3 odd index ---------- */
const b3 = b(3);
if (!b3 || b3.key !== 'oddOneOut') fail('bonus 3 is not oddOneOut');
else {
  const { cols, rows, oddIndex } = b3.grid;
  if (!Number.isInteger(oddIndex) || oddIndex < 0 || oddIndex >= cols * rows) fail(`bonus 3 oddIndex ${oddIndex} is outside ${cols} x ${rows} (0..${cols * rows - 1})`);
}

/* ---------- reused tile refs ---------- */
const checkRef = (where: string, r: ClueRef) => {
  if ('new' in r) {
    if (blank(r.new)) fail(`${where}: new ref has no id`);
    return;
  }
  const s: Slot | undefined = slots.find((x) => x.slot === r.slot);
  if (!s) return fail(`${where}: points to missing slot ${r.slot}`);
  if (s.kind !== 'movie') return fail(`${where}: slot ${r.slot} is a bonus, it has no clues`);
  if (r.clue !== 1 && r.clue !== 2) return fail(`${where}: clue ${r.clue} is not 1 or 2`);
  if (!s[r.clue === 1 ? 'clue1' : 'clue2']) fail(`${where}: slot ${r.slot} has no clue ${r.clue}`);
};
for (const s of bonuses) {
  const where = `bonus ${s.bonus} (slot ${s.slot})`;
  if (s.key === 'focus' || s.key === 'cleanUp' || s.key === 'speedRound' || s.key === 'finale') s.tiles.forEach((r, i) => checkRef(`${where} tiles[${i}]`, r));
  if (s.key === 'doubleFeature') {
    checkRef(`${where} left`, s.left);
    checkRef(`${where} right`, s.right);
  }
  if (s.key === 'controlCenter') s.icons.forEach((r, i) => checkRef(`${where} icons[${i}]`, r));
}

/* ---------- bonus 8 icons ---------- */
const b8 = b(8);
if (!b8 || b8.key !== 'controlCenter') fail('bonus 8 is not controlCenter');
else {
  if (b8.icons.length !== 4) fail(`bonus 8 has ${b8.icons.length} icons, expected 4`);
  const news = b8.icons.filter((r) => 'new' in r);
  if (news.length !== 1) fail(`bonus 8 has ${news.length} new icons, expected exactly 1 decoy`);
  else if ((news[0] as { new: string }).new !== b8.decoy) fail(`bonus 8 new icon ${(news[0] as { new: string }).new} is not the decoy ${b8.decoy}`);
}

/* ---------- ranks ---------- */
const rs = ranks.slice().sort((a, c) => a.min - c.min);
if (rs.length === 0) fail('no ranks');
else {
  if (rs[0].min !== 0) fail(`ranks start at ${rs[0].min}, expected 0`);
  if (rs[rs.length - 1].max !== 50) fail(`ranks end at ${rs[rs.length - 1].max}, expected 50`);
  rs.forEach((r, i) => {
    if (r.max < r.min) fail(`rank "${r.name}": max ${r.max} < min ${r.min}`);
    if (i > 0 && r.min !== rs[i - 1].max + 1) fail(`ranks "${rs[i - 1].name}" (..${rs[i - 1].max}) and "${r.name}" (${r.min}..) ${r.min <= rs[i - 1].max ? 'overlap' : 'leave a gap'}`);
  });
}

/* ---------- voice lines: quips never give the answer away ---------- */
const norm = (t: string) => ` ${t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
for (const m of movies) {
  const { intro, reveal } = m.voice ?? ({} as { intro?: string; reveal?: string });
  if (blank(intro)) fail(`slot ${m.slot}: no voice.intro`);
  if (blank(reveal)) fail(`slot ${m.slot}: no voice.reveal`);
  const t = norm(m.answer);
  if (!blank(reveal) && !norm(reveal!).includes(t)) fail(`slot ${m.slot}: reveal "${reveal}" does not contain the answer "${m.answer}"`);
  if (!blank(intro) && norm(intro!).includes(t)) fail(`slot ${m.slot}: intro "${intro}" contains the answer "${m.answer}"`);
}

/* ---------- warnings ---------- */
const warnings: { what: string; detail: string }[] = [];
if (meta.musicLicenseText == null) warnings.push({ what: 'meta.musicLicenseText', detail: 'null (fill it before publishing)' });
const LONG = 20;
for (const s of slots) {
  const title = s.kind === 'movie' ? s.answer : s.key === 'spotlight' ? s.title : '';
  if (title.length > LONG) warnings.push({ what: `title > ${LONG} chars`, detail: `slot ${s.slot}: "${title}" (${title.length})` });
}
const longest = movies.reduce((a, m) => (m.answer.length > a.answer.length ? m : a), movies[0]);
if (longest) warnings.push({ what: 'longest title', detail: `slot ${longest.slot}: "${longest.answer}" (${longest.answer.length})` });

/* ---------- src copy vs docs copy (warning only) ---------- */
try {
  const a = readFileSync(resolve(__dirname, '../docs/xmas/questions.json'), 'utf8');
  const c = readFileSync(resolve(__dirname, '../src/xmas/questions.json'), 'utf8');
  if (a !== c) warnings.push({ what: 'stale copy', detail: 'src/xmas/questions.json differs from docs/xmas/questions.json: run npx tsx scripts/sync_xmas_data.ts' });
} catch {
  warnings.push({ what: 'copy check', detail: 'could not compare docs and src copies' });
}

if (warnings.length) {
  console.log('WARNINGS');
  console.table(warnings);
}
if (fails.length) {
  console.error(`\nFAILED (${fails.length})`);
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: ${slots.length} slots (${movies.length} movies, ${bonuses.length} bonuses), stars [${stars}], ${ranks.length} ranks`);
