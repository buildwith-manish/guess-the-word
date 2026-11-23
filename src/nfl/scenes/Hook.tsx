/**
 * Hook (NFL, task 3b): the first 6 s (hookSec in timing.ts).
 *
 *   0:00-0:03  lock screen: the first card, blurred; a notification "Scouting report: 30 players." slides in over it
 *   0:03-0:06  the blurred card gives way to the real, blank card, which flips in with the jersey silhouette; the HUD
 *              ("30 cards, 150 points") pops in at the top; the rule chips fade in on the card's "?" panel
 *
 * The hook ends on the blank card with the HUD and chips up. Card 1's own segment (CardScene with `fromHook`) takes over
 * from exactly that picture, so card 1 plays once: its intro and clues are in its segment, not repeated here. The Rookie
 * level banner is NOT drawn here (LevelBanner, placed by Part 1). The rules are never spoken: no voice cue for them.
 *
 * `HookLock` is the reusable 1-second lock-screen piece: it takes a start frame (`at`) and draws nothing outside
 * [at, at + HOOK_LOCK_TICKS]. Text comes from data.ts (hookText), every time from timing.ts (hookSec, hookBeats,
 * chipStaggerSec) or the spring presets in system.ts. `frame` and `at` are design ticks (30 fps).
 * Exports: Hook, HookLock, HOOK_LOCK_TICKS, hookMarks, hookCues, hookVoice.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { cards, hookText, type Card } from '../data';
import { RuleChips } from '../components/Chips';
import { ScoreHud, levelTagColor } from '../components/ScoreHud';
import { WalletCard } from '../components/WalletCard';
import { cue, type SfxCue } from '../sfx';
import { LOCK_BEATS, LOCK_NOTIFICATION_TICKS, LockNotification } from '../shared/LockNotification';
import { clamp01 } from '../shared/fade';
import { SPRINGS, blurPx, colors, levelBackground, px, springAt } from '../system';
import { FPS, chipStaggerSec, hookBeats, levelNames, hookSec, secToTicks, useNflFrame } from '../timing';
import { ANSWER_BOX, TOP_ROW } from './CardScene';

/** Start tick so far back that every entrance spring has settled. */
const ENTERED = -1e6;

export const HOOK_LOCK_TICKS = LOCK_NOTIFICATION_TICKS;

/** Marks in ticks from the start of the hook. Exported so the frame list and the cues read the same numbers. */
export const hookMarks = () => {
  const lock = secToTicks(hookBeats.lockSec);
  return {
    notifyAt: secToTicks(hookBeats.notifyAt),
    notifyIn: secToTicks(hookBeats.notifyAt) + LOCK_BEATS.bannerIn,
    notifyOut: secToTicks(hookBeats.notifyAt) + LOCK_BEATS.bannerOut,
    notifyEnd: secToTicks(hookBeats.notifyAt) + HOOK_LOCK_TICKS,
    flip: lock,
    flipEnd: lock + Math.round(SPRINGS.slow * FPS),
    hud: secToTicks(hookBeats.hudAt),
    chips: secToTicks(hookBeats.chipsAt),
    end: secToTicks(hookSec),
  };
};

/** SFX cues, `at` = tick the hook starts in the caller's clock: the notification sound with the banner, the card sound with the flip. */
export const hookCues = (at: number): SfxCue[] => {
  const m = hookMarks();
  return [cue('notification', at + m.notifyIn), cue('card-in', at + m.flip)].sort((a, b) => a.frame - b.frame);
};

/** Where the hook clip starts (the audio map supplies the clip). Only the clip is spoken: the rules never are. */
export const hookVoice = (at: number) => ({ type: 'hook' as const, key: '', tick: at + secToTicks(hookBeats.voiceAt) });

const first = cards[0];

/** The first card as the lock screen's wallpaper: blank, already settled, drawn the same way everywhere it appears. */
const BlankCard: React.FC<{ frame: number; card?: Card }> = ({ frame, card = first }) => <WalletCard card={card} state="blank" frame={frame} since={ENTERED} />;

/**
 * The reusable 1-second lock-screen piece (HOOK_LOCK_TICKS): blurred backdrop in, notification banner slides down, holds,
 * slides out. Starts at design tick `at`; renders nothing outside [at, at + HOOK_LOCK_TICKS].
 */
export const HookLock: React.FC<{ frame: number; at: number; /** Card used as the wallpaper and for the level colour. Default: card 1 (the hook). FinalCard passes card 30. */ card?: Card }> = ({
  frame,
  at,
  card = first,
}) => (
  <LockNotification
    frame={frame}
    at={at}
    appName={hookText.appName}
    title={hookText.title}
    body={hookText.body}
    timeLabel={hookText.timeLabel}
    level={card.level}
  >
    <BlankCard frame={frame} card={card} />
  </LockNotification>
);

export const Hook: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const f = useNflFrame() - at;
  const m = hookMarks();

  const flipP = f < m.flip ? 0 : springAt(f, m.flip, 'slow');
  const hudP = f < m.hud ? 0 : springAt(f, m.hud, 'gentle');

  return (
    <AbsoluteFill style={{ background: levelBackground[first.level], overflow: 'hidden' }}>
      {/* lock screen: the card, blurred, from the first frame until the real card has flipped in */}
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - clamp01(flipP * 1.5), filter: `blur(${px(blurPx * 0.6)}px) brightness(0.8)` }}>
        <BlankCard frame={f} />
      </div>

      <HookLock frame={f} at={m.notifyAt} />

      {/* the real card flips in from edge-on at 0:03 */}
      {f >= m.flip && (
        <div style={{ position: 'absolute', inset: 0, opacity: clamp01(flipP * 2), transform: `perspective(${px(1800)}px) rotateY(${-90 * (1 - flipP)}deg)` }}>
          <BlankCard frame={f} />
        </div>
      )}

      {/* "30 cards, 150 points" */}
      <div style={{ position: 'absolute', inset: 0, opacity: clamp01(hudP), transform: `translateY(${px(-16 * (1 - hudP))}px)` }}>
        <ScoreHud done={0} frame={f} top={TOP_ROW.top} side="left" compact tag={levelNames[first.level]} tagColor={levelTagColor(first.level)} />
      </div>

      {/* rules, on the "?" panel; never spoken. dur runs past the hook's end: card 1's segment carries them on. */}
      <RuleChips box={ANSWER_BOX} frame={f} at={m.chips} dur={3 * (m.end - m.chips)} outTicks={Math.round(SPRINGS.snappy * FPS)} stagger={secToTicks(chipStaggerSec)} />
    </AbsoluteFill>
  );
};
