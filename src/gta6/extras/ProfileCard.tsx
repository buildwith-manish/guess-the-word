/**
 * ProfileCard and ProfilePair: a contact-style card with an initials avatar and the name. No portrait, no art.
 * The name comes from props; the initials are derived from it. Avatar colour is `tint`, else deterministic from the name.
 * All motion is a pure function of `frame`, `at` (local design ticks).
 */
import React from 'react';
import type { Level } from '../data';
import { FrostCard } from '../components';
import { colors, textStyle, u } from '../system';
import { hash01, initialsOf } from './util';

export type ProfileCardProps = {
  name: string;
  frame: number;
  at: number;
  level?: Level;
  /** Avatar colour. Default: a muted hue derived from the name. */
  tint?: string;
  /** Reference units (1920x1080). */
  width?: number;
  /** Avatar diameter, reference units. */
  avatar?: number;
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ name, frame, at, level, tint, width = 420, avatar = 160 }) => {
  const bg = tint ?? `hsl(${Math.round(hash01(name) * 360)} 45% 42%)`;
  return (
    <FrostCard frame={frame} at={at} level={level} width={width} padding={36} style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(24) }}>
      <div style={{ width: u(avatar), height: u(avatar), borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <span style={{ ...textStyle('title'), fontSize: u(avatar * 0.4), fontWeight: 700, color: colors.ink }}>{initialsOf(name)}</span>
      </div>
      <div style={{ ...textStyle('choice'), color: colors.ink, textAlign: 'center' }}>{name}</div>
    </FrostCard>
  );
};

export type ProfilePairProps = {
  a: string;
  b: string;
  frame: number;
  at: number;
  /** Ticks between the two cards entering. */
  stagger?: number;
  /** Gap between the cards, reference units. */
  gap?: number;
  level?: Level;
  width?: number;
  avatar?: number;
};

export const ProfilePair: React.FC<ProfilePairProps> = ({ a, b, frame, at, stagger = 6, gap = 48, level, width, avatar }) => (
  <div style={{ display: 'flex', gap: u(gap), alignItems: 'flex-start' }}>
    <ProfileCard name={a} frame={frame} at={at} level={level} width={width} avatar={avatar} />
    <ProfileCard name={b} frame={frame} at={at + stagger} level={level} width={width} avatar={avatar} />
  </div>
);
