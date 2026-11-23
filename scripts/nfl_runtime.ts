/**
 * Runtime report for the NFL quiz: per-part table and total, compared with the 12 to 14 minute target.
 * Run: npx tsx scripts/nfl_runtime.ts
 * Exit 1 when the total is outside the target or a structural check fails (chapters, end screen, clue constants).
 */
import { cards } from '../src/nfl/data';
import {
  RENDER_FPS,
  RENDER_TOTAL_FRAMES,
  TOTAL_SEC,
  chapters,
  clueBaseSec,
  clueTmwSec,
  endScreenSec,
  outroSlotSec,
  partRanges,
  scriptEstimateSec,
  segments,
  targetSec,
  ticksToSec,
  useClipTimings,
} from '../src/nfl/timing';

const tc = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};
const pad = (v: string | number, w: number): string => String(v).padStart(w);
const failures: string[] = [];
const warnings: string[] = [];

console.log(`Clip timings: ${useClipTimings ? 'measured clips' : 'none yet, constants only (fallback)'}`);
console.log(`Render: ${RENDER_FPS} fps\n`);
console.log(`${'part'.padEnd(7)}${pad('start', 9)}${pad('end', 9)}${pad('length', 9)}${pad('frames', 9)}`);
for (const p of partRanges) {
  const len = ticksToSec(p.to) - ticksToSec(p.from);
  console.log(`${p.name.padEnd(7)}${pad(tc(ticksToSec(p.from)), 9)}${pad(tc(ticksToSec(p.to)), 9)}${pad(tc(len), 9)}${pad(p.renderTo - p.renderFrom, 9)}`);
}
console.log(`${'total'.padEnd(7)}${pad(tc(0), 9)}${pad(tc(TOTAL_SEC), 9)}${pad(tc(TOTAL_SEC), 9)}${pad(RENDER_TOTAL_FRAMES, 9)}`);

const min = TOTAL_SEC / 60;
console.log(`\nTotal ${min.toFixed(2)} min. Target ${targetSec.min / 60} to ${targetSec.max / 60} min. Script estimate ${(scriptEstimateSec / 60).toFixed(1)} min (${((TOTAL_SEC - scriptEstimateSec) / 60 >= 0 ? '+' : '') + ((TOTAL_SEC - scriptEstimateSec) / 60).toFixed(2)} min vs estimate).`);
if (TOTAL_SEC < targetSec.min || TOTAL_SEC > targetSec.max) failures.push(`total ${tc(TOTAL_SEC)} is outside ${targetSec.min / 60} to ${targetSec.max / 60} min`);

// per-segment-kind totals
const byKind = new Map<string, number>();
for (const s of segments) byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + ticksToSec(s.to - s.from));
console.log('\nBy segment kind: ' + [...byKind].map(([k, v]) => `${k} ${v.toFixed(1)} s`).join(', '));

// gaps and overlaps
segments.forEach((s, i) => {
  if (i === 0 ? s.from !== 0 : s.from !== segments[i - 1].to) failures.push(`segment ${i} (${s.kind}) does not start where the previous one ends`);
  if (s.to <= s.from) failures.push(`segment ${i} (${s.kind}) has no length`);
});
if (partRanges[0].from !== 0 || partRanges[3].to !== segments[segments.length - 1].to) failures.push('parts do not cover the whole timeline');
partRanges.forEach((p, i) => i > 0 && p.from !== partRanges[i - 1].to && failures.push(`${p.name} does not start where ${partRanges[i - 1].name} ends`));

// card slots
for (const s of segments) {
  if (s.kind !== 'card') continue;
  const base = s.card.twoMinuteWarning ? clueTmwSec : clueBaseSec;
  if (s.card.clueSec !== base) warnings.push(`card ${s.card.n}: cards.json clueSec ${s.card.clueSec} differs from timing.ts (${base}); timing.ts wins`);
  s.phases.clues.forEach((r, i) => ticksToSec(r.to - r.from) + 1e-6 < base && failures.push(`card ${s.card.n} clue ${i + 1}: slot shorter than ${base} s`));
}

// chapters: 3 or more, first at 0:00, each at least 10 s
if (chapters[0].sec !== 0) failures.push('first chapter is not at 0:00');
if (chapters.length < 3) failures.push('fewer than 3 chapters');
chapters.forEach((c, i) => {
  const end = i + 1 < chapters.length ? chapters[i + 1].sec : TOTAL_SEC;
  if (end - c.sec < 10) failures.push(`chapter "${c.title}" is ${(end - c.sec).toFixed(1)} s, under 10 s`);
});

// outro lines must finish before the end screen starts
const outro = segments.find((s) => s.kind === 'outro');
if (outro && outro.kind === 'outro' && outroSlotSec.length > 0) {
  const linesSec = outroSlotSec.reduce((a, b) => a + b, 0);
  const free = ticksToSec(outro.endScreenFrom - outro.from);
  if (linesSec > free + 1e-6) warnings.push(`outro lines take ${linesSec.toFixed(1)} s, the part before the ${endScreenSec} s end screen is ${free.toFixed(1)} s`);
}
if (cards.length !== 30) failures.push(`${cards.length} cards, expected 30`);

console.log('\nChapters: ' + chapters.map((c) => `${tc(c.sec)} ${c.title}`).join(' | '));
for (const w of warnings) console.log('WARN ' + w);
if (failures.length > 0) {
  for (const f of failures) console.log('FAIL ' + f);
  process.exit(1);
}
console.log('\nOK');
