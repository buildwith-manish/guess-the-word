#!/usr/bin/env node
/**
 * scripts/voiceover-scan.js
 * ---------------------------------------------------------------------------
 * Finds your voiceover clips and measures them, so the video can fit around them.
 *
 *   public/voiceover/q01.mp3 ... q50.mp3      the answer reveal of question 1..50
 *   public/voiceover/qq01.mp3 ... qq50.mp3    the question-phase (timer) clip
 *   public/voiceover/bonus01.mp3 ... bonus05  the answer reveal of bonus round 1..5
 *   public/voiceover/bonusq01.mp3 ... bonusq05  the question prompt of bonus round 1..5
 *   public/voiceover/intro.mp3                the hook intro line
 *   public/voiceover/scoreboard_intro.mp3     scoreboard intro line
 *   public/voiceover/scoreboard_legend.mp3    scoreboard LEGEND rank line
 *   public/voiceover/scoreboard_expert.mp3    scoreboard EXPERT rank line
 *   public/voiceover/scoreboard_good.mp3      scoreboard GOOD rank line
 *   public/voiceover/scoreboard_beginner.mp3  scoreboard BEGINNER rank line
 *   public/voiceover/scoreboard_keepgoing.mp3 scoreboard KEEP GOING rank line
 *   public/voiceover/outro.mp3                the end-screen outro line
 *   (.mp3 .wav .m4a .aac .ogg .flac all work)
 *
 * It writes src/voiceover-manifest.json:
 *   { q: { "1": { file, seconds } }, qq: {...}, bonus: {...}, bonusq: {...},
 *     intro: { file, seconds }, scoreboard: { legend: { file, seconds }, ... }, outro: { file, seconds } }
 *
 * timing.ts reads that file: each clip starts just after the reveal lands, and the reveal hold is
 * stretched when the clip is longer than the default hold, so nothing is ever cut off. A missing
 * clip changes nothing for that question.
 *
 *   npm run voiceover            # scan + coverage report
 *   (npm run render runs this automatically first)
 *
 * Durations: WAV is read directly; everything else uses ffprobe (PATH, or `npx remotion ffprobe`).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const settings = require(path.join(ROOT, 'settings.json'));
const VO = settings.voiceover;
const DIR = path.join(ROOT, 'public', VO.dir);
const MANIFEST = path.join(ROOT, 'src', 'voiceover-manifest.json');
const PIXEL_MANIFEST = path.join(ROOT, 'src', 'pixel', 'pixel-voiceover-manifest.json');
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

const probeArgs = (file) => ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file];
const ffprobeSeconds = (file) => {
  const tries = [
    ['ffprobe', probeArgs(file)],
    [process.platform === 'win32' ? 'npx.cmd' : 'npx', ['remotion', 'ffprobe', ...probeArgs(file)]],
  ];
  for (const [bin, args] of tries) {
    const r = spawnSync(bin, args, { encoding: 'utf8', cwd: ROOT, shell: process.platform === 'win32' });
    const v = parseFloat(String(r.stdout || '').trim().split(/\s+/).pop());
    if (r.status === 0 && Number.isFinite(v)) return v;
  }
  return null;
};

const seconds = (file) => {
  if (/\.wav$/i.test(file)) {
    const s = wavSeconds(file);
    if (s) return s;
  }
  return ffprobeSeconds(file);
};

const main = () => {
  const manifest = { q: {}, qq: {}, bonus: {}, bonusq: {}, intro: null, scoreboard: {}, outro: null };
  // Pixel quiz clips (own namespace so brand numbers never collide with q01..q50):
  //   pxqq##  question line · pxq##  answer line · pxbonusq##  bonus question · pxbonus##  bonus answer
  const pixel = { q: {}, qq: {}, bonus: {}, bonusq: {} };
  const problems = [];
  if (fs.existsSync(DIR)) {
    for (const name of fs.readdirSync(DIR).sort()) {
      if (!EXT.test(name)) continue;

      const s = seconds(path.join(DIR, name));
      if (!s) {
        problems.push(`could not measure "${name}" (install ffmpeg/ffprobe, or use a .wav)`);
        continue;
      }
      const entry = { file: name, seconds: Math.round(s * 1000) / 1000 };

      // Pixel quiz clips: pxqq##, pxq##, pxbonus##, pxbonusq##
      const px = /^px(bonusq|qq|q|bonus)0*(\d+)\.[a-z0-9]+$/i.exec(name);
      if (px) {
        const kind = px[1].toLowerCase();
        const n = String(Number(px[2]));
        if (pixel[kind][n]) {
          problems.push(`two clips for px${kind} ${n}: keeping ${pixel[kind][n].file}, ignoring ${name}`);
          continue;
        }
        pixel[kind][n] = entry;
        continue;
      }

      // Numbered clips: qq##, q##, bonus##, bonusq##
      const m = /^(bonusq|qq|q|bonus)0*(\d+)\.[a-z0-9]+$/i.exec(name);
      if (m) {
        const kind = m[1].toLowerCase();
        const n = String(Number(m[2]));
        if (manifest[kind][n]) {
          problems.push(`two clips for ${kind} ${n}: keeping ${manifest[kind][n].file}, ignoring ${name}`);
          continue;
        }
        manifest[kind][n] = entry;
        continue;
      }

      // Named clips: intro, outro, scoreboard_*
      const baseName = name.replace(/\.[a-z0-9]+$/i, '').toLowerCase();
      if (baseName === 'intro') {
        manifest.intro = entry;
        continue;
      }
      if (baseName === 'outro') {
        manifest.outro = entry;
        continue;
      }
      if (baseName.startsWith('scoreboard_')) {
        const rankName = baseName.replace('scoreboard_', '');
        manifest.scoreboard[rankName] = entry;
        continue;
      }

      problems.push(`ignored "${name}" (unrecognized name)`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(PIXEL_MANIFEST, JSON.stringify(pixel, null, 2) + '\n');

  let total = 0;
  try {
    total = require(path.join(ROOT, 'src', 'rounds.json')).length;
  } catch (e) {
    /* rounds.json is generated; the pixel quiz does not need it */
  }
  const bonusTotal = settings.bonus.after.length;
  const qn = Object.keys(manifest.q).length;
  const qqn = Object.keys(manifest.qq).length;
  const bn = Object.keys(manifest.bonus).length;
  const bqn = Object.keys(manifest.bonusq).length;
  const sbn = Object.keys(manifest.scoreboard).length;
  const defaultHoldSec = (settings.timing.answerHold - VO.offsetFrames - VO.tailFrames) / 30;

  console.log(`\n  voiceover: ${qn}/${total} reveal · ${qqn}/${total} question-phase · ${bn}/${bonusTotal} bonus reveal · ${bqn}/${bonusTotal} bonus question · ${sbn}/6 scoreboard · intro ${manifest.intro ? '✓' : '✗'} · outro ${manifest.outro ? '✓' : '✗'}  (${path.relative(ROOT, DIR)})`);
  if (qn + qqn + bn === 0 && !manifest.intro && !manifest.outro) console.log('  no clips yet: the video renders exactly as before. Run `npm run voiceover:script` for the lines to record.');

  const long = Object.entries(manifest.q).filter(([, v]) => v.seconds > defaultHoldSec);
  if (long.length) {
    console.log(
      `  ${long.length} clip(s) are longer than the default reveal (${defaultHoldSec.toFixed(1)} s): the video holds the answer longer where needed so nothing is cut off.`,
    );
  }
  const pxCount = (k) => Object.keys(pixel[k]).length;
  if (pxCount('q') + pxCount('qq') + pxCount('bonus') + pxCount('bonusq') > 0) {
    console.log(
      `  pixel quiz voiceover: ${pxCount('q')}/46 answer · ${pxCount('qq')}/46 question · ${pxCount('bonus')}/4 bonus answer · ${pxCount('bonusq')}/4 bonus question`,
    );
  }
  const odd = Object.entries(manifest.q).filter(([, v]) => v.seconds < 0.3 || v.seconds > 9);
  odd.forEach(([n, v]) => problems.push(`q${n}: ${v.seconds}s looks wrong (empty or too long?)`));
  const missing = [];
  for (let i = 1; i <= total; i++) if (!manifest.q[String(i)]) missing.push(i);
  if (qn && missing.length) console.log(`  missing questions: ${missing.join(', ')}`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  console.log('');
};

main();
