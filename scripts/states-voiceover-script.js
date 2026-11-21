#!/usr/bin/env node
/**
 * scripts/states-voiceover-script.js  (npm run states:voiceover:script)
 * Writes the voiceover script of Video 4, same method as scripts/voiceover-script.js (esbuild-bundle the timing
 * module, read the data, write the lines), but with its own wording:
 *   docs/states-voiceover-script.md        the lines WITH [emotion] tags (paste into ElevenLabs)
 *   public/voiceover/states-lines.csv      the same text with the tags stripped (id,type,text)
 * Every line comes from the data (states-data.ts, states-settings.json, the bonus puzzles in state-timing.ts):
 * no state fact is typed here. The on-screen `fact` field is NOT used (every fact is still unverified, factVerify).
 *
 * Ids and where the clip goes (public/voiceover/<id>.mp3 is the suggested file name; a states manifest scan is a
 * later task, these are the manifest keys in src/states/states-voiceover-manifest.json):
 *   intro                    manifest.intro
 *   level1 .. level4         manifest.level[EASY | MEDIUM | HARD | EXPERT] (video order of the levels)
 *   r01 .. r50               manifest.reveal["1".."50"]   (answer reveal, 12 words or fewer, checked below)
 *   b1q .. b4q               manifest.bonusq["1".."4"]    (bonus question)
 *   b1 .. b4                 manifest.bonus["1".."4"]     (bonus answer, 12 words or fewer, checked below)
 *   legend expert good beginner keepgoing    manifest.scoreboard[<same>]
 *   outro                    manifest.outro
 * Exit code 1 if a reveal is over 12 words or an id repeats.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAX_REVEAL_WORDS = 12;

const load = async () => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `states-vo-${process.pid}.mjs`);
  await esbuild.build({
    stdin: {
      contents: "export * as T from './src/states/state-timing.ts'; export * as D from './src/states/states-data.ts';",
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  });
  const mod = await import(`file://${outfile}`);
  fs.unlinkSync(outfile);
  return mod;
};

const pad = (n) => String(n).padStart(2, '0');
const title = (w) => w.charAt(0) + w.slice(1).toLowerCase();
const strip = (s) => s.replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim();
const words = (s) => strip(s).split(/\s+/).filter(Boolean).length;
const csvCell = (s) => `"${s.replace(/"/g, '""')}"`;

(async () => {
  const { T, D } = await load();
  const settings = require(path.join(ROOT, 'src/states/states-settings.json'));
  const STATES = D.STATES;
  const LEVELS = T.LEVELS;
  const total = STATES.length;
  const stateOf = (key) => D.getState(key);

  const rows = []; // { id, section, tag, text }
  const add = (id, section, tag, text) => rows.push({ id, section, tag, text });

  // ---- intro
  const seconds = LEVELS.map((l) => l.time);
  add('intro', 'INTRO', '[excited]', `Can you name all ${total} US states by their shape? ${LEVELS.length} levels, and the clock is ticking. Let's go!`);

  // ---- levels (tier wording follows the tiers of states-data / StateLevelCard: outline, half hidden, rotated, pixels)
  const TIER = ['Just the outline.', 'Half the shape is hidden.', 'The shapes are rotated.', 'The shape starts as pixels.'];
  const TAG = ['[cheerful]', '[confident]', '[serious]', '[dramatic]'];
  const NUM = ['one', 'two', 'three', 'four', 'five', 'six'];
  if (LEVELS.length > TIER.length) throw new Error('more levels than level lines: add a line to TIER in this script');
  LEVELS.forEach((l, i) => {
    const count = STATES.filter((s) => s.level === l.name).length;
    const last = i === LEVELS.length - 1 ? ' Good luck!' : '';
    add(`level${i + 1}`, 'LEVELS', TAG[i], `Level ${NUM[i]}: ${title(l.name)}. ${TIER[i]} ${count} states, ${l.time} seconds each.${last}`);
  });

  // ---- reveals r01..r50 ("{State}. Capital: {Capital}." and short variations, no facts)
  const REVEAL = [
    (s) => `${s.name}. Capital: ${s.capital}.`,
    (s) => `That's ${s.name}. The capital is ${s.capital}.`,
    (s) => `${s.name}! Capital: ${s.capital}.`,
    (s) => `It's ${s.name}. Capital: ${s.capital}.`,
  ];
  const milestones = settings.streak.milestones;
  STATES.forEach((s, i) => {
    const tag = milestones.includes(s.id) ? '[excited]' : '[cheerful]';
    add(`r${pad(s.id)}`, 'REVEALS', tag, REVEAL[i % REVEAL.length](s));
  });

  // ---- bonus rounds (bNq = the question, bN = the answer); wording follows each puzzle kind
  const puzzles = T.BONUS_PUZZLES;
  puzzles.forEach((p, i) => {
    add(`b${i + 1}q`, 'BONUS QUESTIONS', '[excited]', `Bonus round! ${p.prompt}`);
  });
  puzzles.forEach((p, i) => {
    const answer = p.options[p.correctIndex];
    const subject = stateOf(p.subject).name;
    const text = {
      missing: `It's ${answer}!`,
      borders: `${answer} borders ${subject}.`,
      capital: `${answer}! The capital of ${subject}.`,
      nickname: `${subject}. ${answer}.`,
    }[p.kind];
    add(`b${i + 1}`, 'BONUS ANSWERS', '[cheerful]', text);
  });

  // ---- scoreboard (score ranges out of the total, from the rank thresholds)
  const SB = {
    legend: ['[excited]', (r) => `${r.min} to ${r.max}. Legend! You really know your states.`],
    expert: ['[impressed]', (r) => `${r.min} to ${r.max}. Expert! Seriously good.`],
    good: ['[cheerful]', (r) => `${r.min} to ${r.max}. Good job! Solid score.`],
    beginner: ['[encouraging]', (r) => `${r.min} to ${r.max}. Beginner. Not bad, keep learning.`],
    keepgoing: ['[warm]', (r) => `${r.min} to ${r.max}. Keep going! You'll get there.`],
  };
  settings.ranks.forEach((r, i, all) => {
    const key = r.id.toLowerCase();
    const max = i === 0 ? total : all[i - 1].min - 1;
    if (!SB[key]) throw new Error(`no scoreboard line for rank ${r.id}: add it to SB in this script`);
    add(key, 'SCOREBOARD', SB[key][0], SB[key][1]({ min: r.min, max }));
  });

  // ---- outro
  add('outro', 'OUTRO', '[cheerful]', `Comment your score out of ${total}, and subscribe for more state quizzes!`);

  // ---- checks
  const problems = [];
  const seen = new Set();
  rows.forEach((r) => {
    if (seen.has(r.id)) problems.push(`duplicate id ${r.id}`);
    seen.add(r.id);
    if ((r.section === 'REVEALS' || r.section === 'BONUS ANSWERS') && words(r.text) > MAX_REVEAL_WORDS) {
      problems.push(`${r.id}: ${words(r.text)} words (max ${MAX_REVEAL_WORDS}): ${r.text}`);
    }
  });

  // ---- write
  const md = [];
  md.push('# Video 4 voiceover script: Guess the US State from Its Shape');
  md.push('');
  md.push(`${rows.length} clips. Generated by \`npm run states:voiceover:script\` (scripts/states-voiceover-script.js); do not edit by hand, change the script or the data and re-run.`);
  md.push('');
  md.push('- `[emotion]` tags are for ElevenLabs (v3 style audio tags); remove them for a voice/model that reads them aloud. The CSV `public/voiceover/states-lines.csv` is the same text without tags.');
  md.push('- Suggested file name: `public/voiceover/<id>.mp3` (e.g. `r07.mp3`). The ids map to the manifest keys in `src/states/states-voiceover-manifest.json`: `intro`; `levelN` = `level[EASY|MEDIUM|HARD|EXPERT]` in order; `rNN` = `reveal[N]`; `bNq` = `bonusq[N]`; `bN` = `bonus[N]`; rank ids = `scoreboard[id]`; `outro`. A states scan script that fills the manifest is not written yet.');
  md.push(`- Reveals and bonus answers are ${MAX_REVEAL_WORDS} words or fewer (the video holds the answer until the clip ends, so shorter is better).`);
  md.push('- The on-screen fun facts are not read: every fact in states-data.ts is still marked unverified.');
  md.push(`- Level clocks: ${LEVELS.map((l) => `${title(l.name)} ${l.time}s`).join(', ')}.`);
  let section = '';
  rows.forEach((r) => {
    if (r.section !== section) {
      section = r.section;
      md.push('', `## ${section}`, '', '| id | line |', '|---|---|');
    }
    md.push(`| ${r.id} | ${r.tag} ${r.text.replace(/\|/g, '\\|')} |`);
  });
  md.push('');
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'states-voiceover-script.md'), md.join('\n'));

  const TYPE = { INTRO: 'intro', LEVELS: 'level', REVEALS: 'reveal', 'BONUS QUESTIONS': 'bonus_question', 'BONUS ANSWERS': 'bonus_answer', SCOREBOARD: 'scoreboard', OUTRO: 'outro' };
  const csv = ['id,type,text', ...rows.map((r) => `${r.id},${TYPE[r.section]},${csvCell(strip(r.text))}`)].join('\n') + '\n';
  // plain lines for copy-paste: spoken text only (no ids, headings or tags), one per line
  fs.writeFileSync(path.join(ROOT, 'public', 'voiceover', 'states-lines.txt'), rows.map((r) => strip(r.text)).join('\n') + '\n');
  fs.mkdirSync(path.join(ROOT, 'public', 'voiceover'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'public', 'voiceover', 'states-lines.csv'), csv);

  const counts = rows.reduce((a, r) => ((a[r.section] = (a[r.section] || 0) + 1), a), {});
  console.log(`\n  ${rows.length} clips: ${Object.entries(counts).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(', ')}`);
  console.log('  wrote docs/states-voiceover-script.md and public/voiceover/states-lines.csv');
  console.log('\n  first 10 lines:');
  rows.slice(0, 10).forEach((r) => console.log(`  ${r.id.padEnd(8)} ${r.tag} ${r.text}`));
  console.log('');
  if (problems.length) {
    problems.forEach((p) => console.log('  PROBLEM: ' + p));
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
