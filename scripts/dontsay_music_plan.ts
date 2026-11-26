/** Prints the music-bed plan (task MU2): bed spans, crossfade windows, check-in swell, duck windows, absolute and per part.
 *  Run: npx tsx scripts/dontsay_music_plan.ts */
import { RENDER_TOTAL_FRAMES, partRanges } from '../src/dontsay/timing';
import { DUCK_DB, MUSIC_VOLUME, checkInSwells, duckDepth, musicBeds, voiceWindows } from '../src/dontsay/music';

const FPS = 60;
const t = (f: number): string => `${Math.floor(f / FPS / 60)}:${(f / FPS % 60).toFixed(2).padStart(5, '0')}`;
const where = (f: number): string => {
  const p = partRanges.find((r) => f >= r.renderFrom && f < r.renderTo) ?? partRanges[partRanges.length - 1];
  return `P${p.part}+${f - p.renderFrom}`;
};

console.log(`total ${RENDER_TOTAL_FRAMES} frames (${t(RENDER_TOTAL_FRAMES)}); MUSIC_VOLUME ${MUSIC_VOLUME}; duck ${DUCK_DB} dB; ${voiceWindows.length} voice windows\n`);
console.log('bed        file         seq frames (abs)     fade-in (abs | part+local)                fade-out (abs | part+local)               skip');
musicBeds.forEach((b) => {
  const fi = b.fadeIn ? `${b.fadeIn[0]}-${b.fadeIn[1]} | ${where(b.fadeIn[0])}` : '-';
  const fo = b.fadeOut ? `${b.fadeOut[0]}-${b.fadeOut[1]} | ${where(b.fadeOut[0])}` : '-';
  console.log(`${b.key.padEnd(10)} ${b.file.padEnd(12)} ${`${b.seqFrom}-${b.seqTo}`.padEnd(20)} ${fi.padEnd(41)} ${fo.padEnd(41)} ${b.skip}`);
});
console.log('\nbed changes (crossfade centre), per part:');
musicBeds.slice(1).forEach((b) => {
  const c = Math.round((b.fadeIn![0] + b.fadeIn![1]) / 2);
  console.log(`  frame ${String(c).padStart(5)} (${t(c)})  ${where(c).padEnd(8)} -> ${b.key}   window ${b.fadeIn![0]}-${b.fadeIn![1]}`);
});
console.log('\ncheck-in swells:', checkInSwells.map((s) => `${s.file} ${s.from}-${s.to} (${where(s.from)})`).join(', '));

let ducked = 0;
let max = 0;
for (let f = 0; f < RENDER_TOTAL_FRAMES; f++) {
  const d = duckDepth(f);
  if (d > 0.5) ducked++;
  max = Math.max(max, d);
}
console.log(`\nducked (more than half way) ${(ducked / FPS).toFixed(1)} s of ${(RENDER_TOTAL_FRAMES / FPS).toFixed(1)} s; deepest ${max.toFixed(2)}`);
// invariants
let ok = true;
musicBeds.forEach((b, i) => {
  if (i > 0 && b.fadeIn![0] !== musicBeds[i - 1].fadeOut![0]) ok = false;
  if (i > 0 && musicBeds[i - 1].fadeOut![1] > b.seqTo) ok = false;
});
console.log(ok ? 'invariants: ok (windows shared, ordered)' : 'invariants: FAILED');
process.exit(ok ? 0 : 1);
