#!/usr/bin/env node
/**
 * scripts/fetch-images.js
 * ---------------------------------------------------------------------------
 * Pulls one 1920x1080 photo per question with the `z-ai image-search` CLI and
 * writes them to public/images/qNN.jpg (+ a manifest that the video reads).
 *
 *   npm run images                 # fetch everything that is missing
 *   npm run images -- --only 3,17  # specific questions (1-based ids)
 *   npm run images -- --force      # re-fetch even if a file already exists
 *   npm run images -- --query "cat fish underwater"
 *
 * Behaviour:
 *   • never accepts a photo that would have to be upscaled: every download is measured
 *     and must be at least settings.images.width x height (1920x1080); smaller ones are
 *     skipped in favour of the next candidate. If NO candidate is big enough, the largest
 *     one is used only when it beats what is already on disk — otherwise the existing file
 *     is kept — and the question is listed as "soft" at the end. Override with
 *     --min-width / --min-height.
 *   • files are written only after a candidate passes, so a failed --force run can never
 *     replace a good photo with a worse one
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
const COUNT = Number(valueOf('--count', 10));
const MIN_W = Number(valueOf('--min-width', settings.images.width || 1920));
const MIN_H = Number(valueOf('--min-height', settings.images.height || 1080));
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

/** Pixel size straight from the file header (JPEG / PNG / WebP / GIF) — no ffprobe needed. */
const imageSize = (buf) => {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf.slice(0, 3).toString() === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') {
      const fmt = buf.slice(12, 16).toString();
      if (fmt === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (fmt === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (fmt === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = buf[i + 1];
        if (marker === 0xff) {
          i += 1;
          continue;
        }
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* fall through */
  }
  return null;
};

const bigEnough = (size) => !size || (size.width >= MIN_W && size.height >= MIN_H);
const declaredBigEnough = (c) => Boolean(c.width && c.height && c.width >= MIN_W && c.height >= MIN_H);
const area = (size) => (size ? size.width * size.height : 0);

/** Download into memory and validate; the caller decides whether it is worth writing. */
const download = async (url) => {
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
  return { buf, size: imageSize(buf) };
};

const main = async () => {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const progress = readJson(PROGRESS, { version: 1, done: {}, failed: {}, soft: {} });
  progress.soft = progress.soft || {};
  const manifest = readJson(MANIFEST, {});

  const wanted = rounds.filter((row) => (ONLY.length ? ONLY.includes(Number(row.id)) : true));
  console.log(
    `\n  fetching ${wanted.length} image(s) with \`${BIN} image-search\` · source must be >= ${MIN_W}x${MIN_H}\n`,
  );

  let ok = 0;
  let skipped = 0;
  const failures = [];
  const soft = [];

  for (const row of wanted) {
    const id = Number(row.id);
    const target = path.join(IMAGES_DIR, fileName(id));
    const exists = fs.existsSync(target) && fs.statSync(target).size > 8 * 1024;
    const existingSize = exists ? imageSize(fs.readFileSync(target)) : null;

    // already present: skip it, unless --force or it is below the target resolution
    if (!FORCE && exists && bigEnough(existingSize)) {
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

    // try candidates the search says are big enough first
    const usable = candidates
      .filter((c) => !isBlocked(c.url) && !isBlocked(c.source || ''))
      .sort((a, b) => Number(declaredBigEnough(b)) - Number(declaredBigEnough(a)));
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

    let chosen = null; // first candidate that is big enough
    let best = null; // largest candidate seen, used only if nothing is big enough
    for (const candidate of usable) {
      try {
        const got = await download(candidate.url);
        if (!bigEnough(got.size)) {
          console.error(`     · ${got.size.width}x${got.size.height} is below ${MIN_W}x${MIN_H}, trying the next result`);
          if (!best || area(got.size) > area(best.size)) best = { ...got, url: candidate.url };
          continue;
        }
        chosen = { ...got, url: candidate.url };
        break;
      } catch (err) {
        console.error(`     · ${err.message}`);
      }
    }

    let isSoft = false;
    if (!chosen && best) {
      isSoft = true;
      if (existingSize && area(existingSize) >= area(best.size)) {
        console.error(
          `     ! no ${MIN_W}x${MIN_H} source found; keeping the existing ${existingSize.width}x${existingSize.height} file`,
        );
        soft.push(id);
        progress.soft[id] = `${existingSize.width}x${existingSize.height}`;
        manifest[String(id)] = fileName(id);
        writeJson(PROGRESS, progress);
        continue;
      }
      chosen = best;
    }

    if (!chosen) {
      console.error('     ✖ no candidate could be downloaded (existing file, if any, left untouched)');
      failures.push(id);
      progress.failed[id] = 'download failed';
      writeJson(PROGRESS, progress);
      continue;
    }

    const tmp = `${target}.part`;
    fs.writeFileSync(tmp, chosen.buf);
    fs.renameSync(tmp, target);
    progress.done[id] = {
      url: chosen.url,
      file: fileName(id),
      bytes: chosen.buf.length,
      size: chosen.size ? `${chosen.size.width}x${chosen.size.height}` : 'unknown',
      at: new Date().toISOString(),
    };
    delete progress.failed[id];
    if (isSoft) {
      soft.push(id);
      progress.soft[id] = progress.done[id].size;
    } else {
      delete progress.soft[id];
    }
    manifest[String(id)] = fileName(id);
    writeJson(PROGRESS, progress);
    writeJson(MANIFEST, manifest);
    const dim = chosen.size ? ` ${chosen.size.width}x${chosen.size.height}` : '';
    console.log(
      `     ✔ ${fileName(id)}${dim}  ${(chosen.buf.length / 1024).toFixed(0)} KB  ${new URL(chosen.url).hostname}${isSoft ? '  (soft: below target)' : ''}`,
    );
    ok += 1;
  }

  writeJson(MANIFEST, manifest);
  writeJson(PROGRESS, progress);

  console.log(`\n  ✔ ${ok} fetched · ${skipped} already ${MIN_W}x${MIN_H}+ · ${failures.length} failed · ${soft.length} soft`);
  if (soft.length) {
    console.log(`  soft ids (no ${MIN_W}x${MIN_H} source found, will be upscaled a little): ${soft.join(', ')}`);
    console.log(`  try other wording, one id at a time:  npm run images -- --only ${soft[0]} --force --query "<better query>"`);
  }
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
