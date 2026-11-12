#!/usr/bin/env node
/**
 * scripts/fetch-pixel-images.js
 * Pulls one photo per brand with the `z-ai image-search` CLI (same tool as fetch-images.js)
 * and writes public/pixel-brands/NN.jpg. The picture is cropped to a centred square in the
 * video, so pick/keep photos where the brand is in the middle.
 *
 *   npm run pixel:images                  # fetch everything that is missing
 *   npm run pixel:images -- --only 3,17   # specific ids (1-based)
 *   npm run pixel:images -- --force       # re-fetch even if the file exists
 *   npm run pixel:images -- --query "Pop-Tarts box front"   (with --only N)
 *
 * Missing files are fine: the video falls back to a colour-block stand-in.
 * Or skip this script and drop your own NN.jpg files into public/pixel-brands/.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const settings = require(path.join(ROOT, 'settings.json'));
const OUT = path.join(ROOT, 'public', 'pixel-brands');

// brands.ts is TypeScript; pull the table out with a tiny regex instead of a build step
const src = fs.readFileSync(path.join(ROOT, 'src/pixel/brands.ts'), 'utf8');
const brands = [...src.matchAll(/^\s*B\((\d+), '((?:[^'\\]|\\.)*)', \d, '(?:[^'\\]|\\.)*', \[[^\]]*\](?:, '((?:[^'\\]|\\.)*)')?\),/gm)].map((m) => ({
  id: Number(m[1]),
  name: m[2].replace(/\\'/g, "'"),
  query: m[3] ? m[3] : `${m[2]} package`,
}));

const argv = process.argv.slice(2);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const BIN = val('--bin', process.env.Z_AI_BIN || 'z-ai');
const ONLY = val('--only', '').split(',').map((s) => Number(s.trim())).filter(Boolean);
const FORCE = argv.includes('--force');
const QUERY = val('--query', null);
const MIN = Number(val('--min', 720)); // square crop: shorter side must be at least this
const BLOCKED = [...(settings.images.blockedHosts || []), 'istockphoto.com', 'gettyimages.com', 'dreamstime.com', 'alamy.com', 'depositphotos.com', '123rf.com', 'stock.adobe.com'];

const search = (q) => {
  const res = spawnSync(BIN, ['image-search', q, '--count', '10', '--json'], { encoding: 'utf8', timeout: 120000 });
  if (res.error) throw new Error(res.error.code === 'ENOENT' ? `\`${BIN}\` not found (install the z-ai CLI or pass --bin)` : res.error.message);
  if (res.status !== 0) throw new Error((res.stderr || '').trim().slice(0, 300));
  let parsed;
  try { parsed = JSON.parse(res.stdout); } catch { return []; }
  const list = Array.isArray(parsed) ? parsed : parsed.results || parsed.images || parsed.data || parsed.items || [];
  return list
    .map((x) => (typeof x === 'string' ? { url: x } : x))
    .map((x) => ({ url: x.url || x.image || x.imageUrl || x.src || x.original || x.link, width: x.width, height: x.height }))
    .filter((x) => x.url && /^https?:\/\//.test(x.url) && !BLOCKED.some((h) => x.url.toLowerCase().includes(h)));
};

const isImage = (b) => (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || b.slice(0, 4).toString() === 'RIFF';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const wanted = brands.filter((b) => (ONLY.length ? ONLY.includes(b.id) : true));
  console.log(`\n  fetching ${wanted.length} brand photo(s) -> public/pixel-brands/\n`);
  const failed = [];
  for (const b of wanted) {
    const file = path.join(OUT, `${String(b.id).padStart(2, '0')}.jpg`);
    if (!FORCE && fs.existsSync(file) && fs.statSync(file).size > 8 * 1024) continue;
    const q = QUERY || b.query;
    console.log(`  ${String(b.id).padStart(2, '0')} ${b.name.padEnd(32)} ${q}`);
    try {
      const cands = search(q).sort((a, c) => Math.min(c.width || 0, c.height || 0) - Math.min(a.width || 0, a.height || 0));
      let saved = false;
      for (const c of cands) {
        if (c.width && c.height && Math.min(c.width, c.height) < MIN) continue;
        try {
          const r = await fetch(c.url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; guess-the-word/1.0)' } });
          if (!r.ok) continue;
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 8 * 1024 || !isImage(buf)) continue;
          fs.writeFileSync(file, buf);
          saved = true;
          break;
        } catch { /* next candidate */ }
      }
      if (!saved) throw new Error('no usable candidate');
    } catch (e) {
      console.error(`     x ${e.message}`);
      failed.push(b.id);
    }
  }
  console.log(failed.length ? `\n  missing: ${failed.join(', ')} (re-run with --only, or drop NN.jpg in manually)\n` : '\n  done\n');
})();
