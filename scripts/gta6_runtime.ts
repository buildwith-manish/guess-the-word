/** Prints per-part and total runtime of the GTA 6 video and compares it with the 11:30-12:30 target.
 *  Run: npx tsx scripts/gta6_runtime.ts */
import { FPS, RENDER_FPS, RENDER_TOTAL_FRAMES, TOTAL_SEC, chapters, partRanges, readSec, revealFullSec, segments, targetSec, ticksToSec, timecode } from '../src/gta6/timing';

const sec = (t: number) => ticksToSec(t);
console.log(`design ${FPS} fps / render ${RENDER_FPS} fps | readSec ${readSec} | revealFullSec ${revealFullSec}\n`);
console.table(
  partRanges.map((p) => ({
    part: p.name,
    start: timecode(sec(p.from)),
    end: timecode(sec(p.to)),
    'ticks (30 fps)': p.frames,
    'render frames': p.renderTo - p.renderFrom,
    'render from': p.renderFrom,
    'render to': p.renderTo,
    seconds: +sec(p.frames).toFixed(1),
  })),
);
console.log(`segments: ${segments.length} | total ${TOTAL_SEC.toFixed(1)} s (${timecode(TOTAL_SEC)}) | ${RENDER_TOTAL_FRAMES} render frames`);
console.log('chapters:\n  ' + chapters.join('\n  '));
const verdict = TOTAL_SEC < targetSec.min ? 'BELOW' : TOTAL_SEC > targetSec.max ? 'ABOVE' : 'INSIDE';
console.log(`\ntarget ${timecode(targetSec.min)}-${timecode(targetSec.max)}: ${verdict}`);
process.exit(verdict === 'INSIDE' ? 0 : 1);
