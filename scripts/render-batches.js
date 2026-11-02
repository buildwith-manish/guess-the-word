#!/usr/bin/env node
/**
 * scripts/render-batches.js
 * ---------------------------------------------------------------------------
 * Resume-safe batch renderer. Instead of one 15 minute render that can die at
 * 92%, it renders N-frame chunks in parallel-friendly lanes and remembers the
 * ones that finished. Re-running the same command picks up where it stopped,
 * then concatenates the valid chunks into out/video.mp4.
 *
 *   node scripts/render-batches.js                 # 1800-frame chunks (30 s @ 60 fps)
 *   node scripts/render-batches.js --size 600      # smaller chunks = smaller redo window
 *   node scripts/render-batches.js --only 5        # render a single batch (lane worker)
 *   node scripts/render-batches.js --concat        # only remux the finished chunks
 *   node scripts/render-batches.js --clean         # wipe out/batches + progress file
 *   node scripts/render-batches.js --force         # ignore existing chunks
 *   node scripts/render-batches.js --lane          # ONE full render (no chunking)
 *                                                  # Remotion already parallelises
 *                                                  # internally; --lane is the
 *                                                  # simple path, --size/--only are
 *                                                  # the chunked one
 *
 * Extra flags are forwarded to `remotion render` (e.g. --concurrency=4).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const BATCH_DIR = path.join(OUT, 'batches');
const PROGRESS = path.join(OUT, '.render-progress.json');
const COMPOSITION = process.env.REMOTION_COMPOSITION || 'GuessTheWord';

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : fallback;
};

// chunk size is in OUTPUT frames (60 fps): 1800 frames = the same 30 s window as 900 frames at 30 fps
const SIZE = Math.max(60, Number(valueOf('--size', 1800)));
const ONLY = valueOf('--only', null);
// our own flags never reach `remotion render`
const OUR_FLAGS = ['--size', '--only', '--concat', '--clean', '--force', '--lane', '--help'];
const FORWARD = argv.filter(
  (a, i) => !OUR_FLAGS.includes(a) && !(i > 0 && ['--size', '--only'].includes(argv[i - 1])),
);

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const run = (cmd, args) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
};

const remotion = () =>
  process.platform === 'win32' ? 'npx.cmd' : 'npx';

/**
 * Composition length: $TOTAL_FRAMES (handy for smoke tests) or the real
 * timeline module, which is the same maths the video renders from — so the
 * chunk boundaries can never drift away from the composition.
 */
const getTotalFrames = () => {
  if (process.env.TOTAL_FRAMES) return Number(process.env.TOTAL_FRAMES);
  try {
    const json = execFileSync(process.execPath, [path.join(__dirname, 'timeline.js'), '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    // OUTPUT frames (the composition runs at 60 fps), not the 30 fps design frames
    return JSON.parse(json).renderFrames;
  } catch (err) {
    throw new Error(
      `Could not determine the composition length (${err.message}). Run \`npm run timeline\` first.`,
    );
  }
};

const makeBatches = (total, size) => {
  const batches = [];
  for (let from = 0; from < total; from += size) {
    batches.push({ from, to: Math.min(total, from + size) - 1 });
  }
  return batches;
};

const chunkName = (i) => `chunk-${String(i).padStart(3, '0')}.mp4`;

const remux = (files, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  for (const f of files) {
    if (!fs.existsSync(f)) throw new Error(`Missing chunk ${f}`);
  }
  const list = path.join(BATCH_DIR, 'concat.txt');
  fs.writeFileSync(list, files.map((f) => `file '${path.basename(f)}'`).join('\n') + '\n');
  // stream copy, no re-encode — every chunk was rendered with identical settings
  run(remotion(), ['remotion', 'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', target]);
};

const main = () => {
  if (has('--help')) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
    return;
  }

  if (has('--clean')) {
    fs.rmSync(BATCH_DIR, { recursive: true, force: true });
    fs.rmSync(PROGRESS, { force: true });
    fs.rmSync(path.join(OUT, 'video.mp4'), { force: true });
    console.log('✔ cleaned out/batches, out/.render-progress.json and out/video.mp4');
    return;
  }

  if (has('--lane')) {
    const frames = process.env.TOTAL_FRAMES ? ` --frames=0-${Number(process.env.TOTAL_FRAMES) - 1}` : '';
    console.log(`\n  ${COMPOSITION} · full render (no chunking)${frames ? ` · frames ${frames.slice(9)}` : ''}\n`);
    run(remotion(), [
      'remotion',
      'render',
      COMPOSITION,
      path.join(OUT, 'video.mp4'),
      ...(frames ? [frames.trim()] : []),
      ...FORWARD,
    ]);
    console.log('\n✔ out/video.mp4');
    return;
  }

  const total = getTotalFrames();
  const batches = makeBatches(total, SIZE);
  fs.mkdirSync(BATCH_DIR, { recursive: true });

  const progress = readJson(PROGRESS, { size: SIZE, total, done: {} });
  if (progress.size !== SIZE) {
    console.log(`⚠ chunk size changed (${progress.size} -> ${SIZE}): starting a fresh progress map`);
    progress.size = SIZE;
    progress.total = total;
    progress.done = {};
  }
  progress.total = total;

  if (has('--concat')) {
    const files = batches.map((_, i) => path.join(BATCH_DIR, chunkName(i))).filter((f) => fs.existsSync(f));
    if (!files.length) throw new Error('No chunks found. Run the renderer first.');
    console.log(`✔ remuxing ${files.length}/${batches.length} chunk(s)`);
    remux(files, path.join(OUT, 'video.mp4'));
    return;
  }

  const targets = ONLY === null ? batches.map((_, i) => i) : [Number(ONLY)];
  if (ONLY !== null && (Number.isNaN(targets[0]) || !batches[targets[0]])) {
    throw new Error(`--only ${ONLY} is out of range (0..${batches.length - 1})`);
  }

  console.log(
    `\n  ${COMPOSITION} · ${total} frames · ${batches.length} batch(es) of ${SIZE} frames` +
      (ONLY !== null ? ` · lane worker for batch ${ONLY}` : ''),
  );

  let rendered = 0;
  for (const i of targets) {
    const b = batches[i];
    const out = path.join(BATCH_DIR, chunkName(i));
    const frameRange = `${b.from}-${b.to}`;

    if (!has('--force') && progress.done[chunkName(i)] && fs.existsSync(out)) {
      console.log(`  ↷ batch ${i + 1}/${batches.length} (frames ${frameRange}) already done`);
      continue;
    }

    console.log(`  → batch ${i + 1}/${batches.length} (frames ${frameRange})`);
    try {
      run(remotion(), [
        'remotion',
        'render',
        COMPOSITION,
        out,
        `--frames=${frameRange}`,
        ...FORWARD,
      ]);
    } catch (err) {
      console.log(`\n✖ batch ${i} failed. Progress is saved — re-run the same command to resume.`);
      writeJson(PROGRESS, progress);
      process.exit(err.status || 1);
    }

    progress.done[chunkName(i)] = { from: b.from, to: b.to, at: new Date().toISOString() };
    writeJson(PROGRESS, progress);
    rendered += 1;
  }

  const missing = batches.map((_, i) => i).filter((i) => !fs.existsSync(path.join(BATCH_DIR, chunkName(i))));
  if (missing.length) {
    console.log(`\n  ${rendered} batch(es) rendered · ${missing.length} still missing: ${missing.join(', ')}`);
    console.log('  re-run this command to pick them up.');
    return;
  }

  console.log('\n  all batches present — remuxing into out/video.mp4');
  remux(batches.map((_, i) => path.join(BATCH_DIR, chunkName(i))), path.join(OUT, 'video.mp4'));
  console.log('\n✔ out/video.mp4');
};

try {
  main();
} catch (err) {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
}
