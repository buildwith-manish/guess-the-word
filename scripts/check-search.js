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

const EXPECT = { rounds: 30, levels: { EASY: 10, MEDIUM: 10, HARD: 10 }, bonus: 3, after: [10, 20, 30] };
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
  if (ROUNDS.length !== EXPECT.rounds) p.push(`${ROUNDS.length} rounds, expected ${EXPECT.rounds}`);
  const ids = ROUNDS.map((r) => r.id);
  if (new Set(ids).size !== ids.length) p.push("duplicate ids");
  ROUNDS.forEach((r, i) => {
    if (r.id !== i + 1) p.push(`index ${i} has id ${r.id}`);
  });
  const names = ROUNDS.map((r) => r.name.toLowerCase());
  if (new Set(names).size !== names.length) p.push("duplicate names");
  check(`${EXPECT.rounds} rounds, unique ids (1-${EXPECT.rounds} in order) and names`, p);
}

// 2. level counts
{
  const c = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const p = [];
  ROUNDS.forEach((r) => {
    if (r.level in c) c[r.level]++;
    else p.push(`round ${r.id}: bad level ${r.level}`);
  });
  for (const k of Object.keys(c)) if (c[k] !== EXPECT.levels[k]) p.push(`${k} = ${c[k]}, expected ${EXPECT.levels[k]}`);
  check(`level counts ${Object.values(EXPECT.levels).join(" / ")}`, p);
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
  if (BONUS.length !== EXPECT.bonus) p.push(`${BONUS.length} bonus puzzles, expected ${EXPECT.bonus}`);
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
  if (after !== EXPECT.after.join(",")) p.push(`afterRound is ${after}, expected ${EXPECT.after.join(",")}`);
  check(`${EXPECT.bonus} bonus puzzles: 3 searches, 4 unique options, correctIndex = answer`, p);
}

// 7. bonus answer not a round name
{
  const names = new Set(ROUNDS.map((r) => r.name.toLowerCase()));
  const p = BONUS.filter((b) => names.has(b.answer.toLowerCase())).map(
    (b) => `bonus answer "${b.answer}" is also a round name`
  );
  check("bonus answers are not round names", p);
}

// ---- bonus scene plans (task 4a): src/search/bonus-engine.ts via search-timing.ts
const fs = require("fs");
const tm = { exports: {} };
new Function(
  "module",
  "exports",
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, "..", "src", "search", "search-timing.ts")],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    logLevel: "silent",
  }).outputFiles[0].text
)(tm, tm.exports);
const { buildBonusPlan, TIMELINE } = tm.exports;
const plans = BONUS.map((_, i) => buildBonusPlan(i));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "search", "search-settings.json"), "utf8"));

// 8. exactly one correct option, no duplicate options, fixed data order
{
  const p = [];
  plans.forEach((pl, i) => {
    const t = `bonus ${i + 1}`;
    const b = BONUS[i];
    if (pl.options.length !== 4) p.push(`${t}: ${pl.options.length} options in the plan`);
    const correct = pl.options.filter((o) => o.correct);
    if (correct.length !== 1) p.push(`${t}: ${correct.length} correct options, expected 1`);
    else if (correct[0].text !== pl.answer) p.push(`${t}: the correct option is not the answer`);
    if (pl.options.findIndex((o) => o.correct) !== pl.correctIndex) p.push(`${t}: correctIndex does not match the flagged option`);
    const keys = pl.options.map((o) => o.text.trim().toLowerCase());
    if (new Set(keys).size !== keys.length) p.push(`${t}: duplicate options`);
    if (pl.options.map((o) => o.text).join("|") !== b.options.join("|")) p.push(`${t}: option order differs from the data`);
  });
  check("bonus plans: exactly one correct option, no duplicates, data order", p);
}

// 9. bonus scene order and durations
{
  const p = [];
  const per = cfg.typing.ticksPerChar;
  plans.forEach((pl, i) => {
    const t = `bonus ${i + 1}`;
    if (pl.searchAt.length !== 3) p.push(`${t}: ${pl.searchAt.length} search starts`);
    pl.searchAt.forEach((at, k) => {
      if (k === 0) return;
      const need = Math.max(cfg.typing.minTicks, pl.searches[k - 1].length * per) + cfg.bonus.searchHoldChars * per;
      if (at - pl.searchAt[k - 1] < need) p.push(`${t}: search ${k + 1} starts before search ${k} has typed and held`);
    });
    const lastNeed = Math.max(cfg.typing.minTicks, pl.searches[2].length * per) + cfg.bonus.searchHoldChars * per;
    if (pl.chipsAt[0] < pl.searchAt[2] + lastNeed) p.push(`${t}: chips start before the last search is done`);
    pl.chipsAt.forEach((at, k) => {
      if (k && at <= pl.chipsAt[k - 1]) p.push(`${t}: chips ${k} and ${k + 1} not in order`);
    });
    if (pl.clockStart <= pl.chipsAt[3]) p.push(`${t}: clock starts before the last chip`);
    if (pl.revealAt !== pl.clockStart + pl.clockFrames) p.push(`${t}: revealAt is not clockStart + clockFrames`);
    if (pl.clockFrames !== Math.round(cfg.bonus.clockSeconds * 30)) p.push(`${t}: clock is not bonus.clockSeconds`);
    if (pl.duration !== pl.revealAt + pl.holdFrames + pl.exitFrames) p.push(`${t}: duration is not reveal + hold + exit`);
    const seg = TIMELINE.segments.find((s) => s.kind === "bonus" && s.index === i);
    if (!seg) p.push(`${t}: no bonus segment in the timeline`);
    else if (seg.duration !== pl.duration) p.push(`${t}: timeline segment is ${seg.duration}, plan is ${pl.duration}`);
  });
  check("bonus plans: searches, chips, clock, reveal in order; timeline durations match", p);
}

// 10. settings searchHoldChars equals HOLD_CHARS in the SearchBar component
{
  const p = [];
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "search", "components", "SearchBar.tsx"), "utf8");
  const m = src.match(/export const HOLD_CHARS\s*=\s*(\d+)/);
  if (!m) p.push("HOLD_CHARS not found in SearchBar.tsx");
  else if (Number(m[1]) !== cfg.bonus.searchHoldChars) p.push(`bonus.searchHoldChars is ${cfg.bonus.searchHoldChars}, HOLD_CHARS is ${m[1]}`);
  check("bonus.searchHoldChars equals HOLD_CHARS in SearchBar", p);
}

if (process.argv.includes("--plans")) {
  plans.forEach((pl, i) => {
    console.log(`\nBonus ${i + 1} (after round ${pl.afterRound}): ${pl.answer} (${pl.from})`);
    pl.searches.forEach((s, k) => console.log(`  search ${k + 1} @ tick ${pl.searchAt[k]}: ${s}`));
    pl.options.forEach((o, k) => console.log(`  chip ${k + 1} @ tick ${pl.chipsAt[k]}: ${o.text}${o.correct ? "  <- correct" : ""}`));
    console.log(`  clock: tick ${pl.clockStart}, ${pl.clockFrames} ticks; reveal @ tick ${pl.revealAt}`);
    console.log(`  hold ${pl.holdFrames}, exit ${pl.exitFrames}, total ${pl.duration} ticks (${pl.duration * 2} frames at 60 fps)`);
  });
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
