/**
 * Prints the YouTube chapter list from src/xmas/timing.ts and writes docs/xmas/chapters.txt.
 * Run: npx tsx scripts/xmas_chapters.ts   (exit 1 when a chapter is under 10 s)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { TOTAL_SEC, chapterStartsSec, chapters } from '../src/xmas/timing';

const MIN_CHAPTER_SEC = 10;
const out = join(__dirname, '..', 'docs', 'xmas', 'chapters.txt');

const ends = [...chapterStartsSec.slice(1), TOTAL_SEC];
const lengths = chapterStartsSec.map((s, i) => ends[i] - s);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, chapters.join('\n') + '\n');

console.log(chapters.join('\n'));
console.log('');
let bad = 0;
chapters.forEach((line, i) => {
  const ok = lengths[i] >= MIN_CHAPTER_SEC;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${lengths[i].toFixed(1).padStart(6)} s  ${line}`);
});
console.log(`\nwrote ${out}`);
if (bad) {
  console.error(`${bad} chapter(s) shorter than ${MIN_CHAPTER_SEC} s`);
  process.exit(1);
}
