#!/usr/bin/env node
/**
 * scripts/states-timeline.js  (npm run states:timeline)
 * Bundles src/states/state-timing.ts with esbuild (same approach as scripts/timeline.js) and prints
 * total frames, runtime, every segment and the chapter timestamps. It loads the SAME module the
 * video renders from, so the numbers cannot disagree with Studio.
 *   node scripts/states-timeline.js            # summary + segments + chapters
 *   node scripts/states-timeline.js --json
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const load = async () => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `states-timing-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/states/state-timing.ts')],
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

const mmss = (ticks, fps) => {
  const s = Math.round(ticks / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

(async () => {
  const m = await load();
  const { TIMELINE, QUESTIONS, LEVELS, FPS, RENDER_FPS, RENDER_TOTAL_FRAMES, TOTAL } = m;
  const segs = TIMELINE.segments;

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ totalFrames: TIMELINE.totalFrames, fps: FPS, renderFps: RENDER_FPS, renderFrames: RENDER_TOTAL_FRAMES, segments: segs }));
    return;
  }

  const counts = segs.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {});
  console.log(`\n  Guess the US State from Its Shape: ${TOTAL} questions, ${m.WIDTH}x${m.HEIGHT} @ ${RENDER_FPS} fps`);
  console.log(`  total ${TIMELINE.totalFrames} design frames (${FPS} fps) = ${RENDER_TOTAL_FRAMES} output frames`);
  console.log(`  runtime ${mmss(TIMELINE.totalFrames, FPS)} (${(TIMELINE.totalFrames / FPS).toFixed(1)} s)`);
  console.log(`  segments: ${Object.entries(counts).map(([k, v]) => `${k}x${v}`).join('  ')}\n`);

  const detail = (s) => {
    if (s.kind === 'question') {
      const q = QUESTIONS[s.index];
      const p = m.buildQuestionPlan(s.index);
      return `Q${q.id} ${q.key} ${q.level} clock ${p.timerSeconds}s${p.fast ? ' FAST' : ''} hold ${p.hold}`;
    }
    if (s.kind === 'levelCard') return LEVELS[s.levelIndex].name;
    if (s.kind === 'bonus') return `slot ${s.index + 1} ${s.bonusKind} (placeholder length until 4a)`;
    if (s.kind === 'reminder') return `after Q${s.hud.number}`;
    if (s.kind === 'iris') return `${s.hud.label}${s.hud.number} ${s.variant}`;
    return '';
  };
  console.log('  #    kind        from   dur   start   detail');
  segs.forEach((s, i) => {
    console.log(`  ${String(i).padStart(3)}  ${s.kind.padEnd(10)} ${String(s.from).padStart(6)} ${String(s.duration).padStart(5)}  ${mmss(s.from, FPS).padStart(5)}   ${detail(s)}`);
  });

  console.log('\n  Chapters');
  console.log('  time    tick     chapter');
  const ch = [];
  segs.forEach((s) => {
    if (s.kind === 'hook') ch.push([s.from, 'Hook']);
    if (s.kind === 'levelCard') ch.push([s.from, `${LEVELS[s.levelIndex].name} level`]);
    if (s.kind === 'bonus') ch.push([s.from, `Bonus ${s.index + 1} (${s.bonusKind})`]);
    if (s.kind === 'scoreboard') ch.push([s.from, 'Scoreboard']);
  });
  ch.forEach(([from, name]) => console.log(`  ${mmss(from, FPS).padStart(5)}   ${String(from).padStart(6)}   ${name}`));
  console.log('');
})().catch((e) => { console.error(e); process.exit(1); });
