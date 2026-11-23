import React from 'react';
import type { SpotlightBonus } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { FPS } from '../shared/clock';
import { springAt } from '../shared/springs';
import { colors, glassSurface, px, textStyle, useXmasFrame } from '../system';
import { playSecOf } from '../timing';
import { UI } from '../ui';
import type { RoundProps } from './registry';

/**
 * Bonus 1, Spotlight: an iOS Spotlight search field types the movie title, ONE LETTER PER 1/lettersPerSec SECOND (data.ts),
 * so only the first letters appear during the play time. Text only: no images. A space does not take a second of its own;
 * it appears together with the next letter. Typing stops at the end of the play time: the picture held through the reveal
 * is the last letters typed. A soft key sound per letter (spotlightCues).
 *
 * Draws only the play area (see registry.ts). No backdrop blur here: BonusScene's banner and timer already use the two
 * blurred layers, so the glass in this round is flat (same look, no blur).
 */
export const SPOTLIGHT = {
  /** field size and position inside the play area, reference units */
  field: { x: 32, y: 56, w: 780, h: 112 },
  fontSize: 58,
  /** a letter fades up over this many ticks and rises this many ems */
  popTicks: 3,
  popRise: 0.08,
  /** result skeleton rows under the field (shapes only, no text) */
  skeletonRows: 3,
} as const;

type LetterChar = { ch: string; /** tick the character appears, or null if it never does (after the play time) */ at: number | null; letter: number };

/** Every character of the title with the tick it appears (play-local ticks added to `playFrom`). */
export const spotlightChars = (slot: SpotlightBonus, playFrom: number, playFrames: number): LetterChar[] => {
  const typeTicks = FPS / slot.lettersPerSec;
  const chars = [...slot.title];
  // letter number (1-based) a character appears with: its own, or for a space the next letter's
  const out: LetterChar[] = [];
  let letter = 0;
  const own: number[] = [];
  for (const ch of chars) {
    if (ch !== ' ') letter += 1;
    own.push(ch === ' ' ? letter + 1 : letter);
  }
  chars.forEach((ch, i) => {
    const start = playFrom + (own[i] - 1) * typeTicks;
    out.push({ ch, at: start < playFrom + playFrames ? start : null, letter: own[i] });
  });
  return out;
};

/** Number of letters (not spaces) typed by tick `t`. */
export const lettersTyped = (slot: SpotlightBonus, playFrom: number, playFrames: number, t: number): number => {
  const typeTicks = FPS / slot.lettersPerSec;
  const k = Math.floor((t - playFrom) / typeTicks) + 1;
  const maxK = Math.ceil(playFrames / typeTicks);
  return Math.max(0, Math.min(k, maxK, [...slot.title].filter((c) => c !== ' ').length));
};

/** Sounds: one soft key per letter at the tick it appears. `playStart` = absolute design tick the play time starts (not scene-local). */
export const spotlightCues = (slot: SpotlightBonus, playStart: number): SfxCue[] => {
  const playTicks = Math.round(playSecOf(slot) * FPS);
  const out: SfxCue[] = [];
  for (const c of spotlightChars(slot, playStart, playTicks)) {
    if (c.ch !== ' ' && c.at !== null) out.push(cue('type-key', c.at, { volume: 0.7 }));
  }
  return out;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const Magnifier: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <line x1="15.4" y1="15.4" x2="21" y2="21" />
  </svg>
);

export const Spotlight: React.FC<RoundProps> = ({ slot, playFrom, playFrames }) => {
  if (slot.key !== 'spotlight') throw new Error(`Spotlight: bonus ${slot.bonus} is a ${slot.key} round`);
  const t = useXmasFrame();
  const S = SPOTLIGHT;
  const chars = spotlightChars(slot, playFrom, playFrames);
  const visible = chars.filter((c) => c.at !== null && t >= (c.at as number));
  const lastAt = visible.length ? Math.max(...visible.map((c) => c.at as number)) : -Infinity;
  const enter = springAt(t, playFrom - 8, 'smooth');
  const caretOn = t - lastAt < 8 || Math.floor(t / 8) % 2 === 0;

  // shrink only if a very long title would not fit the field
  const textW = S.field.w - 104;
  const fontSize = Math.min(S.fontSize, (textW / Math.max(1, slot.title.length)) * 1.7);

  const { backdropFilter: _b, WebkitBackdropFilter: _wb, ...flat } = glassSurface(S.field.h / 2, { edge: 0.8, depth: 0.7, base: colors.glassBase, tint: colors.gold, tintPercent: 12 });
  void _b;
  void _wb;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: clamp01(enter * 2), transform: `translateY(${px(14 * (1 - enter))}px)` }}>
      <div
        style={{
          position: 'absolute',
          left: px(S.field.x),
          top: px(S.field.y),
          width: px(S.field.w),
          height: px(S.field.h),
          display: 'flex',
          alignItems: 'center',
          gap: px(22),
          padding: `0 ${px(34)}px`,
          boxSizing: 'border-box',
          ...flat,
        }}
      >
        <Magnifier size={px(44)} color={colors.muted} />
        <div style={{ ...textStyle('title'), fontSize: px(fontSize), whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          {visible.length === 0 ? <span style={{ color: colors.faint, fontWeight: 500 }}>{UI.searchPlaceholder}</span> : null}
          {visible.map((c, i) => {
            const k = clamp01((t - (c.at as number)) / S.popTicks);
            return (
              <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: k, transform: `translateY(${px(S.popRise * fontSize * (1 - k))}px)` }}>
                {c.ch}
              </span>
            );
          })}
          <span style={{ display: 'inline-block', width: px(4), height: px(fontSize * 0.95), marginLeft: px(4), borderRadius: px(2), background: colors.gold, opacity: caretOn ? 1 : 0 }} />
        </div>
      </div>

      {/* result skeleton: shapes only, so the field does not float in empty space */}
      {Array.from({ length: S.skeletonRows }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: px(S.field.x + 14),
            top: px(S.field.y + S.field.h + 36 + i * 46),
            width: px(S.field.w - 28 - i * 90),
            height: px(26),
            borderRadius: px(13),
            background: colors.segmentOff,
            opacity: 0.8 - i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

export default Spotlight;
