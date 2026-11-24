/**
 * dontsay_voice_check.ts: does every voice clip play exactly once, inside its slot, without overlap (task 5c).
 *   npx tsx scripts/dontsay_voice_check.ts     (exit 1 on any failure, prints the failures; else "ok: N clips, 0 overlaps")
 * Inputs: src/dontsay/timing.ts (segments, voiceCues, clip lengths) and src/dontsay/audioMap.ts (ids) only, plus the files on disk.
 * Checks: 1 every id of audioMap.ts is cued exactly once in the whole video; 2 tick + clip length <= end of its slot;
 *         3 no two clips overlap in time; 4 every clip file exists in public/dontsay/voiceover/clips/.
 */
import { existsSync } from 'node:fs';
import { bonusAudio, checkInId, hookIds, levelIds, outroIds, rankIds, rankIntroId, roundAudio } from '../src/dontsay/audioMap';
import { FPS, clipPath, clipSec, segments, voiceCues, type Segment } from '../src/dontsay/timing';

type Role = 'round intro' | 'round rule' | 'round reveal' | 'round result' | 'level' | 'settings' | 'check-in' | 'bonus intro' | 'bonus reveal' | 'hook' | 'rank' | 'outro';
const roles = new Map<string, Role>();
const expected: string[] = [];
const reg = (id: string | undefined, role: Role): void => { if (id) { roles.set(id, role); expected.push(id); } };
roundAudio.forEach((a) => { reg(a.intro, 'round intro'); reg(a.rule, 'round rule'); reg(a.reveal, 'round reveal'); reg(a.result, 'round result'); });
bonusAudio.forEach((a) => { reg(a.intro, 'bonus intro'); reg(a.reveal, 'bonus reveal'); });
Object.values(levelIds).forEach((l) => { reg(l.level, 'level'); reg(l.settings, 'settings'); });
reg(checkInId, 'check-in');
hookIds.forEach((i) => reg(i, 'hook'));
reg(rankIntroId, 'rank'); rankIds.forEach((i) => reg(i, 'rank'));
outroIds.forEach((i) => reg(i, 'outro'));

/** End tick (absolute) of the slot a clip of this role must finish in. */
const slotEnd = (seg: Segment, role: Role): number => {
  if (seg.kind === 'round') return role === 'round reveal' ? seg.phases.reveal.to : role === 'round result' ? seg.phases.result.to : seg.phases.intro.to;
  if (seg.kind === 'bonus') return role === 'bonus reveal' ? seg.phases.reveal.to : seg.phases.intro.to;
  return seg.to;
};

type Played = { id: string; role: Role; where: string; start: number; end: number; slotEnd: number };
const failures: string[] = [];
const played: Played[] = [];
const count = new Map<string, number>();
const whereOf = (s: Segment): string => (s.kind === 'round' ? `round ${s.round.n}` : s.kind === 'bonus' ? `bonus ${s.bonus.n}` : s.kind === 'levelCard' ? `level ${s.level}` : s.kind);

for (const seg of segments) {
  let cues;
  try { cues = voiceCues(seg); } catch (e) { failures.push(`${whereOf(seg)}: ${(e as Error).message}`); continue; }
  for (const c of cues) {
    count.set(c.id, (count.get(c.id) ?? 0) + 1);
    const role = roles.get(c.id);
    if (!role) { failures.push(`${whereOf(seg)}: cue ${c.id} is not an id of audioMap.ts`); continue; }
    const len = clipSec(c.id);
    if (len === undefined) { failures.push(`${c.id}: no measured length (timings.generated.ts)`); continue; }
    const start = (seg.from + c.tick) / FPS;
    played.push({ id: c.id, role, where: whereOf(seg), start, end: start + len, slotEnd: slotEnd(seg, role) / FPS });
  }
}

// 1 exactly once
for (const id of expected) {
  const n = count.get(id) ?? 0;
  if (n === 0) failures.push(`${id} (${roles.get(id)}) is never played`);
  else if (n > 1) failures.push(`${id} (${roles.get(id)}) is played ${n} times`);
}
if (new Set(expected).size !== expected.length) failures.push('audioMap.ts lists an id twice');

// 2 inside its slot
for (const p of played) if (p.end > p.slotEnd + 1e-6) failures.push(`${p.id} (${p.role}, ${p.where}) ends ${p.end.toFixed(2)} s, its slot ends ${p.slotEnd.toFixed(2)} s: runs ${(p.end - p.slotEnd).toFixed(2)} s past`);

// 3 no overlap
const byTime = [...played].sort((a, b) => a.start - b.start);
let overlaps = 0;
for (let i = 1; i < byTime.length; i++) {
  const a = byTime[i - 1], b = byTime[i];
  if (b.start < a.end - 1e-6) { overlaps++; failures.push(`${a.id} (${a.where}) and ${b.id} (${b.where}) overlap by ${(a.end - b.start).toFixed(2)} s at ${b.start.toFixed(2)} s`); }
}

// 4 files exist
for (const id of expected) if (!existsSync(`public/${clipPath(id)}`)) failures.push(`${id}: file public/${clipPath(id)} does not exist`);

if (failures.length) {
  console.error(`FAIL: ${failures.length} problem(s)`);
  console.error(`${'#'.padStart(3)}  problem`);
  failures.forEach((f, i) => console.error(`${String(i + 1).padStart(3)}  ${f}`));
  process.exit(1);
}
console.log(`ok: ${expected.length} clips, ${overlaps} overlaps`);
