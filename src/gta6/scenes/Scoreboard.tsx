import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FrostCard } from '../components';
import { items, levels, rankLines, rankTiers } from '../data';
import type { RankName } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { FRAME, SAFE, colors, levelBackground, springAt, textStyle, u } from '../system';
import { scoreboardSec, secToTicks } from '../timing';

/**
 * Final scoreboard (task 6a), reused from the search video's scoreboard (rank cards + closing beat), rebuilt on the gta6 system.
 *
 *   frame  local design tick, 0 at the start of the scoreboard segment (length `scoreboardSec` from timing.ts)
 *
 * Rank names and ranges come from `rankTiers` (data.ts, out of `items.length`); the voiceover line of each rank from `rankLines`
 * (data.ts, empty until the script is pasted). Beats, in local ticks (all derived from `scoreboardSec`):
 *   rings   three activity rings (one per level) close fully, from `BEATS.rings`
 *   stack   rank cards rise in one after another, best rank first (top to bottom)
 *   lights  each rank is highlighted in turn, best to lowest (LEGEND, EXPERT, GOOD, BEGINNER, KEEP GOING), for an equal share of the time left; the last one (lowest) stays
 * `scoreboardCues` uses the same beats, so scene and sound cannot drift apart.
 */

const ACCENT: Record<RankName, string> = {
  LEGEND: '#FFC93C',
  EXPERT: '#38E1FF',
  GOOD: '#30D158',
  BEGINNER: '#FF9F0A',
  'KEEP GOING': '#FF453A',
};

const TOTAL = secToTicks(scoreboardSec);
export const BEATS = { rings: 6, ringsLen: 36, stack: 12, stagger: 8, light: 90, tail: 30 } as const;
const ORDER = rankTiers.map((r) => r.name); // best first (rankTiers order, same as the voiceover's rank lines): LEGEND ... KEEP GOING
const lightLen = Math.floor((TOTAL - BEATS.light - BEATS.tail) / rankTiers.length);

/** Tick a rank card starts rising (best rank first). */
export const cardStart = (name: RankName): number => BEATS.stack + ORDER.indexOf(name) * BEATS.stagger;
/** Tick a rank's highlight starts (best rank first). */
export const lightStart = (name: RankName): number => BEATS.light + ORDER.indexOf(name) * lightLen;

/** Sound cues, `start` = absolute design tick of the scoreboard segment. */
export const scoreboardCues = (start = 0): SfxCue[] => [
  cue('scorecard', start + BEATS.rings),
  ...ORDER.map((n) => cue('tick', start + cardStart(n))),
  ...ORDER.map((n) => cue(n === rankTiers[0].name ? 'chime-easy' : 'ping-medium', start + lightStart(n))),
];

const RING = { size: 520, stroke: 40, gap: 14, outer: 240 } as const;

const Rings: React.FC<{ frame: number }> = ({ frame }) => {
  const k = Math.min(1, Math.max(0, (frame - BEATS.rings) / BEATS.ringsLen));
  const eased = 1 - Math.pow(1 - k, 3); // reaches exactly 1: rings close fully
  const c = RING.size / 2;
  return (
    <svg width={u(RING.size)} height={u(RING.size)} viewBox={`0 0 ${RING.size} ${RING.size}`}>
      {levels.map((level, i) => {
        const r = RING.outer - i * (RING.stroke + RING.gap);
        const len = 2 * Math.PI * r;
        return (
          <g key={level} transform={`rotate(-90 ${c} ${c})`}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={colors.level[level]} strokeOpacity={0.2} strokeWidth={RING.stroke} />
            {eased > 0 && (
              <circle
                cx={c} cy={c} r={r} fill="none" stroke={colors.level[level]} strokeWidth={RING.stroke} strokeLinecap="round"
                strokeDasharray={`${len * eased} ${len}`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

const CARD = { w: 920, h: 120, gap: 16, top: 170 } as const;

export const Scoreboard: React.FC<{ frame: number }> = ({ frame }) => {
  const total = items.length;
  const lit = ORDER.filter((n) => frame >= lightStart(n)).pop(); // last rank whose highlight has started
  const text = springAt(frame, BEATS.rings, 'gentle');
  return (
    <AbsoluteFill style={{ background: levelBackground[levels[levels.length - 1]] }}>
      <div style={{ position: 'absolute', left: u(SAFE.x + 60), top: u((FRAME.h - RING.size) / 2) }}>
        <Rings frame={frame} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: text }}>
          <div style={{ ...textStyle('number'), color: colors.ink }}>{total}</div>
        </div>
      </div>

      {/* rank cards: best on top, rise in from the best, top to bottom */}
      <div style={{ position: 'absolute', left: u(FRAME.w - SAFE.x - CARD.w), top: u(CARD.top), display: 'flex', flexDirection: 'column', gap: u(CARD.gap) }}>
        {rankTiers.map((r) => {
          const p = springAt(frame, cardStart(r.name), 'snappy');
          const on = lit === r.name;
          const dim = lit !== undefined && !on;
          const accent = ACCENT[r.name];
          const hl = on ? springAt(frame, lightStart(r.name), 'bouncy') : 0;
          return (
            <div key={r.name} style={{ opacity: Math.min(1, p * 1.4) * (dim ? 0.5 : 1), transform: `translateY(${(1 - p) * u(24)}px) scale(${1 + hl * 0.04})` }}>
              <FrostCard width={CARD.w} height={CARD.h} padding={0} style={{ display: 'flex', alignItems: 'center', gap: u(24), paddingLeft: u(36), paddingRight: u(36), boxShadow: on ? `0 0 0 ${u(3)}px ${accent}` : undefined }}>
                <span style={{ width: u(20), height: u(20), borderRadius: '50%', background: accent, flex: 'none' }} />
                <span style={{ ...textStyle('choice'), flex: 1, color: colors.ink }}>{r.name}</span>
                <span style={{ ...textStyle('caption'), color: colors.muted }}>{`${r.min}–${r.max}`}</span>
              </FrostCard>
            </div>
          );
        })}
      </div>

      {/* voiceover line of the highlighted rank (only when the script line exists) */}
      {lit && rankLines[lit] && (
        <div style={{ position: 'absolute', left: u(FRAME.w - SAFE.x - CARD.w), width: u(CARD.w), top: u(CARD.top + 5 * CARD.h + 4 * CARD.gap + 36), ...textStyle('body'), color: colors.ink, opacity: springAt(frame, lightStart(lit), 'gentle') }}>
          {rankLines[lit]}
        </div>
      )}
    </AbsoluteFill>
  );
};

export default Scoreboard;
