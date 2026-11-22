/**
 * Maps every row of docs/gta6/lines.csv to the items of src/gta6/data.ts and writes src/gta6/audioMap.ts.
 * Run: npx tsx scripts/build_gta6_audio_map.ts      (exit code 1 when anything does not line up; nothing is written then)
 *
 * Walk, in file order:
 *   hook                  -> hookId (exactly one)
 *   question | bonus      -> the NEXT item of data.ts; a bonus row needs a bonus item (B1..B3), a question row a question item
 *   reveal                -> the item just opened; it must have a question and no reveal yet
 *   dyk                   -> the PREVIOUS item (the one just revealed); it must have a reveal and no dyk yet
 *   level                 -> levelIds, in order, for the levels after the first (medium, hard)
 *   scorecard             -> scoreCardIds of the level of the last item walked; that item must carry a "...ScoreCard" extra
 *   rank, outro           -> rankIds (one per rankTiers entry), outroIds
 * Checks: no row left over (unknown type, wrong order, wrong kind), every item has a question and a reveal,
 * didYouKnow in data.ts <=> a dyk row, total mapped = number of rows. No id is written by hand.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { extraIds, items, levels, rankTiers } from '../src/gta6/data';
import type { Level } from '../src/gta6/data';

const CSV = 'docs/gta6/lines.csv';
const OUT = 'src/gta6/audioMap.ts';

type Row = { line: number; id: string; type: string; text: string };
const rows: Row[] = readFileSync(CSV, 'utf8')
  .replace(/\r/g, '')
  .split('\n')
  .slice(1)
  .filter((l) => l.trim() !== '')
  .map((l, i) => {
    const m = l.match(/^([^,]*),([^,]*),(.*)$/);
    return { line: i + 2, id: m?.[1].trim() ?? '', type: m?.[2].trim() ?? '', text: m?.[3] ?? '' };
  });

type ItemAudio = { order: number; n: string; questionId: string; revealId: string; dykId?: string };
const problems: string[] = [];
const warnings: string[] = [];
const bad = (r: Row, why: string) => problems.push(`${CSV}:${r.line} ${r.id} (${r.type}): ${why}`);

let hookId: string | undefined;
const audio: ItemAudio[] = [];
const levelRows: Row[] = [];
const scoreRows: { row: Row; level: Level }[] = [];
const rankRows: Row[] = [];
const outroRows: Row[] = [];
let mapped = 0;
let pendingLevel: { row: Row; level: Level } | undefined;
const seen = new Set<string>();

for (const r of rows) {
  if (!r.id) { bad(r, 'empty id'); continue; }
  if (seen.has(r.id)) { bad(r, 'duplicate id'); continue; }
  seen.add(r.id);
  const cur = audio[audio.length - 1];
  const curItem = cur ? items[audio.length - 1] : undefined;
  switch (r.type) {
    case 'hook':
      if (hookId) bad(r, `second hook row (hook is already ${hookId})`);
      else { hookId = r.id; mapped++; }
      break;
    case 'question':
    case 'bonus': {
      if (cur && !cur.revealId) { bad(r, `item ${curItem!.n} has no reveal before this row`); break; }
      const item = items[audio.length];
      if (!item) { bad(r, `no item left in data.ts (${items.length} items)`); break; }
      if ((r.type === 'bonus') !== (item.kind === 'bonus')) { bad(r, `row type does not match item ${item.n} (kind ${item.kind})`); break; }
      if (pendingLevel) {
        if (item.level !== pendingLevel.level || (curItem && curItem.level === item.level))
          warnings.push(`${pendingLevel.row.id} is the ${pendingLevel.level} level card but sits before item ${item.n} (${item.level}) after ${curItem ? `item ${curItem.n} (${curItem.level})` : 'the hook'}; timing.ts shows that card before the first ${pendingLevel.level} item, matched by type, not by position`);
        pendingLevel = undefined;
      }
      audio.push({ order: item.order, n: item.n, questionId: r.id, revealId: '' });
      mapped++;
      break;
    }
    case 'reveal':
      if (!cur) bad(r, 'reveal before any question');
      else if (cur.revealId) bad(r, `item ${curItem!.n} already has a reveal (${cur.revealId})`);
      else { cur.revealId = r.id; mapped++; }
      break;
    case 'dyk':
      if (!cur) bad(r, 'dyk before any item');
      else if (!cur.revealId) bad(r, `item ${curItem!.n} has no reveal yet`);
      else if (cur.dykId) bad(r, `item ${curItem!.n} already has a dyk (${cur.dykId})`);
      else { cur.dykId = r.id; mapped++; }
      break;
    case 'level': {
      const li = levelRows.length + 1;
      if (li >= levels.length) { bad(r, `more level rows than levels after the first (${levels.length - 1})`); break; }
      levelRows.push(r);
      pendingLevel = { row: r, level: levels[li] };
      mapped++;
      break;
    }
    case 'scorecard':
      if (!curItem || !cur.revealId) bad(r, 'score card before an item is complete');
      else if (!extraIds(curItem).some((e) => e.endsWith('ScoreCard'))) bad(r, `follows item ${curItem.n}, which has no ScoreCard extra in data.ts`);
      else if (scoreRows.some((s) => s.level === curItem.level)) bad(r, `second score card for ${curItem.level}`);
      else { scoreRows.push({ row: r, level: curItem.level }); mapped++; }
      break;
    case 'rank': rankRows.push(r); mapped++; break;
    case 'outro': outroRows.push(r); mapped++; break;
    default: bad(r, 'unknown type');
  }
}

/* ---- totals and per-item checks ---- */
if (!hookId) problems.push(`${CSV}: no hook row`);
if (audio.length !== items.length) problems.push(`${audio.length} items have a question row, data.ts has ${items.length}`);
audio.forEach((a, i) => {
  const item = items[i];
  if (!a.questionId) problems.push(`item ${item?.n}: no question`);
  if (!a.revealId) problems.push(`item ${item?.n}: no reveal`);
  if (item && Boolean(item.didYouKnow) !== Boolean(a.dykId)) problems.push(`item ${item.n}: didYouKnow in data.ts is ${item.didYouKnow ? 'set' : 'empty'} but the CSV has ${a.dykId ? 'a dyk row' : 'no dyk row'}`);
});
if (levelRows.length !== levels.length - 1) problems.push(`${levelRows.length} level rows, expected ${levels.length - 1} (medium, hard)`);
const scoreCardItems = items.filter((i) => extraIds(i).some((e) => e.endsWith('ScoreCard')));
if (scoreRows.length !== scoreCardItems.length) problems.push(`${scoreRows.length} scorecard rows, data.ts has ${scoreCardItems.length} ScoreCard items (${scoreCardItems.map((i) => i.n).join(', ')})`);
if (rankRows.length !== rankTiers.length) problems.push(`${rankRows.length} rank rows, rankTiers has ${rankTiers.length}`);
if (outroRows.length !== 3) warnings.push(`${outroRows.length} outro rows (the outro scene has 3 asks)`);
if (mapped !== rows.length) problems.push(`mapped ${mapped} rows, ${CSV} has ${rows.length}`);

warnings.forEach((w) => console.warn('warning: ' + w));
if (problems.length) {
  console.error(`FAIL (${problems.length}):`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

/* ---- write ---- */
const q = (s: string) => `'${s}'`;
const itemLines = audio.map((a) => `  { order: ${a.order}, n: ${q(a.n)}, questionId: ${q(a.questionId)}, revealId: ${q(a.revealId)}${a.dykId ? `, dykId: ${q(a.dykId)}` : ''} },`);
const byLevel = (rs: { row: Row; level: Level }[]) => rs.map((s) => `  ${s.level}: ${q(s.row.id)},`).join('\n');
const src = `/* Generated by scripts/build_gta6_audio_map.ts from docs/gta6/lines.csv and src/gta6/data.ts. Do not edit; do not hand-write ids. */
import type { Level } from './data';

export type ItemAudio = { order: number; n: string; questionId: string; revealId: string; dykId?: string };

export const hookId = ${q(hookId!)};

/** One entry per item, in play order (same order as data.ts \`items\`). */
export const itemAudio: ItemAudio[] = [
${itemLines.join('\n')}
];

/** Level card clips. Easy has none. */
export const levelIds: Partial<Record<Level, string>> = {
${byLevel(levelRows.map((row, i) => ({ row, level: levels[i + 1] })))}
};

/** Score card clips, by the level they close (after the item with the ScoreCard extra: ${scoreRows.map((s) => scoreCardItems.find((i) => i.level === s.level)!.n).join(', ')}). */
export const scoreCardIds: Partial<Record<Level, string>> = {
${byLevel(scoreRows)}
};

/** Rank lines in file order (rankTiers order, highest first). */
export const rankIds: string[] = [${rankRows.map((r) => q(r.id)).join(', ')}];

export const outroIds: string[] = [${outroRows.map((r) => q(r.id)).join(', ')}];

/** Rows of lines.csv that were mapped (all of them). */
export const mappedRows = ${mapped};

export const audioOf = (item: { order: number }): ItemAudio => {
  const a = itemAudio.find((x) => x.order === item.order);
  if (!a) throw new Error(\`audioMap: no audio for item order \${item.order}\`);
  return a;
};
`;
writeFileSync(OUT, src);

const pad = (s: string, n: number) => s.padEnd(n);
console.log(`${pad('item', 6)} ${pad('question id', 12)} ${pad('reveal id', 10)} dyk id`);
audio.forEach((a) => console.log(`${pad(a.n, 6)} ${pad(a.questionId, 12)} ${pad(a.revealId, 10)} ${a.dykId ?? ''}`));
console.log(`\nhook ${hookId} | levels ${levelRows.map((r) => r.id).join(', ')} | score cards ${scoreRows.map((s) => `${s.level} ${s.row.id}`).join(', ')} | ranks ${rankRows.map((r) => r.id).join(', ')} | outro ${outroRows.map((r) => r.id).join(', ')}`);
console.log(`mapped ${mapped} of ${rows.length} rows -> ${OUT}`);
