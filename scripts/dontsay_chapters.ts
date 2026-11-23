/**
 * dontsay_chapters.ts: YouTube chapter list for "Don't Say The Same As Me", from timing.ts.
 *   npx tsx scripts/dontsay_chapters.ts
 * Prints the list and the difference to the script's draft, and writes docs/dontsay/chapters.txt
 * (the chapter lines only, ready to paste into the description).
 *
 * Chapters: Intro, one per level card (title from levelColors), the final bonus, the rank card.
 * Bonuses 1-4 and the outro are not chapters. Times are the start of each segment, floored to the
 * second (what YouTube reads). The first chapter must be 0:00 and each must be 10 s or longer.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { bonuses, levelColors } from '../src/dontsay/data';
import { segments, ticksToSec, timecode, TOTAL_SEC } from '../src/dontsay/timing';

type Chapter = { title: string; sec: number };

const titleCase = (s: string): string => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const lastBonus = bonuses[bonuses.length - 1];

const chapters: Chapter[] = [];
for (const s of segments) {
  const sec = Math.floor(ticksToSec(s.from) + 1e-9);
  if (s.kind === 'hook') chapters.push({ title: 'Intro', sec });
  else if (s.kind === 'levelCard') chapters.push({ title: `Level ${s.level}: ${levelColors[s.level].name}`, sec });
  else if (s.kind === 'bonus' && s.bonus.n === lastBonus.n) chapters.push({ title: `Final bonus: ${titleCase(s.bonus.name)}`, sec });
  else if (s.kind === 'rankCard') chapters.push({ title: 'Your rank', sec });
}

/** The draft in the script, in chapter order (Intro ... Your rank). */
const DRAFT = ['0:00', '0:08', '2:12', '4:19', '6:16', '8:01', '9:44', '10:00'];
const toSec = (t: string): number => {
  const [m, s] = t.split(':').map(Number);
  return m * 60 + s;
};

const problems: string[] = [];
if (chapters[0]?.sec !== 0) problems.push('first chapter is not 0:00');
chapters.forEach((c, i) => {
  const next = i + 1 < chapters.length ? chapters[i + 1].sec : Math.floor(TOTAL_SEC);
  if (next - c.sec < 10) problems.push(`"${c.title}" is shorter than 10 s`);
});
if (chapters.length !== DRAFT.length) problems.push(`${chapters.length} chapters but the draft has ${DRAFT.length}`);

const lines = chapters.map((c) => `${timecode(c.sec)} ${c.title}`);
const out = resolve(dirname(new URL(import.meta.url).pathname), '../docs/dontsay/chapters.txt');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n') + '\n');

const sign = (n: number): string => (n > 0 ? `+${n}` : `${n}`);
console.log(lines.join('\n'));
console.log('');
console.log('chapter'.padEnd(28), 'now'.padStart(6), 'draft'.padStart(6), 'diff (s)'.padStart(9));
chapters.forEach((c, i) => {
  const d = DRAFT[i];
  console.log(c.title.padEnd(28), timecode(c.sec).padStart(6), (d ?? '-').padStart(6), (d ? sign(c.sec - toSec(d)) : '-').padStart(9));
});
console.log(`\ntotal runtime ${timecode(TOTAL_SEC)} (${TOTAL_SEC} s)`);
console.log(problems.length ? `PROBLEMS:\n- ${problems.join('\n- ')}` : 'checks: first chapter 0:00, every chapter >= 10 s, chapter count matches the draft');
console.log(`written: ${out}`);
if (problems.length) process.exitCode = 1;
