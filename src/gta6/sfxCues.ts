import { localPhases } from './components';
import { expandStartTick } from './components/RevealEngine';
import { isFullReveal, secToTicks, holdSec } from './timing';
import { cue } from './sfx';
import type { SfxCue } from './sfx';
import { controlCenterCues } from './scenes/looks/ControlCenterLook';
import { hookCues } from './scenes/Hook';
import { levelCardCues } from './scenes/LevelCard';
import { scoreCardCues } from './scenes/ScoreCard';
import { bannerStart, nextRound, part1Plan } from './parts/Part1';
import type { Placed } from './parts/Part1';
import { part2Plan } from './parts/Part2';
import { part4Plan } from './parts/Part4';
import { outroCues } from './scenes/Outro';
import { scoreboardCues } from './scenes/Scoreboard';
import { part3NoBanner, part3Plan, part3ReplayBeats } from './parts/Part3';
import type { Item } from './data';

/**
 * Easy / medium (fast) reveal: a soft breath while the wrong options fade, a glass ding with a low tap on the pop.
 * Local ticks of the item. The breath starts 4 ticks after the fade (the reveal voice clip starts on the same tick, and
 * a cue within 3 ticks of a voice start would be moved 0.2 s later); the ding is on the first tick of the pop.
 * The control-center look flips its tiles instead (own cue), full-reveal items keep their silent elimination.
 */
const fastRevealCues = (item: Item): SfxCue[] => {
  if (item.look === 'controlCenter' || isFullReveal(item)) return [];
  const hold = localPhases(item).hold.from;
  return [cue('reveal-fade', hold + secToTicks(holdSec) + 4), cue('reveal-pop', expandStartTick(hold, 'fast'))];
};

/**
 * Sound cues per part, absolute design ticks from the start of that part (30 per second).
 * Collected from the cue helpers of each scene, plus the banner "notification" at the start of every item-end banner
 * (`noBanner` lists items whose end banner is not drawn, so they get no cue either).
 * There are no per-item answer / timer cues yet (no earlier task defines them): only what the scenes export.
 */
const cuesOf = (plan: Placed[], noBanner: (item: Item) => boolean = () => false): SfxCue[] =>
  plan
  .flatMap(({ seg, at }, i): SfxCue[] => {
    switch (seg.kind) {
      case 'hook':
        return hookCues(at);
      case 'levelCard':
        return levelCardCues(seg.level, at);
      case 'item': {
        const own = seg.item.look === 'controlCenter' ? controlCenterCues(localPhases(seg.item)).map((c) => ({ ...c, frame: c.frame + at })) : [];
        const reveal = fastRevealCues(seg.item).map((c) => ({ ...c, frame: c.frame + at }));
        const banner = nextRound(seg.item) && !noBanner(seg.item) ? [cue('notification', bannerStart(plan[i]))] : [];
        return [...own, ...reveal, ...banner];
      }
      case 'scoreCard':
        return scoreCardCues(at);
      default:
        return [];
    }
  })
  .sort((a, b) => a.frame - b.frame);

export const part1Cues: SfxCue[] = cuesOf(part1Plan);
export const part2Cues: SfxCue[] = cuesOf(part2Plan);

/** Part3: the scene cues, plus the hook's pair for the replayed lock notification (notification on the banner, whoosh as the question starts). */
export const part3Cues: SfxCue[] = [
  ...cuesOf(part3Plan, part3NoBanner),
  cue('notification', part3ReplayBeats.notification),
  cue('whoosh', part3ReplayBeats.whoosh),
].sort((a, b) => a.frame - b.frame);

/** Part4: scoreboard cues, then the outro's (asks, score card, end-screen slots), each at its start tick in the part. */
export const part4Cues: SfxCue[] = part4Plan
  .flatMap(({ seg, at }): SfxCue[] => (seg.kind === 'scoreboard' ? scoreboardCues(at) : seg.kind === 'outro' ? outroCues(at) : []))
  .sort((a, b) => a.frame - b.frame);
