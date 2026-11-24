/**
 * Placement check for the voiceover: where every clip starts in the full video (voiceCues.ts), and whether it fits.
 *   npx tsx scripts/dontsay_voice_fit.ts [--strict]
 * Lists (1) clips that run into the NEXT clip (two voices at once), (2) clips that run past the end of their own scene
 * (they talk over the next scene's picture), (3) the runtime after the clip-driven slots, vs the ~10:44 target.
 * Needs src/dontsay/timings.generated.ts (scripts/build_dontsay_timings.py). --strict exits 1 on any overlap.
 */
import { readFileSync } from 'node:fs';
import { buildVoiceCues } from '../src/dontsay/voiceCues';
import { FPS, TOTAL_SEC, clipSec, segments, targetSec, targetToleranceSec, timecode, ticksToSec } from '../src/dontsay/timing';

const strict = process.argv.includes('--strict');
const text = new Map<string, string>();
for (const line of readFileSync(process.env.CSV ?? 'docs/dontsay/lines.csv', 'utf8').split(/\r?\n/).slice(1)) {
  const m = line.match(/^(ds_\d+),[^,]*,(.*)$/);
  if (m) text.set(m[1], m[2].replace(/^"|"$/g, ''));
}

const cues = buildVoiceCues();
const measured = cues.filter((c) => clipSec(c.id) !== undefined);
console.log(`${measured.length} of ${cues.length} voice clips measured`);
if (!measured.length) { console.log('no clips in timings.generated.ts yet'); process.exit(0); }

type Issue = { id: string; label: string; by: number; text: string; note: string };
const overlaps: Issue[] = [];
const past: Issue[] = [];
// Cleaned clips carry 0.1 s of silence at both ends (clean_dontsay_clips.sh), so only speech that runs past the next
// clip's 0.1 s lead-in is audible as two voices at once.
const PAD = 0.1;
const segOf = (tick: number) => segments.find((s) => tick >= s.from && tick < s.to);

measured.forEach((c, i) => {
  const start = ticksToSec(c.tick);
  const end = start + (clipSec(c.id) as number);
  const next = measured[i + 1];
  const audible = next ? end - PAD - (ticksToSec(next.tick) + PAD) : -1;
  if (next && audible > 0.03) {
    overlaps.push({ id: c.id, label: c.label, by: audible, text: text.get(c.id) ?? '', note: `runs into ${next.id} (${next.label})` });
  }
  const seg = segOf(c.tick);
  if (seg && end - PAD > ticksToSec(seg.to) + 0.1 && !(next && audible > 0.03)) {
    past.push({ id: c.id, label: c.label, by: end - PAD - ticksToSec(seg.to), text: text.get(c.id) ?? '', note: `ends after its ${seg.kind} scene` });
  }
});

const show = (title: string, xs: Issue[]) => {
  console.log(`\n${title}: ${xs.length}`);
  xs.sort((a, b) => b.by - a.by).forEach((x) => console.log(`  ${x.id}  ${x.label.padEnd(18)} +${x.by.toFixed(2)} s  ${x.note}\n        "${x.text}"`));
};
show('OVERLAPS (two voices at once: shorten the line, or lengthen the slot)', overlaps);
show('Runs past its own scene (starts before the clip ends, no overlap with another voice)', past);

const delta = TOTAL_SEC - targetSec;
console.log(`\nruntime ${timecode(TOTAL_SEC)} (${TOTAL_SEC.toFixed(1)} s), target ${timecode(targetSec)} +/-${targetToleranceSec} s: ${Math.abs(delta) <= targetToleranceSec ? 'within' : delta > 0 ? 'ABOVE' : 'BELOW'} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} s)`);
console.log(`fps ${FPS}`);
if (strict && overlaps.length) process.exit(1);
