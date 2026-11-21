// npm run search:hints  -> checks every file listed in src/search/hint-images.json. Exit 1 on failure.
// Needs: python3 + pillow (used only to decode PNGs, no network).
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'public/search/hints');
const manifestPath = path.join(root, 'src/search/hint-images.json');
if (!fs.existsSync(manifestPath)) { console.error('missing ' + manifestPath); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const files = Object.entries(manifest).flatMap(([r, a]) => a.map(f => [r, f]));
const py = `
import sys, json, numpy as np
from PIL import Image
out = []
for p in json.loads(sys.argv[1]):
    try:
        im = Image.open(p)
        a = np.array(im.convert('RGBA'))
        h, w = a.shape[:2]
        al = a[..., 3]
        c = [al[0,0], al[0,-1], al[-1,0], al[-1,-1]]
        out.append({'size': [w, h], 'mode': im.mode, 'corners': [int(x) for x in c], 'opaque': float((al > 127).mean())})
    except Exception as e:
        out.append({'error': str(e)})
print(json.dumps(out))`;
const paths = files.map(([, f]) => path.join(dir, f));
const exists = paths.map(p => fs.existsSync(p));
const present = paths.filter((p, i) => exists[i]);
let info = [];
if (present.length) {
  const r = spawnSync('python3', ['-c', py, JSON.stringify(present)], { encoding: 'utf8', maxBuffer: 1e8 });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  info = JSON.parse(r.stdout);
}
let fail = 0, k = 0; const opaqueTxt = [];
const rows = files.map(([r, f], i) => {
  const probs = [];
  if (!exists[i]) probs.push('missing file');
  else {
    const d = info[k++];
    if (d.error) probs.push(d.error);
    else {
      if (d.size[0] !== 512 || d.size[1] !== 512) probs.push(`size ${d.size.join('x')}`);
      if (!['RGBA', 'LA', 'P'].includes(d.mode)) probs.push('no alpha');
      if (d.corners.some(x => x !== 0)) probs.push('corner not transparent');
      if (d.opaque < 0.08 || d.opaque > 0.85) probs.push(`opaque ${(d.opaque * 100).toFixed(0)}%`);
      opaqueTxt[i] = (d.opaque * 100).toFixed(0) + '%';
    }
  }
  if (probs.length) fail++;
  return { round: r, file: f, opaque: opaqueTxt[i] || '-', status: probs.length ? 'FAIL: ' + probs.join(', ') : 'ok' };
});
console.table(rows);
const missing = []; for (let r = 1; r <= 50; r++) if (!manifest[String(r)]) missing.push(r);
console.log(`rounds in manifest: ${Object.keys(manifest).length}/50; failing files: ${fail}`);
console.log('rounds missing: ' + (missing.length ? missing.join(', ') : 'none'));
process.exit(fail ? 1 : 0);
