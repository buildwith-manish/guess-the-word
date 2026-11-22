import React from 'react';
import { AbsoluteFill } from 'remotion';
import { items } from './data';
import type { Item } from './data';
import { QuestionScene, itemFrames, itemTicks } from './scenes/QuestionScene';

/** Dev compositions: "GTA6-Q" (one item, by order number) and "GTA6-Q-All" (all items back to back). */

export const itemByOrder = (order: number): Item => {
  const item = items.find((i) => i.order === order);
  if (!item) throw new Error(`GTA6-Q: no item with order ${order} (1 to ${items.length})`);
  return item;
};

export type PreviewProps = { order: number };
export const PREVIEW_DEFAULTS: PreviewProps = { order: 1 };

export const previewFrames = (order: number): number => itemFrames(itemByOrder(order));

export const Gta6Preview: React.FC<PreviewProps> = ({ order }) => (
  <AbsoluteFill>
    <QuestionScene item={itemByOrder(order)} at={0} />
  </AbsoluteFill>
);

/** Item starts in design ticks, back to back, in item order. */
const starts: number[] = [];
{
  let cur = 0;
  for (const item of items) {
    starts.push(cur);
    cur += itemTicks(item);
  }
}
export const ALL_FRAMES = items.reduce((sum, item) => sum + itemFrames(item), 0);

export const Gta6PreviewAll: React.FC = () => (
  <AbsoluteFill>
    {items.map((item, i) => (
      <QuestionScene key={item.order} item={item} at={starts[i]} />
    ))}
  </AbsoluteFill>
);
