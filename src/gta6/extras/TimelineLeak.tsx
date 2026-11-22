import React from 'react';
import { TimelineView } from './TimelineCard';
import type { TimelineNode, TimelineViewProps } from './TimelineCard';

export type TimelineLeakProps = Omit<TimelineViewProps, 'nodes'> & {
  /** Dated nodes after the leak (up to three), e.g. the official release. */
  nodes: TimelineNode[];
  /** The leak node: its caption (and optional date). It is placed first, before the dated nodes. */
  leak: Omit<TimelineNode, 'icon'>;
};

/** Timeline with a leak icon node in front of the dated nodes. Draws nothing outside [at, at + dur). */
export const TimelineLeak: React.FC<TimelineLeakProps> = ({ nodes, leak, ...rest }) => (
  <TimelineView nodes={[{ ...leak, icon: 'leak' }, ...nodes.slice(0, 3).map((x) => ({ ...x, icon: 'dot' as const }))]} {...rest} />
);
