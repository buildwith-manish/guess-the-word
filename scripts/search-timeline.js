#!/usr/bin/env node
/**
 * scripts/search-timeline.js
 * Builds src/search/search-timing.ts (and search-data.ts) with esbuild, the same
 * approach as scripts/timeline.js, and prints the real frame plan.
 *
 * Usage:
 *   node scripts/search-timeline.js            # summary, segments, chapters
 *   node scripts/search-timeline.js --json     # machine readable
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const load = async (entry) => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `search-${path.basename(entry, '.ts')}-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
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

const clock = (frames, fps) => {
  const s = Math.round(frames / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const main = async () => {
  const t = await load('src/search/search-timing.ts');
  const d = await load('src/search/search-data.ts');
  const { TIMELINE, LEVELS, FPS, RENDER_FPS, RENDER_TOTAL_FRAMES, TOTAL } = t;
  const { ROUNDS, BONUS } = d;

  if (process.argv.includes('--json')) {
    process.stdout.write(
      JSON.stringify({
        totalFrames: TIMELINE.totalFrames,
        fps: FPS,
        renderFps: RENDER_FPS,
        renderFrames: RENDER_TOTAL_FRAMES,
        segments: TIMELINE.segments,
      }),
    );
    return;
  }

  const segs = TIMELINE.segments;
  const counts = segs.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {});
  console.log(`\n  Search history: ${TOTAL} rounds, ${BONUS.length} bonus, native @ ${RENDER_FPS} fps`);
  console.log(`  total ${TIMELINE.totalFrames} design frames @ ${FPS} fps = ${RENDER_TOTAL_FRAMES} output frames @ ${RENDER_FPS} fps`);
  console.log(`  runtime ${clock(TIMELINE.totalFrames, FPS)} (mm:ss)`);
  console.log(`  segments: ${Object.entries(counts).map(([k, v]) => `${k}x${v}`).join('  ')}\n`);

  console.log('  frame    dur  kind        detail');
  segs.forEach((s) => {
    const detail =
      s.kind === 'round' ? `R${s.index + 1} ${ROUNDS[s.index].name}${s.lead ? ` (lead ${s.lead})` : ''}`
      : s.kind === 'bonus' ? `bonus ${s.index + 1} ${BONUS[s.index].answer}`
      : s.kind === 'levelCard' ? LEVELS[s.levelIndex].name
      : s.kind === 'iris' ? `${s.variant}`
      : s.kind === 'reminder' ? `after R${s.hud.number}`
      : '';
    console.log(`  ${String(s.from).padStart(6)} ${String(s.duration).padStart(5)}  ${s.kind.padEnd(10)}  ${detail}`);
  });

  const chapters = [];
  segs.forEach((s) => {
    if (s.kind === 'hook') chapters.push(['Hook', s.from]);
    if (s.kind === 'levelCard') chapters.push([`Level ${s.levelIndex + 1} ${LEVELS[s.levelIndex].name}`, s.from]);
    if (s.kind === 'bonus') chapters.push([`Bonus ${s.index + 1}`, s.from]);
    if (s.kind === 'scoreboard') chapters.push(['Scoreboard', s.from]);
  });
  console.log('\n  chapter              time    frame');
  chapters.forEach(([name, f]) =>
    console.log(`  ${name.padEnd(20)} ${clock(f, FPS).padStart(5)}  ${String(f).padStart(6)}`),
  );
  console.log('');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
