import { localPhases } from './components';
import { cue } from './sfx';
import type { SfxCue } from './sfx';
import { controlCenterCues } from './scenes/looks/ControlCenterLook';
import { hookCues } from './scenes/Hook';
import { levelCardCues } from './scenes/LevelCard';
import { scoreCardCues } from './scenes/ScoreCard';
import { bannerStart, nextRound, part1Plan } from './parts/Part1';

/**
 * Sound cues per part, absolute design ticks from the start of that part (30 per second).
 * Collected from the cue helpers of each scene, plus the banner "notification" at the start of every item-end banner.
 * There are no per-item answer / timer cues yet (no earlier task defines them): only what the scenes export.
 */
export const part1Cues: SfxCue[] = part1Plan
  .flatMap(({ seg, at }, i): SfxCue[] => {
    switch (seg.kind) {
      case 'hook':
        return hookCues(at);
      case 'levelCard':
        return levelCardCues(seg.level, at);
      case 'item': {
        const own = seg.item.look === 'controlCenter' ? controlCenterCues(localPhases(seg.item)).map((c) => ({ ...c, frame: c.frame + at })) : [];
        const banner = nextRound(seg.item) ? [cue('notification', bannerStart(part1Plan[i]))] : [];
        return [...own, ...banner];
      }
      case 'scoreCard':
        return scoreCardCues(at);
      default:
        return [];
    }
  })
  .sort((a, b) => a.frame - b.frame);
