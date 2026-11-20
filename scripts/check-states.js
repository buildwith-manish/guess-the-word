#!/usr/bin/env node
/**
 * scripts/check-states.js  (npm run states:check)
 * Validates src/states/states-data.ts against src/states/states-geo.json.
 * Prints a table, exits 1 on any failure. Never edits data.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEVEL_COUNTS = { EASY: 14, MEDIUM: 14, HARD: 12, EXPERT: 10 };
const MAX_FACT_WORDS = 8;

(async () => {
  const { build } = require('esbuild');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-states-'));
  const out = path.join(tmp, 'states-data.cjs');
  await build({
    entryPoints: [path.join(ROOT, 'src/states/states-data.ts')],
    bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
  });
  const { STATES } = require(out);
  fs.rmSync(tmp, { recursive: true, force: true });

  const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/states/states-geo.json'), 'utf8'));
  const geoByName = new Map(geo.states.map((s) => [s.name, s]));
  const stateNames = new Set(STATES.map((s) => s.name));

  const checks = [];
  const add = (name, problems, detail) =>
    checks.push({ name, ok: problems.length === 0, detail: problems.length ? problems.join('; ') : detail });

  add('50 states', STATES.length === 50 ? [] : [`got ${STATES.length}`], '50');

  const dup = (arr) => [...new Set(arr.filter((v, i) => arr.indexOf(v) !== i))];
  add('unique ids', dup(STATES.map((s) => s.id)).map((d) => `duplicate id ${d}`), 'all unique');
  add('unique keys', dup(STATES.map((s) => s.key)).map((d) => `duplicate key ${d}`), 'all unique');
  const idProblems = STATES.map((s, i) => (s.id === i + 1 ? null : `${s.name} id ${s.id} at position ${i + 1}`)).filter(Boolean);
  add('ids 1-50 in order', idProblems, '1..50');

  const counts = {};
  for (const s of STATES) counts[s.level] = (counts[s.level] || 0) + 1;
  const lvl = [];
  for (const [l, n] of Object.entries(LEVEL_COUNTS)) if ((counts[l] || 0) !== n) lvl.push(`${l} ${counts[l] || 0}, want ${n}`);
  for (const l of Object.keys(counts)) if (!(l in LEVEL_COUNTS)) lvl.push(`unknown level ${l}`);
  add('level counts 14/14/12/10', lvl, Object.keys(LEVEL_COUNTS).map((l) => `${l} ${counts[l]}`).join(', '));

  const geoProblems = [];
  for (const s of STATES) {
    const g = geoByName.get(s.name);
    if (!g) { geoProblems.push(`${s.name}: not in geo`); continue; }
    if (!g.shape) geoProblems.push(`${s.name}: no shape`);
    if (!g.mini) geoProblems.push(`${s.name}: no mini`);
    if (!g.cells || !g.cells[12] || !g.cells[24] || !g.cells[48]) geoProblems.push(`${s.name}: cells missing`);
  }
  add('shape + mini + cells in geo', geoProblems, 'all 50 present');

  const factProblems = STATES
    .map((s) => [s.name, s.fact.trim().split(/\s+/).filter(Boolean).length])
    .filter(([, n]) => n > MAX_FACT_WORDS)
    .map(([n, c]) => `${n}: ${c} words`);
  add(`facts <= ${MAX_FACT_WORDS} words`, factProblems, 'all within limit');

  const emojiProblems = STATES.filter((s) => !Array.isArray(s.hintEmoji) || s.hintEmoji.length !== 3)
    .map((s) => `${s.name}: ${s.hintEmoji ? s.hintEmoji.length : 0} items`);
  add('hintEmoji has 3 items', emojiProblems, 'all 3');

  const rotProblems = STATES.filter((s) => s.level === 'HARD' && typeof s.rotation !== 'number').map((s) => `${s.name}: no rotation`);
  add('HARD has rotation', rotProblems, `${counts.HARD || 0} set`);
  const cropProblems = STATES.filter((s) => s.level === 'MEDIUM' && !s.cropSide).map((s) => `${s.name}: no cropSide`);
  add('MEDIUM has cropSide', cropProblems, `${counts.MEDIUM || 0} set`);

  const borderProblems = [];
  let borderTotal = 0;
  for (const g of geo.states) {
    for (const b of g.borders) {
      borderTotal++;
      if (!stateNames.has(b)) borderProblems.push(`${g.name} -> ${b}`);
    }
  }
  add('borders resolve to a state', borderProblems, `${borderTotal} names`);

  const w = Math.max(...checks.map((c) => c.name.length));
  console.log(`${'CHECK'.padEnd(w)}  RESULT  DETAIL`);
  for (const c of checks) console.log(`${c.name.padEnd(w)}  ${c.ok ? 'PASS  ' : 'FAIL  '}  ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(failed ? `\n${failed} check(s) FAILED` : `\nAll ${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
