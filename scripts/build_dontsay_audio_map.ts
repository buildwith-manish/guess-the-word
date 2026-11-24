/**
 * Maps every row of docs/dontsay/lines.csv to the rounds, bonuses, levels and scenes of
 * src/dontsay/data.ts and writes src/dontsay/audioMap.ts.
 *   npx tsx scripts/build_dontsay_audio_map.ts
 * Exit code 1 when anything does not line up; nothing is written then. Env: CSV, OUT (to test elsewhere).
 * Pattern (idea only): scripts/build_gta6_audio_map.ts.
 *
 * Walk, in file order:
 *   hook                -> hookIds (before the first level row)
 *   settings            -> the NEXT level row (levelIds[level].settings)
 *   level               -> levelIds, in level order; the next round must be the first round of that level
 *   roundintro          -> the NEXT round of data.ts; the previous round must be complete, and any bonus or
 *                          check-in that data.ts puts after the previous round must have come first
 *   rule                -> the round just opened; the round must be `heavy` in data.ts
 *   reveal              -> the round just opened; a heavy round must already have its rule
 *   result              -> the round just revealed (not allowed on a round with skipResultLine)
 *   bonusintro          -> the bonus data.ts puts after the last complete round
 *   bonusreveal         -> the bonus just opened
 *   checkin             -> right after round heartCheckIn.afterRound
 *   rank                -> after the last bonus: first row = intro line, then one row per `ranks` entry
 *   outro               -> after the rank rows
 * Hard checks (exit 1): a row left over or out of order, an unknown type, a duplicate id, a round without a
 * reveal (or result, or rule when heavy), a bonus without intro or reveal, a heavy round without a rule row or a
 * rule row on a non-heavy round, a level without a row, a rank row that does not name its tier, row count.
 * Soft checks (warnings, printed): the spoken text differs from the text in data.ts (prompt, answer, bonus voice
 * lines, level and check-in voice). No id is written by hand.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { bonuses, heartCheckIn, levelColors, ranks, rounds } from '../src/dontsay/data';
import type { Level } from '../src/dontsay/data';

const CSV = process.env.CSV ?? 'docs/dontsay/lines.csv';
const OUT = process.env.OUT ?? 'src/dontsay/audioMap.ts';

/* ---------- CSV (quoted cells, commas and "" escapes allowed) ---------- */
type Row = { line: number; id: string; type: string; text: string };
const problems: string[] = [];
const warnings: string[] = [];

const parseCsv = (text: string): { line: number; cells: string[] }[] => {
  const t = text.replace(/\r/g, '');
  const out: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let inQ = false;
  let line = 1;
  let start = 1;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else { if (c === '\n') line++; cell += c; }
    } else if (c === '"') inQ = true;
    else if (c === ',') { cells.push(cell); cell = ''; }
    else if (c === '\n') { cells.push(cell); out.push({ line: start, cells }); cells = []; cell = ''; line++; start = line; }
    else cell += c;
  }
  if (cell !== '' || cells.length) { cells.push(cell); out.push({ line: start, cells }); }
  return out.filter((r) => !(r.cells.length === 1 && r.cells[0].trim() === ''));
};

const parsed = parseCsv(readFileSync(CSV, 'utf8'));
const header = parsed[0]?.cells.map((c) => c.trim().toLowerCase()).join(',');
if (header !== 'id,type,text') { console.error(`FAIL: ${CSV} header is "${header}", expected "id,type,text"`); process.exit(1); }
const rows: Row[] = [];
for (const p of parsed.slice(1)) {
  if (p.cells.length !== 3) { problems.push(`${CSV}:${p.line} has ${p.cells.length} columns, expected 3 (quote text that contains a comma)`); continue; }
  rows.push({ line: p.line, id: p.cells[0].trim(), type: p.cells[1].trim(), text: p.cells[2].trim() });
}

/* ---------- walk ---------- */
const levelNumbers = (Object.keys(levelColors) as unknown as string[]).map(Number).sort((a, b) => a - b) as Level[];

type RoundAcc = { n: number; level: Level; intro: Row; rule?: Row; reveal?: Row; result?: Row };
type BonusAcc = { n: number; intro: Row; reveal?: Row };
type LevelAcc = { level: Level; row: Row; settings?: Row };

const accRounds: RoundAcc[] = [];
const accBonus: BonusAcc[] = [];
const hookRows: Row[] = [];
const levelRows: LevelAcc[] = [];
const rankRows: Row[] = [];
const outroRows: Row[] = [];
let checkIn: Row | undefined;
let pendingSettings: Row | undefined;
let pendingLevel: LevelAcc | undefined;
let openBonus: BonusAcc | undefined;
let mapped = 0;
const seen = new Set<string>();

const heavyOf = (n: number): boolean => Boolean(rounds.find((r) => r.n === n)?.heavy);
const skipResultOf = (n: number): boolean => Boolean(rounds.find((r) => r.n === n)?.skipResultLine);
const bad = (r: Row, why: string) => problems.push(`${CSV}:${r.line} ${r.id} (${r.type}): ${why}`);
const missingOf = (a: RoundAcc): string[] => {
  const m: string[] = [];
  if (!a.reveal) m.push('reveal');
  if (!a.result && !skipResultOf(a.n)) m.push('result');
  if (heavyOf(a.n) && !a.rule) m.push('rule');
  return m;
};
const roundOpen = (a: RoundAcc | undefined): boolean => Boolean(a && missingOf(a).length);
/** What data.ts puts between the last complete round and the next row, that has no row yet. */
const dueBefore = (last: RoundAcc | undefined): string | undefined => {
  if (!last) return undefined;
  const b = bonuses.find((x) => x.afterRound === last.n);
  if (b && !accBonus.some((x) => x.n === b.n)) return `bonus ${b.n} (due after round ${last.n}) has no row yet`;
  if (heartCheckIn.afterRound === last.n && !checkIn) return `the heart check-in (due after round ${last.n}) has no row yet`;
  return undefined;
};

for (const r of rows) {
  if (!r.id) { bad(r, 'empty id'); continue; }
  if (seen.has(r.id)) { bad(r, 'duplicate id'); continue; }
  seen.add(r.id);
  const cur = accRounds[accRounds.length - 1];
  switch (r.type) {
    case 'hook':
      if (levelRows.length || accRounds.length) bad(r, 'hook row after the video has started');
      else { hookRows.push(r); mapped++; }
      break;
    case 'settings':
      if (pendingSettings) bad(r, `second settings row before a level row (first was ${pendingSettings.id})`);
      else { pendingSettings = r; mapped++; }
      break;
    case 'level': {
      const level = levelNumbers[levelRows.length];
      if (level === undefined) { bad(r, `more level rows than levels (${levelNumbers.length})`); break; }
      if (pendingLevel) { bad(r, `level ${pendingLevel.level} (${pendingLevel.row.id}) never got a round`); break; }
      if (roundOpen(cur)) { bad(r, `round ${cur!.n} is not complete (no ${missingOf(cur!).join(', ')})`); break; }
      if (openBonus && !openBonus.reveal) { bad(r, `bonus ${openBonus.n} has no reveal`); break; }
      const due = dueBefore(cur);
      if (due) { bad(r, due); break; }
      const next = rounds[accRounds.length];
      if (!next || next.level !== level) { bad(r, `level ${level} row, but the next round is ${next ? `round ${next.n} (level ${next.level})` : 'missing'}`); break; }
      pendingLevel = { level, row: r, settings: pendingSettings };
      pendingSettings = undefined;
      levelRows.push(pendingLevel);
      mapped++;
      break;
    }
    case 'roundintro': {
      if (roundOpen(cur)) { bad(r, `round ${cur!.n} is not complete (no ${missingOf(cur!).join(', ')})`); break; }
      if (openBonus && !openBonus.reveal) { bad(r, `bonus ${openBonus.n} has no reveal`); break; }
      const due = dueBefore(cur);
      if (due) { bad(r, due); break; }
      const next = rounds[accRounds.length];
      if (!next) { bad(r, `no round left in data.ts (${rounds.length} rounds)`); break; }
      if (pendingLevel) {
        if (pendingLevel.level !== next.level) { bad(r, `round ${next.n} is level ${next.level} but the open level row is level ${pendingLevel.level}`); break; }
        pendingLevel = undefined;
      } else if (!cur || cur.level !== next.level) {
        bad(r, `round ${next.n} starts level ${next.level} but no level row came before it`);
        break;
      }
      accRounds.push({ n: next.n, level: next.level, intro: r });
      openBonus = undefined;
      mapped++;
      break;
    }
    case 'rule':
      if (!cur || cur.reveal || cur.rule) bad(r, !cur ? 'rule before any round' : cur.reveal ? `round ${cur.n} is already revealed` : `round ${cur.n} already has a rule row (${cur.rule!.id})`);
      else if (!heavyOf(cur.n)) bad(r, `round ${cur.n} is not heavy in data.ts, so it has no rule clip`);
      else { cur.rule = r; mapped++; }
      break;
    case 'reveal':
      if (!cur) bad(r, 'reveal before any round');
      else if (cur.reveal) bad(r, `round ${cur.n} already has a reveal (${cur.reveal.id})`);
      else if (heavyOf(cur.n) && !cur.rule) bad(r, `round ${cur.n} is heavy: its rule row must come before the reveal`);
      else { cur.reveal = r; mapped++; }
      break;
    case 'result':
      if (!cur || !cur.reveal) bad(r, `${cur ? `round ${cur.n}` : 'no round'} has no reveal yet`);
      else if (cur.result) bad(r, `round ${cur.n} already has a result (${cur.result.id})`);
      else if (skipResultOf(cur.n)) bad(r, `round ${cur.n} has skipResultLine in data.ts`);
      else { cur.result = r; mapped++; }
      break;
    case 'bonusintro': {
      if (!cur || roundOpen(cur)) { bad(r, cur ? `round ${cur.n} is not complete` : 'bonus before any round'); break; }
      if (openBonus && !openBonus.reveal) { bad(r, `bonus ${openBonus.n} has no reveal`); break; }
      const b = bonuses.find((x) => x.afterRound === cur.n);
      if (!b) { bad(r, `data.ts has no bonus after round ${cur.n}`); break; }
      if (accBonus.some((x) => x.n === b.n)) { bad(r, `bonus ${b.n} already has an intro`); break; }
      openBonus = { n: b.n, intro: r };
      accBonus.push(openBonus);
      mapped++;
      break;
    }
    case 'bonusreveal':
      if (!openBonus) bad(r, 'bonus reveal without an open bonus');
      else if (openBonus.reveal) bad(r, `bonus ${openBonus.n} already has a reveal (${openBonus.reveal.id})`);
      else { openBonus.reveal = r; mapped++; }
      break;
    case 'checkin':
      if (checkIn) bad(r, `second check-in row (first was ${checkIn.id})`);
      else if (!cur || cur.n !== heartCheckIn.afterRound || roundOpen(cur)) bad(r, `data.ts puts the check-in after round ${heartCheckIn.afterRound}, this row follows ${cur ? `round ${cur.n}${roundOpen(cur) ? ' (incomplete)' : ''}` : 'no round'}`);
      else { checkIn = r; mapped++; }
      break;
    case 'rank':
      if (accRounds.length !== rounds.length || accBonus.length !== bonuses.length || (openBonus && !openBonus.reveal)) bad(r, 'rank row before the last round and bonus are complete');
      else if (roundOpen(cur)) bad(r, `round ${cur!.n} is not complete`);
      else { rankRows.push(r); mapped++; }
      break;
    case 'outro':
      if (!rankRows.length) bad(r, 'outro row before the rank rows');
      else { outroRows.push(r); mapped++; }
      break;
    default:
      bad(r, 'unknown type');
  }
}

/* ---------- totals and per-item checks ---------- */
if (!hookRows.length) problems.push(`${CSV}: no hook row`);
if (pendingSettings) problems.push(`${CSV}:${pendingSettings.line} ${pendingSettings.id} (settings): no level row after it`);
if (pendingLevel) problems.push(`${CSV}:${pendingLevel.row.line} ${pendingLevel.row.id} (level): level ${pendingLevel.level} never got a round`);
if (levelRows.length !== levelNumbers.length) problems.push(`${levelRows.length} level rows, data.ts has ${levelNumbers.length} levels`);
if (accRounds.length !== rounds.length) problems.push(`${accRounds.length} roundintro rows, data.ts has ${rounds.length} rounds`);
accRounds.forEach((a) => {
  const m = missingOf(a);
  if (m.length) problems.push(`round ${a.n}: no ${m.join(', ')} row`);
});
if (accBonus.length !== bonuses.length) problems.push(`${accBonus.length} bonusintro rows, data.ts has ${bonuses.length} bonuses`);
accBonus.forEach((b) => { if (!b.reveal) problems.push(`bonus ${b.n}: no bonus reveal row`); });
if (!checkIn) problems.push(`no checkin row (data.ts: after round ${heartCheckIn.afterRound})`);
if (rankRows.length !== ranks.length + 1) problems.push(`${rankRows.length} rank rows, expected ${ranks.length + 1} (intro line + one per rank)`);
rankRows.slice(1).forEach((r, i) => {
  const tier = ranks[i];
  if (tier && !r.text.toLowerCase().includes(tier.name.toLowerCase())) bad(r, `rank row ${i + 1} does not name "${tier.name}" (ranks order, lowest first)`);
});
if (outroRows.length !== 3) warnings.push(`${outroRows.length} outro rows (the outro scene has 3 asks)`);
if (mapped !== rows.length) problems.push(`mapped ${mapped} rows, ${CSV} has ${rows.length}`);

/* ---------- soft checks: spoken text against data.ts ---------- */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const same = (label: string, row: Row | undefined, expected: string) => {
  if (row && norm(row.text) !== norm(expected)) warnings.push(`${row.id} ${label}: CSV "${row.text}" differs from data.ts "${expected}"`);
};
accRounds.forEach((a) => {
  const r = rounds.find((x) => x.n === a.n)!;
  // the spoken intro may add the filter after the prompt ("Name a fruit. Not red or yellow."): only a different start is reported
  if (!norm(a.intro.text).startsWith(norm(r.prompt))) same(`round ${a.n} intro`, a.intro, r.prompt);
  // a numeric answer in data.ts is spoken as words: not compared
  if (a.reveal && !/^\d+$/.test(r.answer) && norm(a.reveal.text.split('.')[0]) !== norm(r.answer)) warnings.push(`${a.reveal.id} round ${a.n} reveal: CSV answer "${a.reveal.text.split('.')[0]}" differs from data.ts answer "${r.answer}"`);
});
accBonus.forEach((a) => {
  const b = bonuses.find((x) => x.n === a.n)!;
  same(`bonus ${a.n} intro`, a.intro, b.voiceIntro);
  same(`bonus ${a.n} reveal`, a.reveal, b.voiceReveal);
});
levelRows.forEach((l) => same(`level ${l.level}`, l.row, levelColors[l.level].voice));
same('check-in', checkIn, heartCheckIn.voice);

warnings.forEach((w) => console.warn('warning: ' + w));
if (problems.length) {
  console.error(`FAIL (${problems.length}):`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

/* ---------- write ---------- */
const q = (s: string): string => `'${s}'`;
const roundLines = accRounds.map(
  (a) => `  { n: ${a.n}, intro: ${q(a.intro.id)}, ${a.rule ? `rule: ${q(a.rule.id)}, ` : ''}reveal: ${q(a.reveal!.id)}${a.result ? `, result: ${q(a.result.id)}` : ''} },`,
);
const bonusLines = accBonus.map((b) => `  { n: ${b.n}, intro: ${q(b.intro.id)}, reveal: ${q(b.reveal!.id)} },`);
const levelLines = levelRows.map((l) => `  ${l.level}: { level: ${q(l.row.id)}${l.settings ? `, settings: ${q(l.settings.id)}` : ''} },`);
const heavy = accRounds.filter((a) => a.rule).map((a) => a.n);

const src = `/* Generated by scripts/build_dontsay_audio_map.ts from docs/dontsay/lines.csv and src/dontsay/data.ts. Do not edit; do not hand-write ids. */
import type { Level } from './data';

export type RoundAudio = { n: number; intro: string; rule?: string; reveal: string; result?: string };
export type BonusAudio = { n: number; intro: string; reveal: string };
export type LevelAudio = { level: string; settings?: string };

/** Hook lines, in order. */
export const hookIds: string[] = [${hookRows.map((r) => q(r.id)).join(', ')}];

/** Level card clip per level; \`settings\` is the rules-sheet line that comes right before that level card. */
export const levelIds: Record<Level, LevelAudio> = {
${levelLines.join('\n')}
};

/** One entry per round, in data.ts order. \`rule\` only on heavy rounds (${heavy.join(', ')}). */
export const roundAudio: RoundAudio[] = [
${roundLines.join('\n')}
];

/** One entry per bonus, in bonus order. */
export const bonusAudio: BonusAudio[] = [
${bonusLines.join('\n')}
];

/** Heart check-in line (after round ${heartCheckIn.afterRound}). */
export const checkInId = ${q(checkIn!.id)};

/** Rank card: the intro line, then one line per rank in \`ranks\` order (lowest first). */
export const rankIntroId = ${q(rankRows[0].id)};
export const rankIds: string[] = [${rankRows.slice(1).map((r) => q(r.id)).join(', ')}];

export const outroIds: string[] = [${outroRows.map((r) => q(r.id)).join(', ')}];

/** Rows of lines.csv that were mapped (all of them). */
export const mappedRows = ${mapped};

export const roundAudioOf = (n: number): RoundAudio => {
  const a = roundAudio.find((x) => x.n === n);
  if (!a) throw new Error(\`audioMap: no audio for round \${n}; run scripts/build_dontsay_audio_map.ts\`);
  return a;
};
export const bonusAudioOf = (n: number): BonusAudio => {
  const a = bonusAudio.find((x) => x.n === n);
  if (!a) throw new Error(\`audioMap: no audio for bonus \${n}; run scripts/build_dontsay_audio_map.ts\`);
  return a;
};
`;
writeFileSync(OUT, src);

const pad = (s: string, n: number): string => s.padEnd(n);
console.log(`${pad('item', 8)} ${pad('intro', 8)} ${pad('rule', 8)} ${pad('result', 8)} reveal`);
const byOrder: string[] = [];
accRounds.forEach((a) => byOrder.push(`${pad(`R${a.n}`, 8)} ${pad(a.intro.id, 8)} ${pad(a.rule?.id ?? '-', 8)} ${pad(a.result?.id ?? '-', 8)} ${a.reveal!.id}`));
accBonus.forEach((b) => byOrder.push(`${pad(`B${b.n}`, 8)} ${pad(b.intro.id, 8)} ${pad('-', 8)} ${pad('-', 8)} ${b.reveal!.id}`));
console.log(byOrder.join('\n'));
console.log(
  `\nhook ${hookRows.map((r) => r.id).join(', ')} | levels ${levelRows.map((l) => `L${l.level} ${l.row.id}${l.settings ? ` (+settings ${l.settings.id})` : ''}`).join(', ')} | check-in ${checkIn!.id} | rank ${rankRows.map((r) => r.id).join(', ')} | outro ${outroRows.map((r) => r.id).join(', ')}`,
);
console.log(`mapped ${mapped} of ${rows.length} rows, ${warnings.length} warning(s) -> ${OUT}`);
