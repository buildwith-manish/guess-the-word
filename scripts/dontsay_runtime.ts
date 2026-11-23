/** Prints per-part and total runtime of the Don't Say video and compares it with the ~10:44 target.
 *  Also cross-checks timing.ts against the per-round fields in data.ts.
 *  Run: npx tsx scripts/dontsay_runtime.ts */
import { bonuses, heartCheckIn, rounds } from '../src/dontsay/data';
import { FPS, RENDER_FPS, RENDER_TOTAL_FRAMES, TOTAL_SEC, bonusSec, chapters, heartCheckInSec, partLabels, partRanges, segments, targetSec, targetToleranceSec, ticksToSec, timecode, timerSecFor, introBaseSec } from '../src/dontsay/timing';

console.log(`design ${FPS} fps / render ${RENDER_FPS} fps\n`);
console.table(
  partRanges.map((p) => ({
    part: `${p.name} ${partLabels[p.part]}`,
    start: timecode(ticksToSec(p.from)),
    end: timecode(ticksToSec(p.to)),
    'render frames': p.frames,
    'render from': p.renderFrom,
    'render to': p.renderTo,
    seconds: +ticksToSec(p.ticks).toFixed(1),
  })),
);
const byKind: Record<string, number> = {};
segments.forEach((s) => (byKind[s.kind] = (byKind[s.kind] ?? 0) + ticksToSec(s.to - s.from)));
console.log('seconds by segment kind:', Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, +v.toFixed(1)])));
console.log(`segments: ${segments.length} | total ${TOTAL_SEC.toFixed(1)} s (${timecode(TOTAL_SEC)}) | ${RENDER_TOTAL_FRAMES} render frames`);
console.log('chapters:\n  ' + chapters.join('\n  '));

// consistency with data.ts (warnings only)
const warn: string[] = [];
rounds.forEach((r) => {
  if (r.introSec !== undefined && Math.abs(r.introSec - introBaseSec(r)) > 1e-9) warn.push(`round ${r.n}: data introSec ${r.introSec} != timing ${introBaseSec(r)}`);
  if (r.timerSec !== undefined && r.timerSec !== timerSecFor(r.level)) warn.push(`round ${r.n}: data timerSec ${r.timerSec} != timing ${timerSecFor(r.level)}`);
});
bonuses.forEach((b) => b.durationSec !== undefined && b.durationSec !== bonusSec && warn.push(`bonus ${b.n}: data durationSec ${b.durationSec} != bonusSec ${bonusSec}`));
if (heartCheckIn.durationSec !== heartCheckInSec) warn.push(`heartCheckIn: data ${heartCheckIn.durationSec} != heartCheckInSec ${heartCheckInSec}`);
console.log(warn.length ? `\nWARN:\n  ${warn.join('\n  ')}` : '\ndata/timing cross-check: no mismatches');

const diff = TOTAL_SEC - targetSec;
const verdict = Math.abs(diff) <= targetToleranceSec ? 'INSIDE' : diff > 0 ? 'ABOVE' : 'BELOW';
console.log(`\ntarget ~${timecode(targetSec)} (+/-${targetToleranceSec} s, tolerance assumed): ${verdict} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)} s)`);
process.exit(verdict === 'INSIDE' ? 0 : 1);
