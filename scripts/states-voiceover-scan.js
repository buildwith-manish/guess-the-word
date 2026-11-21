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
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'public', 'voiceover');
const OUT = path.join(ROOT, 'src', 'states', 'states-voiceover-manifest.json');
const OUT_ANALYSIS = path.join(ROOT, 'src', 'states', 'states-voice-analysis.json');
const LINES = path.join(DIR, 'states-lines.csv');
const settings = require(path.join(ROOT, 'src', 'states', 'states-settings.json'));

const seconds = (file) => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const s = parseFloat(out.trim());
  return Number.isFinite(s) && s > 0 ? Math.round(s * 1000) / 1000 : 0;
};

/**
 * Per-clip analysis for the visuals (design ticks, 30 per second):
 *   env    voice level per tick, 0..100 (RMS of that 1/30 s, relative to the clip's loud passages)  -> speaking pulse
 *   start  first tick with speech, end = last tick with speech + 1                                  -> when a line is really heard
 *   split  (reveal clips) tick where the second part (the capital) starts: the end of the longest pause between the
 *          two sentences; without a clear pause, the share of the first sentence in the line's text   -> answer card timing
 */
const TICK = 30;
const SR = 8000;
const SPT = SR / TICK;
const lines = {};
if (fs.existsSync(LINES)) {
  for (const row of fs.readFileSync(LINES, 'utf8').split(/\r?\n/).slice(1)) {
    const m = row.match(/^([^,]+),"(.*)"$/);
    if (m) lines[m[1]] = m[2].replace(/""/g, '"');
  }
}
const analyse = (file, id) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) return null;
  const pcm = new Float32Array(Uint8Array.from(r.stdout).buffer, 0, Math.floor(r.stdout.length / 4));
  const n = Math.max(1, Math.floor(pcm.length / SPT));
  const rms = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const a = Math.floor(t * SPT);
    const b = Math.min(pcm.length, Math.floor((t + 1) * SPT));
    let acc = 0;
    for (let i = a; i < b; i++) acc += pcm[i] * pcm[i];
    rms[t] = Math.sqrt(acc / Math.max(1, b - a));
  }
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const peak = sorted[Math.floor(sorted.length * 0.95)] || 1e-6;
  const env = Array.from(rms, (v) => Math.min(100, Math.round((v / peak) * 100)));
  const thr = 12;
  let start = env.findIndex((v) => v >= thr);
  let end = env.length - [...env].reverse().findIndex((v) => v >= thr);
  if (start < 0) {
    start = 0;
    end = n;
  }
  const out = { env, start, end };
  const rm = id.match(/^r\d+$/);
  if (rm) {
    // pauses (>= 4 ticks) strictly inside the speech; the split is the end of the pause nearest to where the first
    // sentence should end by its share of the text (a long name or a pause inside "Capital: | Austin" cannot fool it)
    const text = lines[id] || '';
    const first = (text.match(/^[^.!?]*[.!?]/) || [text])[0];
    const guess = Math.round(start + ((end - start) * first.length) / Math.max(1, text.length));
    const pauses = [];
    let run = 0;
    for (let t = start; t < end; t++) {
      if (env[t] < thr) run++;
      else {
        if (run >= 4 && t - run > start + 3) pauses.push({ from: t - run, to: t });
        run = 0;
      }
    }
    const nearest = pauses.sort((x, y) => Math.abs(x.to - guess) - Math.abs(y.to - guess))[0];
    out.split = nearest && Math.abs(nearest.to - guess) <= Math.max(14, (end - start) * 0.3) ? nearest.to : guess;
    if (out.split === guess) out.splitFromText = true;
  }
  return out;
};

const analysis = {};
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
  const a = analyse(path.join(DIR, f), id);
  if (a) analysis[f] = a;
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
fs.writeFileSync(OUT_ANALYSIS, JSON.stringify(analysis) + '\n');
const n = (o) => Object.keys(o).length;
console.log(
  `wrote ${path.relative(ROOT, OUT)}: intro ${manifest.intro ? 1 : 0}, levels ${n(manifest.level)}, questions ${n(manifest.question)}, reveals ${n(manifest.reveal)}, ` +
    `bonus questions ${n(manifest.bonusq)}, bonus answers ${n(manifest.bonus)}, scoreboard ${n(manifest.scoreboard)}, outro ${manifest.outro ? 1 : 0}`,
);
if (unknown.length) console.log(`ignored (no matching id): ${unknown.join(', ')}`);
if (bad.length) console.log(`could not measure: ${bad.join(', ')}`);
const fromText = Object.entries(analysis).filter(([, a]) => a.splitFromText).map(([f]) => f);
console.log(`analysed ${Object.keys(analysis).length} clips (voice level per tick, speech start/end, reveal split)` + (fromText.length ? `; split guessed from the text for: ${fromText.join(', ')}` : ''));
if (n(manifest.question) === 0) console.log('note: no q01..q50 question clips found, the clock will not wait for a question read-out');
process.exitCode = bad.length ? 1 : 0;
