/**
 * Maps every row of docs/xmas/lines.csv to the slots of src/xmas/data.ts and writes src/xmas/audioMap.ts.
 * Run: npx tsx scripts/build_xmas_audio_map.ts      (exit code 1 when anything does not line up; nothing is written then)
 *
 * Walk, in file order:
 *   hook                                   exactly one, first
 *   per slot in play order                 movie slot: quip, reveal; bonus slot: bonusintro, bonusreveal
 *   end                                    exactly one
 *   rank                                   one per data.ts rank, lowest first
 *   outro                                  one per data.ts outro ask, in order
 * Checks (any failure = exit 1): a row left over or out of order; a slot without both rows or without both clip files;
 * a row type that does not match the slot kind; a movie quip or reveal whose text differs from slot.voice; a bonus line
 * whose text differs from data.ts (intro, reveal); a rank or outro line that differs from data.ts; a movie reveal that does
 * not contain the answer title; a movie quip that contains the answer title; any [square-bracket] tag in any text.
 * Optional lines: rows of type `optional` are left out unless INCLUDE_OPTIONAL_LINES is true (then they are listed in
 * `optionalIds`). Any other unknown type is a leftover row.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { outroAsks, ranks, slots, voiceOf } from '../src/xmas/data';

const INCLUDE_OPTIONAL_LINES = false;
const CSV = 'docs/xmas/lines.csv';
const CLIPS = 'public/xmas/voiceover/clips';
const OUT = 'src/xmas/audioMap.ts';

type Row = { line: number; id: string; type: string; text: string };

/** RFC 4180 reader: quoted fields, doubled quotes, commas and newlines inside quotes. */
const parseCsv = (src: string): string[][] => {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim() !== ''));
};

const table = parseCsv(readFileSync(CSV, 'utf8'));
const header = table[0].map((h) => h.trim());
const col = (n: string) => header.indexOf(n);
if (col('id') < 0 || col('type') < 0 || col('text') < 0) { console.error(`FAIL: ${CSV} needs the columns id,type,text`); process.exit(1); }
const rows: Row[] = table.slice(1).map((r, i) => ({ line: i + 2, id: (r[col('id')] ?? '').trim(), type: (r[col('type')] ?? '').trim(), text: (r[col('text')] ?? '').trim() }));

const problems: string[] = [];
const bad = (r: Row, why: string) => problems.push(`${CSV}:${r.line} ${r.id} (${r.type}): ${why}`);

/** Lower case, curly quotes straight, everything but letters and digits to single spaces, padded: word-boundary contains(). */
const norm = (s: string): string => ` ${s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const contains = (text: string, title: string): boolean => norm(text).includes(norm(title));

/* ---- ids, tags, clips ---- */
const seen = new Set<string>();
for (const r of rows) {
  if (!r.id) bad(r, 'empty id');
  else if (seen.has(r.id)) bad(r, 'duplicate id');
  seen.add(r.id);
  if (/[\[\]]/.test(r.text)) bad(r, `text has a square-bracket tag: ${r.text}`);
}

/* ---- walk ---- */
let pos = 0;
const peek = (): Row | undefined => rows[pos];
const take = (r: Row) => { pos++; return r; };
const optional: Row[] = [];
const skipOptional = () => {
  while (peek()?.type === 'optional') { const r = take(peek()!); if (INCLUDE_OPTIONAL_LINES) optional.push(r); }
};

let hookId = '';
const slotAudio: { slot: number; kind: 'movie' | 'bonus'; introId: string; revealId: string }[] = [];
const rankIds: string[] = [];
const outroIds: string[] = [];
let endId = '';

/** After the first out-of-order row the walk stops: everything after it would only repeat the same fault. */
let stopped = false;
const expect = (type: string, what: string): Row | undefined => {
  if (stopped) return undefined;
  skipOptional();
  const r = peek();
  if (!r) { problems.push(`${CSV}: ended before ${what}`); stopped = true; return undefined; }
  if (r.type !== type) { bad(r, `expected ${type} for ${what}; walk stopped here`); stopped = true; return undefined; }
  return take(r);
};

const hook = expect('hook', 'the hook');
if (hook) hookId = hook.id;

for (const slot of slots) {
  const [introType, revealType] = slot.kind === 'movie' ? ['quip', 'reveal'] : ['bonusintro', 'bonusreveal'];
  const intro = expect(introType, `slot ${slot.slot} ${introType}`);
  const reveal = expect(revealType, `slot ${slot.slot} ${revealType}`);
  if (!intro || !reveal) { if (!intro && !reveal) break; continue; }
  slotAudio.push({ slot: slot.slot, kind: slot.kind, introId: intro.id, revealId: reveal.id });
  const v = voiceOf(slot);
  if (intro.text !== v.intro) bad(intro, `text differs from data.ts slot ${slot.slot} ${slot.kind === 'movie' ? 'voice.intro' : 'intro'}: "${intro.text}" vs "${v.intro}"`);
  if (reveal.text !== v.reveal) bad(reveal, `text differs from data.ts slot ${slot.slot} ${slot.kind === 'movie' ? 'voice.reveal' : 'reveal'}: "${reveal.text}" vs "${v.reveal}"`);
  if (slot.kind === 'movie') {
    if (!contains(reveal.text, slot.answer)) bad(reveal, `reveal does not contain the answer title "${slot.answer}"`);
    if (contains(intro.text, slot.answer)) bad(intro, `quip contains the answer title "${slot.answer}"`);
  }
}

const end = expect('end', 'the end line');
if (end) endId = end.id;
ranks.forEach((rk, i) => {
  const r = expect('rank', `rank line ${i + 1} (${rk.name})`);
  if (!r) return;
  rankIds.push(r.id);
  if (r.text !== rk.voice) bad(r, `text differs from data.ts ranks[${i}].voice: "${r.text}" vs "${rk.voice}"`);
});
outroAsks.forEach((ask, i) => {
  const r = expect('outro', `outro line ${i + 1}`);
  if (!r) return;
  outroIds.push(r.id);
  if (r.text !== ask) bad(r, `text differs from data.ts outro[${i}]: "${r.text}" vs "${ask}"`);
});
skipOptional();
for (; !stopped && pos < rows.length; pos++) bad(rows[pos], 'row left over (not used by any slot, rank or outro line)');

/* ---- every mapped row needs a clip ---- */
const mapped = [hookId, ...slotAudio.flatMap((s) => [s.introId, s.revealId]), endId, ...rankIds, ...outroIds, ...optional.map((r) => r.id)].filter(Boolean);
for (const id of mapped) if (!existsSync(`${CLIPS}/${id}.wav`)) problems.push(`no clip ${CLIPS}/${id}.wav`);
if (!stopped) for (const s of slotAudio) if (!s.introId || !s.revealId) problems.push(`slot ${s.slot} has no intro or no reveal`);
if (!stopped && slotAudio.length !== slots.length) problems.push(`${slotAudio.length} slots mapped, data.ts has ${slots.length}`);

if (problems.length) {
  console.error(`FAIL (${problems.length}):`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}

/* ---- write ---- */
const q = (s: string) => `'${s}'`;
const src = `/* Generated by scripts/build_xmas_audio_map.ts from docs/xmas/lines.csv and src/xmas/data.ts. Do not edit; do not hand-write ids.
 * Text is never stored here: slot lines live in data.ts (voiceOf), rank lines in data.ts ranks[].voice, the others in lines.csv. */
import { ranks } from './data';

export type SlotAudio = { slot: number; kind: 'movie' | 'bonus'; introId: string; revealId: string };

export const hookId = ${q(hookId)};

/** One entry per slot in play order (same order as data.ts slots). intro = quip (movie) or bonusintro; reveal = reveal or bonusreveal. */
export const slotAudio: SlotAudio[] = [
${slotAudio.map((s) => `  { slot: ${s.slot}, kind: ${q(s.kind)}, introId: ${q(s.introId)}, revealId: ${q(s.revealId)} },`).join('\n')}
];

/** The score scene: the end line (type \`end\`), then one rank line per rank, lowest first, same order as data.ts ranks. */
export const scoreAudio = {
  end: ${q(endId)},
  rank: [${rankIds.map(q).join(', ')}],
} as const;

/** The outro asks, in order (same order as data.ts outro). */
export const outroIds = [${outroIds.map(q).join(', ')}] as const;
${INCLUDE_OPTIONAL_LINES ? `
/** Optional lines (INCLUDE_OPTIONAL_LINES is true in the script). */
export const optionalIds = [${optional.map((r) => q(r.id)).join(', ')}] as const;
` : ''}
if (scoreAudio.rank.length !== ranks.length) throw new Error(\`audioMap: \${scoreAudio.rank.length} rank lines for \${ranks.length} ranks\`);

/** Clip id of a slot's intro or reveal. Throws for a slot outside the video. */
export const slotClipId = (slot: number, part: 'intro' | 'reveal'): string => {
  const s = slotAudio[slot - 1];
  if (!s || s.slot !== slot) throw new Error(\`no audio for slot \${slot}\`);
  return part === 'intro' ? s.introId : s.revealId;
};
`;
writeFileSync(OUT, src);
console.log(`ok: ${rows.length} rows mapped (hook, ${slotAudio.length} slots x 2, end, ${rankIds.length} ranks, ${outroIds.length} outro) -> ${OUT}`);
