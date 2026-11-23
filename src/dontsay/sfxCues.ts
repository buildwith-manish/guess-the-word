/**
 * sfxCues.ts: per-part SFX cue lists for "Don't Say The Same As Me".
 * Ticks are 30 fps design ticks, local to the part (0 = first frame of the part).
 * Part 5 list added by task 4m; parts 1 to 4 by tasks 4i to 4l.
 */
import { partRanges, segments } from './timing';
import { round45Cues } from './scenes/Round45Callback';
import { bonusVoiceOnlyCues } from './scenes/BonusVoiceOnly';
import { outroCues } from './scenes/Outro';
import { levelCardCues } from './scenes/LevelCard';
import { revealCues } from './components/RevealEngine';
import { bonusOppositeDayCues } from './scenes/BonusOppositeDay';
import { bonusTripleLockCues } from './scenes/BonusTripleLock';
import { rankCardCues } from './scenes/RankCard';
import { heartCheckInCues } from './scenes/HeartCheckIn';
import { bonusChainCues } from './scenes/BonusChainReaction';
import { scoreboardCues } from './scenes/Scoreboard';
import type { SfxId } from './sfx';

export type PartCue = { name: string; id: SfxId; tick: number; volume: number };

const part2 = partRanges[1];
const part5 = partRanges[4];

/**
 * Part 5 cues (task 4m), shifted from each scene's local clock to the part-5 clock.
 * Mirrors the cue lists the scenes export: level card swell + sheet slide, the reveal cues of every
 * round (RevealEngine), the callback chimes of the round with `callback`, and the voice-only bonus.
 * Not mirrored: sounds that InkBubble, ResultBeat and BonusWrapper mount inside themselves.
 */
export const part5Cues = (): PartCue[] => {
  const out: PartCue[] = [];
  segments
    .filter((s) => s.part === 5)
    .forEach((s) => {
      const base = s.from - part5.from;
      if (s.kind === 'levelCard') {
        levelCardCues(s.level, true).forEach((c) => out.push({ ...c, name: `level-${s.level}-${c.name}`, tick: c.tick + base }));
      } else if (s.kind === 'round') {
        const r = s.round;
        revealCues(r, s.phases.beat.from - s.from).forEach((c) => out.push({ ...c, name: `r${r.n}-reveal-${c.name}`, tick: c.tick + base }));
        if (r.callback) round45Cues(r).forEach((c) => out.push({ ...c, name: `r${r.n}-${c.name}`, tick: c.tick + base }));
      } else if (s.kind === 'bonus') {
        bonusVoiceOnlyCues().forEach((c) => out.push({ name: `bonus${s.bonus.n}-${c.id}`, id: c.id, tick: c.at + base, volume: c.volume }));
      }
    });
  return out;
};

const part6 = partRanges[5];
const seg = (kind: 'rankCard' | 'scoreboard' | 'outro') => {
  const s = segments.find((x) => x.part === 6 && x.kind === kind);
  if (!s) throw new Error(`part 6 has no ${kind} segment`);
  return s;
};

/**
 * Part 6 cues. Rank card and scoreboard cue lists (task 4g) are reused here, shifted from their
 * own local clock to the part-6 clock. Outro: its own cue list shifted to the outro start.
 */
export const part6Cues = (): PartCue[] => [
  ...rankCardCues().map((c) => ({ ...c, name: `rank-card-${c.name}`, tick: c.tick + seg('rankCard').from - part6.from })),
  ...scoreboardCues().map((c) => ({ ...c, name: `scoreboard-${c.name}`, tick: c.tick + seg('scoreboard').from - part6.from })),
  ...outroCues.map((c) => ({ ...c, name: `outro-${c.name}`, tick: c.tick + seg('outro').from - part6.from })),
];

const part4 = partRanges[3];

/**
 * Part 4 cues (task 4l), ticks local to the part. Level card swell + rules-sheet slide (LevelCard `sheet`),
 * every round's reveal cues (shake, click, dissolve, chime) shifted to the round's start, and Bonus 4.
 */
export const part4Cues = (): PartCue[] => {
  const out: PartCue[] = [];
  for (const s of segments) {
    if (s.part !== 4) continue;
    const base = s.from - part4.from;
    if (s.kind === 'levelCard') {
      out.push(...levelCardCues(s.level, true).map((c) => ({ ...c, name: `level-${s.level}-${c.name}`, tick: c.tick + base })));
    } else if (s.kind === 'round') {
      out.push(...revealCues(s.round, s.phases.beat.from - s.from).map((c) => ({ name: `r${s.round.n}-${c.name}`, id: c.id, tick: c.tick + base, volume: c.volume })));
    } else if (s.kind === 'bonus') {
      out.push(...bonusOppositeDayCues().map((c) => ({ name: `b${s.bonus.n}-${c.id}`, id: c.id, tick: c.at + base, volume: c.volume })));
    }
  }
  return out;
};

/**
 * Part 3 cues (task 4k), ticks local to the part. Reference list for the mix: level card swell + settings slide,
 * each round's reveal cues (shake, lock clicks, dissolve, chime), the check-in tone and the bonus chain cues.
 * Part3.tsx mounts only the level card and check-in cues itself; rounds and the bonus mount their own audio.
 * Not listed (owned inside their components, tick not exported): InkBubble's first lock click, the result
 * chip sound, the BONUS pill sound.
 */
export const part3Cues = (): PartCue[] => {
  const part3 = partRanges[2];
  const out: PartCue[] = [];
  for (const s of segments.filter((x) => x.part === 3)) {
    const base = s.from - part3.from;
    if (s.kind === 'levelCard') {
      out.push(...levelCardCues(s.level, true).map((c) => ({ ...c, name: `level-${s.level}-${c.name}`, tick: c.tick + base })));
    } else if (s.kind === 'round') {
      out.push(...revealCues(s.round, s.phases.beat.from - s.from).map((c) => ({ ...c, name: `round-${s.round.n}-${c.name}`, tick: c.tick + base })));
    } else if (s.kind === 'heartCheckIn') {
      out.push(...heartCheckInCues().map((c) => ({ ...c, name: `check-in-${c.name}`, tick: c.tick + base })));
    } else if (s.kind === 'bonus') {
      out.push(...bonusChainCues().map((c, i) => ({ name: `bonus-${s.bonus.n}-${c.id}-${i}`, id: c.id, tick: c.at + base, volume: c.volume })));
    }
  }
  return out;
};

/**
 * Part 2 cues (task 4j). Level card (with the rules sheet), each round's reveal cues (shake, click,
 * dissolve, chime; the same list RevealEngine mounts itself), and the Triple Lock bonus cues, all
 * shifted onto the part-2 clock. Each scene still mounts its own audio; this list is for the mix.
 */
export const part2Cues = (): PartCue[] => {
  const out: PartCue[] = [];
  segments
    .filter((s) => s.part === 2)
    .forEach((s) => {
      const base = s.from - part2.from;
      if (s.kind === 'levelCard') {
        levelCardCues(s.level, true).forEach((c) => out.push({ ...c, name: `level-${s.level}-${c.name}`, tick: c.tick + base }));
      } else if (s.kind === 'round') {
        revealCues(s.round, s.phases.beat.from - s.from).forEach((c) =>
          out.push({ name: `round-${s.round.n}-${c.name}`, id: c.id, tick: c.tick + base, volume: c.volume }),
        );
      } else if (s.kind === 'bonus') {
        bonusTripleLockCues().forEach((c, i) => out.push({ name: `bonus-${s.bonus.n}-${c.id}-${i}`, id: c.id, tick: c.at + base, volume: 1 }));
      }
    });
  return out;
};
