#!/usr/bin/env node
/**
 * scripts/refetch-broken.js
 * ---------------------------------------------------------------------------
 * Finds images that would render badly (missing, truncated, wrong format,
 * wrong size) and re-fetches just those, then re-normalizes them. Meant to be
 * run after fetch-images + resize-images, and before a long render.
 *
 *   npm run images:refetch                # check + repair everything
 *   npm run images:refetch -- --dry-run   # report only, change nothing
 *   npm run images:refetch -- --min-kb 40 # stricter minimum file size
 *   npm run images:refetch -- --force     # re-fetch every image, no matter what
 *
 * Exits non-zero when something is still broken (handy in CI).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const settings = require(path.join(ROOT, 'settings.json'));
const rounds = require(path.join(ROOT, 'src/rounds.json'));

const IMAGES_DIR = path.join(ROOT, settings.images.publicDir);
const EXPECT_W = Number(settings.images.width) || 1920;
const EXPECT_H = Number(settings.images.height) || 1080;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, fallback) => {
  const i = argv.indexOf(f);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const DRY = has('--dry-run');
const FORCE = has('--force');
const MIN_KB = Number(valueOf('--min-kb', 12));

const fileName = (id) => `q${String(id).padStart(2, '0')}.jpg`;

const looksLikeImage = (buf) =>
  (buf[0] === 0xff && buf[1] === 0xd8) ||
  (buf[0] === 0x89 && buf[1] === 0x50) ||
  (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') ||
  buf.slice(0, 3).toString() === 'GIF';

const probe = (file) => {
  const bin = process.env.FFPROBE_BIN || 'ffprobe';
  const res = spawnSync(
    bin,
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  const m = (res.stdout || '').trim().match(/^(\d+),(\d+)/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
};

const diagnose = (id) => {
  const file = path.join(IMAGES_DIR, fileName(id));
  if (!fs.existsSync(file)) return 'missing';
  const size = fs.statSync(file).size;
  if (size < MIN_KB * 1024) return `too small (${(size / 1024).toFixed(0)} KB)`;
  const head = Buffer.alloc(16);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, head, 0, 16, 0);
  fs.closeSync(fd);
  if (!looksLikeImage(head)) return 'not a valid image';
  const dims = probe(file);
  if (dims && (dims.width !== EXPECT_W || dims.height !== EXPECT_H)) {
    return `wrong size ${dims.width}x${dims.height} (want ${EXPECT_W}x${EXPECT_H})`;
  }
  return null;
};

const runNode = (script, args) => {
  const res = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  return res.status === 0;
};

const main = () => {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const broken = [];
  for (const row of rounds) {
    const id = Number(row.id);
    const problem = FORCE ? 'forced' : diagnose(id);
    if (problem) broken.push({ id, word: row.word, problem });
  }

  console.log(`\n  checked ${rounds.length} image(s) in ${path.relative(ROOT, IMAGES_DIR)}`);

  if (!broken.length) {
    console.log('  ✔ all images present, valid and ${EXPECT_W}x${EXPECT_H} — nothing to do\n');
    return;
  }

  console.log(`  ${broken.length} need attention:`);
  broken.forEach((b) => console.log(`    q${String(b.id).padStart(2, '0')} ${b.word.padEnd(11)} ${b.problem}`));

  if (DRY) {
    console.log('\n  --dry-run: nothing was changed\n');
    process.exitCode = 1;
    return;
  }

  const ids = broken.map((b) => b.id).join(',');
  console.log('');

  const fetched = runNode('fetch-images.js', ['--only', ids, '--force']);
  if (!fetched) {
    console.log('\n  ✖ fetch-images.js reported failures (is the z-ai CLI installed?)\n');
  }

  // only normalize what actually landed on disk
  const landed = broken.map((b) => b.id).filter((id) => fs.existsSync(path.join(IMAGES_DIR, fileName(id))));
  if (landed.length) runNode('resize-images.js', ['--only', landed.join(','), '--force']);

  const stillBroken = broken.map((b) => b.id).filter((id) => diagnose(id));
  if (stillBroken.length) {
    console.log(`\n  ✖ still broken: ${stillBroken.join(', ')}`);
    console.log('    The video keeps working: missing photos render as the "IMAGE HERE" card.\n');
    process.exitCode = 1;
    return;
  }

  console.log('\n  ✔ every image is valid and ${EXPECT_W}x${EXPECT_H}\n');
};

main();
