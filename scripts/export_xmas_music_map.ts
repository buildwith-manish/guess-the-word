/**
 * Writes docs/xmas/music-map.json (read by scripts/make_xmas_music.py): the video length, the three part ranges and the
 * windows of the gold bonus rounds, all in seconds from timing.ts. Re-run it, then make_xmas_music.py, after a timing change.
 *   npx tsx scripts/export_xmas_music_map.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { TOTAL_SEC, partRanges, segments } from '../src/xmas/timing';

const gold = segments
  .filter((s) => s.kind === 'slot' && s.slot.kind === 'bonus')
  .map((s) => ({ start: s.startSec, end: s.endSec }));
const map = {
  totalSec: TOTAL_SEC,
  parts: partRanges.map((p) => ({ start: p.startSec, end: p.endSec })),
  gold,
};
mkdirSync('docs/xmas', { recursive: true });
writeFileSync('docs/xmas/music-map.json', JSON.stringify(map, null, 2) + '\n');
console.log(`music map: ${map.totalSec.toFixed(1)} s, ${map.parts.length} parts, ${gold.length} gold windows`);
