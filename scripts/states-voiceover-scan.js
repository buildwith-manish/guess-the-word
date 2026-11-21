#!/usr/bin/env node
/**
 * scripts/states-voiceover-scan.js  (npm run states:voiceover:scan)
 * Fills src/states/states-voiceover-manifest.json from the clips in public/voiceover (needs ffprobe).
 * File names follow the ids of public/voiceover/states-lines.csv plus a question clip per state:
 *   intro                       manifest.intro
 *   level1 .. level4            manifest.level[<levels[i].name in states-settings.json>]
 *   q01 .. q50                  manifest.question["1".."50"]  (question clip: plays as the outline draws, the clock starts after it)
 *   r01 .. r50                  manifest.reveal["1".."50"]    (reveal clip: starts after the answer lands)
 *   b1q .. b4q                  manifest.bonusq["1".."4"]     (bonus question: the bonus clock starts after it)
 *   b1 .. b4                    manifest.bonus["1".."4"]      (bonus answer)
 *   legend expert good beginner keepgoing   manifest.scoreboard[<same>]
 *   outro                       manifest.outro
 * Clips for the other videos (px*.wav) are ignored. Unknown file names are listed, not guessed.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'public', 'voiceover');
const OUT = path.join(ROOT, 'src', 'states', 'states-voiceover-manifest.json');
const settings = require(path.join(ROOT, 'src', 'states', 'states-settings.json'));

const seconds = (file) => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const s = parseFloat(out.trim());
  return Number.isFinite(s) && s > 0 ? Math.round(s * 1000) / 1000 : 0;
};

const manifest = { intro: null, level: {}, question: {}, reveal: {}, bonus: {}, bonusq: {}, scoreboard: {}, outro: null };
const ranks = new Set(settings.ranks.map((r) => r.id.toLowerCase()));
const unknown = [];
const bad = [];

for (const f of fs.readdirSync(DIR).sort()) {
  const m = f.match(/^(.+)\.(wav|mp3|m4a|aac|ogg|flac)$/i);
  if (!m || /^px/i.test(f)) continue;
  const id = m[1].toLowerCase();
  const secs = seconds(path.join(DIR, f));
  if (!secs) {
    bad.push(f);
    continue;
  }
  const entry = { file: f, seconds: secs };
  let k;
  if (id === 'intro') manifest.intro = entry;
  else if (id === 'outro') manifest.outro = entry;
  else if ((k = id.match(/^level(\d+)$/)) && settings.levels[Number(k[1]) - 1]) manifest.level[settings.levels[Number(k[1]) - 1].name] = entry;
  else if ((k = id.match(/^q(\d+)$/))) manifest.question[String(Number(k[1]))] = entry;
  else if ((k = id.match(/^r(\d+)$/))) manifest.reveal[String(Number(k[1]))] = entry;
  else if ((k = id.match(/^b(\d+)q$/))) manifest.bonusq[String(Number(k[1]))] = entry;
  else if ((k = id.match(/^b(\d+)$/))) manifest.bonus[String(Number(k[1]))] = entry;
  else if (ranks.has(id)) manifest.scoreboard[id] = entry;
  else unknown.push(f);
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
const n = (o) => Object.keys(o).length;
console.log(
  `wrote ${path.relative(ROOT, OUT)}: intro ${manifest.intro ? 1 : 0}, levels ${n(manifest.level)}, questions ${n(manifest.question)}, reveals ${n(manifest.reveal)}, ` +
    `bonus questions ${n(manifest.bonusq)}, bonus answers ${n(manifest.bonus)}, scoreboard ${n(manifest.scoreboard)}, outro ${manifest.outro ? 1 : 0}`,
);
if (unknown.length) console.log(`ignored (no matching id): ${unknown.join(', ')}`);
if (bad.length) console.log(`could not measure: ${bad.join(', ')}`);
const total = settings.levels.length + 2 + 2 * 4 + ranks.size;
if (n(manifest.question) === 0) console.log('note: no q01..q50 question clips found, the clock will not wait for a question read-out');
process.exitCode = bad.length ? 1 : 0;
