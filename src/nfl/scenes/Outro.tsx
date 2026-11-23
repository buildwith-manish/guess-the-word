import React from 'react';
import { AbsoluteFill } from 'remotion';
import { cards } from '../data';
import { lineText } from '../lines';
import { cue, type SfxCue } from '../sfx';
import { FrostCard } from '../shared/FrostCard';
import { FRAME, SAFE, colors, levelBackground, px, textStyle } from '../system';
import { prepClue, wrapBalanced } from '../components/clueLayout';
import { endScreenSec, outroFadeSec, outroLenSec, outroLineStarts, secToTicks } from '../timing';

/**
 * Outro. `frame` = design ticks since the outro segment started. The five spoken lines (docs/nfl/lines.csv, keys '1'..'5')
 * are also drawn as text, all on ONE screen (iOS-10, full screen from iOS-13): a stack of cards, each card appearing in its own slot
 * (rise-in, `gentle` spring) at the start of its voice slot (`outroLineStarts`) and staying until the fade. Every card has a
 * fixed position worked out from all five texts up front, so nothing moves when a card arrives.
 * End screen: nothing is drawn in the bottom half (YouTube's elements go there). The last `outroFadeSec` fades to black.
 * No copy is written here: the text is the script's, the starts and the length come from timing.ts.
 */
export const outroMarks = () => {
  const end = secToTicks(outroLenSec);
  return { lines: outroLineStarts, fade: end - secToTicks(outroFadeSec), end };
};

/** Cues in ticks, `start` = the tick the outro starts at in the caller's clock: a notification per line, the sting as the fade starts. */
export const outroCues = (start: number): SfxCue[] => {
  const m = outroMarks();
  return [...m.lines.map((t) => cue('notification', start + t)), cue('end-sting', start + m.fade)];
};

/** Voice clips: type 'outro', keys '1'..'5', each at the start of its slot. */
export const outroVoice = (start: number) => outroMarks().lines.map((t, i) => ({ type: 'outro' as const, key: String(i + 1), tick: start + t }));

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * iOS-13: FULL-SCREEN stack while the lines play. Five large notification-style cards fill y 72 to 648 (the safe box), each
 * with an icon tile in the level colour, glass tinted with it, 40-unit left-aligned text; heights follow the line counts.
 * When the end screen starts (last `endScreenSec`), the cards fade out and the compact top-half stack (iOS-10, 28-unit text,
 * ends near y 357) takes over, so YouTube's end-screen elements in the bottom half never sit on text. A line that starts
 * after that point appears directly in the compact stack.
 */
const FULL = { top: 72, bottom: 648, gap: 12, size: 40, lineHeight: 1.15, padX: 24, tile: 56, tileGap: 20, radius: 28 } as const;
const STACK = { top: 68, gap: 8, size: 28, lineHeight: 1.15, padX: 16, padY: 6, radius: 16 } as const;

/** Our own 24-grid line icons (one stroke weight), one per script line in order; no logos. */
const GLYPHS: React.ReactNode[] = [
  <path key="c" d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />, // comment
  <g key="q"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8" /><path d="M12 17h.01" /></g>, // which card
  <g key="l"><path d="M10 6h10M10 12h10M10 18h10" /><path d="M3.5 6l1.5 1.5L7.5 4.5M3.5 12l1.5 1.5 2.5-3M3.5 18l1.5 1.5 2.5-3" /></g>, // picks
  <path key="b" d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21a2 2 0 0 0 4 0" />, // subscribe
  <g key="p"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10.5 9.5l4 2.5-4 2.5z" /></g>, // full quiz
];

export const Outro: React.FC<{ frame: number }> = ({ frame }) => {
  const marks = outroMarks();
  const W = FRAME.w - SAFE.x * 2;
  const endAt = marks.end - secToTicks(endScreenSec);
  const fo = clamp01((frame - endAt) / secToTicks(0.3));
  const last = cards[cards.length - 1];
  const accent = colors.level[last.level];

  const texts = marks.lines.map((t, i) => ({ t, i, text: lineText('outro', String(i + 1)) })).filter((r) => r.text) as { t: number; i: number; text: string }[];

  // full layout: heights share the safe box in proportion to the line counts
  const fullTextW = W - FULL.padX * 2 - FULL.tile - FULL.tileGap;
  const fullLines = texts.map((r) => wrapBalanced(prepClue(r.text), FULL.size, fullTextW * 0.97));
  const units = fullLines.reduce((n, l) => n + l.length, 0);
  const unit = (FULL.bottom - FULL.top - FULL.gap * (texts.length - 1)) / Math.max(1, units);
  let fy: number = FULL.top;
  const full = texts.map((r, k) => {
    const h = Math.round(unit * fullLines[k].length);
    const row = { ...r, lines: fullLines[k], h, top: fy };
    fy += h + FULL.gap;
    return row;
  });

  // compact layout (iOS-10)
  let y: number = STACK.top;
  const compact = texts.map((r) => {
    const lines = wrapBalanced(prepClue(r.text), STACK.size, (W - STACK.padX * 2) * 0.97);
    const h = Math.ceil(lines.length * STACK.size * STACK.lineHeight + STACK.padY * 2);
    const row = { ...r, lines, h, top: y };
    y += h + STACK.gap;
    return row;
  });

  const fade = clamp01((frame - marks.fade) / (marks.end - marks.fade));
  return (
    <AbsoluteFill style={{ background: levelBackground[last.level] }}>
      {fo < 1 &&
        full.map((r) =>
          frame >= r.t && r.t < endAt ? (
            <div key={`f${r.i}`} style={{ position: 'absolute', left: px(SAFE.x), top: px(r.top), opacity: 1 - fo }}>
              <FrostCard frame={frame} at={r.t} level={last.level} width={W} height={r.h} padding={0} radius={FULL.radius}>
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: px(FULL.tileGap), padding: `0 ${px(FULL.padX)}px`, boxSizing: 'border-box' }}>
                  <div style={{ flex: 'none', width: px(FULL.tile), height: px(FULL.tile), borderRadius: px(16), background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" width={px(32)} height={px(32)} fill="none" stroke={colors.onAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      {GLYPHS[r.i % GLYPHS.length]}
                    </svg>
                  </div>
                  <div style={{ ...textStyle('clue'), fontSize: px(FULL.size), lineHeight: FULL.lineHeight, color: colors.ink, textAlign: 'left' }}>
                    {r.lines.map((l, k) => (
                      <div key={k} style={{ whiteSpace: 'nowrap' }}>{l}</div>
                    ))}
                  </div>
                </div>
              </FrostCard>
            </div>
          ) : null,
        )}
      {compact.map((r) => {
        const at = Math.max(r.t, endAt);
        return frame >= at ? (
          <div key={`c${r.i}`} style={{ position: 'absolute', left: px(SAFE.x), top: px(r.top) }}>
            <FrostCard frame={frame} at={at} width={W} height={r.h} padding={0} radius={STACK.radius}>
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${px(STACK.padX)}px`, boxSizing: 'border-box' }}>
                <div style={{ ...textStyle('clue'), fontSize: px(STACK.size), lineHeight: STACK.lineHeight, color: colors.ink, textAlign: 'center' }}>
                  {r.lines.map((l, k) => (
                    <div key={k} style={{ whiteSpace: 'nowrap' }}>{l}</div>
                  ))}
                </div>
              </div>
            </FrostCard>
          </div>
        ) : null;
      })}
      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
