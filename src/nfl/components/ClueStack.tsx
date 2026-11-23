import React from 'react';
import { pointsLabel, type Card } from '../data';
import { colors, px, springAt, springOver, textStyle, type } from '../system';
import { HERO, HISTORY, LAYOUT, FIELD, heroFit, historyFit, rowTextW } from './clueLayout';

export type ClueStackProps = {
  card: Card;
  /** Local design frame (30 fps ticks). */
  frame: number;
  /** Local tick each clue arrives (five numbers, from timing.ts). */
  starts: readonly number[];
  /** Kept for the callers; the layout is fixed to the field (clueLayout FIELD) and ignores it. */
  box?: { left: number; top: number; width: number; height: number };
  /** Emerge length in ticks. Default: the `gentle` spring preset. Two-Minute Warning cards pass `tmwFlipTicks(card)`. */
  flipTicks?: number;
};

/**
 * Hero + history (iOS-6, motion iOS-8). A HERO slot (fixed box, top of the field) holds the live clue; four HISTORY rows (fixed boxes
 * below it, clue order) hold the earlier clues in full. Nothing moves or resizes while clues arrive:
 *   - iOS-8c, newest on top: every older card moves down ONE slot together; the card that held the clue being replaced
 *     TRAVELS from the hero slot into history slot 0 (top order: newest, then older, oldest last) on the gentle spring (top, height, radius and look interpolate; the hero text fades out early and the
 *     row text fades in late, both clipped by the moving card, the points tag glides with it);
 *   - the new clue's hero card rises from 24 units below with a slight scale (0.94 -> 1) and fades in on the same spring.
 *   One spring drives both, so it reads as one motion. Nothing else moves; the other rows and the field stay put.
 *   No placeholders: the history area is empty at first. Reading order top to bottom is clue 5, 4, 3, 2, 1.
 * Text sizes (clueLayout): hero 32 to 40 units auto-fitted (up to 4 lines), history one size, up to 2 lines. Lines are
 * wrapped by clueFit-style metrics, so the DOM never re-wraps. Points are a right-aligned tag in each slot.
 */
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const Tag: React.FC<{ text: string; color: string; opacity?: number }> = ({ text, color, opacity = 1 }) => (
  <div style={{ ...textStyle('chip'), letterSpacing: '0em', fontSize: px(type.chip.size), color, opacity, whiteSpace: 'nowrap', textAlign: 'right' }}>{text}</div>
);

const Lines: React.FC<{ lines: string[]; size: number; lineHeight: number; color: string; weight?: number }> = ({ lines, size, lineHeight, color, weight }) => (
  <div style={{ ...textStyle('clue'), fontSize: px(size), lineHeight, fontWeight: weight ?? type.clue.weight, letterSpacing: size >= 32 ? '-0.015em' : '-0.01em', color, textAlign: 'left' }}>
    {lines.map((l, i) => (
      <div key={i} style={{ whiteSpace: 'nowrap' }}>{l}</div>
    ))}
  </div>
);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const rowTop = (j: number): number => LAYOUT.heroH + LAYOUT.rowGap + j * (LAYOUT.rowH + LAYOUT.rowGap);
const HERO_BG = 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06)), rgba(0,0,0,0.30)';
const ROW_BG = 'rgba(255,255,255,0.07)';
const ROW_PAD = 16;

const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', boxSizing: 'border-box' };

export const ClueStack: React.FC<ClueStackProps> = ({ card, frame, starts, flipTicks }) => {
  const accent = colors.level[card.level];
  let m = -1;
  starts.forEach((s, k) => {
    if (s !== undefined && frame >= s && k < card.clues.length) m = k;
  });
  if (m < 0) return null;
  const p = flipTicks === undefined ? springAt(frame, starts[m], 'gentle') : springOver(frame, starts[m], flipTicks);
  const q = clamp01(p);
  const heroNow = heroFit(card.clues[m]);
  const textW = FIELD.w - LAYOUT.heroPadX * 2 - LAYOUT.tagW;

  const heroLines = (f: ReturnType<typeof heroFit>, opacity: number) => (
    <div style={{ position: 'absolute', left: px(LAYOUT.heroPadX), top: 0, height: '100%', width: px(textW), display: 'flex', alignItems: 'center', opacity }}>
      <Lines lines={f.lines} size={f.size} lineHeight={HERO.lineHeight} color={colors.ink} />
    </div>
  );

  // iOS-8c: newest on top. Clue i sits in history slot (m-1-i): 0 is directly under the hero. On every new clue each older
  // card moves down exactly ONE slot (80 units) on the same spring; the card that was the hero becomes slot 0 (it shrinks
  // and changes look on the way). Cards keep their 8-unit gap the whole time, so nothing crosses or overlaps.
  const slotTop = (k: number): number => (k < 0 ? 0 : rowTop(k));
  const slotH = (k: number): number => (k < 0 ? LAYOUT.heroH : LAYOUT.rowH);
  const cards = Array.from({ length: m }, (_, i) => {
    const to = m - 1 - i;
    const from = to - 1; // -1 = the hero slot
    if (to >= LAYOUT.historyRows) return null;
    const hero = from < 0;
    const lk = hero ? q : 1; // look: hero -> row
    return (
      <div
        key={i}
        style={{
          position: 'absolute', left: 0, width: '100%', top: px(lerp(slotTop(from), slotTop(to), p)), height: px(lerp(slotH(from), slotH(to), p)),
          borderRadius: px(lerp(LAYOUT.radius.surface, LAYOUT.radius.row, lk)), overflow: 'hidden', zIndex: hero ? 2 : 1,
        }}
      >
        {hero && <div style={{ ...fill, borderRadius: 'inherit', border: `${px(1.5)}px solid ${accent}`, background: HERO_BG, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', opacity: 1 - q }} />}
        <div style={{ ...fill, borderRadius: 'inherit', border: `${px(1)}px solid ${colors.hairline}`, background: ROW_BG, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)', opacity: lk }} />
        {hero && heroLines(heroFit(card.clues[i]), clamp01(1 - p * 2.2))}
        <div style={{ position: 'absolute', left: px(ROW_PAD), top: 0, height: '100%', width: px(rowTextW), display: 'flex', alignItems: 'center', opacity: hero ? clamp01((p - 0.45) * 2.2) : 1 }}>
          <Lines lines={historyFit(card.clues[i]).lines} size={HISTORY.size} lineHeight={HISTORY.lineHeight} color={colors.ink} />
        </div>
        <div style={{ position: 'absolute', right: px(ROW_PAD), top: px(hero ? lerp(LAYOUT.heroPadY + 4, 0, p) : 0), height: px(hero ? lerp(type.chip.size, LAYOUT.rowH, p) : LAYOUT.rowH), display: 'flex', alignItems: 'center' }}>
          <Tag text={pointsLabel(card.points[i])} color={accent} opacity={hero ? lerp(1, 0.85, q) : 0.85} />
        </div>
      </div>
    );
  });

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(FIELD.w), height: px(FIELD.h), pointerEvents: 'none' }}>
      {cards}

      {/* new hero card: rises 24 units, scales 0.94 -> 1, fades in on the same spring */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: px(LAYOUT.heroH), boxSizing: 'border-box', overflow: 'hidden', zIndex: 1,
          borderRadius: px(LAYOUT.radius.surface), border: `${px(1.5)}px solid ${accent}`, background: HERO_BG, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          opacity: clamp01(p * 2.2), transform: `translateY(${px((1 - p) * 24)}px) scale(${lerp(0.94, 1, p)})`, transformOrigin: '50% 50%',
        }}
      >
        {heroLines(heroNow, 1)}
        <div style={{ position: 'absolute', right: px(LAYOUT.heroPadX), top: px(LAYOUT.heroPadY + 4) }}>
          <Tag text={pointsLabel(card.points[m])} color={accent} />
        </div>
      </div>
    </div>
  );
};
