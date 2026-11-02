#!/usr/bin/env node
/**
 * scripts/timeline.js
 * ---------------------------------------------------------------------------
 * Builds src/timing.ts (which imports settings.json + rounds.json) with
 * esbuild and prints the real frame plan. Nothing here is a re-implementation:
 * it loads the SAME module the video renders from, so the numbers can never
 * disagree with what you see on screen.
 *
 * Usage:
 *   node scripts/timeline.js             # summary
 *   node scripts/timeline.js --json      # machine readable (used by render-batches)
 *   node scripts/timeline.js --segments  # every segment
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const loadTimeline = async () => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `gtw-timing-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/timing.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    // explicit order: without it esbuild resolves './bonus' to './bonus.tsx'
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  });
  const mod = await import(`file://${outfile}`);
  fs.unlinkSync(outfile);
  return {
    TIMELINE: mod.TIMELINE,
    PUZZLES: mod.PUZZLES,
    QUESTIONS: mod.QUESTIONS,
    LEVELS: mod.LEVELS,
    FPS: mod.FPS,
    RENDER_FPS: mod.RENDER_FPS,
    TIME_SCALE: mod.TIME_SCALE,
    RENDER_TOTAL_FRAMES: mod.RENDER_TOTAL_FRAMES,
  };
};

const fmt = (frames, fps) => {
  const s = frames / fps;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
};

const main = async () => {
  const { TIMELINE, QUESTIONS, LEVELS, FPS, RENDER_FPS, TIME_SCALE, RENDER_TOTAL_FRAMES } = await loadTimeline();
  const asJson = process.argv.includes('--json');
  const all = process.argv.includes('--segments');

  if (asJson) {
    process.stdout.write(JSON.stringify({
        totalFrames: TIMELINE.totalFrames,
        fps: FPS,
        renderFps: RENDER_FPS,
        timeScale: TIME_SCALE,
        renderFrames: RENDER_TOTAL_FRAMES,
        segments: TIMELINE.segments,
      }));
    return;
  }

  const counts = TIMELINE.segments.reduce((acc, s) => {
    acc[s.kind] = (acc[s.kind] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n  Guess the Word — ${QUESTIONS.length} questions · authored at ${FPS} fps / 1920x1080 · output ${RENDER_FPS} fps / 2560x1440`);
  console.log(`  total ${TIMELINE.totalFrames} design frames (${fmt(TIMELINE.totalFrames, FPS)}) = ${RENDER_TOTAL_FRAMES} output frames @ ${RENDER_FPS} fps`);
  console.log(`  segments: ${Object.entries(counts).map(([k, v]) => `${k}×${v}`).join('  ')}\n`);

  LEVELS.forEach((level) => {
    const qs = TIMELINE.segments.filter((s) => s.kind === 'question' && QUESTIONS[s.index].level === level.name);
    const frames = qs.reduce((a, s) => a + s.duration, 0);
    console.log(
      `  ${level.name.padEnd(7)} ${String(qs.length).padStart(2)} questions · ${String(level.time).padStart(2)}s each · ${fmt(frames, FPS)}`,
    );
  });

  const firstBonus = TIMELINE.segments.find((s) => s.kind === 'bonus');
  console.log(`\n  first bonus at frame ${firstBonus?.from} (${fmt(firstBonus?.from ?? 0, FPS)})`);

  if (all) {
    console.log('\n  frame      dur   kind');
    TIMELINE.segments.forEach((s) => {
      const extra =
        s.kind === 'question'
          ? `Q${s.index + 1} ${QUESTIONS[s.index].word}`
          : s.kind === 'bonus'
            ? `bonus ${s.index + 1} ${s.puzzle.kind}`
            : s.kind === 'levelCard'
              ? `level ${s.levelIndex + 1}`
              : '';
      console.log(`  ${String(s.from).padStart(6)}  ${String(s.duration).padStart(5)}   ${s.kind.padEnd(10)} ${extra}`);
    });
  }

  console.log('');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { loadTimeline };
