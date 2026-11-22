#!/usr/bin/env node
/**
 * scripts/search-voiceover-scan.js   (npm run search:voice)
 * Measures the search-history voiceover clips and writes src/search/search-voiceover-manifest.json.
 *
 * Clips live in public/voiceover/search/ (a sub-folder, so the quiz / pixel scanner never picks them up).
 * File names (wav, mp3, m4a, aac, ogg, flac):
 *   intro                       -> intro
 *   level-1 .. level-3          -> level[n]
 *   clue-<round>-<1..3>         -> clue[round][n-1]
 *   hint-<variant>-r<round>     -> hint[round]        (the spoken hint, played when the hint appears)
 *   reveal-<round>              -> reveal[round]
 *   bonus-<n>                   -> bonus[n]           (bonus answer)
 *   bonus-<n>-intro             -> bonusIntro[n]      (bonus intro line)
 *   scoreboard-intro | -legend | -expert | -good | -beginner | -keepgoing -> scoreboard[key]
 *   outro                       -> outro
 * Each entry is { file: "search/<name>", seconds }. `file` is relative to public/<settings.voiceover.dir>.
 * Durations: WAV is read from the header; other formats use ffprobe if it is on PATH.
 * Prints a coverage report against src/search/search-data.ts. A missing clip is never an error: the video
 * falls back to its fixed timing for that part.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8'));
const SUB = 'search';
const DIR = path.join(ROOT, 'public', settings.voiceover.dir, SUB);
const OUT = path.join(ROOT, 'src/search/search-voiceover-manifest.json');
const EXT = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;

const wavSeconds = (file) => {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return null;
  let pos = 12;
  let byteRate = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(pos + 16);
    if (id === 'data' && byteRate) return Math.min(size, b.length - pos - 8) / byteRate;
    pos += 8 + size + (size % 2);
  }
  return null;
};
const seconds = (file) => {
  let s = /\.wav$/i.test(file) ? wavSeconds(file) : null;
  if (s == null) {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    s = r.status === 0 ? parseFloat(r.stdout) : null;
  }
  return Number.isFinite(s) && s > 0 ? Math.round(s * 1000) / 1000 : null;
};

const m = { intro: null, level: {}, clue: {}, reveal: {}, hint: {}, bonus: {}, bonusIntro: {}, scoreboard: {}, outro: null };
const unknown = [];
const unreadable = [];
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => EXT.test(f)).sort() : [];

for (const f of files) {
  const stem = f.replace(EXT, '');
  const secs = seconds(path.join(DIR, f));
  if (secs == null) { unreadable.push(f); continue; }
  const entry = { file: `${SUB}/${f}`, seconds: secs };
  let k;
  if (stem === 'intro') m.intro = entry;
  else if (stem === 'outro') m.outro = entry;
  else if ((k = stem.match(/^level-(\d+)$/))) m.level[k[1]] = entry;
  else if ((k = stem.match(/^clue-(\d+)-([123])$/))) (m.clue[k[1]] ||= [null, null, null])[Number(k[2]) - 1] = entry;
  else if ((k = stem.match(/^hint-\d+-r(\d+)$/))) m.hint[k[1]] = entry;
  else if ((k = stem.match(/^reveal-(\d+)$/))) m.reveal[k[1]] = entry;
  else if ((k = stem.match(/^bonus-(\d+)-intro$/))) m.bonusIntro[k[1]] = entry;
  else if ((k = stem.match(/^bonus-(\d+)$/))) m.bonus[k[1]] = entry;
  else if ((k = stem.match(/^scoreboard-(intro|legend|expert|good|beginner|keepgoing)$/))) m.scoreboard[k[1]] = entry;
  else unknown.push(f);
}
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0])));
for (const key of ['level', 'clue', 'reveal', 'hint', 'bonus', 'bonusIntro']) m[key] = sortObj(m[key]);
fs.writeFileSync(OUT, JSON.stringify(m, null, 2) + '\n');

// coverage against the data
const data = fs.readFileSync(path.join(ROOT, 'src/search/search-data.ts'), 'utf8');
const roundsSrc = data.slice(data.indexOf('export const ROUNDS'), data.indexOf('export const BONUS'));
const rounds = (roundsSrc.match(/^\s+id: \d+,/gm) || []).length;
const bonuses = (data.match(/afterRound: \d+,/g) || []).length;
const count = (o) => Object.keys(o).length;
const fullClues = Object.values(m.clue).filter((a) => a.every(Boolean)).length;
const row = (name, have, want) => console.log(`  ${have === want ? 'ok  ' : 'MISS'} ${name.padEnd(14)} ${have}/${want}`);
console.log(`wrote ${path.relative(ROOT, OUT)} from ${files.length} clips in public/${settings.voiceover.dir}/${SUB}/`);
row('intro', m.intro ? 1 : 0, 1);
row('level cards', count(m.level), 3);
row('rounds w/ 3 clues', fullClues, rounds);
row('hints', count(m.hint), rounds);
row('reveals', count(m.reveal), rounds);
row('bonus answers', count(m.bonus), bonuses);
row('bonus intros', count(m.bonusIntro), bonuses);
row('scoreboard', count(m.scoreboard), 6);
row('outro', m.outro ? 1 : 0, 1);
if (unknown.length) console.log(`  unrecognised file names (ignored): ${unknown.join(', ')}`);
if (unreadable.length) console.log(`  could not read a duration (skipped): ${unreadable.join(', ')}`);
