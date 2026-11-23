import React from 'react';
import { pointsLabel, type Card } from '../data';
import { colors, px, springAt, springOver, textStyle, type } from '../system';
import { HERO, HISTORY, LAYOUT, FIELD, heroFit, historyFit } from './clueLayout';

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
 * Hero + history (iOS-6). A HERO slot (fixed box, top of the field) holds the live clue; four HISTORY rows (fixed boxes
 * below it, clue order) hold the earlier clues in full. Nothing moves or resizes while clues arrive:
 *   - the new clue emerges inside the hero's own mask: it rises from the bottom edge of the hero with the gentle spring
 *     and a slight scale (0.96 -> 1); nothing is drawn outside the hero box while it moves (overflow hidden);
 *   - the clue it replaces fades out of the hero in the first third of the spring, and its history row fades in. Opacity
 *     only, no travel, so there is one main motion.
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

export const ClueStack: React.FC<ClueStackProps> = ({ card, frame, starts, flipTicks }) => {
  const accent = colors.level[card.level];
  let m = -1;
  starts.forEach((s, k) => {
    if (s !== undefined && frame >= s && k < card.clues.length) m = k;
  });
  if (m < 0) return null;
  const p = flipTicks === undefined ? springAt(frame, starts[m], 'gentle') : springOver(frame, starts[m], flipTicks);
  const fadeOut = 1 - clamp01(p * 3); // leaving hero text
  const fadeIn = clamp01(p * 3); // arriving text and the docked row
  const heroNow = heroFit(card.clues[m]);
  const heroPrev = m > 0 ? heroFit(card.clues[m - 1]) : undefined;
  const textW = FIELD.w - LAYOUT.heroPadX * 2 - LAYOUT.tagW;
  const rise = (1 - p) * LAYOUT.heroH * 0.6;

  const heroLines = (f: ReturnType<typeof heroFit>, opacity: number, dy: number, scale: number, key: string) => (
    <div key={key} style={{ position: 'absolute', left: px(LAYOUT.heroPadX), top: 0, bottom: 0, width: px(textW), display: 'flex', alignItems: 'center', opacity, transform: `translateY(${px(dy)}px) scale(${scale})`, transformOrigin: '0% 100%' }}>
      <Lines lines={f.lines} size={f.size} lineHeight={HERO.lineHeight} color={colors.ink} />
    </div>
  );

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: px(FIELD.w), height: px(FIELD.h), pointerEvents: 'none' }}>
      {/* hero: fixed box, masks its own motion */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: px(LAYOUT.heroH), boxSizing: 'border-box', overflow: 'hidden',
          borderRadius: px(LAYOUT.radius.surface), border: `${px(1.5)}px solid ${accent}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06)), rgba(0,0,0,0.30)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        {heroPrev && fadeOut > 0 ? heroLines(heroPrev, fadeOut, 0, 1, `p${m - 1}`) : null}
        {heroLines(heroNow, m === 0 ? Math.min(1, p * 2) : fadeIn, rise, 0.96 + 0.04 * Math.min(1, p), `c${m}`)}
        <div style={{ position: 'absolute', right: px(LAYOUT.heroPadX), top: px(LAYOUT.heroPadY + 4) }}>
          <Tag text={pointsLabel(card.points[m])} color={accent} opacity={m === 0 ? Math.min(1, p * 2) : 1} />
        </div>
      </div>

      {/* history: four fixed rows in clue order; a row is empty until its clue has been replaced in the hero */}
      {Array.from({ length: LAYOUT.historyRows }, (_, j) => {
        const filled = j < m;
        const arriving = j === m - 1; // docks now
        const op = filled ? (arriving ? fadeIn : 1) : 0;
        const fit = historyFit(card.clues[j]);
        return (
          <div
            key={j}
            style={{
              position: 'absolute', left: 0, top: px(LAYOUT.heroH + LAYOUT.rowGap + j * (LAYOUT.rowH + LAYOUT.rowGap)), width: '100%', height: px(LAYOUT.rowH),
              boxSizing: 'border-box', borderRadius: px(LAYOUT.radius.row),
              border: `${px(1)}px solid ${filled ? colors.hairline : 'rgba(255,255,255,0.07)'}`,
              background: filled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
              boxShadow: filled ? 'inset 0 1px 0 rgba(255,255,255,0.10)' : 'none',
              display: 'flex', alignItems: 'center', padding: `0 ${px(16)}px`,
            }}
          >
            {filled ? (
              <>
                <div style={{ flex: 1, opacity: op }}>
                  <Lines lines={fit.lines} size={HISTORY.size} lineHeight={HISTORY.lineHeight} color={colors.ink} />
                </div>
                <Tag text={pointsLabel(card.points[j])} color={accent} opacity={op * 0.85} />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
