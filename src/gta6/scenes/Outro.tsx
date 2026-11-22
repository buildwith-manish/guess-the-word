import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FrostCard } from '../components';
import { items } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { FRAME, SAFE, colors, levelBackground, radius, springAt, textStyle, u } from '../system';
import { outroSec, secToTicks } from '../timing';
import { ScoreCard, SCORE_BEATS } from './ScoreCard';

/**
 * Outro (timing.ts `outroSec`, 20 s). `frame` = design ticks since the outro segment started.
 *
 * Three on-screen asks, in this order, top half, left column (no voiceover):
 *   1  "Type your score out of {total} in the comments"
 *   2  "Which question got you? Tell me the number"
 *   3  the one subscribe ask: "Next up: {next video}"
 * There is no like or subscribe ask anywhere before the scoreboard; this is the only one.
 *
 * End screen: nothing is drawn for YouTube's next-video and subscribe elements (no outlines, no placeholders): the
 * bottom half stays empty so the real elements can be placed in YouTube Studio wherever they fit.
 * The score card (hard variant, after the last item, settled) stays in the top-right corner as a miniature.
 * Final fade: the last `fadeSec` goes to black.
 *
 * Only the ask copy below is written here; the total comes from data.ts and every length from timing.ts or OUTRO.
 */
export const OUTRO_TEXT = {
  commentScore: (total: number) => `Type your score out of ${total} in the comments`,
  commentNumber: 'Which question got you? Tell me the number',
  nextUp: 'Next up: NFL Thanksgiving quiz',
} as const;

/** Seconds from the start of the outro. */
export const OUTRO = { asksSec: [0.4, 2.6, 4.8], fadeSec: 1, cardSec: 0.2 } as const;

export const outroTicks = secToTicks(outroSec);
export const outroBeats = {
  asks: OUTRO.asksSec.map(secToTicks),
  card: secToTicks(OUTRO.cardSec),
  fade: outroTicks - secToTicks(OUTRO.fadeSec),
  end: outroTicks,
} as const;

/** Cues, absolute design ticks, for an outro that starts at `start`. */
export const outroCues = (start = 0): SfxCue[] => [
  cue('scorecard', start + outroBeats.card),
  cue('notification', start + outroBeats.asks[0]),
  cue('notification', start + outroBeats.asks[1]),
  cue('ping-medium', start + outroBeats.asks[2]),
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const MINI = 0.24; // score card miniature scale
const SETTLED = SCORE_BEATS.ringsAt + SCORE_BEATS.ringsLen + 30; // a tick after every beat of ScoreCard has finished
const last = items[items.length - 1];

const Ask: React.FC<{ text: string; frame: number; at: number; accent?: string }> = ({ text, frame, at, accent }) => (
  <FrostCard frame={frame} at={at} width={1230} padding={28} radius={radius.lg} style={accent ? { border: `${u(2)}px solid ${accent}` } : undefined}>
    <div style={{ ...textStyle('choice'), fontSize: u(46), color: colors.ink }}>{text}</div>
  </FrostCard>
);

export const Outro: React.FC<{ frame: number }> = ({ frame }) => {
  const card = springAt(frame, outroBeats.card, 'gentle');
  const fade = clamp01((frame - outroBeats.fade) / (outroBeats.end - outroBeats.fade));
  const texts = [OUTRO_TEXT.commentScore(items.length), OUTRO_TEXT.commentNumber, OUTRO_TEXT.nextUp];
  return (
    <AbsoluteFill style={{ background: levelBackground.hard }}>
      <div style={{ position: 'absolute', left: u(SAFE.x), top: u(SAFE.top + 40), display: 'flex', flexDirection: 'column', gap: u(24) }}>
        {texts.map((t, i) => (
          <Ask key={i} text={t} frame={frame} at={outroBeats.asks[i]} accent={i === 2 ? colors.hard : undefined} />
        ))}
      </div>

      {/* score card, kept in the corner */}
      <div
        style={{
          position: 'absolute',
          right: u(SAFE.x),
          top: u(SAFE.top),
          width: u(FRAME.w * MINI),
          height: u(FRAME.h * MINI),
          overflow: 'hidden',
          borderRadius: u(radius.md),
          border: `${u(1.5)}px solid ${colors.hairline}`,
          opacity: card,
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: u(FRAME.w), height: u(FRAME.h), transform: `scale(${MINI})`, transformOrigin: 'top left' }}>
          <ScoreCard level="hard" after={last} frame={SETTLED} />
        </div>
      </div>

      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

export default Outro;
