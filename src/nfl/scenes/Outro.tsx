import React from 'react';
import { AbsoluteFill } from 'remotion';
import { cards } from '../data';
import { lineText } from '../lines';
import { cue, type SfxCue } from '../sfx';
import { FrostCard } from '../shared/FrostCard';
import { FRAME, SAFE, colors, levelBackground, px, textStyle } from '../system';
import { OUTRO_CLIPS, outroFadeSec, outroLenSec, outroLineStarts, secToTicks } from '../timing';

/**
 * Outro. `frame` = design ticks since the outro segment started. The five spoken lines (docs/nfl/lines.csv, keys '1'..'5')
 * are also drawn as text, one at a time in the top half, each from the start of its voice slot (`outroLineStarts`).
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

export const Outro: React.FC<{ frame: number }> = ({ frame }) => {
  const marks = outroMarks();
  let active = -1;
  marks.lines.forEach((t, i) => {
    if (frame >= t) active = i;
  });
  const key = String(active + 1);
  const text = active >= 0 && active < OUTRO_CLIPS ? lineText('outro', key) : undefined;
  const fade = clamp01((frame - marks.fade) / (marks.end - marks.fade));
  const last = cards[cards.length - 1];
  return (
    <AbsoluteFill style={{ background: levelBackground[last.level] }}>
      {text ? (
        <div style={{ position: 'absolute', left: px(SAFE.x), right: px(SAFE.x), top: px(SAFE.top + 24), display: 'flex', justifyContent: 'center' }}>
          <FrostCard key={active} frame={frame} at={marks.lines[active]} width={FRAME.w - SAFE.x * 2} padding={28} radius={22}>
            <div style={{ ...textStyle('clue'), color: colors.ink, textAlign: 'center' }}>{text}</div>
          </FrostCard>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
