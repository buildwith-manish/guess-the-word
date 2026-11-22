#!/usr/bin/env node
/**
 * scripts/search-lines-csv.js  (npm run search:lines)
 * Writes docs/search-voiceover/lines.csv and ai-script.md for an AI voice.
 *  - clues come from src/search/search-data.ts (exact on-screen text), so re-run this after any clue change
 *  - reveal lines come from docs/search-voiceover-script.md
 *  - everything else (intro, levels, bonus, scoreboard, outro) is written below
 * `text` is the voice text with emotion tags in [square brackets]: for the AI voice ONLY, never shown on
 * screen. If your voice tool reads tags aloud, strip every [..] and the space after it.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
// default: plain text, no emotion tags. `npm run search:lines -- --tags` writes the tagged voice text instead.
const WITH_TAGS = process.argv.includes('--tags');
const OUT = path.join(ROOT, 'docs/search-voiceover');

const bundle = async (entry) => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `lines-${path.basename(entry, '.ts')}-${process.pid}.mjs`);
  await esbuild.build({ entryPoints: [path.join(ROOT, entry)], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
  const m = await import(`file://${outfile}`);
  fs.unlinkSync(outfile);
  return m;
};

// emotion per clue position: calm and flat first, curious, then a little amused as it gets obvious
const CLUE_TAG = ['calm', 'curious', 'amused'];
const PRON = {
  Pikachu: 'PEEK-ah-choo', Moana: 'moh-AH-nah', Gollum: 'GAH-lum', 'WALL-E': 'WALL-ee',
  Pokémon: 'POH-kay-mahn',
};

const main = async () => {
  const { ROUNDS, BONUS } = await bundle('src/search/search-data.ts');
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/search/search-settings.json'), 'utf8'));
  const doc = fs.readFileSync(path.join(ROOT, 'docs/search-voiceover-script.md'), 'utf8');
  const reveal = {};
  for (const m of doc.matchAll(/^- reveal-(\d+)\.mp3: (.+)$/gm)) reveal[Number(m[1])] = m[2].trim();

  const rows = [];
  const add = (r) => rows.push(r);
  const tagged = (tag, text) => `[${tag}] ${text}`;
  const pronOf = (s) => Object.keys(PRON).filter((k) => s.includes(k)).map((k) => `${k} = ${PRON[k]}`).join('; ');
  const secs = (text) => Math.round((text.split(/\s+/).length / 2.5 + 0.4) * 10) / 10;
  const ten = (n) => ({ 27: 'Twenty-seven', 21: 'Twenty-one', 15: 'Fifteen', 9: 'Nine' }[n] || String(n));
  const sec = cfg.think.seconds === 5 ? 'Five' : String(cfg.think.seconds);

  const intro = `Everyone has a search history they'd never show anyone. Here are ${ROUNDS.length === 30 ? 'thirty' : ROUNDS.length} characters. You get three searches, then a hint. Guess who it is before time runs out.`;
  add({ file: 'intro.mp3', key: 'intro', type: 'intro', round: '', text: intro,
    voice: `[warmly] Everyone has a search history they'd never show anyone. [playfully] Here are ${ROUNDS.length === 30 ? 'thirty' : ROUNDS.length} characters. You get three searches, then a hint. [excited] Guess who it is before time runs out.`,
    emotion: 'warmly > playfully > excited', pause: 0 });

  const levels = [
    ['EASY', 'calm', `Level one: easy. Ten characters you already know. ${sec} seconds to answer.`],
    ['MEDIUM', 'curious', `Level two: medium. The clues get a little sneakier. ${sec} seconds to answer.`],
    ['HARD', 'serious', `Level three: hard. These ones really make you think. ${sec} seconds to answer. Good luck.`],
  ];
  levels.forEach(([lv, tag, text], i) => add({ file: `level-${i + 1}.mp3`, key: `level.${i + 1}`, type: 'level card', round: '', level: lv, text, voice: tagged(tag, text) + '', emotion: tag, pause: 0 }));

  ROUNDS.forEach((r) => {
    r.searches.forEach((s, k) => add({ file: `clue-${r.id}-${k + 1}.mp3`, key: `clue.${r.id}.${k}`, type: 'clue', round: r.id, level: r.level, text: s, voice: tagged(CLUE_TAG[k], s), emotion: CLUE_TAG[k], pause: 0, note: 'read exactly as typed; no lead-in; no silence at the start (typing starts with the clip)' }));
  });
  ROUNDS.forEach((r) => {
    const text = reveal[r.id]; if (!text) throw new Error(`no reveal line for round ${r.id}`);
    const tag = /Of course/.test(text) ? 'playfully' : 'warmly';
    add({ file: `reveal-${r.id}.mp3`, key: `reveal.${r.id}`, type: 'reveal', round: r.id, level: r.level, text, voice: tagged(tag, text), emotion: tag, pause: 0.4, note: ['one beat of silence before; clean end, no tail', pronOf(text)].filter(Boolean).join('; ') });
  });
  BONUS.forEach((b, i) => {
    const text = `Bonus answer: ${b.answer}.`;
    add({ file: `bonus-${i + 1}.mp3`, key: `bonus.${i + 1}`, type: 'bonus answer', round: `after ${b.afterRound}`, text, voice: tagged('excited', text), emotion: 'excited', pause: 0.3, note: pronOf(b.answer) });
  });

  add({ file: 'scoreboard-intro.mp3', key: 'scoreboard.intro', type: 'scoreboard', round: '', text: "Let's see how you did.", voice: "[warmly] Let's see how you did.", emotion: 'warmly', pause: 0 });
  const rankLine = {
    LEGEND: ['excited', (n) => `Legend. ${ten(n)} or more. You know your characters.`],
    EXPERT: ['impressed', (n) => `Expert. ${ten(n)} or more. Just a few slipped past.`],
    GOOD: ['warmly', (n) => `Good. ${ten(n)} or more. More than half right.`],
    BEGINNER: ['encouraging', (n) => `Beginner. ${ten(n)} or more. A solid start.`],
    'KEEP GOING': ['encouraging', (n) => `Keep going. Under ${ten(cfg.ranks[3].min).toLowerCase()}. Everybody starts somewhere.`],
  };
  cfg.ranks.forEach((rk) => {
    const [tag, fn] = rankLine[rk.name]; const text = fn(rk.min);
    add({ file: `scoreboard-${rk.name.replace(/\s+/g, '').toLowerCase()}.mp3`, key: `scoreboard.${rk.name.replace(/\s+/g, '').toLowerCase()}`, type: 'scoreboard', round: '', text, voice: tagged(tag, text), emotion: tag, pause: 0, note: 'all five play back to back: keep each under about 4 s' });
  });

  const outro = "How many did you get? Tell me in the comments. If you want more search histories, subscribe, and I'll see you in the next one.";
  add({ file: 'outro.mp3', key: 'outro', type: 'outro', round: '', text: outro, voice: "[warmly] How many did you get? Tell me in the comments. [playfully] If you want more search histories, subscribe, and I'll see you in the next one.", emotion: 'warmly > playfully', pause: 0 });

  // three columns only: id (= file name without .mp3), type, text (plain; with [emotion] tags only when run with --tags)
  const cols = ['id', 'type', 'text'];
  const esc = (v) => { const s = v === undefined || v === null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(',')].concat(rows.map((r) => [r.file.replace(/\.mp3$/, ''), r.type.replace(' card', '').replace(' answer', ''), WITH_TAGS ? r.voice : r.text].map(esc).join(','))).join('\n') + '\n';
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'lines.csv'), csv);
  console.log(`lines.csv: ${rows.length} rows, about ${Math.round(rows.reduce((n, r) => n + secs(r.text), 0))} s of speech (estimate)`);
};
main().catch((e) => { console.error(e); process.exit(1); });
