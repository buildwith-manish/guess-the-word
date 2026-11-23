/**
 * Checks TimerToPill timing and titleFit. Run: npx tsx scripts/check_xmas_timer.ts
 * Prints the tick plan (design ticks, 30/s; render frame = tick x 2) for a movie, a star and a bonus slot, then fits the
 * title of slot 13, slot 3 and the longest title. Exit 1 if a title cannot fit on one line at the minimum size.
 */
import { movies, slotAt } from '../src/xmas/data';
import { defaultMorphFrame, timerCues, timerPlan, timerPropsOf } from '../src/xmas/components/TimerToPill';
import { TITLE_FIT, fitTitle } from '../src/xmas/titleFit';
import { TIME_SCALE } from '../src/xmas/timing';

let bad = 0;
const show = (label: string, n: number) => {
  const s = slotAt(n);
  const p = timerPropsOf(s);
  const plan = timerPlan(0, p.segments, p.secondsPerSegment);
  const morph = defaultMorphFrame(0, p.segments, p.secondsPerSegment);
  const r = (t: number) => `${t} (f${t * TIME_SCALE})`;
  console.log(`${label} slot ${n} (${s.kind}${s.star ? ', star' : ''}): ${p.segments} segments, ${p.secondsPerSegment.toFixed(3)} s each, variant ${p.variant}`);
  console.log(`  first segment ${r(plan.fills[0])}, last segment ${r(plan.fills[p.segments - 1])}, flash ${r(plan.flash.from)}..${r(plan.flash.to)}, morph ${r(morph)}..${r(morph + 14)}`);
  const cues = timerCues(0, p.segments, p.secondsPerSegment);
  console.log(`  cues: ${cues.map((c) => `${c.sfx}@${c.frame}`).join(' ')}`);
};
show('movie', 1);
show('star', (movies.find((m) => m.star) as { slot: number }).slot);
show('bonus', 5);

const fit = (label: string, title: string) => {
  const f = fitTitle(title);
  if (!f.fits) bad++;
  console.log(`${label}: "${title}" (${[...title].length} chars) -> ${f.fontSize} units, text ${f.textWidth.toFixed(1)} wide, pill ${f.pillWidth}x${f.pillHeight}, fits ${f.fits}`);
};
const t13 = slotAt(13);
const t3 = slotAt(3);
if (t13.kind === 'movie') fit('slot 13', t13.answer);
if (t3.kind === 'movie') fit('slot 3', t3.answer);
const longest = movies.reduce((a, b) => (b.answer.length > a.answer.length ? b : a));
fit(`longest (slot ${longest.slot})`, longest.answer);
fit('30 x W (worst case)', 'W'.repeat(30));
console.log(`all titles fit: ${movies.every((m) => fitTitle(m.answer).fits)}; min size ${TITLE_FIT.minSize}, max ${TITLE_FIT.maxSize}`);
process.exit(bad || !movies.every((m) => fitTitle(m.answer).fits) ? 1 : 0);
