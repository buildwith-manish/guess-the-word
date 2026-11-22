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
 * End screen: the last `endScreenSec` (15 s) of the outro. Bottom half holds only two hairline outlines marking where
 * YouTube's elements go (YouTube draws them): the next-video slot and the subscribe circle, see END_SLOTS. Nothing else
 * is drawn below y = FRAME.h / 2.
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
export const OUTRO = { asksSec: [0.4, 2.6, 4.8], endScreenSec: 15, fadeSec: 1, cardSec: 0.2, subscribePulseSec: 0.6 } as const;

export const outroTicks = secToTicks(outroSec);
export const outroBeats = {
  asks: OUTRO.asksSec.map(secToTicks),
  card: secToTicks(OUTRO.cardSec),
  slots: outroTicks - secToTicks(OUTRO.endScreenSec),
  subscribeSlot: outroTicks - secToTicks(OUTRO.endScreenSec) + secToTicks(OUTRO.subscribePulseSec),
  fade: outroTicks - secToTicks(OUTRO.fadeSec),
  end: outroTicks,
} as const;

type R = { x: number; y: number; w: number; h: number };
/** Where YouTube's end-screen elements go, 1920x1080 units, bottom half only. Placeholder geometry: place the real elements in YouTube Studio. */
export const END_SLOTS: { video: R; subscribe: R } = {
  video: { x: 380, y: 600, w: 640, h: 360 },
  subscribe: { x: 1230, y: 670, w: 220, h: 220 },
};

/** Cues, absolute design ticks, for an outro that starts at `start`. */
export const outroCues = (start = 0): SfxCue[] => [
  cue('scorecard', start + outroBeats.card),
  cue('notification', start + outroBeats.asks[0]),
  cue('notification', start + outroBeats.asks[1]),
  cue('ping-medium', start + outroBeats.asks[2]),
  cue('whoosh', start + outroBeats.slots),
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const MINI = 0.24; // score card miniature scale
const SETTLED = SCORE_BEATS.ringsAt + SCORE_BEATS.ringsLen + 30; // a tick after every beat of ScoreCard has finished
const last = items[items.length - 1];

const box = (r: R): React.CSSProperties => ({ position: 'absolute', left: u(r.x), top: u(r.y), width: u(r.w), height: u(r.h), boxSizing: 'border-box' });

const Ask: React.FC<{ text: string; frame: number; at: number; accent?: string }> = ({ text, frame, at, accent }) => (
  <FrostCard frame={frame} at={at} width={1230} padding={28} radius={radius.lg} style={accent ? { border: `${u(2)}px solid ${accent}` } : undefined}>
    <div style={{ ...textStyle('choice'), fontSize: u(46), color: colors.ink }}>{text}</div>
  </FrostCard>
);

const Slots: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < outroBeats.slots) return null;
  const v = springAt(frame, outroBeats.slots, 'gentle');
  const s = springAt(frame, outroBeats.subscribeSlot, 'gentle');
  const pulse = 0.5 + 0.5 * Math.sin((frame - outroBeats.subscribeSlot) / 24);
  return (
    <>
      <div
        style={{
          ...box(END_SLOTS.video),
          borderRadius: u(radius.md),
          border: `${u(2)}px solid ${colors.hairline}`,
          opacity: v,
          transform: `translateY(${(1 - v) * u(24)}px)`,
        }}
      />
      <div
        style={{
          ...box(END_SLOTS.subscribe),
          borderRadius: '50%',
          border: `${u(2)}px solid ${colors.hard}`,
          opacity: s * (0.6 + 0.4 * pulse),
          transform: `scale(${0.9 + 0.1 * s})`,
        }}
      />
    </>
  );
};

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

      <Slots frame={frame} />
      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

export default Outro;
