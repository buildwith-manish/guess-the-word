import React from 'react';
import type { Level } from '../data';
import { colors, radius, springAt, textStyle, u } from '../system';
import { FrostCard } from '../components/FrostCard';
import { extraWindow } from './shared';

export type TimelineNode = {
  /** Date text as it should read. */
  date?: string;
  /** Optional caption under the date. */
  label?: string;
  /** `leak` draws the leak icon instead of a dot (TimelineLeak only). */
  icon?: 'dot' | 'leak';
};

export type TimelineViewProps = {
  nodes: TimelineNode[];
  frame: number;
  /** Local frame of the answer reveal: the line starts drawing here. */
  at: number;
  dur?: number;
  level?: Level;
  /** Top-left corner, reference units (1920x1080). */
  left: number;
  top: number;
  width?: number;
};

const LINE_TICKS = 18;
const FIRST_NODE = 6;
const NODE_STAGGER = 7;

/** Generic leak glyph (a drop with a crack and two falling drops); original art. */
export const LeakIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={u(size)} height={u(size)} viewBox="0 0 64 64" fill="none">
    <path d="M32 6C32 6 14 26 14 38a18 18 0 0 0 36 0C50 26 32 6 32 6Z" stroke={color} strokeWidth="4" strokeLinejoin="round" />
    <path d="M30 26l-6 10 8 4-5 10" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="54" cy="46" r="3.5" fill={color} />
    <circle cx="58" cy="56" r="2.5" fill={color} />
  </svg>
);

/** Shared renderer: a line that draws left to right with nodes springing in along it. */
export const TimelineView: React.FC<TimelineViewProps> = ({ nodes, frame, at, dur, level, left, top, width = 1180 }) => {
  const w = extraWindow(frame, at, dur);
  if (!w.visible) return null;
  const accent = level ? colors.level[level] : colors.ink;
  const n = nodes.length;
  const pad = 150; // keeps the first and last node's text inside the card
  const line = Math.min(1, w.f / LINE_TICKS);
  const xs = nodes.map((_, i) => (n === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (n - 1)));
  return (
    <div style={{ position: 'absolute', left: u(left), top: u(top), opacity: Math.min(1, w.p), transform: `translateY(${(1 - w.p) * u(28)}px)` }}>
      <FrostCard width={width} height={330} padding={0} radius={radius.lg} level={level}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', left: u(pad), top: u(120), width: u(width - 2 * pad) * line, height: u(6), borderRadius: u(3), background: colors.mutedStrong }} />
          {nodes.map((node, i) => {
            const pop = Math.min(1.08, springAt(frame, at + FIRST_NODE + i * NODE_STAGGER, 'bouncy'));
            const leak = node.icon === 'leak';
            return (
              <div key={i} style={{ position: 'absolute', left: u(xs[i]), top: 0, width: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: Math.min(1, pop), transform: `scale(${0.5 + 0.5 * pop})`, transformOrigin: `50% ${u(123)}px` }}>
                <div style={{ position: 'absolute', top: u(leak ? 78 : 105), transform: 'translateX(-50%)' }}>
                  {leak ? (
                    <LeakIcon size={90} color={colors.medium} />
                  ) : (
                    <div style={{ width: u(36), height: u(36), borderRadius: '50%', background: accent, boxShadow: `0 0 0 ${u(8)}px ${accent}33` }} />
                  )}
                </div>
                <div style={{ position: 'absolute', top: u(190), transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {node.date && <div style={{ ...textStyle('choice'), color: colors.ink }}>{node.date}</div>}
                  {node.label && <div style={{ ...textStyle('caption'), color: colors.muted, marginTop: u(6) }}>{node.label}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </FrostCard>
    </div>
  );
};

export type TimelineCardProps = Omit<TimelineViewProps, 'nodes'> & {
  /** Up to three dated nodes, in order (extra nodes are ignored). */
  nodes: TimelineNode[];
};

/** Timeline of up to three dated nodes. Draws nothing outside [at, at + dur). */
export const TimelineCard: React.FC<TimelineCardProps> = ({ nodes, ...rest }) => (
  <TimelineView nodes={nodes.slice(0, 3).map((x) => ({ ...x, icon: 'dot' as const }))} {...rest} />
);
