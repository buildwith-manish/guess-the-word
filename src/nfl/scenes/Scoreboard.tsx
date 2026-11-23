import React from 'react';
import { byLevel, levels, ranks } from '../data';
import { cue, type SfxCue } from '../sfx';
import { clamp01 } from '../shared/levelTransition';
import { SPRINGS, colors, easeOut, levelBackground, px, radius, safeBox, springAt, textStyle } from '../system';
import { scoreboardPlan } from '../timing';

/**
 * Scoreboard: the activity rings fill, then the five rank bands light from the lowest to the highest, each with its
 * voiceover line (clip key = position in `ranks`, best = 1; the audio map supplies the clips). It is ONE card throughout:
 * all five tiers are on it from the first frame, dim, and light one by one. When the last (highest) tier has lit and
 * settled, the card holds with all five lit and nothing moving (`scoreboardPlan.hold`, at least `rankFinalHoldSec`):
 * that is the screenshot frame. Rank names and score ranges come from data.ts, every length from timing.ts.
 * `frame` is the local design tick (30 fps) from the start of the segment.
 */
export type ScoreboardProps = { frame: number };

const RING = { box: 200, stroke: 20, radii: [86, 64, 42] } as const;

/** SFX cues in design ticks from the start of the video: one rank-reveal as each rank lights. */
export const scoreboardCues = (start: number): SfxCue[] => scoreboardPlan.steps.map((s) => cue('rank-reveal', start + s.from));

/** Rank clip starts (the audio map supplies the clips): each plays as its rank lights. */
export const scoreboardVoice = (start: number) => scoreboardPlan.steps.map((s) => ({ type: 'rank' as const, key: s.key, tick: start + s.from }));

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const hexA = (c: string, a: number): string => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};
/** Level-colour ramp, green to amber to red, t = 0 lowest rank .. 1 highest. Returns #rrggbb. */
const ramp = (t: number): string => {
  const stops = [colors.level.rookie, colors.level.starter, colors.level.hof].map(hex);
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [stops[i], stops[i + 1]];
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('')}`;
};

export const Scoreboard: React.FC<ScoreboardProps> = ({ frame }) => {
  const plan = scoreboardPlan;
  const sa = (at: number, preset: keyof typeof SPRINGS): number => (frame < at ? 0 : springAt(frame, at, preset));
  const panelP = sa(0, 'gentle');
  const outLen = Math.round(SPRINGS.gentle * 30);
  const n = ranks.length;

  // rings: each fills to its level's played share (all cards are played by now), staggered across the rings phase
  const ringLen = plan.rings.to * 0.6;
  const ringStagger = (plan.rings.to - ringLen) / Math.max(1, levels.length - 1);
  const C = (r: number) => 2 * Math.PI * r;

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground.starter }}>
      <div
        style={{
          position: 'absolute',
          left: px(safeBox.left),
          top: px(safeBox.top),
          width: px(safeBox.w),
          height: px(safeBox.h),
          boxSizing: 'border-box',
          padding: px(32),
          display: 'flex',
          alignItems: 'center',
          gap: px(32),
          borderRadius: px(radius.xl),
          background: colors.glass,
          border: `${px(1)}px solid ${colors.hairline}`,
          boxShadow: `0 ${px(16)}px ${px(48)}px ${colors.shadow}`,
          opacity: clamp01(panelP * 1.5),
          transform: `scale(${0.96 + 0.04 * panelP})`,
          transformOrigin: 'center',
        }}
      >
        <svg viewBox={`0 0 ${RING.box} ${RING.box}`} width={px(RING.box)} height={px(RING.box)} style={{ flex: 'none', display: 'block' }}>
          {levels.map((l, i) => {
            const r = RING.radii[i];
            const done = byLevel[l].length;
            const total = byLevel[l].length;
            const p = easeOut(clamp01((frame - i * ringStagger) / ringLen));
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

        {/* the five tiers on one card: best on top, lit from the bottom up */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: px(12) }}>
          {ranks.map((rank, i) => {
            const step = plan.steps.find((s) => s.rank === i)!;
            const color = ramp(1 - i / Math.max(1, n - 1));
            const lit = sa(step.from, 'gentle');
            const litC = clamp01(lit);
            // emphasis while this tier is the current one; it settles before the step ends, so the hold is still
            const emph = frame < step.from || frame >= step.to ? 0 : clamp01(lit) * (1 - clamp01((frame - (step.to - outLen)) / outLen));
            const text: React.CSSProperties = { ...textStyle('rank'), whiteSpace: 'nowrap', opacity: 0.45 + 0.55 * litC };
            return (
              <div
                key={rank.name}
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: px(16),
                  padding: `0 ${px(20)}px`,
                  borderRadius: px(radius.lg),
                  background: colors.glass,
                  border: `${px(2)}px solid ${hexA(color, 0.08 + 0.7 * litC)}`,
                  boxShadow: emph > 0 ? `0 0 ${px(36 * emph)}px ${hexA(color, 0.5 * emph)}` : undefined,
                  transform: `scale(${1 + 0.025 * emph})`,
                  transformOrigin: 'center',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: hexA(color, 0.2 * litC) }} />
                <div style={{ position: 'relative', flex: 'none', width: px(20), height: px(20), borderRadius: px(10), background: color, opacity: 0.3 + 0.7 * litC }} />
                <div style={{ ...text, position: 'relative', flex: 1, color: colors.ink }}>{rank.name}</div>
                <div style={{ ...text, position: 'relative', color }}>
                  {rank.min}–{rank.max}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
