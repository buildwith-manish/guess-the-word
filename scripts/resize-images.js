#!/usr/bin/env node
/**
 * scripts/resize-images.js
 * ---------------------------------------------------------------------------
 * Normalizes every downloaded photo to exactly 1280x720 with ffmpeg, so the
 * video never has to scale, letterbox or letter-crop at render time:
 *
 *   scale=1280:720:force_original_aspect_ratio=increase  (fill the frame)
 *   crop=1280:720                                        (centre crop)
 *   -q:v 2 -pix_fmt yuvj420p                             (small, sharp JPEG)
 *
 *   npm run images:resize              # normalize everything in public/images
 *   npm run images:resize -- --only 4  # a single question
 *   npm run images:resize -- --force   # re-encode even if already 1280x720
 *   npm run images:resize -- --dir public/images
 *
 * Requires ffmpeg on PATH (override with FFMPEG_BIN or --ffmpeg).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const settings = require(path.join(ROOT, 'settings.json'));

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, fallback) => {
  const i = argv.indexOf(f);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

/**
 * ffmpeg resolution: --ffmpeg flag -> $FFMPEG_BIN -> ffmpeg on PATH ->
 * the static binary Remotion already ships in node_modules (no system install
 * needed). ffprobe is looked up next to whichever ffmpeg we picked.
 */
const resolveFfmpeg = () => {
  const explicit = valueOf('--ffmpeg', process.env.FFMPEG_BIN || '');
  if (explicit) return explicit;
  if (spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0) return 'ffmpeg';
  try {
    const compositor = require('@remotion/compositor-linux-x64-gnu');
    const candidat = path.join(path.dirname(require.resolve('@remotion/compositor-linux-x64-gnu/package.json')), 'ffmpeg');
    if (fs.existsSync(candidat)) return candidat;
    if (compositor && typeof compositor.getFfmpegPath === 'function') return compositor.getFfmpegPath();
  } catch {
    /* compositor not installed for this platform: fall through */
  }
  return 'ffmpeg';
};

const FFMPEG = resolveFfmpeg();
const DIR = path.resolve(ROOT, valueOf('--dir', settings.images.publicDir));
const W = Number(settings.images.width) || 1280;
const H = Number(settings.images.height) || 720;
const ONLY = valueOf('--only', '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const FORCE = has('--force');

const MANIFEST = path.join(ROOT, 'src/image-manifest.json');

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const ffmpegAvailable = () => {
  const res = spawnSync(FFMPEG, ['-version'], { encoding: 'utf8' });
  if (res.error || res.status !== 0) {
    console.error(
      `\n✖ ffmpeg not found ("${FFMPEG}").\n` +
        '  Install it (macOS: brew install ffmpeg · Windows: winget install ffmpeg · ' +
        'Debian/Ubuntu: sudo apt install ffmpeg) or rerun the Remotion CLI which bundles one:\n' +
        '    npx remotion ffmpeg -version\n',
    );
    return false;
  }
  return true;
};

const probe = (file) => {
  // ffprobe ships next to ffmpeg (both the system and the Remotion build)
  const probeBin = process.env.FFPROBE_BIN || FFMPEG.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
  const res = spawnSync(
    probeBin,
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  const m = (res.stdout || '').trim().match(/^(\d+),(\d+)/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
};

const resize = (file) => {
  const tmp = `${file}.tmp.jpg`;
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}`;
  const res = spawnSync(
    FFMPEG,
    ['-y', '-v', 'error', '-i', file, '-vf', vf, '-q:v', '2', '-pix_fmt', 'yuvj420p', '-frames:v', '1', tmp],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) {
    fs.rmSync(tmp, { force: true });
    throw new Error((res.stderr || 'ffmpeg failed').trim().split('\n').slice(-2).join(' '));
  }
  fs.renameSync(tmp, file);
  return probe(file);
};

const main = () => {
  if (!fs.existsSync(DIR)) {
    console.error(`\n✖ ${path.relative(ROOT, DIR)} does not exist. Run \`npm run images\` first.\n`);
    process.exitCode = 1;
    return;
  }
  if (!ffmpegAvailable()) {
    process.exitCode = 1;
    return;
  }

  const files = fs
    .readdirSync(DIR)
    .filter((f) => /^q\d+\.(jpe?g|png|webp)$/i.test(f))
    .filter((f) => (ONLY.length ? ONLY.includes(Number(f.match(/\d+/)[0])) : true))
    .sort();

  if (!files.length) {
    console.log(`\n  nothing to resize in ${path.relative(ROOT, DIR)}\n`);
    return;
  }

  console.log(`\n  normalizing ${files.length} image(s) to ${W}x${H} with ffmpeg\n`);
  const manifest = readJson(MANIFEST, {});
  let done = 0;

  for (const f of files) {
    const id = Number(f.match(/\d+/)[0]);
    const full = path.join(DIR, f);
    const before = probe(full);

    if (!FORCE && before && before.width === W && before.height === H) {
      console.log(`  ↷ ${f} already ${W}x${H}`);
      manifest[String(id)] = f;
      done += 1;
      continue;
    }

    try {
      const after = resize(full);
      manifest[String(id)] = f;
      console.log(
        `  ✔ ${f}  ${before ? `${before.width}x${before.height}` : '?'} -> ${after ? `${after.width}x${after.height}` : `${W}x${H}`}`,
      );
      done += 1;
    } catch (err) {
      console.error(`  ✖ ${f}  ${err.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n  ✔ ${done}/${files.length} normalized · manifest updated (src/image-manifest.json)\n`);
};

main();
