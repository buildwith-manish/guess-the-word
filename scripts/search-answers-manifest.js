#!/usr/bin/env node
// Writes src/search/answer-images.json from the pictures in public/search/answers.
// Put one picture per round there, named answer-NN.png (NN = round id, two digits; .jpg .jpeg .webp also work),
// then run: npm run search:answers
// A round without a picture simply gets the text-only answer card. Prints which rounds have none.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'public', 'search', 'answers');
const out = path.join(ROOT, 'src', 'search', 'answer-images.json');
const data = fs.readFileSync(path.join(ROOT, 'src', 'search', 'search-data.ts'), 'utf8');
const ids = [...data.matchAll(/^\s{4}id: (\d+),/gm)].map((m) => Number(m[1]));
const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
const manifest = {};
const bad = [];
files.forEach((f) => {
  const m = /^answer-(\d{2})\.(png|jpe?g|webp)$/i.exec(f);
  if (!m) { if (f !== '.gitkeep') bad.push(f); return; }
  const id = Number(m[1]);
  if (!ids.includes(id)) { bad.push(`${f} (no round ${id})`); return; }
  manifest[String(id)] = f;
});
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
const missing = ids.filter((id) => !manifest[String(id)]);
console.log(`answer pictures: ${Object.keys(manifest).length}/${ids.length}`);
console.log('rounds without a picture: ' + (missing.length ? missing.join(', ') : 'none'));
if (bad.length) console.log('ignored files: ' + bad.join(', '));
