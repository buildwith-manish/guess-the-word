/**
 * dontsay_voice_fit.ts: which voice clips are longer than the slot they play in (task 5b). Read-only: edits no text, no clip.
 *   npx tsx scripts/dontsay_voice_fit.ts            (prints the report; exit 1 only if the inputs do not line up)
 *   FIT_TOP=15  how many worst lines to list (default 15)
 *
 * Inputs: src/dontsay/timings.csv (clip lengths, written by build_dontsay_timings.py), docs/dontsay/lines.csv (the spoken
 * text), src/dontsay/audioMap.ts (which clip belongs to which round/bonus/level), data.ts and timing.ts (rounds, slots).
 * Slots are the constants in timing.ts, none is written here:
 *   round intro  introStdSec 1.2 | heavy introHeavySec 3.2 | callback introCallbackSec 4.2   (a heavy round's intro slot holds
 *                the intro line AND its rule line, one after the other, so they are measured together)
 *   reveal revealSec 2.0 | result resultSec 1.8 | level card levelCardSec 4 | check-in heartCheckInSec 2
 *   bonus intro bonusIntroSec 2 | bonus reveal bonusRevealSec 3
 * "Overrun" = clip length - slot (only lines with a positive overrun are listed). A slot also needs clipPadSec (0.3 s) after
 * the clip (timing.ts: slot = max(base, clip + 0.3)), so lines that fit by less than 0.3 s are counted separately.
 *
 * Every voiced slot stretches in timing.ts: slot = max(base, clips + 0.3 s). The runtime printed equals TOTAL_SEC (self-checked).
 * "Shortened" = the worst lines cut to (slot - 0.3 s), so they add nothing. A heavy pair is cut as a whole.
 */
import { readFileSync } from 'node:fs';
import { bonuses, heartCheckIn, rounds } from '../src/dontsay/data';
import { bonusAudio, checkInId, levelIds, roundAudio } from '../src/dontsay/audioMap';
import {
  TOTAL_TICKS, bonusIntroSec, bonusPhaseSecs, bonusRevealSec, checkInSecFor, clipPadSec, clipSec, heartCheckInSec, introBaseSec,
  introSecFor, levelCardSec, levelCardSecFor, resultSec, resultSecFor, revealSec, revealSecFor, secToTicks, settingsCardSec,
  settingsCardSecFor, targetSec, timecode,
} from '../src/dontsay/timing';

const TOP = Number(process.env.FIT_TOP ?? 15);
const problems: string[] = [];

/* ---------- inputs ---------- */
const csvDur = new Map<string, number>();
readFileSync('src/dontsay/timings.csv', 'utf8').replace(/\r/g, '').split('\n').slice(1).filter(Boolean).forEach((l) => {
  const [id, , d] = l.split(',');
  csvDur.set(id, Number(d));
});
if (!csvDur.size) problems.push('src/dontsay/timings.csv has no rows: run python3 scripts/build_dontsay_timings.py');

const text = new Map<string, string>();
{
  const t = readFileSync('docs/dontsay/lines.csv', 'utf8').replace(/\r/g, '');
  const rows: string[][] = [];
  let cells: string[] = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { cells.push(cell); cell = ''; }
    else if (c === '\n') { cells.push(cell); rows.push(cells); cells = []; cell = ''; }
    else cell += c;
  }
  rows.slice(1).filter((r) => r.length >= 3).forEach((r) => text.set(r[0].trim(), r[2].trim()));
}

/** Length of a clip from timings.csv; must agree with what timing.ts measured (timings.generated.ts). */
const dur = (id: string): number => {
  const d = csvDur.get(id);
  if (d === undefined) { problems.push(`no clip length for ${id} in timings.csv`); return 0; }
  const g = clipSec(id);
  if (g === undefined || Math.abs(g - d) > 1e-6) problems.push(`${id}: timings.csv says ${d}, timing.ts (timings.generated.ts) says ${g}: re-run build_dontsay_timings.py`);
  return d;
};

/* ---------- one entry per slot ---------- */
type Kind = 'settings' | 'intro' | 'reveal' | 'result' | 'level' | 'check-in' | 'bonus intro' | 'bonus reveal';
type Entry = {
  where: string; kind: Kind; ids: string[]; durs: number[]; slot: number; len: number; over: number; text: string;
  /** For a round intro/reveal: how timing.ts stretches that slot today. */
  grows?: { round: number; part: 'intro' | 'reveal' };
};
const entries: Entry[] = [];
const add = (where: string, kind: Kind, ids: string[], slot: number, grows?: Entry['grows']) => {
  const durs = ids.map(dur);
  const len = durs.reduce((a, b) => a + b, 0);
  entries.push({ where, kind, ids, durs, slot, len, over: len - slot, text: ids.map((i) => text.get(i) ?? '?').join(' '), grows });
};

for (const r of rounds) {
  const a = roundAudio.find((x) => x.n === r.n);
  if (!a) { problems.push(`round ${r.n} is not in audioMap.ts`); continue; }
  add(`R${r.n}`, 'intro', a.rule ? [a.intro, a.rule] : [a.intro], introBaseSec(r), { round: r.n, part: 'intro' });
  add(`R${r.n}`, 'reveal', [a.reveal], revealSec, { round: r.n, part: 'reveal' });
  if (a.result) add(`R${r.n}`, 'result', [a.result], resultSec);
}
for (const [lv, ids] of Object.entries(levelIds)) add(`L${lv}`, 'level', [ids.level], levelCardSec);
if (levelIds[1].settings) add('L1', 'settings' as Kind, [levelIds[1].settings], settingsCardSec);
add(`after R${heartCheckIn.afterRound}`, 'check-in', [checkInId], heartCheckInSec);
for (const b of bonuses) {
  const a = bonusAudio.find((x) => x.n === b.n);
  if (!a) { problems.push(`bonus ${b.n} is not in audioMap.ts`); continue; }
  add(`B${b.n}`, 'bonus intro', [a.intro], bonusIntroSec);
  add(`B${b.n}`, 'bonus reveal', [a.reveal], bonusRevealSec);
}
if (problems.length) { console.error('FAIL:\n  ' + problems.join('\n  ')); process.exit(1); }

/* ---------- runtimes (in ticks, exactly as timing.ts rounds its slots) ---------- */
const T = (s: number): number => secToTicks(s);
/** Ticks timing.ts adds because of clips: every voiced slot is max(base, clip + pad) now. */
const grownNow = rounds.reduce((sum, r) => sum + (T(introSecFor(r)) - T(introBaseSec(r))) + (T(revealSecFor(r)) - T(revealSec)) + (T(resultSecFor(r)) - T(resultSec)), 0)
  + (Object.keys(levelIds) as unknown as (1 | 2 | 3 | 4 | 5)[]).reduce((sum, lv) => sum + T(levelCardSecFor(lv)) - T(levelCardSec), 0)
  + (T(settingsCardSecFor()) - T(settingsCardSec))
  + (T(checkInSecFor()) - T(heartCheckInSec))
  + bonuses.reduce((sum, b) => { const p = bonusPhaseSecs(b.n); return sum + (T(p.intro) - T(bonusIntroSec)) + (T(p.reveal) - T(bonusRevealSec)); }, 0);
const BASE_TICKS = TOTAL_TICKS - grownNow;
/** Length of an entry after shortening (the 15 worst are cut to slot - pad; a pair is cut proportionally). */
const cutLen = (e: Entry): number => Math.min(e.len, e.slot - clipPadSec);

const allFit = (cut: Set<Entry>): number => {
  let ticks = BASE_TICKS;
  for (const e of entries) ticks += T(Math.max(e.slot, (cut.has(e) ? cutLen(e) : e.len) + clipPadSec)) - T(e.slot);
  return ticks;
};

/* self-check: the model must give back timing.ts's own total, or the numbers below cannot be trusted */
if (allFit(new Set()) !== TOTAL_TICKS) {
  console.error(`FAIL: model gives ${allFit(new Set())} ticks, timing.ts gives ${TOTAL_TICKS}`);
  process.exit(1);
}

/* ---------- report ---------- */
const f1 =(n: number, w = 6): string => n.toFixed(2).padStart(w);
const over = entries.filter((e) => e.over > 1e-9).sort((a, b) => b.over - a.over);
const tight = entries.filter((e) => e.over <= 1e-9 && e.len + clipPadSec > e.slot + 1e-9);
const worst = over.slice(0, TOP);
const worstSet = new Set(worst);

console.log(`Voice fit: ${entries.length} slots, ${csvDur.size} clips, pad ${clipPadSec} s`);
console.log(`${over.length} slot(s) have a clip longer than the slot; ${tight.length} more fit by less than the ${clipPadSec} s pad.\n`);
console.log(`The ${worst.length} worst (clip longer than slot):`);
console.log(`${'#'.padStart(2)} ${'where'.padEnd(10)} ${'line'.padEnd(12)} ${'ids'.padEnd(15)} ${'clip s'.padStart(6)} ${'slot s'.padStart(6)} ${'over s'.padStart(6)}  text`);
worst.forEach((e, i) => {
  const kind = e.ids.length > 1 ? `${e.kind}+rule` : e.kind;
  console.log(`${String(i + 1).padStart(2)} ${e.where.padEnd(10)} ${kind.padEnd(12)} ${e.ids.join('+').padEnd(15)} ${f1(e.len)} ${f1(e.slot)} ${f1(e.over)}  ${e.text}`);
});
const sumOver = (xs: Entry[]): number => xs.reduce((s, e) => s + e.over, 0);
console.log(`\nOverrun: worst ${worst.length} = ${sumOver(worst).toFixed(2)} s, all ${over.length} = ${sumOver(over).toFixed(2)} s, the rest = ${sumOver(over.slice(TOP)).toFixed(2)} s`);
console.log('By slot: ' + (['intro', 'reveal', 'result', 'level', 'check-in', 'bonus intro', 'bonus reveal'] as Kind[]).map((k) => {
  const xs = over.filter((e) => e.kind === k);
  return `${k} ${xs.length}/${entries.filter((e) => e.kind === k).length}`;
}).join(' | '));

const base = BASE_TICKS / 30, now = TOTAL_TICKS / 30, fitCut = allFit(worstSet) / 30;
const row = (label: string, s: number, ref: number): string => `${label.padEnd(34)} ${s.toFixed(1).padStart(7)} s  ${timecode(s).padStart(5)}  ${(s >= ref ? '+' : '') + (s - ref).toFixed(1).padStart(6)} s vs target ${timecode(targetSec)}`;
console.log('\nRuntime (timing.ts stretches every voiced slot to its clip + pad)');
console.log(row('base (no voice, base slots)', base, targetSec));
console.log(row('clips as they are (= timing.ts)', now, targetSec) + `   added by clips: ${(now - base).toFixed(1)} s`);
console.log(row(`${worst.length} worst shortened`, fitCut, targetSec) + `   saves ${(now - fitCut).toFixed(1)} s`);
