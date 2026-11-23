/**
 * Task 6b: voice fit report. Run with `npx tsx scripts/xmas_voice_fit.ts [--top N] [--csv path]`.
 *
 * Reads the measured clip lengths (src/xmas/timings.csv), the spoken lines (src/xmas/data.ts) and the base lengths
 * and flex rules (constants in src/xmas/timing.ts). For every slot clip that is longer than its base slot it prints
 * the overrun and the line text, then the totals and the runtime the flex rules give. It changes no text, clip or file.
 *
 * Flex rules (same as timing.ts): intro slot = max(base, clip + flexPadIntro), reveal slot = max(base, clip + flexPadReveal),
 * both rounded up to whole 30 fps ticks; thinking/playing time never changes.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { slots, voiceOf } from '../src/xmas/data';
import type { Slot } from '../src/xmas/data';
import {
  FPS,
  TOTAL_SEC,
  bonusIntroSec,
  bonusRevealSec,
  flexPadIntro,
  flexPadReveal,
  hookSec,
  movieIntroSec,
  movieRevealSec,
  outroSec,
  pauseTicksOf,
  playSecOf,
  scoreBeats,
  scoreSec,
  secToTicks,
  targetSec,
  ticksToSec,
  timecode,
  useClipTimings,
} from '../src/xmas/timing';

type Part = 'intro' | 'reveal';
type CsvRow = { id: string; type: string; slot: number | null; part: string; durSec: number };

/* ---------- arguments ---------- */
const args = process.argv.slice(2);
const argValue = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const TOP = Math.max(1, Number(argValue('--top') ?? 15));
const scriptDir = path.dirname(process.argv[1] ?? '.');
const csvPath = path.resolve(argValue('--csv') ?? path.join(scriptDir, '..', 'src', 'xmas', 'timings.csv'));

/* ---------- csv: id,type,slot,part,durSec ---------- */
const loadCsv = (file: string): CsvRow[] => {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  const head = lines[0].split(',').map((h) => h.trim());
  const col = (name: string): number => {
    const i = head.indexOf(name);
    if (i < 0) throw new Error(`${file}: no column "${name}" (found ${head.join(',')})`);
    return i;
  };
  const [cId, cType, cSlot, cPart, cDur] = ['id', 'type', 'slot', 'part', 'durSec'].map(col);
  return lines.slice(1).map((line, n) => {
    const f = line.split(',').map((x) => x.trim());
    const durSec = Number(f[cDur]);
    if (!Number.isFinite(durSec)) throw new Error(`${file} line ${n + 2}: bad durSec "${f[cDur]}"`);
    return { id: f[cId], type: f[cType], slot: f[cSlot] === '' ? null : Number(f[cSlot]), part: f[cPart], durSec };
  });
};

/* ---------- the flex rules, as in timing.ts ---------- */
const up = (sec: number): number => Math.ceil(sec * FPS - 1e-9);
const baseSec = (s: Slot, part: Part): number => (part === 'intro' ? (s.kind === 'movie' ? movieIntroSec : bonusIntroSec) : s.kind === 'movie' ? movieRevealSec : bonusRevealSec);
const padSec = (part: Part): number => (part === 'intro' ? flexPadIntro : flexPadReveal);
const flexTicks = (s: Slot, part: Part, clip: number | undefined): number =>
  Math.max(secToTicks(baseSec(s, part)), clip === undefined ? 0 : up(clip + padSec(part)));

const expectedType = (s: Slot, part: Part): string => (s.kind === 'movie' ? (part === 'intro' ? 'quip' : 'reveal') : part === 'intro' ? 'bonusintro' : 'bonusreveal');

/* ---------- join csv rows to slots ---------- */
const rows = loadCsv(csvPath);
const problems: string[] = [];
const clipOf = new Map<string, CsvRow>();
for (const r of rows) {
  if (r.slot === null) continue;
  const key = `${r.slot}:${r.part}`;
  if (clipOf.has(key)) problems.push(`duplicate clip for slot ${r.slot} ${r.part}`);
  clipOf.set(key, r);
}

type Clip = {
  slot: Slot;
  part: Part;
  id: string;
  type: string;
  text: string;
  clipSec: number;
  baseSec: number;
  /** clip - base, seconds; positive = the clip is longer than its base slot. */
  overrun: number;
  /** Slot length after the flex rules minus the base length, seconds. */
  added: number;
};

const clips: Clip[] = [];
for (const s of slots) {
  for (const part of ['intro', 'reveal'] as const) {
    const r = clipOf.get(`${s.slot}:${part}`);
    if (!r) {
      problems.push(`slot ${s.slot} ${part}: no row in ${path.basename(csvPath)}`);
      continue;
    }
    if (r.type !== expectedType(s, part)) problems.push(`slot ${s.slot} ${part}: csv type "${r.type}", data.ts says ${s.kind} so "${expectedType(s, part)}"`);
    const base = baseSec(s, part);
    clips.push({
      slot: s,
      part,
      id: r.id,
      type: r.type,
      text: voiceOf(s)[part],
      clipSec: r.durSec,
      baseSec: base,
      overrun: r.durSec - base,
      added: ticksToSec(flexTicks(s, part, r.durSec) - secToTicks(base)),
    });
  }
}
const slotRowCount = rows.filter((r) => r.slot !== null).length;
if (slotRowCount !== clips.length) problems.push(`csv has ${slotRowCount} slot rows, data.ts expects ${slots.length * 2}`);
if (problems.length) {
  console.error('Cannot build the report:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

/* ---------- output helpers ---------- */
const f2 = (n: number): string => n.toFixed(2);
const sgn = (n: number): string => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(2)}`;
const cell = (t: string): string => t.replace(/\|/g, '\\|');
const kindOf = (c: Clip): string => (c.slot.kind === 'movie' ? (c.part === 'intro' ? 'movie quip' : 'movie reveal') : c.part === 'intro' ? 'bonus intro' : 'bonus reveal');
const label = (c: Clip): string => `${c.slot.slot}${c.slot.kind === 'bonus' ? ` (bonus ${c.slot.bonus}: ${c.slot.name})` : ''}`;
const hms = (sec: number): string => `${timecode(sec)} (${f2(sec)} s)`;

const longer = clips.filter((c) => c.overrun > 1e-9);
const worst = longer.slice().sort((a, b) => b.overrun - a.overrun || a.slot.slot - b.slot.slot);

console.log(`# Voice fit report (task 6b)\n`);
console.log(`Clips: ${path.relative(process.cwd(), csvPath) || csvPath}, ${clips.length} slot clips for ${slots.length} slots.`);
console.log(`Base lengths: movie quip ${movieIntroSec} s, bonus intro ${bonusIntroSec} s, reveal ${movieRevealSec} s (bonus reveal ${bonusRevealSec} s). Flex pad: intro +${flexPadIntro} s, reveal +${flexPadReveal} s.\n`);

/* ---------- 1. worst overruns ---------- */
console.log(`## ${Math.min(TOP, worst.length)} worst overruns (of ${longer.length} clips longer than their base slot)\n`);
console.log('| # | slot | kind | clip id | clip s | base s | overrun s | slot becomes s | line |');
console.log('|---|---|---|---|---|---|---|---|---|');
worst.slice(0, TOP).forEach((c, i) => {
  console.log(`| ${i + 1} | ${label(c)} | ${kindOf(c)} | ${c.id} | ${f2(c.clipSec)} | ${f2(c.baseSec)} | ${sgn(c.overrun)} | ${f2(c.baseSec + c.added)} | ${cell(c.text)} |`);
});

/* ---------- 2. totals by kind ---------- */
const kinds = ['movie quip', 'movie reveal', 'bonus intro', 'bonus reveal'];
console.log('\n## Added time by clip kind\n');
console.log('| kind | clips | longer than base | longest overrun s | added over base s |');
console.log('|---|---|---|---|---|');
for (const k of kinds) {
  const all = clips.filter((c) => kindOf(c) === k);
  const over = all.filter((c) => c.overrun > 1e-9);
  const max = over.length ? Math.max(...over.map((c) => c.overrun)) : 0;
  console.log(`| ${k} | ${all.length} | ${over.length} | ${over.length ? sgn(max) : '-'} | ${f2(all.reduce((a, c) => a + c.added, 0))} |`);
}
const padOnly = clips.filter((c) => c.overrun <= 1e-9 && c.added > 1e-9);
const addedTotal = clips.reduce((a, c) => a + c.added, 0);
const overrunSum = longer.reduce((a, c) => a + c.overrun, 0);
console.log(`\nSum of overruns (clip minus base, only clips longer than base): ${f2(overrunSum)} s.`);
console.log(`Total added time over the base lengths, after the flex rules: **${f2(addedTotal)} s**.`);
console.log(
  padOnly.length
    ? `(${padOnly.length} clip(s) are not longer than base but still lengthen their slot because clip + pad exceeds it: ${padOnly.map((c) => `${c.slot.slot} ${c.part}`).join(', ')}.)`
    : '(No clip is shorter than base while still lengthening its slot.)',
);

/* ---------- 3. runtime ---------- */
const fixedTicks = secToTicks(hookSec) + secToTicks(scoreSec) + secToTicks(outroSec);
const slotTicks = (withClips: boolean): number =>
  slots.reduce((a, s) => {
    const intro = flexTicks(s, 'intro', withClips ? clipOf.get(`${s.slot}:intro`)!.durSec : undefined);
    const reveal = flexTicks(s, 'reveal', withClips ? clipOf.get(`${s.slot}:reveal`)!.durSec : undefined) + pauseTicksOf(s);
    return a + intro + secToTicks(playSecOf(s)) + reveal;
  }, 0);
const baseTotal = ticksToSec(fixedTicks + slotTicks(false));
const flexTotal = ticksToSec(fixedTicks + slotTicks(true));
const target = targetSec.target;
const tol = targetSec.tolerance;

console.log('\n## Runtime\n');
console.log('| | length |');
console.log('|---|---|');
console.log(`| hook + score + outro (fixed) | ${hms(ticksToSec(fixedTicks))} |`);
console.log(`| base lengths (no clips) | ${hms(baseTotal)} |`);
console.log(`| **with flex rules** | **${hms(flexTotal)}** |`);
console.log(`| target | ${hms(target)} +-${tol} s |`);
const delta = flexTotal - target;
console.log(`\nWith the flex rules the video is ${sgn(delta)} s against 12:00: ${Math.abs(delta) <= tol ? 'inside' : 'OUTSIDE'} the +-${tol} s tolerance.`);
if (delta > tol) console.log(`Cut at least ${f2(delta - tol)} s to reach the edge of the tolerance, ${f2(delta)} s to reach 12:00.`);
else if (delta < -tol) console.log(`${f2(-delta - tol)} s short of the tolerance edge, ${f2(-delta)} s short of 12:00.`);

const expectedTotal = useClipTimings ? flexTotal : baseTotal;
console.log(
  Math.abs(TOTAL_SEC - expectedTotal) < 1e-6
    ? `\nCheck: timing.ts TOTAL_SEC (${f2(TOTAL_SEC)} s) matches this script's ${useClipTimings ? 'flexed' : 'base (timings.generated.ts has no clips yet)'} total.`
    : `\nWARNING: timing.ts TOTAL_SEC is ${f2(TOTAL_SEC)} s but this script computes ${f2(expectedTotal)} s for the same inputs (timings.generated.ts ${useClipTimings ? 'has' : 'has no'} clips). Check before trusting the numbers.`,
);

/* ---------- 4. clips outside the slot flex (not changed by timing.ts) ---------- */
console.log('\n## Other voice clips (timing.ts does not flex these; shown for information)\n');
const byType = (t: string): CsvRow[] => rows.filter((r) => r.type === t);
const beats = scoreBeats();
type Other = { what: string; id: string; clip: number; start: number; nextStart: number; nextWhat: string };
const others: Other[] = [];
const hook = byType('hook')[0];
if (hook) others.push({ what: 'hook line', id: hook.id, clip: hook.durSec, start: 0, nextStart: hookSec, nextWhat: 'slot 1 starts' });
const end = byType('end')[0];
if (end) others.push({ what: 'end line (score)', id: end.id, clip: end.durSec, start: ticksToSec(beats.endVoiceFrom), nextStart: ticksToSec(beats.bands[0]?.voiceFrom ?? beats.total), nextWhat: 'first rank voice' });
byType('rank').forEach((r, i) => {
  const b = beats.bands[i];
  if (!b) return;
  const next = beats.bands[i + 1];
  others.push({ what: `rank line ${i + 1}`, id: r.id, clip: r.durSec, start: ticksToSec(b.voiceFrom), nextStart: ticksToSec(next ? next.voiceFrom : beats.total), nextWhat: next ? `rank voice ${i + 2}` : 'score segment ends' });
});
console.log('| line | id | clip s | voice runs to s | next starts at s | what | gap s |');
console.log('|---|---|---|---|---|---|---|');
for (const o of others) {
  const gap = o.nextStart - (o.start + o.clip);
  console.log(`| ${o.what} | ${o.id} | ${f2(o.clip)} | ${f2(o.start + o.clip)} | ${f2(o.nextStart)} | ${o.nextWhat} | ${gap >= 0 ? '+' : '-'}${Math.abs(gap).toFixed(3)}${gap < 0 ? ' (overlaps)' : ''} |`);
}
console.log('(Times are seconds from the start of the hook line or of the score segment. Outro asks are not checked here.)');
