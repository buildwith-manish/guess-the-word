/**
 * FinalCard (NFL, task 3c): card 30. It opens with the exact lock-screen animation of the hook (`HookLock`: blurred card,
 * notification banner slides down, holds, slides out; same notification text and sound), then plays card 30 through
 * CardScene as for any other card.
 *
 * Timing: the lock second is the first part of card 30's own segment in timing.ts (`phases.lock`, `finalLockSec`), so the
 * scene's clock is the segment's clock: 0 = lock start, `phases.intro.from` = where "Card 30." starts and the card enters.
 * CardScene draws nothing of the card before its own intro (the blank card only springs in from there), so the lock sits on
 * top of an empty level background plus the HUD band. Duration: `finalCardTicks` / `finalCardFrames`.
 * The wallpaper is card 30 itself (blank "?" face, its level colour), via HookLock's `card` prop.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { cards } from '../data';
import { cue, type SfxCue } from '../sfx';
import { CardScene, cardFrames, cardTicks } from './CardScene';
import { HOOK_LOCK_TICKS, HookLock, hookMarks } from './Hook';
import { finalLockSec, secToTicks, useNflFrame } from '../timing';

const final = cards.find((c) => c.final);
if (!final) throw new Error('FinalCard: no card is flagged final in data.ts');
// the shared lock piece is a fixed length; the timeline slot for it must match
if (secToTicks(finalLockSec) !== HOOK_LOCK_TICKS) throw new Error(`FinalCard: finalLockSec is ${secToTicks(finalLockSec)} ticks, the lock piece is ${HOOK_LOCK_TICKS}`);

/** Length of the final card's segment (lock + card 30) in design ticks (30 fps) and in render frames (60 fps). */
export const finalCardTicks: number = cardTicks(final);
export const finalCardFrames: number = cardFrames(final);

/** The lock notification sound lands with the banner, as in the hook. `start` = tick the segment starts. Card 30's own cues come with its card cue list. */
export const finalCardCues = (start: number): SfxCue[] => {
  const m = hookMarks();
  return [cue('notification', start + (m.notifyIn - m.notifyAt))];
};

export const FinalCard: React.FC<{ at?: number; jersey?: string | number }> = ({ at = 0, jersey }) => {
  const f = useNflFrame() - at;
  return (
    <AbsoluteFill>
      <CardScene card={final} at={at} jersey={jersey} />
      <HookLock frame={f} at={0} card={final} />
    </AbsoluteFill>
  );
};
