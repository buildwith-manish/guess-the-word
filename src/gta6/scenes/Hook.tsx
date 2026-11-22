import React from 'react';
import { Sequence } from 'remotion';
import { ControlCenterTiles, LOCK_BEATS, LOCK_NOTIFICATION_TICKS, LockNotification, ScoreHud, SpoilerBadge } from '../components';
import type { RuleTile } from '../components';
import { byLevel, items } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { FRAME, SAFE, levelBackground, springAt, u } from '../system';
import { hookSec, secToTicks, ticksToFrames, useGta6Frame } from '../timing';
import { QuestionScene } from './QuestionScene';
import { ShellVoiceContext } from '../voiceContext';

/**
 * Hook, 0:00 to 0:06 (timing.ts `hookSec`). Rules are on screen only, no voiceover.
 *
 *   0 to 1 s   LockNotification (LOCK_NOTIFICATION_TICKS) over the blurred answer grid of item 1
 *   1 s on     QuestionScene for item 1, mounted straight after the notification (its own phases from timing.ts)
 *   +6 ticks   ControlCenterTiles (options, seconds, keep score), the "0 / total" counter and the badge fade in over it
 *   6 s        overlays are gone; the sequence ends at hookSec
 *
 * `at` is the design tick the hook starts at in the parent timeline (0 for the video). All numbers come from
 * data.ts / timing.ts; only the label words below are written here.
 */
const FIRST = items[0];

export const HOOK_TEXT = {
  appName: 'GTA 6 QUIZ',
  title: 'New question',
  timeLabel: 'now',
  tiles: { options: 'CHOICES', seconds: 'SECONDS', score: 'KEEP SCORE' },
  badge: 'SPOILER-FREE',
} as const;

/** Layout (1920x1080 units): the rules sit right of the Messages answer chips, under the bubble. */
const LAYOUT = { tile: 180, tileGap: 28, tilesTop: 560, tilesCount: 3 } as const;
const OVERLAY_DELAY = 6; // ticks after Q1 starts
const TILE_STAGGER = 4;

/** Local ticks (0 = start of the hook). */
export const hookTicks = secToTicks(hookSec);
export const hookBeats = {
  lock: 0,
  question: LOCK_NOTIFICATION_TICKS,
  overlays: LOCK_NOTIFICATION_TICKS + OVERLAY_DELAY,
  end: hookTicks,
} as const;

/** Sound cues in absolute design ticks, for a hook that starts at `at`. */
export const hookCues = (at = 0): SfxCue[] => [
  cue('notification', at + hookBeats.lock + LOCK_BEATS.bannerIn),
  cue('whoosh', at + hookBeats.question),
  ...[0, 1, 2].map((i) => cue('tick', at + hookBeats.overlays + i * TILE_STAGGER)),
];

const ruleTiles = (): RuleTile[] => [
  { value: FIRST.options.length, label: HOOK_TEXT.tiles.options },
  { value: FIRST.timerSec, label: HOOK_TEXT.tiles.seconds },
  { label: HOOK_TEXT.tiles.score },
];

const Overlays: React.FC = () => {
  const f = useGta6Frame();
  const tilesW = LAYOUT.tilesCount * LAYOUT.tile + (LAYOUT.tilesCount - 1) * LAYOUT.tileGap;
  const counter = springAt(f, hookBeats.overlays, 'gentle');
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: counter }}>
        <ScoreHud
          score={0}
          total={items.length}
          levelTotals={[byLevel.easy.length, byLevel.medium.length, byLevel.hard.length]}
        />
      </div>
      <div style={{ position: 'absolute', left: u(FRAME.w - SAFE.x - tilesW), top: u(LAYOUT.tilesTop) }}>
        <ControlCenterTiles tiles={ruleTiles()} frame={f} at={hookBeats.overlays} outAt={hookBeats.end} stagger={TILE_STAGGER} tileSize={LAYOUT.tile} />
      </div>
      <div style={{ position: 'absolute', right: u(SAFE.x), bottom: u(SAFE.bottom) }}>
        <SpoilerBadge text={HOOK_TEXT.badge} frame={f} at={hookBeats.overlays} outAt={hookBeats.end} />
      </div>
    </>
  );
};

const Lock: React.FC = () => {
  const f = useGta6Frame();
  return (
    <LockNotification
      frame={f}
      at={hookBeats.lock}
      appName={HOOK_TEXT.appName}
      title={HOOK_TEXT.title}
      body={FIRST.q}
      timeLabel={HOOK_TEXT.timeLabel}
      options={FIRST.options}
      level={FIRST.level}
    />
  );
};

export const Hook: React.FC<{ at?: number }> = ({ at = 0 }) => (
  <Sequence from={ticksToFrames(at)} durationInFrames={ticksToFrames(hookTicks)} layout="absolute-fill">
    {/* opaque base: LockNotification fades in from opacity 0 and Q1 only mounts after it, so without this tick 0 paints nothing (transparent) */}
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[FIRST.level] }} />
    {/* Q1 runs under everything; it starts when the notification ends. Its own counter is off: the hook draws 0 / total. */}
    {/* the hook is a silent teaser for Q1 (the hook line plays over it); Q1 is voiced in its own segment, never twice */}
    <ShellVoiceContext.Provider value={false}>
      <QuestionScene item={FIRST} at={hookBeats.question} hud={false} />
    </ShellVoiceContext.Provider>
    <Lock />
    <Overlays />
  </Sequence>
);

