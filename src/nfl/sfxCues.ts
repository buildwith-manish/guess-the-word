/**
 * Sound cues per part (NFL). Every `frame` is a design tick (30 fps) local to the part, like the plans in parts/*.tsx;
 * the audio layer shifts them by the part's start. One `switch` per placed segment returns the scene's own cue list
 * moved to the segment's offset; no cue is defined here that a scene already exports.
 *
 * Card cues are assembled here because CardScene has no cue export: card-in at "Card n." (not on card 1, the hook's
 * flip already played it), clue-flip-N at each clue, points-drop-P at every clue after the first (P = the points left
 * from card.points), the Two-Minute Warning ticks, then the reveal engine's cues.
 */
import type { Card } from './data';
import { cards } from './data';
import { tmwCues } from './components/TwoMinuteWarning';
import { revealCues } from './components/RevealEngine';
import { part1BannerAt, part1Plan, type Placed } from './parts/Part1';
import { part3Plan } from './parts/Part3';
import { finalCardCues } from './scenes/FinalCard';
import { levelCardCues } from './scenes/LevelCard';
import { walletCollectionCues } from './scenes/WalletCollection';
import { hookCues } from './scenes/Hook';
import { levelBannerCues } from './scenes/LevelBanner';
import { scoreCardCues } from './scenes/ScoreCard';
import { cue, clueFlipId, pointsDropId, type ClueNumber, type PointsLeft, type SfxCue } from './sfx';
import { segments } from './timing';

const cardSegment = (card: Card) => {
  const seg = segments.find((s) => s.kind === 'card' && s.card.n === card.n);
  if (!seg || seg.kind !== 'card') throw new Error(`sfxCues: no segment for card ${card.n}`);
  return seg;
};

/** Cues of one card whose segment starts at tick `at` of the caller's clock. */
export const cardCues = (card: Card, at: number): SfxCue[] => {
  const seg = cardSegment(card);
  const local = (t: number) => at + (t - seg.from);
  const out: SfxCue[] = [];
  if (card.n !== cards[0].n) out.push(cue('card-in', local(seg.phases.intro.from)));
  seg.phases.clues.forEach((r, i) => {
    out.push(cue(clueFlipId((i + 1) as ClueNumber), local(r.from)));
    if (i > 0) out.push(cue(pointsDropId(card.points[i] as PointsLeft), local(r.from)));
  });
  out.push(...tmwCues(card, at));
  out.push(...revealCues(card, local(seg.phases.beat.from)));
  return out;
};

const byFrame = (a: SfxCue, b: SfxCue) => a.frame - b.frame;

const cuesOf = (plan: Placed[]): SfxCue[] =>
  plan
    .flatMap(({ seg, at }): SfxCue[] => {
      switch (seg.kind) {
        case 'hook':
          return hookCues(at);
        case 'card':
          // card 30 opens with the lock-screen replay: its notification sound comes first
          return seg.card.final ? [...finalCardCues(at), ...cardCues(seg.card, at)] : cardCues(seg.card, at);
        case 'levelCard':
          if (seg.level === 'rookie') throw new Error('sfxCues: Rookie has no level card');
          return levelCardCues(seg.level, at);
        case 'collection':
          return walletCollectionCues(at);
        case 'scoreCard':
          return scoreCardCues(at);
        default:
          throw new Error(`sfxCues: no cues for segment "${seg.kind}" yet`);
      }
    })
    .sort(byFrame);

/** Part 1: hook, Rookie banner over card 1, cards 1 to 10, Rookie score card. Ticks local to the part. */
export const part1Cues: SfxCue[] = [...cuesOf(part1Plan), ...levelBannerCues(part1BannerAt)].sort(byFrame);

/** Part 3: Hall of Fame level card, cards 21 to 29, card 30 (lock replay + card), Wallet collection. Ticks local to the part. */
export const part3Cues: SfxCue[] = cuesOf(part3Plan);
