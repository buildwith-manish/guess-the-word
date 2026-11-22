import { audioOf, hookId, levelIds, outroIds, rankIds, scoreCardIds } from './audioMap';
import { revealClipTick } from './components/RevealEngine';
import { localPhases } from './components/QuestionShell';
import { items } from './data';
import { part1Plan } from './parts/Part1';
import { part2Plan } from './parts/Part2';
import { part3Plan } from './parts/Part3';
import { part4Plan } from './parts/Part4';
import type { Placed } from './parts/Part1';
import { part1Cues, part2Cues, part3Cues, part4Cues } from './sfxCues';
import type { SfxCue } from './sfx';
import { RENDER_FPS, clipSec, dykLeadSec, outroSlotSec, partRanges, rankSlotSec, secToTicks, ticksToFrames } from './timing';

/**
 * One timeline for the whole GTA6-Full mix, in absolute design ticks (30 per second) of the Full composition.
 * Part content is placed exactly as GTA6-Full places it: part-local tick + `partRanges[i].from`, using each part's own plan
 * (so Part1's skipped Q1 and Part3's replay are respected, not timing.ts' absolute segment positions).
 * Used by src/gta6/Audio.tsx and scripts/build_gta6_duck.ts (which bakes the music ducking envelope from `voiceEvents`).
 */

/** Mix levels, shared by Audio.tsx and the ducking script. */
export const MIX = {
  voice: 1,
  /** SFX sit this many dB under the voice (task: 6 to 8). */
  sfxUnderVoiceDb: 7,
  /** Music bed (public/sounds/music-base.wav is about -31 LUFS, already ~15 dB under the voice) and its depth while a voice clip plays. */
  musicBase: 1,
  musicDuck: 0.5,
  duckAttackSec: 0.12,
  duckReleaseSec: 0.45,
  musicFadeInSec: 1,
  musicFadeOutSec: 2,
  /** An SFX that would start within this many ticks of a voice clip start is moved after it. */
  collideTicks: 3,
  nudgeSec: 0.2,
} as const;
export const sfxGain = Math.pow(10, -MIX.sfxUnderVoiceDb / 20);

export type VoiceEvent = {
  id: string;
  /** Start, absolute design tick. */
  tick: number;
  sec: number;
  /** End of the container the clip plays in (a clip is cut there, like in the visual part). */
  endTick: number;
  what: string;
};

const events: VoiceEvent[] = [];
const OFF = partRanges.map((p) => p.from);

const add = (part: number, local: number, id: string, endLocal: number, what: string) => {
  const sec = clipSec(id);
  if (sec === undefined) return; // no measured clip: silent, as in QuestionShell
  const tick = OFF[part] + local;
  const endTick = Math.min(OFF[part] + endLocal, partRanges[part].to); // GTA6-Full cuts a part at its range end
  if (tick >= endTick) return;
  events.push({ id, tick, sec, endTick, what });
};

const addItem = (part: number, at: number, end: number, item: (typeof items)[number], label: string) => {
  const au = audioOf(item);
  const p = localPhases(item);
  add(part, at + p.read.from, au.questionId, end, `${label} question`);
  add(part, at + revealClipTick(p.hold.from), au.revealId, end, `${label} reveal`);
  if (p.dyk && au.dykId) add(part, at + p.dyk.from + secToTicks(dykLeadSec), au.dykId, end, `${label} dyk`);
};

const plans: Placed[][] = [part1Plan, part2Plan, part3Plan, part4Plan];
plans.forEach((plan, part) => {
  for (const { seg, at, ticks } of plan) {
    const end = at + ticks;
    switch (seg.kind) {
      case 'hook':
        add(part, at, hookId, end, 'hook');
        // Q1 is only a teaser under the hook line: it gets no voice there (the hook line would play over its question clip).
        // Q1 is voiced in its own segment after the level card.
        break;
      case 'levelCard':
        if (levelIds[seg.level]) add(part, at, levelIds[seg.level]!, end, `${seg.level} level card`);
        break;
      case 'item':
        addItem(part, at, end, seg.item, `item ${seg.item.n}`);
        break;
      case 'scoreCard':
        if (scoreCardIds[seg.level]) add(part, at, scoreCardIds[seg.level]!, end, `${seg.level} score card`);
        break;
      case 'scoreboard': {
        let t = at;
        rankIds.forEach((id, i) => {
          add(part, t, id, end, `rank line ${i + 1}`);
          t += secToTicks(rankSlotSec[i] ?? 0);
        });
        break;
      }
      case 'outro': {
        let t = at;
        outroIds.forEach((id, i) => {
          add(part, t, id, end, `outro line ${i + 1}`);
          t += secToTicks(outroSlotSec[i] ?? 0);
        });
        break;
      }
    }
  }
});

export const voiceEvents: VoiceEvent[] = events.sort((a, b) => a.tick - b.tick);

/** Voice clips that start before the previous one has ended. */
export const voiceOverlaps = voiceEvents.flatMap((e, i) => {
  const prev = voiceEvents.slice(0, i).filter((o) => o.tick + secToTicks(o.sec) > e.tick && o.endTick > e.tick);
  return prev.map((o) => ({ a: o, b: e, overlapSec: (o.tick + secToTicks(o.sec) - e.tick) / 30 }));
});

export type PlacedSfx = { cue: SfxCue; /** absolute tick actually used */ tick: number; nudgedFrom?: number; collidedWith?: VoiceEvent };

const cueLists: SfxCue[][] = [part1Cues, part2Cues, part3Cues, part4Cues];
export const sfxEvents: PlacedSfx[] = cueLists
  .flatMap((list, part) => list.map((cue) => ({ cue, tick: OFF[part] + cue.frame })))
  .map((s): PlacedSfx => {
    const hit = voiceEvents.find((v) => Math.abs(v.tick - s.tick) <= MIX.collideTicks);
    // never both on the same frame: the voice keeps its frame, the sound moves just after it
    return hit ? { ...s, tick: hit.tick + secToTicks(MIX.nudgeSec), nudgedFrom: s.tick, collidedWith: hit } : s;
  })
  .sort((a, b) => a.tick - b.tick);

export const totalFrames = ticksToFrames(partRanges[partRanges.length - 1].to);

/** Stable fingerprint of the voice timeline; the baked envelope records it so a stale one is caught. */
export const voiceSignature = (): string => {
  let h = 5381;
  for (const e of voiceEvents) for (const ch of `${e.id}@${e.tick}:${e.sec.toFixed(3)};`) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return `${voiceEvents.length}:${(h >>> 0).toString(16)}`;
};

export const clipFrames = (sec: number): number => Math.ceil(sec * RENDER_FPS) + 2;
