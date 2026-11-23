/** Prints the numbers behind bonus 2 (Focus) and 6 (Clean Up) at the frames to check. Run: npx tsx scripts/check_xmas_bonus_4b.ts */
import { bonuses } from '../src/xmas/data';
import { bonusBeats } from '../src/xmas/scenes/BonusScene';
import { focusBlur } from '../src/xmas/bonus/Focus';
import { CLEANUP, cellAlpha, erasedCells, timelineOf } from '../src/xmas/bonus/CleanUp';
import { clueIdOf } from '../src/xmas/bonus/clueRef';
import { FPS } from '../src/xmas/shared/clock';

const f = bonuses[1];
const c = bonuses[5];
if (f.key !== 'focus' || c.key !== 'cleanUp') throw new Error('bonus order changed');
const bf = bonusBeats(f);
const dur = f.sharpenSec * FPS;
console.log(`Focus (slot ${f.slot}): ids ${f.tiles.map(clueIdOf).join(', ')}; play ${bf.playFrom}..${bf.playTo}; sharpen ${dur} ticks`);
for (const [n, t] of [['start', bf.playFrom], ['middle', bf.playFrom + dur / 2], ['end (lock)', bf.playFrom + dur], ['after', bf.playTo]] as const)
  console.log(`  ${n}: tick ${t} (f${t * 2}) blur ${focusBlur(t, bf.playFrom, dur).toFixed(1)} units`);

const bc = bonusBeats(c);
const tl = timelineOf(bc.playFrom, bc.playTo - bc.playFrom);
const cells = erasedCells(0);
console.log(`Clean Up (slot ${c.slot}): ids ${c.tiles.map(clueIdOf).join(', ')}; ${cells.length}/${CLEANUP.grid ** 2} cells erased per tile; erase ${tl.eraseFrom}..${tl.eraseTo}, restore from ${tl.restoreFrom}`);
const erasedShare = (t: number) => {
  let s = 0;
  cells.forEach((cell) => {
    const at = tl.eraseFrom + (cell.rank / (cells.length - 1)) * (tl.eraseTo - tl.eraseFrom);
    const rs = tl.restoreFrom + (cell.rank / (cells.length - 1)) * CLEANUP.restoreSweep;
    s += 1 - cellAlpha(t, at, rs);
  });
  return s / CLEANUP.grid ** 2;
};
for (const [n, t] of [['before', bc.playFrom], ['half erased', tl.eraseTo + CLEANUP.cellTicks], ['restored', tl.restoreFrom + CLEANUP.restoreSweep + CLEANUP.cellTicks + 1]] as const)
  console.log(`  ${n}: tick ${t} (f${t * 2}) erased ${(erasedShare(t) * 100).toFixed(0)}% of the box, ${t >= bc.total ? 'AFTER the slot ends' : 'inside the slot'}`);
console.log(`slot length ${bc.total} ticks`);
