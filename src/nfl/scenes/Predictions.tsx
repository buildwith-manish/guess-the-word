/**
 * Predictions (NFL, task 4e): the predictions segment (predictionsLenSec in timing.ts, about 25 s).
 *
 * Three iOS lock-screen notification cards, one per game, each with the kickoff time (ET) and the matchup. Card text
 * comes from docs/nfl/picks.json through data.ts only. Cards enter one by one at the start of their voice slot
 * (predictionsPlan in timing.ts: slot 0 = intro, slots 1..3 = pick 1..3). The line being spoken is also shown as text
 * under the cards (lineText('prediction', key), the same keys the audio map gives the clips; empty until 5a writes
 * lines.generated.ts).
 *
 * If any pick field is null the scene draws a red "FILL IN PICKS" bar across every frame and the empty fields say it
 * too. `scripts/check_nfl_data.ts --qa` fails on the same condition, so an unfilled scene cannot ship.
 *
 * `picks` prop: optional override of picks.json, for stills with sample data (`remotion still ... --props`). Never
 * committed; the default is the data from picks.json.
 *
 * Text sizes stay in the centre 80% (SAFE.x 128 to 1152, SAFE.top 72 to 648). `frame` / `at` are design ticks (30 fps).
 * Exports: Predictions, predictionsMarks, predictionsCues, predictionsVoice.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { picks as dataPicks, picksFilled, predictionsText, type Pick } from '../data';
import { lineText } from '../lines';
import { cue, type SfxCue } from '../sfx';
import { FRAME, SAFE, blurPx, colors, levelBackground, px, radius, springAt, textStyle } from '../system';
import { predictionsPlan, useNflFrame } from '../timing';

const CARD_W = 960;
const CARD_H = 148;
const CARD_GAP = 12;
const STACK_TOP = SAFE.top + 8;
const CAPTION_TOP = STACK_TOP + 3 * CARD_H + 2 * CARD_GAP + 12;

/** Marks in ticks from the segment start: when each pick card enters, taken from the plan. */
export const predictionsMarks = () => ({
  intro: predictionsPlan.intro.from,
  cards: predictionsPlan.picks.map((r) => r.from),
  end: predictionsPlan.len,
});

/** SFX cues, `at` = tick the segment starts in the caller's clock: the notification sound with each card. */
export const predictionsCues = (at: number): SfxCue[] => predictionsMarks().cards.map((t) => cue('notification', at + t));

/** Voice clips: type 'prediction', keys '0' (intro) to '3', each at the start of its slot. */
export const predictionsVoice = (at: number) => [
  { type: 'prediction' as const, key: '0', tick: at + predictionsPlan.intro.from },
  ...predictionsPlan.picks.map((r, i) => ({ type: 'prediction' as const, key: String(i + 1), tick: at + r.from })),
];

const Missing: React.FC = () => <span style={{ color: colors.red, fontWeight: 800 }}>{predictionsText.placeholder}</span>;

const PickCard: React.FC<{ pick: Pick; n: number; frame: number; at: number; active: boolean; top: number }> = ({ pick, n, frame, at, active, top }) => {
  if (frame < at) return null;
  const p = springAt(frame, at, 'gentle');
  return (
    <div
      style={{
        position: 'absolute',
        left: px((FRAME.w - CARD_W) / 2),
        top: px(top),
        width: px(CARD_W),
        height: px(CARD_H),
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: px(19),
        padding: px(19),
        borderRadius: px(radius.xl),
        background: colors.glassStrong,
        border: `${px(active ? 3 : 1)}px solid ${active ? colors.amber : colors.hairline}`,
        backdropFilter: `blur(${px(blurPx)}px) saturate(1.5)`,
        boxShadow: `0 ${px(13)}px ${px(40)}px ${colors.shadow}`,
        opacity: Math.min(1, p * 1.6),
        transform: `translateY(${-(1 - p) * px(120)}px)`,
      }}
    >
      <div style={{ width: px(70), height: px(70), flex: 'none', borderRadius: px(radius.md), background: colors.amber }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(16) }}>
          <span style={{ ...textStyle('caption'), fontWeight: 600, letterSpacing: px(1.5), color: colors.muted }}>
            {predictionsText.appName.toUpperCase()} · {predictionsText.pickLabel(n)}
          </span>
          <span style={{ ...textStyle('caption'), fontWeight: 700, color: colors.ink, whiteSpace: 'nowrap' }}>
            {predictionsText.kickoffLabel}: {pick.kickoffET === null ? <Missing /> : pick.kickoffET}
          </span>
        </div>
        <div style={{ ...textStyle('body'), fontSize: px(32), fontWeight: 700, color: colors.ink, marginTop: px(4), lineHeight: 1.15 }}>
          {pick.matchup === null ? <Missing /> : pick.matchup}
        </div>
      </div>
    </div>
  );
};

export const Predictions: React.FC<{ at?: number; picks?: Pick[] }> = ({ at = 0, picks = dataPicks }) => {
  const frame = useNflFrame();
  const t = frame - at;
  const m = predictionsMarks();
  const slots = [predictionsPlan.intro, ...predictionsPlan.picks];
  const slot = Math.max(0, slots.findIndex((r) => t >= r.from && t < r.to));
  const spoken = lineText('prediction', String(slot));
  const filled = picksFilled(picks);

  return (
    <AbsoluteFill style={{ background: levelBackground.hof }}>
      {m.cards.map((from, i) => (
        <PickCard
          key={i}
          pick={picks[i] ?? { pick: i + 1, matchup: null, kickoffET: null }}
          n={i + 1}
          frame={frame}
          at={at + from}
          active={slot === i + 1}
          top={STACK_TOP + i * (CARD_H + CARD_GAP)}
        />
      ))}

      {spoken ? (
        <div
          style={{
            position: 'absolute',
            left: px(SAFE.x),
            width: px(FRAME.w - 2 * SAFE.x),
            top: px(CAPTION_TOP),
            textAlign: 'center',
            ...textStyle('body'),
            fontWeight: 600,
            color: colors.ink,
          }}
        >
          {spoken}
        </div>
      ) : null}

      {!filled ? (
        <div
          style={{
            position: 'absolute',
            left: px(SAFE.x),
            width: px(FRAME.w - 2 * SAFE.x),
            top: px(FRAME.h / 2 - 48),
            height: px(96),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.red,
            color: colors.onAccent,
            borderRadius: px(radius.md),
            ...textStyle('title'),
            fontWeight: 800,
            letterSpacing: px(2),
            boxShadow: `0 ${px(8)}px ${px(30)}px ${colors.shadow}`,
          }}
        >
          {predictionsText.placeholder}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
