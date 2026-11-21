import React from 'react';
import { COLORS, FONTS, glass, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { charTick, typedChars } from '../typing';
import { IOS, iosSurface, spring, easeOut } from '../../ios';
import '../../fonts';

/**
 * Generic dark search UI: a rounded bar (magnifier, typewriter, blinking caret) and a
 * "Recent searches" list. A finished search holds a beat, then slides down into the list
 * while the bar clears for the next one.
 *
 * Typing is uneven on purpose (typing.ts): small speed changes, a pause at the start of each word, a longer one
 * after punctuation. Each typed character fades up a little on the shared ease-out.
 * The "Recent searches" list shows only the last `recentCount` finished searches; older ones fade out.
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
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ticks per character of search `i`: a single number applies to every search, an array is one value per search
 *  (a short array repeats its last value). */
export const typeTicksOf = (typeTicks: number | readonly number[], i: number): number =>
  typeof typeTicks === 'number' ? typeTicks : typeTicks[Math.min(i, typeTicks.length - 1)];

export type SearchBarProps = {
  /** The searches, in the order they are typed. */
  searches: string[];
  /** Start tick of each search (same length as `searches`). */
  starts: number[];
  /** Ticks per typed character: one number for all searches, or one value per search. */
  typeTicks: number | readonly number[];
  /** Level accent. Kept for API compatibility; the bar is neutral (the accent lives on the timer, current dot and stamp). */
  accent: string;
  /** Bar width in 1280x720 reference units (passed through px()). */
  size: number;
  /** Bar centre-x and top-y, in 1280x720 reference units (passed through px()). */
  at: { x: number; y: number };
  /** Label above the list. */
  heading?: string;
  /** How many finished searches the list shows at once. Omit to show all of them. */
  recentCount?: number;
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

/**
 * Look (task 7g). Every size is a multiple of `u`, the px per 1280x720 reference unit at this bar width
 * (2 at the stage's own search width). One type scale: CLUE for the big line in the bar (at most 2 lines),
 * LABEL for list rows, HEAD for the small heading. All three stay at or above 28 px at 1440p.
 */
const REF_WIDTH = 576; // the search slot width the proportions below were set for
const CLUE = 26; // 52 px at 1440p
const LABEL = 15; // 30 px
const HEAD = 14; // 28 px
const CLUE_LINE_HEIGHT = 1.25;
/** Typed character: ticks to fade up, rise in em. Motion constants. */
const POP_TICKS = 3;
const POP_RISE = 0.07; // a small, calm rise
/** Part of the slide in which the big clue crossfades into its small list row. */
const XFADE_FROM = 0.25;
const XFADE_SPAN = 0.5;

export const SearchBar: React.FC<SearchBarProps> = ({ searches, starts, typeTicks, size, at, heading = 'Recent searches', recentCount }) => {
  const frame = useDesignFrame();

  const W = px(size);
  const u = W / REF_WIDTH;
  const barH = 100 * u; // room for two lines of clue plus padding
  const barPad = 20 * u;
  const icon = 28 * u;
  const gap = 12 * u;
  const barFont = CLUE * u;
  const rowH = 42 * u;
  const rowFont = LABEL * u;
  const rowIcon = 17 * u;
  const headH = 32 * u;
  const headFont = HEAD * u;
  const listGap = 24 * u;
  const listTop = barH + listGap;
  const rowsTop = listTop + headH;
  const n = searches.length;
  const shown = Math.max(1, Math.min(n, recentCount ?? n)); // rows the list can hold
  const radius = barH * 0.36;

  const barTextX = barPad + icon + gap;
  const rowTextX = barPad + rowIcon + gap;
  const barTextW = W - barTextX - barPad;
  const rowTextW = W - rowTextX - barPad;

  // Eased slide progress per search.
  const tt = (i: number) => typeTicksOf(typeTicks, i);
  const e = searches.map((s, i) =>
    spring((frame - slideStart(starts[i], s.length, tt(i))) / (SLIDE_CHARS * tt(i))),
  );

  // Current search in the bar: the last one that has started and not yet slid away.
  let cur = -1;
  for (let i = 0; i < n; i++) if (frame >= starts[i]) cur = i;
  const inBar = cur >= 0 && e[cur] <= 0;
  const curText = cur >= 0 ? searches[cur] : '';
  const typed = inBar ? typedChars(frame, starts[cur], curText, tt(cur)) : 0;

  // Caret: solid while typing, then a soft blink.
  const typing = inBar && typed < curText.length;
  const blink = 0.5 + 0.5 * Math.cos((frame / (BLINK_CHARS * tt(Math.max(0, cur)))) * Math.PI);
  const caretOpacity = typing ? 1 : clamp01(blink * 1.6);

  // Finished searches that have landed in the list, counted smoothly; the list is as tall as the rows it shows.
  const landed = e.reduce((m, v) => m + clamp01(v), 0);
  const rowsShown = Math.min(shown, landed);
  const panelH = headH + rowsShown * rowH + (rowsShown > 0 ? 16 * u : 0);
  const panelIn = n ? e.reduce((m, v) => Math.max(m, v), 0) : 0;

  // The clue as words of characters: every character is always laid out (so lines never re-wrap while typing)
  // and fades up when its tick comes. The caret sits after the last typed character.
  const caretAfter = typed === curText.length || curText[typed] === ' ' ? typed - 1 : null;
  const caretBefore = caretAfter === null ? typed : null;
  const caretEl = (
    <span style={{ position: 'relative', display: 'inline-block', width: 0, height: barFont * 1.05, verticalAlign: 'text-bottom' }}>
      <span
        style={{
          position: 'absolute',
          left: barFont * 0.07,
          top: 0,
          width: barFont * 0.09,
          height: '100%',
          borderRadius: barFont * 0.05,
          background: IOS.color.blue,
          opacity: caretOpacity,
        }}
      />
    </span>
  );
  const clueNodes: React.ReactNode[] = [];
  if (inBar) {
    let idx = 0;
    curText.split(' ').forEach((word, wi) => {
      const chars: React.ReactNode[] = [];
      for (let c = 0; c < word.length; c++, idx++) {
        const age = frame - charTick(starts[cur], curText, idx + 1, tt(cur));
        const pop = idx < typed ? easeOut(age / POP_TICKS) : 0;
        if (caretBefore === idx) chars.push(<React.Fragment key={`c${idx}`}>{caretEl}</React.Fragment>);
        chars.push(
          <span
            key={idx}
            style={{
              display: 'inline-block',
              opacity: pop,
              transform: `translateY(${(1 - pop) * POP_RISE * barFont}px)`,
            }}
          >
            {word[c]}
          </span>,
        );
        if (caretAfter === idx) chars.push(<React.Fragment key={`a${idx}`}>{caretEl}</React.Fragment>);
      }
      if (wi > 0) clueNodes.push(' ');
      clueNodes.push(
        <span key={`w${wi}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {chars}
        </span>,
      );
      idx++; // the space after the word
    });
  } else {
    clueNodes.push(caretEl); // empty bar: just the blinking caret
  }

  // Glass surface: frosted, dark-tinted so light text stays readable over the moving background.
  const surface = (r: number, shadowY: number, shadowBlur: number): React.CSSProperties => ({
    ...iosSurface(r),
    boxShadow: `0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.28)`,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: px(at.x) - W / 2,
        top: px(at.y),
        width: W,
        fontFamily: IOS.font,
        fontWeight: IOS.weight.medium,
        color: IOS.color.label,
      }}
    >
      {/* Bar: the hero. Up to two lines of clue, vertically centred. */}
      <div
        style={{
          position: 'relative',
          height: barH,
          ...surface(radius, 12 * u, 40 * u),
          boxShadow: `0 ${12 * u}px ${40 * u}px rgba(0,0,0,0.28)`,
        }}
      >
        <div style={{ position: 'absolute', left: barPad, top: (barH - icon) / 2, display: 'flex' }}>
          <Magnifier s={icon} color={IOS.color.secondary} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: barTextX,
            top: 0,
            width: barTextW,
            height: barH,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: barTextW,
              fontSize: barFont,
              lineHeight: CLUE_LINE_HEIGHT,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          >
            {clueNodes}
          </div>
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
          opacity: panelIn,
          ...surface(radius * 0.8, 10 * u, 32 * u),
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
            fontSize: headFont,
            fontWeight: IOS.weight.semibold,
            color: IOS.color.secondary,
            letterSpacing: headFont * 0.02,
          }}
        >
          {heading}
        </div>
      </div>

      {/* Rows: newest on top. Row i sits below one slot for every later search that has landed.
          The big clue (ghost) shrinks and moves while it crossfades into the small row, so the text
          never re-wraps mid-slide. */}
      {searches.map((s, i) => {
        if (e[i] <= 0) return null;
        let slot = 0;
        for (let j = i + 1; j < n; j++) slot += e[j];
        const y = lerp(0, rowsTop + slot * rowH, e[i]);
        const h = lerp(barH, rowH, e[i]);
        const x = lerp(barTextX, rowTextX, e[i]);
        const settled = clamp01(e[i]);
        const f = easeOut((e[i] - XFADE_FROM) / XFADE_SPAN);
        const shrink = lerp(1, rowFont / barFont, e[i]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: y,
              width: W,
              height: h,
              opacity: clamp01(shown - slot),
            }}
          >
            {slot > 0 ? (
              <div style={{ position: 'absolute', left: rowTextX, right: barPad, top: 0, height: px(1), background: IOS.color.hairline, opacity: clamp01(slot) * settled }} />
            ) : null}
            <div style={{ position: 'absolute', left: barPad, top: (h - rowIcon) / 2, display: 'flex', opacity: settled }}>
              <Clock s={rowIcon} color={IOS.color.tertiary} />
            </div>
            {/* ghost: the big clue, scaled down */}
            <div
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: barTextW,
                height: h,
                display: 'flex',
                alignItems: 'center',
                opacity: 1 - f,
              }}
            >
              <div
                style={{
                  width: barTextW,
                  fontSize: barFont,
                  lineHeight: CLUE_LINE_HEIGHT,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  transform: `scale(${shrink})`,
                  transformOrigin: 'left center',
                }}
              >
                {s}
              </div>
            </div>
            {/* list row at its final size */}
            <div
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: rowTextW,
                height: h,
                display: 'flex',
                alignItems: 'center',
                fontSize: rowFont,
                lineHeight: 1.25,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                color: IOS.color.label,
                opacity: f,
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
