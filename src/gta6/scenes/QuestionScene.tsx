import React from 'react';
import { Sequence } from 'remotion';
import type { Item } from '../data';
import { extraIds } from '../data';
import { QuestionShell } from '../components';
import type { ShellContext } from '../components';
import { segments, ticksToFrames } from '../timing';
import { ControlCenterLook } from './looks/ControlCenterLook';
import { MapsLook } from './looks/MapsLook';
import { MessagesLook } from './looks/MessagesLook';
import { PhotosLook } from './looks/PhotosLook';
import { SafariLook } from './looks/SafariLook';

/**
 * One item of the quiz: look picked from `item.look`, inside QuestionShell, mounted as a Sequence.
 *
 *   at   design tick (30 per second) at which the item starts in the parent timeline. Inside the Sequence the
 *        shell clock starts at 0, so `at` only places the item; the item's own phases come from timing.ts.
 *   duration  `itemTicks(item)` / `itemFrames(item)` = the item's segment in timing.ts (nothing written here).
 *
 * Reveal mode ("full" for hard and fastest items, "fast" otherwise) is chosen by QuestionShell through
 * timing.ts `isFullReveal`, and reaches each look as `ctx.revealMode` / `revealFrom`. Safari ignores it and uses
 * "full" itself (see SafariLook); it is only ever used for hard items, which are always full.
 */

const segmentOf = (item: Item) => {
  const seg = segments.find((s) => s.kind === 'item' && s.item.order === item.order);
  if (!seg || seg.kind !== 'item') throw new Error(`QuestionScene: item ${item.n} (order ${item.order}) is not in the timeline`);
  return seg;
};

/** Length of the item in design ticks / render frames, from timing.ts. */
export const itemTicks = (item: Item): number => {
  const s = segmentOf(item);
  return s.to - s.from;
};
export const itemFrames = (item: Item): number => ticksToFrames(itemTicks(item));

export const LOOKS = ['messages', 'maps', 'photos', 'safari', 'controlCenter'] as const;
export type LookId = (typeof LOOKS)[number];

const renderLook = (look: string, ctx: ShellContext): React.ReactNode => {
  switch (look) {
    case 'messages':
      return <MessagesLook {...ctx} />;
    case 'maps':
      return <MapsLook ctx={ctx} />;
    case 'photos':
      return <PhotosLook ctx={ctx} music={extraIds(ctx.item).includes('waveform')} />;
    case 'safari':
      return <SafariLook {...ctx} />;
    case 'controlCenter':
      return <ControlCenterLook {...ctx} />;
    default:
      throw new Error(`QuestionScene: no look "${look}" for item ${ctx.item.n} (known: ${LOOKS.join(', ')})`);
  }
};

/**
 * TODO(FastestWrapper): there is no FastestWrapper in the repo yet (not on branch gta6-quiz or the remote).
 * This pass-through marks where it goes. Replace it with the real import when that task lands.
 */
const FastestWrapper: React.FC<{ item: Item; children: React.ReactNode }> = ({ children }) => <>{children}</>;

export type QuestionSceneProps = { item: Item; at: number; /** false = no score counter (the hook draws its own). */ hud?: boolean };

export const QuestionScene: React.FC<QuestionSceneProps> = ({ item, at, hud = true }) => {
  const body = (
    <QuestionShell item={item} start={0} showTimer={item.look !== 'safari'} hud={hud}>
      {(ctx) => renderLook(item.look, ctx)}
    </QuestionShell>
  );
  return (
    <Sequence from={ticksToFrames(at)} durationInFrames={itemFrames(item)} layout="absolute-fill">
      {item.fastest ? <FastestWrapper item={item}>{body}</FastestWrapper> : body}
    </Sequence>
  );
};
