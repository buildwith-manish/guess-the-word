#!/usr/bin/env node
/**
 * scripts/csv-to-json.js
 * ---------------------------------------------------------------------------
 * rounds.csv  ->  src/rounds.json
 *
 * - Skips lines starting with "#" so the CSV can be self-documenting.
 * - Handles quoted fields (facts contain commas, quotes and en-dashes).
 * - A row with an empty `fact` falls back to facts.csv (word,fact), so a new word
 *   automatically gets its fact card. Facts over 8 words get a warning: the
 *   voiceover has to be able to read them in the card's hold time.
 * - Validates every row (known level, reveal is a letter position inside the word, emoji present)
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
const factsFile = path.resolve(ROOT, arg('facts', 'facts.csv'));
const MAX_FACT_WORDS = 8;

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

/** facts.csv -> { WORD: fact } (optional file; '#' lines skipped, header row required). */
const loadFactLibrary = () => {
  const lib = {};
  if (!fs.existsSync(factsFile)) return lib;
  const lines = fs
    .readFileSync(factsFile, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length && !l.trimStart().startsWith('#'))
    .join('\n');
  const rows = parseCsv(lines).filter((r) => r.some((c) => String(c).trim().length));
  const header = (rows[0] || []).map((h) => h.trim().toLowerCase());
  const wi = header.indexOf('word');
  const fi = header.indexOf('fact');
  if (wi === -1 || fi === -1) {
    console.error(`✖ ${path.relative(ROOT, factsFile)} needs a header row: word,fact`);
    process.exit(1);
  }
  rows.slice(1).forEach((cells) => {
    const word = String(cells[wi] ?? '').toUpperCase().replace(/[^A-Z]/g, '');
    const fact = String(cells[fi] ?? '').trim();
    if (word && fact) lib[word] = fact;
  });
  return lib;
};

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

  const library = loadFactLibrary();
  const out = [];
  const problems = [];
  const warnings = [];

  rows.slice(1).forEach((cells, r) => {
    const get = (name) => {
      const idx = header.indexOf(name);
      return idx === -1 ? '' : String(cells[idx] ?? '').trim();
    };
    const line = r + 2;
    const word = get('word').toUpperCase().replace(/[^A-Z]/g, '');
    const level = get('level').toUpperCase();
    // reveal = 0-based position of the 2nd free letter (the HTML's SPLIT digit); blank -> middle letter
    const reveal = get('reveal') === '' ? Math.floor(word.length / 2) : Number(get('reveal'));
    const id = Number(get('id')) || r + 1;

    if (!word) problems.push(`line ${line}: empty word`);
    if (!LEVELS.includes(level)) problems.push(`line ${line}: level must be EASY/MEDIUM/HARD (got "${level}")`);
    if (!Number.isInteger(reveal) || reveal < 0 || reveal > word.length - 1)
      problems.push(`line ${line}: reveal ${get('reveal')} outside 0..${word.length - 1} (0-based letter position)`);
    if (!get('emoji1') || !get('emoji2')) problems.push(`line ${line}: needs emoji1 and emoji2`);

    const fact = get('fact') || library[word] || '';
    const factWords = fact ? fact.split(/\s+/).length : 0;
    if (factWords > MAX_FACT_WORDS) {
      warnings.push(`line ${line}: ${word} fact is ${factWords} words (voiceover-friendly is <= ${MAX_FACT_WORDS})`);
    }

    out.push({
      id,
      word,
      emoji1: get('emoji1'),
      emoji2: get('emoji2'),
      level,
      reveal,
      fact,
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

  const withFact = out.filter((q) => q.fact).length;
  const noFact = out.filter((q) => !q.fact).map((q) => q.word);
  warnings.forEach((w) => console.warn(`⚠ ${w}`));

  const byLevel = LEVELS.map((l) => `${l}:${out.filter((q) => q.level === l).length}`).join('  ');
  console.log(`✔ ${path.relative(ROOT, outFile)}  (${out.length} questions  ${byLevel})`);
  console.log(`  facts: ${withFact}/${out.length} questions have one${noFact.length ? ` — missing: ${noFact.join(', ')}` : ''}`);
};

main();
