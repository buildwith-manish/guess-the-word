// Checks src/search/search-data.ts. Exit code 1 on any failure.
// Usage: npm run search:check
const path = require("path");
const esbuild = require("esbuild");

const out = esbuild.buildSync({
  entryPoints: [path.join(__dirname, "..", "src", "search", "search-data.ts")],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  logLevel: "silent",
});
const mod = { exports: {} };
new Function("module", "exports", out.outputFiles[0].text)(mod, mod.exports);
const { ROUNDS, BONUS } = mod.exports;

const results = []; // { name, ok, detail }
const check = (name, problems) =>
  results.push({ name, ok: problems.length === 0, detail: problems.join("; ") });

const words = (s) => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
const isOneEmoji = (s) => {
  const g = [...seg.segment(s)];
  return g.length === 1 && /\p{Extended_Pictographic}/u.test(s);
};

// 1. rounds count, unique ids and names
{
  const p = [];
  if (ROUNDS.length !== 30) p.push(`${ROUNDS.length} rounds, expected 30`);
  const ids = ROUNDS.map((r) => r.id);
  if (new Set(ids).size !== ids.length) p.push("duplicate ids");
  ROUNDS.forEach((r, i) => {
    if (r.id !== i + 1) p.push(`index ${i} has id ${r.id}`);
  });
  const names = ROUNDS.map((r) => r.name.toLowerCase());
  if (new Set(names).size !== names.length) p.push("duplicate names");
  check("30 rounds, unique ids (1-30 in order) and names", p);
}

// 2. level counts
{
  const c = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const p = [];
  ROUNDS.forEach((r) => {
    if (r.level in c) c[r.level]++;
    else p.push(`round ${r.id}: bad level ${r.level}`);
  });
  for (const k of Object.keys(c)) if (c[k] !== 10) p.push(`${k} = ${c[k]}, expected 10`);
  check("level counts 10 / 10 / 10", p);
}

// 3. four searches + 2-emoji hint
{
  const p = [];
  ROUNDS.forEach((r) => {
    if (!Array.isArray(r.searches) || r.searches.length !== 4)
      p.push(`round ${r.id}: ${r.searches && r.searches.length} searches`);
    if (!Array.isArray(r.hint) || r.hint.length !== 2 || !r.hint.every(isOneEmoji))
      p.push(`round ${r.id}: hint is not 2 emoji`);
  });
  check("every round: 4 searches and a 2-emoji hint", p);
}

// 4. word limit
{
  const p = [];
  ROUNDS.forEach((r) =>
    r.searches.forEach((s, i) => {
      if (wordCount(s) > 12) p.push(`round ${r.id} clue ${i + 1}: ${wordCount(s)} words`);
    })
  );
  BONUS.forEach((b, bi) =>
    b.searches.forEach((s, i) => {
      if (wordCount(s) > 12) p.push(`bonus ${bi + 1} clue ${i + 1}: ${wordCount(s)} words`);
    })
  );
  check("every search is 12 words or fewer (rounds and bonus)", p);
}

// 5. no name word (4+ letters, whole word, case-insensitive) inside a round's searches
{
  const p = [];
  ROUNDS.forEach((r) => {
    const nameWords = words(r.name)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 4);
    r.searches.forEach((s, i) => {
      const sw = new Set(words(s).map((w) => w.toLowerCase()));
      nameWords.forEach((w) => {
        if (sw.has(w)) p.push(`round ${r.id} (${r.name}) clue ${i + 1} contains "${w}": ${s}`);
      });
    });
  });
  check("no search contains a 4+ letter word of its round's name", p);
}

// 6. bonus puzzles
{
  const p = [];
  if (BONUS.length !== 3) p.push(`${BONUS.length} bonus puzzles, expected 3`);
  BONUS.forEach((b, i) => {
    const t = `bonus ${i + 1}`;
    if (!Array.isArray(b.searches) || b.searches.length !== 3) p.push(`${t}: not 3 searches`);
    if (!Array.isArray(b.options) || b.options.length !== 4) p.push(`${t}: not 4 options`);
    else if (new Set(b.options.map((o) => o.toLowerCase())).size !== 4)
      p.push(`${t}: options not unique`);
    if (!b.options || b.options[b.correctIndex] !== b.answer)
      p.push(`${t}: options[correctIndex] is not the answer`);
  });
  const after = BONUS.map((b) => b.afterRound).join(",");
  if (after !== "10,20,30") p.push(`afterRound is ${after}, expected 10,20,30`);
  check("3 bonus puzzles: 3 searches, 4 unique options, correctIndex = answer", p);
}

// 7. bonus answer not a round name
{
  const names = new Set(ROUNDS.map((r) => r.name.toLowerCase()));
  const p = BONUS.filter((b) => names.has(b.answer.toLowerCase())).map(
    (b) => `bonus answer "${b.answer}" is also a round name`
  );
  check("bonus answers are not round names", p);
}

// table
const w = Math.max(...results.map((r) => r.name.length));
console.log("\nsearch-data check\n");
console.log(`${"CHECK".padEnd(w)}  RESULT`);
console.log(`${"-".repeat(w)}  ------`);
results.forEach((r) => console.log(`${r.name.padEnd(w)}  ${r.ok ? "PASS" : "FAIL"}`));
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log("\nFailures:");
  failed.forEach((r) => r.detail.split("; ").forEach((d) => console.log(`  - [${r.name}] ${d}`)));
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
