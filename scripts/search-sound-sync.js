#!/usr/bin/env node
/**
 * scripts/search-sound-sync.js  (npm run search:sounds)
 * ---------------------------------------------------------------------------
 * Looks for the three iOS clips of the search video in public/sounds/, reads each WAV header and
 * writes src/search/search-sound-files.json:
 *
 *   { "ios-tick": { "present": true, "seconds": 0.09 }, ... }
 *
 * src/search/search-sound.ts plays a clip only when `present` is true; otherwise it plays the older
 * clip named in its FALLBACK table, so a missing or broken file never fails a render. `seconds` sizes
 * the clip's <Sequence>, so a longer recording of your own is not cut off.
 *
 * Run it after you add, replace or delete one of the files. `npm run sounds` makes the default clips
 * (scripts/generate-audio.js); a file of your own with the same name replaces them, but running
 * `npm run sounds` again writes the defaults back over it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8'));
const DIR = path.resolve(ROOT, settings.sound && settings.sound.dir ? settings.sound.dir : 'public/sounds');
const OUT = path.join(ROOT, 'src', 'search', 'search-sound-files.json');
const NAMES = ['ios-tick', 'ios-pop', 'ios-chime'];

/** Length in seconds of a PCM or float WAV, or null when the file is not a readable WAV. */
const wavSeconds = (file) => {
  const b = fs.readFileSync(file);
  if (b.length < 44 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return null;
  let byteRate = 0;
  let dataBytes = 0;
  for (let at = 12; at + 8 <= b.length; ) {
    const id = b.toString('ascii', at, at + 4);
    const size = b.readUInt32LE(at + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(at + 16);
    if (id === 'data') {
      dataBytes = Math.min(size, b.length - at - 8);
      break;
    }
    at += 8 + size + (size % 2);
  }
  return byteRate > 0 && dataBytes > 0 ? dataBytes / byteRate : null;
};

const files = {};
for (const name of NAMES) {
  const file = path.join(DIR, `${name}.wav`);
  const seconds = fs.existsSync(file) ? wavSeconds(file) : null;
  files[name] = { present: seconds !== null, seconds: seconds === null ? 0 : Number(seconds.toFixed(3)) };
  const note = seconds !== null ? `${files[name].seconds}s` : fs.existsSync(file) ? 'not a readable WAV -> fallback' : 'missing -> fallback';
  console.log(`  ${name.padEnd(10)} ${note}`);
}
fs.writeFileSync(OUT, JSON.stringify(files, null, 2) + '\n');
console.log(`✔ ${path.relative(ROOT, OUT)}`);
