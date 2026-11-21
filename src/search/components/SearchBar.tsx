import React from 'react';
import { COLORS, FONTS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import '../../fonts';

/**
 * Generic dark search UI: a rounded bar (magnifier, typewriter, blinking caret) and a
 * "Recent searches" list. A finished search holds a beat, then slides down into the list
 * while the bar clears for the next one.
 *
 * All times are 30 fps design ticks, sampled at 60 fps through useDesignFrame().
 * `frame` below always means design ticks local to the scene that mounts this component.
 */

/** Hold after the last character, in typed characters' worth of ticks. Proportion of typeTicks. */
export const HOLD_CHARS = 6;
/** Slide-down length, in typed characters' worth of ticks. Proportion of typeTicks. */
export const SLIDE_CHARS = 8;
/** Caret blink half-period, in typed characters' worth of ticks. */
const BLINK_CHARS = 8;

/**
 * How many characters are visible at `frame`.
 * Character k (1-based) appears at start + (k - 1) * typeTicks, so the first one lands exactly on `start`.
 * `length` is the string length. `typeTicks` is ticks per character (default 1 = one per tick; pass the setting).
 * For a key-click on every second character: cues at start + (k - 1) * typeTicks for even k.
 */
export const typedCount = (frame: number, start: number, length: number, typeTicks = 1): number => {
  if (frame < start) return 0;
  return Math.min(length, Math.floor((frame - start) / typeTicks) + 1);
};

/** Tick at which a search of `length` characters starts sliding into the list. */
export const slideStart = (start: number, length: number, typeTicks: number): number =>
  start + length * typeTicks + HOLD_CHARS * typeTicks;

/** Tick at which the slide has finished. */
export const slideEnd = (start: number, length: number, typeTicks: number): number =>
  slideStart(start, length, typeTicks) + SLIDE_CHARS * typeTicks;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type SearchBarProps = {
  /** The searches, in the order they are typed. */
  searches: string[];
  /** Start tick of each search (same length as `searches`). */
  starts: number[];
  /** Ticks per typed character. */
  typeTicks: number;
  /** Accent colour (caret, magnifier, bar glow). */
  accent: string;
  /** Bar width in 1280x720 reference units (passed through px()). */
  size: number;
  /** Bar centre-x and top-y, in 1280x720 reference units (passed through px()). */
  at: { x: number; y: number };
  /** Label above the list. */
  heading?: string;
};

const Magnifier: React.FC<{ s: number; color: string }> = ({ s, color }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <line x1="15.4" y1="15.4" x2="21" y2="21" />
  </svg>
);

const Clock: React.FC<{ s: number; color: string }> = ({ s, color }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12,7 12,12 15.5,14" />
  </svg>
);

export const SearchBar: React.FC<SearchBarProps> = ({
  searches,
  starts,
  typeTicks,
  accent,
  size,
  at,
  heading = 'Recent searches',
}) => {
  const frame = useDesignFrame();

  // Layout proportions, all derived from the bar width.
  const W = px(size);
  const barH = W * 0.13;
  const barPad = barH * 0.4;
  const icon = barH * 0.42;
  const gap = barH * 0.3;
  const barFont = barH * 0.4;
  const rowH = barH * 0.82;
  const rowFont = barH * 0.32;
  const rowIcon = rowH * 0.42;
  const headH = barH * 0.62;
  const listGap = barH * 0.45;
  const listTop = barH + listGap;
  const rowsTop = listTop + headH;
  const n = searches.length;
  const panelH = headH + n * rowH + barH * 0.2;

  // Eased slide progress per search.
  const e = searches.map((s, i) =>
    easeOut((frame - slideStart(starts[i], s.length, typeTicks)) / (SLIDE_CHARS * typeTicks)),
  );

  // Current search in the bar: the last one that has started and not yet slid away.
  let cur = -1;
  for (let i = 0; i < n; i++) if (frame >= starts[i]) cur = i;
  const barText =
    cur >= 0 && e[cur] <= 0 ? searches[cur].slice(0, typedCount(frame, starts[cur], searches[cur].length, typeTicks)) : '';

  // Caret: solid while typing, blinking otherwise.
  const typing = cur >= 0 && e[cur] <= 0 && typedCount(frame, starts[cur], searches[cur].length, typeTicks) < searches[cur].length;
  const blinkOn = Math.floor(frame / (BLINK_CHARS * typeTicks)) % 2 === 0;
  const caretOn = typing || blinkOn;

  const barTextX = barPad + icon + gap;
  const rowTextX = barPad + rowIcon + gap;
  const panelIn = n ? e.reduce((m, v) => Math.max(m, v), 0) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: px(at.x) - W / 2,
        top: px(at.y),
        width: W,
        fontFamily: FONTS.body,
        color: COLORS.ink,
      }}
    >
      {/* Bar */}
      <div
        style={{
          position: 'relative',
          height: barH,
          borderRadius: barH / 2,
          background: COLORS.glassStrong,
          border: `${px(1.5)}px solid ${COLORS.stroke}`,
          boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.45), 0 0 ${px(26)}px ${accent}33`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'absolute', left: barPad, top: (barH - icon) / 2, display: 'flex' }}>
          <Magnifier s={icon} color={accent} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: barTextX,
            top: 0,
            height: barH,
            display: 'flex',
            alignItems: 'center',
            fontSize: barFont,
            whiteSpace: 'pre',
          }}
        >
          <span>{barText}</span>
          <span
            style={{
              display: 'inline-block',
              width: barFont * 0.09,
              height: barFont * 1.15,
              marginLeft: barFont * 0.1,
              borderRadius: barFont * 0.05,
              background: accent,
              opacity: caretOn ? 1 : 0,
            }}
          />
        </div>
      </div>

      {/* Recent searches panel */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: listTop,
          width: W,
          height: panelH,
          borderRadius: barH * 0.4,
          background: COLORS.glassStrong,
          border: `${px(1.5)}px solid ${COLORS.stroke}`,
          boxSizing: 'border-box',
          opacity: panelIn,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: barPad,
            top: 0,
            height: headH,
            display: 'flex',
            alignItems: 'center',
            fontSize: barH * 0.26,
            color: COLORS.muted,
            letterSpacing: barH * 0.012,
            textTransform: 'uppercase',
          }}
        >
          {heading}
        </div>
      </div>

      {/* Rows: newest on top. Row i sits below one slot for every later search that has landed. */}
      {searches.map((s, i) => {
        if (e[i] <= 0) return null;
        let slot = 0;
        for (let j = i + 1; j < n; j++) slot += e[j];
        const barRowY = (barH - rowH) / 2;
        const y = lerp(barRowY, rowsTop + slot * rowH, e[i]);
        const x = lerp(barTextX, rowTextX, e[i]);
        const fs = lerp(barFont, rowFont, e[i]);
        const settled = clamp01(e[i]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: y,
              width: W,
              height: rowH,
              opacity: slot > n - 1 ? 0 : 1,
            }}
          >
            <div style={{ position: 'absolute', left: barPad, top: (rowH - rowIcon) / 2, display: 'flex', opacity: settled }}>
              <Clock s={rowIcon} color={COLORS.muted} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                fontSize: fs,
                whiteSpace: 'pre',
                color: COLORS.ink,
              }}
            >
              {s}
            </div>
          </div>
        );
      })}
    </div>
  );
};
