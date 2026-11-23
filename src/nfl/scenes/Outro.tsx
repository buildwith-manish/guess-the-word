import React from 'react';
import { AbsoluteFill } from 'remotion';
import { cards } from '../data';
import { lineText } from '../lines';
import { cue, type SfxCue } from '../sfx';
import { FrostCard } from '../shared/FrostCard';
import { FRAME, SAFE, colors, levelBackground, px, textStyle } from '../system';
import { prepClue, wrapBalanced } from '../components/clueLayout';
import { outroFadeSec, outroLenSec, outroLineStarts, secToTicks } from '../timing';

/**
 * Outro. `frame` = design ticks since the outro segment started. The five spoken lines (docs/nfl/lines.csv, keys '1'..'5')
 * are also drawn as text, all on ONE screen (iOS-10): a stack of cards in the top half, each card appearing in its own slot
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

/** Stack layout (reference units): from y 68 (under the 48-high top row) down; the whole stack ends near y 360, so the bottom half stays free for the end screen. */
const STACK = { top: 68, gap: 8, size: 28, lineHeight: 1.15, padX: 16, padY: 6, radius: 16 } as const;

export const Outro: React.FC<{ frame: number }> = ({ frame }) => {
  const marks = outroMarks();
  const W = FRAME.w - SAFE.x * 2;
  let y: number = STACK.top;
  const rows = marks.lines.flatMap((t, i) => {
    const text = lineText('outro', String(i + 1));
    if (!text) return [];
    const lines = wrapBalanced(prepClue(text), STACK.size, (W - STACK.padX * 2) * 0.97);
    const h = Math.ceil(lines.length * STACK.size * STACK.lineHeight + STACK.padY * 2);
    const row = { t, lines, h, top: y };
    y += h + STACK.gap;
    return [row];
  });
  const fade = clamp01((frame - marks.fade) / (marks.end - marks.fade));
  const last = cards[cards.length - 1];
  return (
    <AbsoluteFill style={{ background: levelBackground[last.level] }}>
      {rows.map((r, i) =>
        frame >= r.t ? (
          <div key={i} style={{ position: 'absolute', left: px(SAFE.x), top: px(r.top) }}>
            <FrostCard frame={frame} at={r.t} width={W} height={r.h} padding={0} radius={STACK.radius}>
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${px(STACK.padX)}px`, boxSizing: 'border-box' }}>
                <div style={{ ...textStyle('clue'), fontSize: px(STACK.size), lineHeight: STACK.lineHeight, color: colors.ink, textAlign: 'center' }}>
                  {r.lines.map((l, k) => (
                    <div key={k} style={{ whiteSpace: 'nowrap' }}>{l}</div>
                  ))}
                </div>
              </div>
            </FrostCard>
          </div>
        ) : null,
      )}
      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
