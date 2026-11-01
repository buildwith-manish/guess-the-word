#!/usr/bin/env node
/**
 * scripts/build-questions.js
 * questions.js (+ facts.csv) -> src/rounds.json   (validates every row + every clue PNG)
 *
 * - `split` in questions.js is the 0-based position of the 2nd free letter; it is written to
 *   rounds.json as `reveal`, which is what Round.tsx / timing.ts read.
 * - A question with an empty `fact` falls back to facts.csv (word,fact), matched by WORD.
 *   Facts over 8 words get a warning: the voiceover has to read them in the card's hold time.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const questions = require(path.join(ROOT, 'questions.js'));
const ICON_DIR = path.join(ROOT, 'public', 'emoji-icons');
const FACTS_FILE = path.join(ROOT, 'facts.csv');
const LEVELS = ['EASY', 'MEDIUM', 'HARD'];
const MAX_FACT_WORDS = 8;

/** minimal CSV line parser (handles "quoted, fields" and "" escapes) */
const parseLine = (line) => {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { cells.push(cur); cur = ''; }
    else cur += c;
  }
  cells.push(cur);
  return cells.map((s) => s.trim());
};

/** facts.csv -> { WORD: fact } (optional file; '#' lines skipped, header row `word,fact` required) */
const loadFactLibrary = () => {
  const lib = {};
  if (!fs.existsSync(FACTS_FILE)) return lib;
  const lines = fs.readFileSync(FACTS_FILE, 'utf8').split(/\r?\n/)
    .filter((l) => l.trim() && !l.trimStart().startsWith('#'));
  const header = parseLine(lines[0] || '').map((h) => h.toLowerCase());
  const wi = header.indexOf('word');
  const fi = header.indexOf('fact');
  if (wi === -1 || fi === -1) {
    console.error('✖ facts.csv needs a header row: word,fact');
    process.exit(1);
  }
  lines.slice(1).forEach((l) => {
    const cells = parseLine(l);
    const word = String(cells[wi] || '').toUpperCase().replace(/[^A-Z]/g, '');
    const fact = String(cells[fi] || '').trim();
    if (word && fact) lib[word] = fact;
  });
  return lib;
};

const library = loadFactLibrary();
const problems = [];
const warnings = [];

const out = questions.map((q, i) => {
  const word = String(q.word || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!word) problems.push(`#${i + 1}: empty word`);
  if (!LEVELS.includes(q.level)) problems.push(`#${q.id}: bad level "${q.level}"`);
  if (!(q.split >= 1 && q.split <= word.length - 1)) problems.push(`#${q.id}: split ${q.split} outside 1..${word.length - 1}`);
  for (const key of ['clueA', 'clueB']) {
    if (!fs.existsSync(path.join(ICON_DIR, q[key] || ''))) problems.push(`#${q.id}: missing public/emoji-icons/${q[key]}`);
  }
  const fact = q.fact || library[word] || '';
  const words = fact ? fact.split(/\s+/).length : 0;
  if (words > MAX_FACT_WORDS) warnings.push(`#${q.id} ${word}: fact is ${words} words (voiceover-friendly is <= ${MAX_FACT_WORDS})`);
  return { id: q.id, word, clueA: q.clueA, clueB: q.clueB, level: q.level, reveal: q.split, fact };
});

const ids = out.map((q) => q.id);
if (new Set(ids).size !== ids.length) problems.push('duplicate ids');

if (problems.length) {
  console.error('✖ questions.js is invalid:\n  ' + problems.join('\n  '));
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, 'src', 'rounds.json'), JSON.stringify(out, null, 2) + '\n');
warnings.forEach((w) => console.warn(`⚠ ${w}`));
const by = LEVELS.map((l) => `${l}:${out.filter((q) => q.level === l).length}`).join('  ');
console.log(`✔ src/rounds.json  (${out.length} questions  ${by})`);
console.log(`  facts: ${out.filter((q) => q.fact).length}/${out.length} questions have one`);
