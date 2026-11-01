#!/usr/bin/env node
/**
 * scripts/fetch-images.js
 * ---------------------------------------------------------------------------
 * Pulls one 1280x720 photo per question with the `z-ai image-search` CLI and
 * writes them to public/images/qNN.jpg (+ a manifest that the video reads).
 *
 *   npm run images                 # fetch everything that is missing
 *   npm run images -- --only 3,17  # specific questions (1-based ids)
 *   npm run images -- --force      # re-fetch even if a file already exists
 *   npm run images -- --query "cat fish underwater"
 *
 * Behaviour:
 *   • skips any result whose URL comes from a blocked host (shutterstock.com,
 *     its CDN domains, and a few other stock sites) — configurable in
 *     settings.json -> images.blockedHosts
 *   • resumes: question ids already present on disk are skipped unless --force
 *   • every download is validated (non-empty, image/* content type or magic
 *     bytes) before it replaces anything
 *   • progress is checkpointed to scripts/.image-progress.json after each file
 *     (git-ignored) so a crashed run resumes instead of starting over
 *
 * The CLI is invoked as:  z-ai image-search "<query>" --count 5 --json
 * (override the binary with Z_AI_BIN or --bin, and the flags with --cli-args).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const settings = require(path.join(ROOT, 'settings.json'));
const rounds = require(path.join(ROOT, 'src/rounds.json'));

const IMAGES_DIR = path.join(ROOT, settings.images.publicDir);
const MANIFEST = path.join(ROOT, 'src/image-manifest.json');
const PROGRESS = path.join(__dirname, '.image-progress.json');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f, fallback) => {
  const i = argv.indexOf(f);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const BIN = valueOf('--bin', process.env.Z_AI_BIN || 'z-ai');
const ONLY = valueOf('--only', '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const FORCE = has('--force');
const COUNT = Number(valueOf('--count', 5));
const QUERY_OVERRIDE = valueOf('--query', null);

const BLOCKED = [
  ...(settings.images.blockedHosts || []),
  'shutterstock.com',
  'shutterstock.net',
  'shutterstock.plus',
  'sscdn.co',
  'istockphoto.com',
  'gettyimages.com',
  'dreamstime.com',
  'alamy.com',
  'depositphotos.com',
  '123rf.com',
  'stock.adobe.com',
];

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
};

const isBlocked = (url) => {
  const lower = String(url).toLowerCase();
  return BLOCKED.some((host) => host && lower.includes(host));
};

const fileName = (id) => `q${String(id).padStart(2, '0')}.jpg`;

const queryFor = (row) => {
  if (QUERY_OVERRIDE) return QUERY_OVERRIDE;
  // the two emoji are the puzzle; the word is what the photo should show
  const word = row.word.toLowerCase();
  return `${word} photo`;
};

/** Run the CLI and pull candidate URLs out of whatever shape it returns. */
const searchImages = (query, count) => {
  const extra = (valueOf('--cli-args', '') || '').split(' ').filter(Boolean);
  const args = ['image-search', query, '--count', String(count), '--json', ...extra];
  const res = spawnSync(BIN, args, { encoding: 'utf8', timeout: 120000 });

  if (res.error) {
    if (res.error.code === 'ENOENT') {
      throw new Error(
        `\`${BIN}\` was not found. Install the z-ai CLI (or pass --bin /path/to/z-ai). ` +
          'Everything else in this project works without images: the video falls back to the ' +
          '"IMAGE HERE" placeholder card.',
      );
    }
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`${BIN} exited with ${res.status}: ${(res.stderr || '').trim().slice(0, 400)}`);
  }

  const text = res.stdout.trim();
  if (!text) return [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // non-JSON output: take the first URL per line
    return text
      .split(/\s+/)
      .filter((t) => /^https?:\/\//.test(t))
      .slice(0, count)
      .map((url) => ({ url }));
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed.results || parsed.images || parsed.data || parsed.items || [];
  return list
    .map((item) => (typeof item === 'string' ? { url: item } : item))
    .map((item) => ({
      url: item.url || item.image || item.imageUrl || item.src || item.original || item.link,
      width: item.width,
      height: item.height,
      source: item.source || item.site || item.domain,
    }))
    .filter((item) => item.url && /^https?:\/\//.test(item.url));
};

const looksLikeImage = (buf) =>
  // JPEG / PNG / WebP / GIF magic bytes
  (buf[0] === 0xff && buf[1] === 0xd8) ||
  (buf[0] === 0x89 && buf[1] === 0x50) ||
  (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') ||
  buf.slice(0, 3).toString() === 'GIF';

const download = async (url, target) => {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; guess-the-word/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const type = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8 * 1024) throw new Error(`suspiciously small file (${buf.length}B) from ${url}`);
  if (!looksLikeImage(buf) && !type.startsWith('image/')) {
    throw new Error(`not an image (${type || 'unknown type'}) from ${url}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  return buf.length;
};

const main = async () => {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const progress = readJson(PROGRESS, { version: 1, done: {}, failed: {} });
  const manifest = readJson(MANIFEST, {});

  const wanted = rounds.filter((row) => (ONLY.length ? ONLY.includes(Number(row.id)) : true));
  console.log(`\n  fetching ${wanted.length} image(s) with \`${BIN} image-search\`\n`);

  let ok = 0;
  let skipped = 0;
  const failures = [];

  for (const row of wanted) {
    const id = Number(row.id);
    const target = path.join(IMAGES_DIR, fileName(id));

    if (!FORCE && fs.existsSync(target) && fs.statSync(target).size > 8 * 1024) {
      manifest[String(id)] = fileName(id);
      skipped += 1;
      continue;
    }

    const query = queryFor(row);
    process.stdout.write(`  q${String(id).padStart(2, '0')} ${row.word.padEnd(11)} ${query}\n`);

    let candidates = [];
    try {
      candidates = searchImages(query, COUNT);
    } catch (err) {
      console.error(`     ✖ search failed: ${err.message}`);
      progress.failed[id] = err.message;
      failures.push(id);
      writeJson(PROGRESS, progress);
      if (/was not found/.test(err.message)) break; // no CLI at all: stop early
      continue;
    }

    const usable = candidates.filter((c) => !isBlocked(c.url) && !isBlocked(c.source || ''));
    if (!usable.length) {
      const note = candidates.length
        ? `all ${candidates.length} result(s) blocked (shutterstock.com and friends)`
        : 'no results';
      console.error(`     ✖ ${note}`);
      progress.failed[id] = note;
      failures.push(id);
      writeJson(PROGRESS, progress);
      continue;
    }

    let saved = 0;
    for (const candidate of usable) {
      try {
        const bytes = await download(candidate.url, target);
        saved = bytes;
        progress.done[id] = { url: candidate.url, file: fileName(id), bytes, at: new Date().toISOString() };
        delete progress.failed[id];
        manifest[String(id)] = fileName(id);
        writeJson(PROGRESS, progress);
        console.log(`     ✔ ${fileName(id)}  ${(bytes / 1024).toFixed(0)} KB  ${new URL(candidate.url).hostname}`);
        break;
      } catch (err) {
        console.error(`     · ${err.message}`);
      }
    }

    if (!saved) {
      console.error('     ✖ no candidate could be downloaded');
      failures.push(id);
      progress.failed[id] = 'download failed';
      writeJson(PROGRESS, progress);
      continue;
    }

    ok += 1;
    writeJson(MANIFEST, manifest);
  }

  writeJson(MANIFEST, manifest);
  writeJson(PROGRESS, progress);

  console.log(`\n  ✔ ${ok} fetched · ${skipped} already present · ${failures.length} failed`);
  if (failures.length) {
    console.log(`  failed ids: ${failures.join(', ')}`);
    console.log('  fix them with:  npm run images -- --only ' + failures.join(',') + ' --force');
  }
  console.log('  next: npm run images:resize\n');
  if (failures.length && ok === 0) process.exitCode = 1;
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
