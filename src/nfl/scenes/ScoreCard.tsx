import React from 'react';
import { byLevel, cards, levels, type Card, type Level } from '../data';
import { lineText } from '../lines';
import { cue, type SfxCue } from '../sfx';
import { clamp01 } from '../shared/levelTransition';
import { SPRINGS, colors, easeOut, levelBackground, px, radius, safeBox, springAt, textStyle, FRAME } from '../system';
import { levelNames, scoreCardBeats, secToTicks } from '../timing';

/**
 * Score card after card 10 (Rookie) and card 20 (Starter): three activity rings (one per level) fill with the cards
 * played so far, a counter, one row per level, and the spoken line as text. The Hall of Fame has no score card.
 * Numbers come from data.ts (`after` is the last card played), the line from the script via lines.ts, beats from timing.ts.
 * `frame` is the local design tick (30 fps) from the start of the segment.
 */
export type ScoreCardLevel = Exclude<Level, 'hof'>;

export type ScoreCardProps = {
  level: ScoreCardLevel;
  /** Last card played before this card (timing.ts `scoreCard` segment: `after`). */
  after: Card;
  frame: number;
};

const RING = { box: 300, stroke: 26, radii: [136, 102, 68] } as const;

/** Beat ticks from the segment start. */
export const scoreCardMarks = () => ({
  ringsAt: secToTicks(scoreCardBeats.ringsAt),
  ringsLen: secToTicks(scoreCardBeats.ringsLen),
  stagger: secToTicks(scoreCardBeats.ringStagger),
  text: secToTicks(scoreCardBeats.textAt),
});

/** SFX cue, in design ticks from the start of the video: the score-card sound lands as the rings start to fill. */
export const scoreCardCues = (start: number): SfxCue[] => [cue('score-card', start + secToTicks(scoreCardBeats.ringsAt))];

/** Where the scorecard clip starts (the audio map supplies the clip): when the line is up. */
export const scoreCardVoice = (level: ScoreCardLevel, start: number) => ({ type: 'scorecard' as const, key: level, tick: start + secToTicks(scoreCardBeats.textAt) });

/** Cards of `level` played up to and including `after`, and how many the level has. */
const progress = (level: Level, after: Card) => ({ done: byLevel[level].filter((c) => c.n <= after.n).length, total: byLevel[level].length });

export const ScoreCard: React.FC<ScoreCardProps> = ({ level, after, frame }) => {
  const m = scoreCardMarks();
  const sa = (at: number, preset: keyof typeof SPRINGS): number => (frame < at ? 0 : springAt(frame, at, preset));
  const panelP = sa(0, 'gentle');
  const lineP = sa(m.text, 'gentle');
  const count = Math.round(after.n * easeOut(clamp01((frame - m.ringsAt) / m.ringsLen)));
  const line = lineText('scorecard', level);

  const panelH = 520;
  const C = (r: number) => 2 * Math.PI * r;

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[level] }}>
      <div
        style={{
          position: 'absolute',
          left: px(safeBox.left),
          top: px((FRAME.h - panelH) / 2),
          width: px(safeBox.w),
          height: px(panelH),
          boxSizing: 'border-box',
          padding: px(32),
          display: 'flex',
          alignItems: 'center',
          gap: px(40),
          borderRadius: px(radius.xl),
          background: colors.glass,
          border: `${px(1)}px solid ${colors.hairline}`,
          boxShadow: `0 ${px(16)}px ${px(48)}px ${colors.shadow}`,
          opacity: clamp01(panelP * 1.5),
          transform: `scale(${0.94 + 0.06 * panelP})`,
          transformOrigin: 'center',
        }}
      >
        {/* activity rings: outer = Rookie, then Starter, then Hall of Fame */}
        <svg viewBox={`0 0 ${RING.box} ${RING.box}`} width={px(RING.box)} height={px(RING.box)} style={{ flex: 'none', display: 'block' }}>
          {levels.map((l, i) => {
            const r = RING.radii[i];
            const { done, total } = progress(l, after);
            const p = easeOut(clamp01((frame - m.ringsAt - i * m.stagger) / m.ringsLen));
            const fill = (total > 0 ? done / total : 0) * p;
            return (
              <g key={l} transform={`rotate(-90 ${RING.box / 2} ${RING.box / 2})`}>
                <circle cx={RING.box / 2} cy={RING.box / 2} r={r} fill="none" stroke={colors.glassStrong} strokeWidth={RING.stroke} />
                {fill > 0 && (
                  <circle
                    cx={RING.box / 2}
                    cy={RING.box / 2}
                    r={r}
                    fill="none"
                    stroke={colors.level[l]}
                    strokeWidth={RING.stroke}
                    strokeLinecap="round"
                    strokeDasharray={C(r)}
                    strokeDashoffset={C(r) * (1 - fill)}
                  />
                )}
              </g>
            );
          })}
        </svg>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: px(20) }}>
          <div style={{ ...textStyle('number'), color: colors.ink }}>
            {count}
            <span style={{ color: colors.muted }}>/{cards.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
            {levels.map((l) => {
              const { done, total } = progress(l, after);
              return (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: px(14) }}>
                  <div style={{ width: px(16), height: px(16), borderRadius: px(8), background: colors.level[l], flex: 'none' }} />
                  <div style={{ ...textStyle('body'), color: colors.ink, flex: 1 }}>{levelNames[l]}</div>
                  <div style={{ ...textStyle('body'), color: colors.muted }}>
                    {done}/{total}
                  </div>
                </div>
              );
            })}
          </div>

          {line && (
            <div
              style={{
                ...textStyle('clue'),
                color: colors.ink,
                opacity: clamp01(lineP),
                transform: `translateY(${px(16 * (1 - clamp01(lineP)))}px)`,
              }}
            >
              {line}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
