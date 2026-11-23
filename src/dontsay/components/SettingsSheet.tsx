/**
 * SettingsSheet: level-start rules display. An iOS Settings-style sheet that slides up at each
 * level intro and lists the level's rule type plus the hearts reset line.
 * Dims the background to ~0.94 and tints the wallpaper toward the level colour.
 * Static hearts line only: no heart is drawn, animated or lost. Sizes in 1280x720 reference units.
 * Level name, rule type, timer seconds come from data.ts / timing.ts; COPY holds UI labels only.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { rounds, levelColors, type Level, type RuleType } from '../data';
import { colours, fontHeadline, glassSurface, springAt } from '../system';
import { WIDTH, secToTicks, settingsCardSec, timerSecFor, useDontSayFrame } from '../timing';

const px = (v: number): number => (v * WIDTH) / 1280;

const COPY = {
  ruleLabel: { banned: 'Banned list', filter: 'Filters', heavy: 'Two rules at once', none: 'No extra rules' } as Record<RuleType, string>,
  ruleKey: 'Rule type',
  timerKey: 'Timer',
  heartsKey: 'Hearts',
  heartsFirst: 'Start full',
  heartsReset: 'Reset to full',
  ruleBreak: 'Break a rule and it counts as a match.',
  done: 'Level',
} as const;

/** Brightness of the scene behind the sheet. */
export const DIM_TO = 0.94;

const levelRuleType = (level: Level): RuleType => {
  const types = rounds.filter((r) => r.level === level).map((r) => r.ruleType ?? 'none');
  if (types.includes('heavy')) return 'heavy';
  if (types.includes('banned')) return 'banned';
  if (types.includes('filter')) return 'filter';
  return 'none';
};
const levelHasBans = (level: Level): boolean => rounds.some((r) => r.level === level && r.ruleType === 'banned');

const Glyph: React.FC<{ kind: 'rule' | 'timer' | 'hearts'; colour: string }> = ({ kind, colour }) => (
  <div style={{ width: px(56), height: px(56), borderRadius: px(14), background: colour, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
    <svg width={px(34)} height={px(34)} viewBox="0 0 34 34" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'rule' ? <path d="M5 8 H29 M10 17 H24 M14 26 H20" /> : null}
      {kind === 'timer' ? <><circle cx="17" cy="19" r="11" /><path d="M17 19 V12 M13 4 H21" /></> : null}
      {kind === 'hearts' ? <path d="M17 29 C4 20 5 8 12 8 C15 8 17 10 17 12 C17 10 19 8 22 8 C29 8 30 20 17 29 Z" fill="#fff" /> : null}
    </svg>
  </div>
);

const Row: React.FC<{ kind: 'rule' | 'timer' | 'hearts'; colour: string; k: string; v: string; last?: boolean }> = ({ kind, colour, k, v, last }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: px(22), height: px(92), padding: `0 ${px(26)}px`,
    borderBottom: last ? 'none' : `${px(1)}px solid ${colours.hairline}` }}>
    <Glyph kind={kind} colour={colour} />
    <span style={{ fontFamily: fontHeadline, fontWeight: 600, fontSize: px(34), color: colours.muted, flex: '0 0 auto' }}>{k}</span>
    <span style={{ fontFamily: fontHeadline, fontWeight: 800, fontSize: px(44), color: colours.ink, letterSpacing: '-0.02em', marginLeft: 'auto', textAlign: 'right' }}>{v}</span>
  </div>
);

export type SettingsSheetProps = {
  level: Level;
  /** Local design tick; defaults to the clock of the enclosing Sequence. */
  frame?: number;
  /** Total length in seconds. Default settingsCardSec. */
  durationSec?: number;
};

export const SettingsSheet: React.FC<SettingsSheetProps> = ({ level, frame: frameProp, durationSec = settingsCardSec }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const total = secToTicks(durationSec);
  const exitAt = total - 10;

  const inP = springAt(frame, 0, 'smooth');
  const outP = interpolate(frame, [exitAt, total], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const presence = Math.min(1, inP) * (1 - outP);
  const slide = (1 - Math.min(1, inP)) * px(620) + outP * px(620);

  const L = levelColors[level];
  const type = levelRuleType(level);
  const accent = L.accent;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* dim to ~0.94 brightness */}
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: (1 - DIM_TO) * presence }} />
      {/* wallpaper tint toward the level colour */}
      <div style={{ position: 'absolute', inset: 0, opacity: presence,
        background: `radial-gradient(120% 90% at 50% 100%, ${accent}59 0%, ${L.wallpaper[0]}33 55%, transparent 100%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: px(72), display: 'flex', justifyContent: 'center', transform: `translateY(${slide}px)` }}>
        <div style={{ ...glassSurface(40, { tint: accent }), width: px(900), padding: `${px(28)}px 0 ${px(14)}px` }}>
          <div style={{ width: px(70), height: px(7), borderRadius: px(4), background: colours.mutedStrong, margin: `0 auto ${px(18)}px` }} />
          <div style={{ padding: `0 ${px(34)}px ${px(14)}px` }}>
            <div style={{ fontFamily: fontHeadline, fontWeight: 600, fontSize: px(30), color: colours.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{COPY.done} {level}</div>
            <div style={{ fontFamily: fontHeadline, fontWeight: 800, fontSize: px(64), color: colours.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{L.name}</div>
          </div>
          <Row kind="rule" colour={accent} k={COPY.ruleKey} v={COPY.ruleLabel[type]} />
          <Row kind="timer" colour="#8E8E93" k={COPY.timerKey} v={`${timerSecFor(level)} s`} />
          <Row kind="hearts" colour="#FF3B30" k={COPY.heartsKey} v={level === 1 ? COPY.heartsFirst : COPY.heartsReset} last={!levelHasBans(level)} />
          {levelHasBans(level) ? (
            <div style={{ padding: `${px(16)}px ${px(34)}px ${px(10)}px`, fontFamily: fontHeadline, fontWeight: 700, fontSize: px(34), color: colours.ink, letterSpacing: '-0.01em',
              borderTop: `${px(1)}px solid ${colours.hairline}` }}>{COPY.ruleBreak}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
