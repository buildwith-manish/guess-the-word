#!/usr/bin/env node
/**
 * scripts/csv-to-json.js
 * ---------------------------------------------------------------------------
 * rounds.csv  ->  src/rounds.json
 *
 * - Skips lines starting with "#" so the CSV can be self-documenting.
 * - Handles quoted fields (facts contain commas, quotes and en-dashes).
 * - Validates every row (known level, reveal inside the word, emoji present)
 *   so a typo fails here instead of halfway through a 15 minute render.
 *
 * Usage: node scripts/csv-to-json.js [--in rounds.csv] [--out src/rounds.json]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const inFile = path.resolve(ROOT, arg('in', 'rounds.csv'));
const outFile = path.resolve(ROOT, arg('out', 'src/rounds.json'));

/** RFC-4180-ish parser, one row at a time. */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const LEVELS = ['EASY', 'MEDIUM', 'HARD'];

const main = () => {
  if (!fs.existsSync(inFile)) {
    console.error(`✖ ${path.relative(ROOT, inFile)} not found`);
    process.exit(1);
  }
  const raw = fs.readFileSync(inFile, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .filter((l) => l.trim().length && !l.trimStart().startsWith('#'))
    .join('\n');

  const rows = parseCsv(lines).filter((r) => r.some((c) => String(c).trim().length));
  if (rows.length < 2) {
    console.error('✖ rounds.csv has no data rows');
    process.exit(1);
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const need = ['id', 'word', 'emoji1', 'emoji2', 'level', 'reveal'];
  const missing = need.filter((n) => !header.includes(n));
  if (missing.length) {
    console.error(`✖ rounds.csv is missing column(s): ${missing.join(', ')}`);
    process.exit(1);
  }

  const out = [];
  const problems = [];

  rows.slice(1).forEach((cells, r) => {
    const get = (name) => {
      const idx = header.indexOf(name);
      return idx === -1 ? '' : String(cells[idx] ?? '').trim();
    };
    const line = r + 2;
    const word = get('word').toUpperCase().replace(/[^A-Z]/g, '');
    const level = get('level').toUpperCase();
    const reveal = Number(get('reveal')) || 1;
    const id = Number(get('id')) || r + 1;

    if (!word) problems.push(`line ${line}: empty word`);
    if (!LEVELS.includes(level)) problems.push(`line ${line}: level must be EASY/MEDIUM/HARD (got "${level}")`);
    if (reveal < 1 || reveal > word.length) problems.push(`line ${line}: reveal ${reveal} outside 1..${word.length}`);
    if (!get('emoji1') || !get('emoji2')) problems.push(`line ${line}: needs emoji1 and emoji2`);

    out.push({
      id,
      word,
      emoji1: get('emoji1'),
      emoji2: get('emoji2'),
      level,
      reveal,
      fact: get('fact'),
    });
  });

  const ids = out.map((q) => q.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate id(s): ${[...new Set(dupes)].join(', ')}`);

  if (problems.length) {
    console.error('✖ rounds.csv is invalid:\n  ' + problems.join('\n  '));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const byLevel = LEVELS.map((l) => `${l}:${out.filter((q) => q.level === l).length}`).join('  ');
  console.log(`✔ ${path.relative(ROOT, outFile)}  (${out.length} questions  ${byLevel})`);
};

main();
