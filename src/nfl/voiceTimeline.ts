import { audioOf, hookId } from './audioMap';
import { cards } from './data';
import { hookVoice } from './scenes/Hook';
import { levelBannerVoice } from './scenes/LevelBanner';
import { levelCardVoice } from './scenes/LevelCard';
import { collectionMarks } from './scenes/WalletCollection';
import { predictionsVoice } from './scenes/Predictions';
import { scoreboardVoice } from './scenes/Scoreboard';
import { scoreCardVoice } from './scenes/ScoreCard';
import { outroVoice } from './scenes/Outro';
import { fullCues } from './sfxCues';
import type { SfxCue } from './sfx';
import { clipTimings, type ClipType } from './timings.generated';
import { RENDER_FPS, rookieGapSec, partRanges, secToTicks, segments, ticksToFrames, levelBannerInSec } from './timing';

/**
 * One timeline for the whole NFL-Full mix, in absolute design ticks (30 per second). Every segment sits at its own
 * `seg.from`, which is where Part1..Part4 place it (part-local tick + partRanges[i].from). Used by Audio.tsx.
 * Voice clips are the cleaned clips in public/nfl/voiceover/clips (ids from audioMap.ts, lengths from timings.generated.ts).
 */
export const MIX = {
  voice: 1,
  /** SFX sit this many dB under the voice. */
  sfxUnderVoiceDb: 7,
  musicBase: 1,
  /** Music depth while a voice clip plays, and how fast it ducks / recovers. */
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

export type VoiceEvent = { id: string; tick: number; sec: number; endTick: number; what: string };

const durById = new Map(clipTimings.map((c) => [c.id, c.durSec] as const));
const idOfSlot = (type: ClipType, key: string): string | undefined => clipTimings.find((c) => c.type === type && c.key === key)?.id;

const events: VoiceEvent[] = [];
const add = (id: string | undefined, tick: number, endTick: number, what: string) => {
  if (!id) return;
  const sec = durById.get(id);
  if (sec === undefined || tick >= endTick) return; // no measured clip: silent
  events.push({ id, tick, sec, endTick, what });
};
const addSlot = (v: { type: ClipType; key: string; tick: number }, endTick: number, what: string) => add(idOfSlot(v.type, v.key), v.tick, endTick, what);

for (const seg of segments) {
  switch (seg.kind) {
    case 'hook':
      add(hookId, hookVoice(seg.from).tick, seg.to, 'hook');
      break;
    case 'levelCard':
      if (seg.level !== 'rookie') addSlot(levelCardVoice(seg.level, seg.from), seg.to, `${seg.level} level card`);
      break;
    case 'card': {
      const au = audioOf(seg.card);
      const ph = seg.phases;
      if (seg.card.n === cards[0].n) {
        // Rookie banner line first, then "Card 1."
        const rookie = levelBannerVoice(seg.from);
        addSlot(rookie, ph.intro.to, 'rookie banner');
        const rookieEnd = rookie.tick + secToTicks(durById.get(idOfSlot('level', 'rookie') ?? '') ?? 0);
        const introAt = Math.max(ph.intro.from, rookieEnd + secToTicks(rookieGapSec));
        add(au.cardintroId, introAt, ph.intro.to, 'card 1 intro');
      } else add(au.cardintroId, ph.intro.from, ph.intro.to, `card ${seg.card.n} intro`);
      au.clueIds.forEach((id, i) => add(id, ph.clues[i].from, ph.clues[i].to, `card ${seg.card.n} clue ${i + 1}`));
      add(au.revealId, ph.reveal.from, ph.reveal.to, `card ${seg.card.n} reveal`);
      if (au.dykId && ph.dyk) add(au.dykId, ph.dyk.from, ph.reveal.to, `card ${seg.card.n} dyk`);
      break;
    }
    case 'scoreCard':
      if (seg.level !== 'hof') addSlot(scoreCardVoice(seg.level, seg.from), seg.to, `${seg.level} score card`);
      break;
    case 'collection':
      // "That was card thirty. Let's see your score." (scorecard:hof) opens the collection
      addSlot({ type: 'scorecard', key: 'hof', tick: seg.from + collectionMarks().stackAt }, seg.to, 'collection line');
      break;
    case 'predictions':
      predictionsVoice(seg.from).forEach((v) => addSlot(v, seg.to, `prediction ${v.key}`));
      break;
    case 'scoreboard':
      scoreboardVoice(seg.from).forEach((v) => addSlot(v, seg.to, `rank ${v.key}`));
      break;
    case 'outro':
      outroVoice(seg.from).forEach((v) => addSlot(v, seg.to, `outro ${v.key}`));
      break;
  }
}

export const voiceEvents: VoiceEvent[] = events.sort((a, b) => a.tick - b.tick);

/** Voice clips that start before the previous one has ended (should be none). */
export const voiceOverlaps = voiceEvents.flatMap((e, i) =>
  voiceEvents
    .slice(0, i)
    .filter((o) => o.tick + secToTicks(o.sec) > e.tick && o.endTick > e.tick)
    .map((o) => ({ a: o.id, b: e.id, overlapSec: (o.tick + secToTicks(o.sec) - e.tick) / 30 })),
);

export type PlacedSfx = { cue: SfxCue; tick: number; nudgedFrom?: number };
export const sfxEvents: PlacedSfx[] = fullCues
  .map((cue): PlacedSfx => {
    const hit = voiceEvents.find((v) => Math.abs(v.tick - cue.frame) <= MIX.collideTicks);
    // never both on the same frame: the voice keeps its frame, the sound moves just after it
    return hit ? { cue, tick: hit.tick + secToTicks(MIX.nudgeSec), nudgedFrom: cue.frame } : { cue, tick: cue.frame };
  })
  .sort((a, b) => a.tick - b.tick);

export const totalFrames = partRanges[partRanges.length - 1].renderTo;
export const clipFrames = (sec: number): number => Math.ceil(sec * RENDER_FPS) + 2;
export { ticksToFrames, levelBannerInSec };
