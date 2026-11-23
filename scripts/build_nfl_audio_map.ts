/**
 * Maps every row of docs/nfl/lines.csv to the cards of src/nfl/data.ts and writes src/nfl/audioMap.ts
 * (and src/nfl/lines.generated.ts: the spoken text per slot, copied unchanged, for the scenes that show it).
 * Run: npx tsx scripts/build_nfl_audio_map.ts      (exit code 1 when anything does not line up; nothing is written then)
 * Pattern: scripts/build_gta6_audio_map.ts (walk the rows in file order, a cursor on the data items).
 *
 * Walk, in file order:
 *   hook       -> hookId (exactly one)
 *   level      -> levelIds, rookie / starter / hof in order
 *   cardintro  -> opens the NEXT card of data.ts; the previous card must be complete
 *   clue       -> the open card; exactly five, in order
 *   reveal     -> the open card, after its five clues; the text must not contain "Did you know"
 *   dyk        -> the open card after its reveal; data.ts must give that card a didYouKnow, and the text starts "Did you know"
 *   scorecard  -> scoreCardIds: rookie after card 10, starter after card 20, hof after card 30 ("Let us see your score")
 *   prediction -> predictionIds '0' (intro) .. '3'
 *   rank       -> rankIds; the file lists the lowest tier first, the map is best first (key '1' = Hall of Famer)
 *   outro      -> outroIds
 * Checks: no row left over (unknown type, wrong place), a card without five clues, a reveal containing "Did you know",
 * a type mismatch (row type vs the place it sits in, dyk vs data.ts, rank text vs data.ts rank name, timings.generated.ts
 * type or key vs this map), a clip id that is not in lines.csv (files in source/ and clips/), an id in lines.csv with no clip,
 * and total mapped = number of rows.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cards, levels, ranks } from '../src/nfl/data';
import type { Level } from '../src/nfl/data';
import { clipTimings } from '../src/nfl/timings.generated';

const CSV = 'docs/nfl/lines.csv';
const OUT = 'src/nfl/audioMap.ts';
const OUT_LINES = 'src/nfl/lines.generated.ts';
const FOLDERS = ['public/nfl/voiceover/source', 'public/nfl/voiceover/clips'];

/* ---- lines.csv (quoted fields allowed) ---- */
const parseCsv = (text: string): string[][] => {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x !== '')) out.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== '')) out.push(row);
  return out;
};

type Row = { line: number; id: string; type: string; text: string };
const table = parseCsv(readFileSync(CSV, 'utf8'));
const header = table[0]?.map((h) => h.trim());
if (header?.join(',') !== 'id,type,text') { console.error(`FAIL: ${CSV} header is ${header?.join(',')}, expected id,type,text`); process.exit(1); }
const rows: Row[] = table.slice(1).map((r, i) => ({ line: i + 2, id: (r[0] ?? '').trim(), type: (r[1] ?? '').trim(), text: r[2] ?? '' }));

type CardAudio = { n: number; cardintroId: string; clueIds: string[]; revealId: string; dykId?: string };
const problems: string[] = [];
const bad = (r: Row, why: string) => problems.push(`${CSV}:${r.line} ${r.id} (${r.type}): ${why}`);

let hookId: string | undefined;
const audio: CardAudio[] = [];
const levelRows: Row[] = [];
const scoreRows: { row: Row; after: number }[] = [];
const predictionRows: Row[] = [];
const rankRows: Row[] = [];
const outroRows: Row[] = [];
const keyOf = new Map<string, { type: string; key: string; text: string }>();
let mapped = 0;
const seen = new Set<string>();
const DYK = /did you know/i;

const done = (a: CardAudio | undefined): boolean => !!a && a.clueIds.length === 5 && !!a.revealId;
const nextCard = () => cards[audio.length];

for (const r of rows) {
  if (!r.id) { bad(r, 'empty id'); continue; }
  if (seen.has(r.id)) { bad(r, 'duplicate id'); continue; }
  seen.add(r.id);
  const cur = audio[audio.length - 1];
  const open = cur && !done(cur) ? cur : undefined;
  const lastCard = cur ? cards[audio.length - 1] : undefined;
  let key: string | undefined;
  switch (r.type) {
    case 'hook':
      if (hookId) bad(r, `second hook row (hook is already ${hookId})`);
      else if (audio.length) bad(r, 'hook after the first card');
      else { hookId = r.id; key = ''; }
      break;
    case 'level': {
      if (open) { bad(r, `card ${open.n} is not complete`); break; }
      const level = levels[levelRows.length];
      if (!level) { bad(r, `more level rows than levels (${levels.length})`); break; }
      const upcoming = nextCard();
      if (!upcoming || upcoming.level !== level || (lastCard && lastCard.level === level)) bad(r, `the ${level} level row must sit right before the first ${level} card (next card is ${upcoming ? `${upcoming.n}, ${upcoming.level}` : 'none'})`);
      levelRows.push(r);
      key = level;
      break;
    }
    case 'cardintro': {
      if (open) { bad(r, `card ${open.n} has ${open.clueIds.length} clues and ${open.revealId ? 'a' : 'no'} reveal before this row`); break; }
      const card = nextCard();
      if (!card) { bad(r, `no card left in data.ts (${cards.length} cards)`); break; }
      audio.push({ n: card.n, cardintroId: r.id, clueIds: [], revealId: '' });
      key = String(card.n);
      break;
    }
    case 'clue':
      if (!cur || cur.revealId) bad(r, 'clue outside a card');
      else if (cur.clueIds.length >= 5) bad(r, `card ${cur.n} already has five clues`);
      else { cur.clueIds.push(r.id); key = `${cur.n}.${cur.clueIds.length}`; }
      break;
    case 'reveal':
      if (!cur) bad(r, 'reveal before any card');
      else if (cur.revealId) bad(r, `card ${cur.n} already has a reveal (${cur.revealId})`);
      else if (cur.clueIds.length !== 5) bad(r, `card ${cur.n} has ${cur.clueIds.length} clues, a card needs five before its reveal`);
      else if (DYK.test(r.text)) bad(r, `the reveal clip for card ${cur.n} contains "Did you know"; that belongs in its own dyk clip`);
      else { cur.revealId = r.id; key = String(cur.n); }
      break;
    case 'dyk':
      if (!cur || !cur.revealId) bad(r, 'dyk before a card has its reveal');
      else if (cur.dykId) bad(r, `card ${cur.n} already has a dyk (${cur.dykId})`);
      else if (!lastCard!.didYouKnow) bad(r, `card ${cur.n} has no didYouKnow in data.ts`);
      else if (!/^\s*did you know/i.test(r.text)) bad(r, 'dyk text does not start with "Did you know"');
      else { cur.dykId = r.id; key = String(cur.n); }
      break;
    case 'scorecard': {
      if (!cur || !done(cur)) { bad(r, 'score card before a card is complete'); break; }
      const level = scoreRows.length < 3 ? levels[scoreRows.length] : undefined;
      if (!level) { bad(r, 'more than three scorecard rows'); break; }
      const closes = cards.filter((c) => c.level === level);
      const lastOfLevel = closes[closes.length - 1].n;
      if (lastCard!.n !== lastOfLevel) { bad(r, `the ${level} score card must follow card ${lastOfLevel}, it follows card ${lastCard!.n}`); break; }
      scoreRows.push({ row: r, after: lastCard!.n });
      key = level;
      break;
    }
    case 'prediction':
      if (scoreRows.length < 3) { bad(r, 'prediction before the card-30 score line'); break; }
      predictionRows.push(r);
      key = String(predictionRows.length - 1);
      break;
    case 'rank':
      if (predictionRows.length === 0) { bad(r, 'rank before the predictions'); break; }
      rankRows.push(r);
      key = String(ranks.length + 1 - rankRows.length); // file order is lowest tier first
      break;
    case 'outro':
      if (rankRows.length === 0) { bad(r, 'outro before the ranks'); break; }
      outroRows.push(r);
      key = String(outroRows.length);
      break;
    default:
      bad(r, 'unknown type');
  }
  if (key !== undefined) { mapped++; keyOf.set(r.id, { type: r.type, key, text: r.text }); }
}

/* ---- totals and per-card checks ---- */
if (!hookId) problems.push(`${CSV}: no hook row`);
if (audio.length !== cards.length) problems.push(`${audio.length} cardintro rows, data.ts has ${cards.length} cards`);
audio.forEach((a) => {
  const card = cards.find((c) => c.n === a.n);
  if (a.clueIds.length !== 5) problems.push(`card ${a.n}: ${a.clueIds.length} clue clips, a card needs five`);
  if (!a.revealId) problems.push(`card ${a.n}: no reveal clip`);
  if (card && Boolean(card.didYouKnow) !== Boolean(a.dykId)) problems.push(`card ${a.n}: didYouKnow in data.ts is ${card.didYouKnow ? 'set' : 'empty'} but lines.csv has ${a.dykId ? 'a dyk row' : 'no dyk row'}`);
});
if (levelRows.length !== levels.length) problems.push(`${levelRows.length} level rows, expected ${levels.length}`);
if (scoreRows.length !== 3) problems.push(`${scoreRows.length} scorecard rows, expected 3 (after cards 10, 20, 30)`);
if (predictionRows.length !== 4) problems.push(`${predictionRows.length} prediction rows, expected 4 (intro + 3 picks)`);
if (rankRows.length !== ranks.length) problems.push(`${rankRows.length} rank rows, data.ts has ${ranks.length} ranks`);
else {
  rankRows.forEach((r, i) => {
    const rank = ranks[ranks.length - 1 - i]; // lowest tier first in the file
    if (!r.text.toLowerCase().includes(rank.name.toLowerCase())) bad(r, `type mismatch: row ${i + 1} should be the ${rank.name} line, the text is "${r.text}"`);
  });
}
if (outroRows.length !== 5) problems.push(`${outroRows.length} outro rows, expected 5`);
if (mapped !== rows.length) problems.push(`mapped ${mapped} rows, ${CSV} has ${rows.length}`);

/* ---- clip files vs lines.csv ---- */
const csvIds = new Set(rows.map((r) => r.id));
for (const dir of FOLDERS) {
  if (!existsSync(dir)) { problems.push(`missing folder ${dir}`); continue; }
  const ids = readdirSync(dir).filter((f) => /\.(wav|mp3)$/i.test(f)).map((f) => f.replace(/\.[^.]+$/, ''));
  ids.filter((i) => !csvIds.has(i)).forEach((i) => problems.push(`${dir}/${i}: clip id is not in ${CSV}`));
  [...csvIds].filter((i) => !ids.includes(i)).forEach((i) => problems.push(`${i}: in ${CSV} but no clip in ${dir}`));
}

/* ---- timings.generated.ts must agree with this map (type and key per id) ---- */
for (const t of clipTimings) {
  const m = keyOf.get(t.id);
  if (!m) problems.push(`timings.generated.ts: clip ${t.id} is not in ${CSV}`);
  else if (m.type !== t.type || m.key !== t.key) problems.push(`timings.generated.ts: ${t.id} is ${t.type}:${t.key}, the audio map says ${m.type}:${m.key} (re-run scripts/build_nfl_timings.py)`);
}
if (clipTimings.length === 0) console.warn('warning: timings.generated.ts is empty; run python3 scripts/build_nfl_timings.py');

if (problems.length) {
  console.error(`FAIL (${problems.length}, first ${Math.min(problems.length, 40)} shown; fix the first one, the rest often follow from it):`);
  problems.slice(0, 40).forEach((p) => console.error('  ' + p));
  process.exit(1);
}

/* ---- write ---- */
const q = (s: string) => `'${s}'`;
const byLevel = (rs: Row[]) => rs.map((r, i) => `  ${levels[i]}: ${q(r.id)},`).join('\n');
const cardLines = audio.map((a) => `  { n: ${a.n}, cardintroId: ${q(a.cardintroId)}, clueIds: [${a.clueIds.map(q).join(', ')}], revealId: ${q(a.revealId)}${a.dykId ? `, dykId: ${q(a.dykId)}` : ''} },`);
const src = `/* Generated by scripts/build_nfl_audio_map.ts from docs/nfl/lines.csv and src/nfl/data.ts. Do not edit; do not hand-write ids. */
import type { Level } from './data';

export type CardAudio = { n: number; cardintroId: string; clueIds: string[]; revealId: string; dykId?: string };

export const hookId = ${q(hookId!)};

/** Level clips: Rookie (banner over card 1), Starter and Hall of Fame (level cards). */
export const levelIds: Record<Level, string> = {
${byLevel(levelRows)}
};

/** One entry per card, in play order (same order as data.ts \`cards\`): "Card n.", five clues (hardest first), reveal, and a dyk only on cards 3, 6, 9, 12, 15, 18, 22, 24, 27, 30. */
export const cardAudio: CardAudio[] = [
${cardLines.join('\n')}
];

/** Score card clips by the level they close (after cards ${scoreRows.map((s) => s.after).join(', ')}); the Hall of Fame one is "That was card thirty" and opens the wallet collection. */
export const scoreCardIds: Record<Level, string> = {
${byLevel(scoreRows.map((s) => s.row))}
};

/** Prediction clips: index 0 = intro, 1..3 = picks (timing key = index as a string). */
export const predictionIds: string[] = [${predictionRows.map((r) => q(r.id)).join(', ')}];

/** Rank clips, best first (Hall of Famer ... Practice Squad), same order as data.ts \`ranks\`; timing key = index + 1. The scoreboard plays them lowest first. */
export const rankIds: string[] = [${[...rankRows].reverse().map((r) => q(r.id)).join(', ')}];

export const outroIds: string[] = [${outroRows.map((r) => q(r.id)).join(', ')}];

/** Rows of lines.csv that were mapped (all of them). */
export const mappedRows = ${mapped};

export const audioOf = (card: { n: number }): CardAudio => {
  const a = cardAudio.find((x) => x.n === card.n);
  if (!a) throw new Error(\`audioMap: no audio for card \${card.n}\`);
  return a;
};
`;
writeFileSync(OUT, src);

const lineRows = rows.map((r) => {
  const m = keyOf.get(r.id)!;
  return `  { id: ${JSON.stringify(r.id)}, type: ${JSON.stringify(m.type)}, key: ${JSON.stringify(m.key)}, text: ${JSON.stringify(r.text)} },`;
});
writeFileSync(
  OUT_LINES,
  `/* Generated by scripts/build_nfl_audio_map.ts from docs/nfl/lines.csv. Do not edit by hand.
 * One row per spoken line. \`id\` is the script id, \`type\` and \`key\` are the same slot keys as in timings.generated.ts
 * (scorecard 'rookie' 'starter' 'hof' | level 'rookie' 'starter' 'hof'), \`text\` is the line exactly as in lines.csv. */
import type { ClipType } from './timings.generated';

export type LineRow = { id: string; type: ClipType; key: string; text: string };
export const lines: LineRow[] = [
${lineRows.join('\n')}
];
`,
);

const pad = (s: string, n: number) => s.padEnd(n);
console.log(`${pad('card', 5)} ${pad('clue ids', 50)} ${pad('reveal', 8)} dyk`);
audio.forEach((a) => console.log(`${pad(String(a.n), 5)} ${pad(a.clueIds.join(' '), 50)} ${pad(a.revealId, 8)} ${a.dykId ?? ''}`));
console.log(`\nhook ${hookId} | levels ${levelRows.map((r) => r.id).join(', ')} | score cards ${scoreRows.map((s) => `${s.row.id} (after ${s.after})`).join(', ')} | predictions ${predictionRows.map((r) => r.id).join(', ')} | ranks (best first) ${[...rankRows].reverse().map((r) => r.id).join(', ')} | outro ${outroRows.map((r) => r.id).join(', ')}`);
console.log(`mapped ${mapped} of ${rows.length} rows -> ${OUT}, ${OUT_LINES}`);
