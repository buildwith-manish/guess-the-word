/** Prints per-part and total runtime of the Christmas emoji quiz and compares it with the 12:00 target.
 *  Run: npx tsx scripts/xmas_runtime.ts
 *  Fallback (no voice clips) bonus slot = bonusIntroSec + bonusPlaySec + bonusRevealSec = 12.5 s.
 *  The planning total assumes assumedBonusSlotSec (16 s) per bonus once real voice intros exist; slots with both
 *  clips measured keep their real length. */
import {
  FPS, RENDER_FPS, RENDER_TOTAL_FRAMES, TOTAL_SEC, assumedBonusSlotSec, chapterStartsSec, chapters, clipSec, partRanges, segments, targetSec, ticksToSec, timecode, useClipTimings,
} from '../src/xmas/timing';
import type { PartRange } from '../src/xmas/timing';

const measured = (n: number) => clipSec(n, 'intro') !== undefined && clipSec(n, 'reveal') !== undefined;
/** Extra seconds the planning assumption adds to a part (bonus slots without measured clips are raised to 16 s). */
const planningExtra = (segs: PartRange['segments']): number =>
  segs.reduce((acc, s) => {
    if (s.kind !== 'slot' || s.slot.kind !== 'bonus' || measured(s.slot.slot)) return acc;
    return acc + Math.max(0, assumedBonusSlotSec - (s.endSec - s.startSec));
  }, 0);

const fmt = (sec: number) => `${timecode(sec)} (${sec.toFixed(1)} s)`;
const rows = partRanges.map((p) => {
  const planned = p.endSec - p.startSec + planningExtra(p.segments);
  return { part: p.name, start: timecode(p.startSec), end: timecode(p.endSec), frames: p.renderFrames, seconds: +(p.endSec - p.startSec).toFixed(1), 'planning s': +planned.toFixed(1) };
});
console.log(`design ${FPS} fps / render ${RENDER_FPS} fps | clips measured for every slot: ${useClipTimings}\n`);
console.table(rows);

const plannedTotal = TOTAL_SEC + planningExtra(segments);
const lo = targetSec.target - targetSec.tolerance;
const hi = targetSec.target + targetSec.tolerance;
const verdictOf = (sec: number) => (sec < lo ? 'BELOW' : sec > hi ? 'ABOVE' : 'INSIDE');
console.log(`segments: ${segments.length} | fallback total ${fmt(TOTAL_SEC)} | ${RENDER_TOTAL_FRAMES} render frames`);
console.log(`planning total (bonus slots at ${assumedBonusSlotSec} s): ${fmt(plannedTotal)}`);
console.log(`NOTE: the fallback bonus length is 12.5 s; this script's planning total assumes ${assumedBonusSlotSec} s per bonus once real voice intros exist.`);
console.log(`target ${fmt(targetSec.target)} +-${targetSec.tolerance} s (${timecode(lo)}-${timecode(hi)}): fallback ${verdictOf(TOTAL_SEC)} (${(TOTAL_SEC - targetSec.target).toFixed(1)} s), planning ${verdictOf(plannedTotal)} (${(plannedTotal - targetSec.target).toFixed(1)} s)`);

console.log('\nchapters:\n  ' + chapters.join('\n  '));
const lens = chapterStartsSec.map((s, i) => (i + 1 < chapterStartsSec.length ? chapterStartsSec[i + 1] : ticksToSec(segments[segments.length - 1].to)) - s);
const short = lens.filter((l) => l < 10).length;
const chapterOk = chapterStartsSec[0] === 0 && chapters.length >= 3 && short === 0;
console.log(`chapter check (starts at 0:00, 3+ chapters, each 10 s or more): ${chapterOk ? 'OK' : 'FAIL'}`);
process.exit(verdictOf(plannedTotal) === 'INSIDE' && chapterOk ? 0 : 1);
