import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { LOCK_BEATS, LOCK_NOTIFICATION_TICKS, LockNotification, NotificationBanner, ScoreHud, expandStartSec, hudCounts, localPhases } from '../components';
import { byLevel, extraIds, items } from '../data';
import type { Item, Level } from '../data';
import { HOOK_TEXT } from '../scenes/Hook';
import { LevelCard } from '../scenes/LevelCard';
import { QuestionScene, itemFrames } from '../scenes/QuestionScene';
import { ScoreCard } from '../scenes/ScoreCard';
import { levelBackground } from '../system';
import { partRanges, secToTicks, segments, ticksToFrames, useGta6Frame } from '../timing';
import { bannerStart, nextRound, roundLabel } from './Part1';
import type { Placed } from './Part1';

/**
 * GTA6-P3: Hard level card, the Hard items (display numbers 31 to 42), Hard score card. Straight cut at the end: Part 4
 * (scoreboard) starts on the next frame, the score card has no exit.
 *
 * Same pattern as Part1/Part2: segments of `partRanges[2]` laid end to end from tick 0, every length from timing.ts, a
 * blurred NotificationBanner on the last `bannerSec` of each item naming the next round. Reveal mode is chosen by the shell
 * (`isFullReveal`: hard items and fastest items are full elimination, so every item here is).
 *
 * LAST ITEM (extra id `q42Replay`): the hook's lock-screen notification is replayed first, then the item.
 *   - Same component, same props shape, same text (`HOOK_TEXT` + the item's `q` and options), same length
 *     (`LOCK_NOTIFICATION_TICKS`), mounted with `at = 0` in its own Sequence, exactly as Hook does.
 *   - timing.ts has no slot for it, so it is INSERTED before the item's segment: Part3 is `LOCK_NOTIFICATION_TICKS` longer than
 *     `partRanges[2].frames`. Nothing else in timing.ts moves, so the chapter times of the Scoreboard and Outro are that much
 *     early in a full-video build (see `part3Replay`).
 *   - No banner into the replay item (the lock notification is its announcement).
 *   - The shell's own score counter is off for this item. A ScoreHud is drawn instead, held at the previous score and
 *     tweened to the new one when the correct option expands, so the rings close on the answer.
 */
const range = partRanges[2];

const REPLAY_ID = 'q42Replay';
const replayItem: Item = (() => {
  const found = items.find((i) => extraIds(i).includes(REPLAY_ID));
  if (!found) throw new Error(`Part3: no item has the extra id "${REPLAY_ID}"`);
  return found;
})();

const buildPlan = (): { placed: Placed[]; replayAt: number; total: number } => {
  const placed: Placed[] = [];
  let cur = 0;
  let replayAt = -1;
  for (const seg of segments) {
    if (seg.from < range.from || seg.to > range.to) continue;
    if (seg.kind === 'item' && seg.item.order === replayItem.order) {
      replayAt = cur;
      cur += LOCK_NOTIFICATION_TICKS;
    }
    const ticks = seg.to - seg.from;
    placed.push({ seg, at: cur, ticks });
    cur += ticks;
  }
  return { placed, replayAt, total: cur };
};
const plan = buildPlan();

export const part3Plan: Placed[] = plan.placed;
export const part3Ticks: number = plan.total;
export const part3Frames: number = ticksToFrames(plan.total);

/** The replayed notification: start tick in Part3 and length (ticks). The item starts at `at + ticks`. */
export const part3Replay = { item: replayItem, at: plan.replayAt, ticks: LOCK_NOTIFICATION_TICKS } as const;

/** No end-of-item banner on the item before the replay: the replayed notification announces it. */
export const part3NoBanner = (item: Item): boolean => nextRound(item)?.order === replayItem.order;

/** Local tick (inside the replay item) at which the correct option starts to expand: the rings close here. */
export const part3RingsAt = (): number => localPhases(replayItem).hold.from + secToTicks(expandStartSec('full'));

/** Cues of the replay, absolute Part3 ticks, same pair the hook uses (notification on the banner, whoosh when the question starts). */
export const part3ReplayBeats = { notification: plan.replayAt + LOCK_BEATS.bannerIn, whoosh: plan.replayAt + LOCK_NOTIFICATION_TICKS } as const;

const LevelCardAt: React.FC<{ level: Level }> = ({ level }) => <LevelCard level={level} frame={useGta6Frame()} />;
const ScoreCardAt: React.FC<{ level: Level; after: Item }> = ({ level, after }) => <ScoreCard level={level} after={after} frame={useGta6Frame()} />;
const BannerAt: React.FC<{ title: string; level: Level }> = ({ title, level }) => <NotificationBanner title={title} frame={useGta6Frame()} at={0} level={level} />;

/** Same call as Hook's `Lock`, with the replay item in place of item 1. */
const ReplayLock: React.FC<{ item: Item }> = ({ item }) => (
  <LockNotification
    frame={useGta6Frame()}
    at={0}
    appName={HOOK_TEXT.appName}
    title={HOOK_TEXT.title}
    body={item.q}
    timeLabel={HOOK_TEXT.timeLabel}
    options={item.options}
    level={item.level}
  />
);

/** Score counter for the replay item: previous score until the answer, then the tween that closes the Hard ring. */
const RingsOnAnswer: React.FC<{ item: Item }> = ({ item }) => (
  <ScoreHud
    {...hudCounts(item)}
    frame={useGta6Frame()}
    at={part3RingsAt()}
  />
);

export const Part3: React.FC = () => (
  <AbsoluteFill>
    {plan.placed.map((p) => {
      const { seg } = p;
      const key = `${seg.kind}-${seg.from}`;
      switch (seg.kind) {
        case 'levelCard':
          return (
            <Sequence key={key} from={ticksToFrames(p.at)} durationInFrames={ticksToFrames(p.ticks)} layout="absolute-fill">
              <LevelCardAt level={seg.level} />
            </Sequence>
          );
        case 'item': {
          const isReplay = seg.item.order === replayItem.order;
          const next = nextRound(seg.item);
          const from = ticksToFrames(bannerStart(p));
          const end = ticksToFrames(p.at + p.ticks);
          return (
            <React.Fragment key={key}>
              {isReplay && (
                <Sequence from={ticksToFrames(part3Replay.at)} durationInFrames={ticksToFrames(part3Replay.ticks)} layout="absolute-fill">
                  {/* opaque base, same reason as in Hook: the notification fades from opacity 0 and nothing else is mounted here */}
                  <div style={{ position: 'absolute', inset: 0, background: levelBackground[seg.item.level] }} />
                  <ReplayLock item={seg.item} />
                </Sequence>
              )}
              <QuestionScene item={seg.item} at={p.at} hud={!isReplay} />
              {isReplay && (
                <Sequence from={ticksToFrames(p.at)} durationInFrames={itemFrames(seg.item)} layout="absolute-fill">
                  <RingsOnAnswer item={seg.item} />
                </Sequence>
              )}
              {next && !part3NoBanner(seg.item) && (
                <Sequence from={from} durationInFrames={end - from} layout="absolute-fill">
                  <BannerAt title={roundLabel(next)} level={next.level} />
                </Sequence>
              )}
            </React.Fragment>
          );
        }
        case 'scoreCard':
          return (
            <Sequence key={key} from={ticksToFrames(p.at)} durationInFrames={ticksToFrames(p.ticks)} layout="absolute-fill">
              <ScoreCardAt level={seg.level} after={seg.after} />
            </Sequence>
          );
        default:
          return null;
      }
    })}
  </AbsoluteFill>
);

export default Part3;
