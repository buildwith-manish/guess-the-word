/** Prints the YouTube chapter list for the GTA 6 quiz from src/gta6/timing.ts and writes docs/gta6/chapters.txt.
 *  Run: npx tsx scripts/gta6_chapters.ts */
import { mkdirSync, writeFileSync } from 'node:fs';
import { levels } from '../src/gta6/data';
import { segments, ticksToSec, timecode } from '../src/gta6/timing';

const at = (kind: 'levelCard' | 'scoreboard', level?: string): number => {
  const seg = segments.find((s) => s.kind === kind && (kind !== 'levelCard' || s.level === level));
  if (!seg) throw new Error(`no ${kind} segment${level ? ` for ${level}` : ''} in timing.ts`);
  return ticksToSec(seg.from);
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const list: { sec: number; title: string }[] = [
  { sec: 0, title: 'Intro and rules' },
  ...levels.map((l, i) => ({ sec: at('levelCard', l), title: `Level ${i + 1}: ${cap(l)}` })),
  { sec: at('scoreboard'), title: 'Your score' },
];

const lines = list.map((c) => `${timecode(c.sec)} ${c.title}`);
console.log(lines.join('\n'));
mkdirSync('docs/gta6', { recursive: true });
writeFileSync('docs/gta6/chapters.txt', lines.join('\n') + '\n');

/* Draft chapters from the script (seconds), for comparison only. */
const draft = [0, 6, 4 * 60 + 10, 8 * 60 + 35, 11 * 60 + 38];
console.log('\nvs script draft (timing.ts minus draft):');
list.forEach((c, i) => {
  const d = Math.round(c.sec - draft[i]);
  console.log(`  ${c.title.padEnd(16)} draft ${timecode(draft[i])}  now ${timecode(c.sec)}  ${d >= 0 ? '+' : '-'}${Math.abs(d)} s`);
});
