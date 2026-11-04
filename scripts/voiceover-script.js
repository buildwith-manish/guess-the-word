#!/usr/bin/env node
/**
 * scripts/voiceover-script.js
 * ---------------------------------------------------------------------------
 * Writes voiceover-script.txt: one line per reveal, with the exact file name to save it as.
 *
 *   npm run voiceover:script
 *
 * The wording comes from settings.voiceover.template ("The answer is {word}.") and
 * settings.voiceover.bonusTemplate. For questions that show a fun fact on screen (every 3rd one),
 * the fact is appended so the spoken line matches what the viewer reads. If you would rather only
 * say the answer, just leave the fact out of that recording.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const settings = require(path.join(ROOT, 'settings.json'));
const VO = settings.voiceover;

const load = async () => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `gtw-vo-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/timing.ts')],
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

(async () => {
  const { QUESTIONS, TIMELINE } = await load();
  const lines = [];
  lines.push('VOICEOVER SCRIPT  (save each clip in public/' + VO.dir + '/ with the file name shown)');
  lines.push('Aim for a calm, upbeat read. Short is fine: the video holds the answer on screen until your clip ends.');
  lines.push('Template: "' + VO.template + '"  (change it in settings.json -> voiceover.template, then re-run this script)');
  lines.push('');
  QUESTIONS.forEach((q) => {
    const words = q.fact ? q.fact.split(/\s+/).length : 0;
    const showFact = q.id % settings.timing.factEvery === 0 && words > 0;
    const say = VO.template.replace('{word}', title(q.word)).replace('{WORD}', q.word);
    lines.push(`q${pad(q.id)}.mp3   [${q.level}]  ${say}${showFact ? ' ' + q.fact : ''}`);
  });
  const bonus = TIMELINE.segments.filter((s) => s.kind === 'bonus');
  if (bonus.length) lines.push('', 'BONUS ROUNDS');
  bonus.forEach((s) => {
    const say = VO.bonusTemplate.replace('{answer}', String(s.puzzle.answer));
    lines.push(`bonus${pad(s.index + 1)}.mp3   ${say}`);
  });
  lines.push('');
  const out = path.join(ROOT, 'voiceover-script.txt');
  fs.writeFileSync(out, lines.join('\n'));
  console.log(lines.slice(0, 12).join('\n') + '\n  ...\n  full script: ' + path.relative(ROOT, out) + '\n');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
