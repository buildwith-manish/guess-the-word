import React from 'react';
import { GlassTile } from '../components/GlassTile';
import type { SpeedRoundBonus } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { springAt } from '../shared/springs';
import { colors, px, useXmasFonts, useXmasFrame } from '../system';
import { clueIdOf } from './clueRef';
import type { RoundProps } from './registry';

/**
 * Bonus 9, Speed Round (iOS Shortcuts): the slot's clue tiles one after another, `perTileSec` each (data.ts), with a
 * Shortcuts-style step indicator under the tile: one pill per tile, the running one wide and filling over its time.
 * A tile is on screen only from its own start to its own end: it fades in the last 3 ticks and is gone at its end tick,
 * and the next one starts on that same tick. After the last tile the indicator stays (all steps done) and the tile area
 * is empty. No text here (BonusScene shows the pass rule). Drawn in the play box (844 x 400), reference units.
 */
export const SPEED_ROUND = {
  tile: 330,
  /** step indicator: centre y in the play box, pill height, gap, idle and active pill width */
  stepY: 374,
  stepH: 12,
  stepGap: 10,
  idleW: 24,
  activeW: 60,
  /** ticks the active pill takes to widen or narrow */
  widenTicks: 6,
  /** tile fade in at its start and fade out before its end (ticks) */
  inTicks: 6,
  outTicks: 3,
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Ticks one tile lasts (perTileSec from data.ts, 30 ticks per second). */
export const tileTicks = (slot: SpeedRoundBonus): number => Math.round(slot.perTileSec * 30);

/** Sounds: one swipe at each tile start, at absolute design tick `playFrom` (the tick play starts at). */
export const speedRoundCues = (slot: SpeedRoundBonus, playFrom: number): SfxCue[] =>
  slot.tiles.map((_, i) => cue('swipe', playFrom + i * tileTicks(slot)));

export const SpeedRound: React.FC<RoundProps> = ({ slot, playFrom }) => {
  useXmasFonts();
  const t = useXmasFrame();
  if (slot.key !== 'speedRound') throw new Error(`SpeedRound: slot ${slot.slot} is not a speed round`);
  const s: SpeedRoundBonus = slot;
  const S = SPEED_ROUND;
  const dur = tileTicks(s);
  const n = s.tiles.length;
  const shell = springAt(t, playFrom - 8, 'smooth');

  // the pills
  const widths = s.tiles.map((_, i) => {
    const start = playFrom + i * dur;
    const a = clamp01((t - start) / S.widenTicks) - clamp01((t - (start + dur)) / S.widenTicks);
    return S.idleW + (S.activeW - S.idleW) * a;
  });
  const rowW = widths.reduce((a, b) => a + b, 0) + S.stepGap * (n - 1);
  let x = (844 - rowW) / 2;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {s.tiles.map((ref, i) => {
        const start = playFrom + i * dur;
        const end = start + dur;
        if (t < start || t >= end) return null;
        const k = springAt(t, start, 'snappy');
        const out = clamp01((end - t) / S.outTicks);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px((844 - S.tile) / 2),
              top: px(0),
              opacity: (0.6 + 0.4 * clamp01(k)) * out,
              transform: `scale(${0.94 + 0.06 * clamp01(k)})`,
              transformOrigin: '50% 50%',
            }}
          >
            <GlassTile imageId={clueIdOf(ref)} side="bonus" size={S.tile} light={false} />
          </div>
        );
      })}

      {/* step indicator */}
      <div style={{ position: 'absolute', inset: 0, opacity: clamp01(shell * 2) }}>
        {s.tiles.map((_, i) => {
          const start = playFrom + i * dur;
          const p = clamp01((t - start) / dur);
          const left = x;
          x += widths[i] + S.stepGap;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: px(left),
                top: px(S.stepY - S.stepH / 2),
                width: px(widths[i]),
                height: px(S.stepH),
                borderRadius: px(S.stepH / 2),
                background: 'rgba(255,255,255,0.20)',
                overflow: 'hidden',
                boxShadow: `inset ${px(1)}px ${px(1)}px 0 rgba(255,255,255,0.35)`,
              }}
            >
              <div style={{ width: `${p * 100}%`, height: '100%', background: colors.gold }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpeedRound;
