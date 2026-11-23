import React from 'react';
import { GlassTile } from '../components/GlassTile';
import { easeOut } from '../../ios/motion';
import { FPS } from '../shared/clock';
import { LAYOUT, px, useXmasFrame } from '../system';
import { clueIdOf } from './clueRef';
import type { RoundProps } from './registry';

/**
 * Bonus 2, Focus (Camera autofocus): the two clue images start heavily blurred and sharpen over slot.sharpenSec while a
 * yellow focus square hunts on each tile and locks when the image is sharp. Image ids and the sharpen time come from data.
 * Cheap: the only effect is one CSS blur on each image box (two filters in total), no canvas, no masks.
 */
export const FOCUS = {
  /** blur at the start, reference units */
  blurStart: 36,
  /** the focus hunts: a small wobble that dies out, so the blur does not fall in a straight line */
  hunt: { amp: 5, cycles: 2.5 },
  /** the right tile starts and locks a few ticks after the left one */
  stagger: 4,
  square: { side: 190, line: 2.5, tick: 9, startScale: 1.38, jitter: 16 },
  lockPulseTicks: 10,
  /** a camera yellow (iOS focus square); the one colour outside red, green and gold, asked for by the brief */
  yellow: '#FFD60A',
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Blur (reference units) at tick `t` for a round whose sharpening runs from `from` over `dur` ticks. Exported for the check. */
export const focusBlur = (t: number, from: number, dur: number): number => {
  const p = clamp01((t - from) / dur);
  if (p >= 1) return 0;
  const base = FOCUS.blurStart * Math.pow(1 - p, 1.6);
  const wobble = FOCUS.hunt.amp * (1 - p) * Math.abs(Math.sin(Math.PI * FOCUS.hunt.cycles * p));
  return Math.max(0, base + wobble);
};

const Square: React.FC<{ t: number; from: number; dur: number }> = ({ t, from, dur }) => {
  const S = FOCUS.square;
  const p = clamp01((t - from) / dur);
  const lock = t - (from + dur);
  const pulse = lock >= 0 && lock < FOCUS.lockPulseTicks ? Math.sin((Math.PI * lock) / FOCUS.lockPulseTicks) : 0;
  const scale = (1 + (S.startScale - 1) * Math.pow(1 - easeOut(p), 1.2)) * (1 + 0.08 * pulse);
  const dx = Math.sin(p * 17) * S.jitter * (1 - p) * (1 - p);
  const dy = Math.cos(p * 13) * S.jitter * (1 - p) * (1 - p);
  const opacity = clamp01((t - from + 6) / 6) * (p >= 1 ? 1 : 0.8);
  const glow = p >= 1 ? 8 + 14 * pulse : 0;
  const line = px(S.line);
  const tick = { position: 'absolute' as const, background: FOCUS.yellow };
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: px(S.side),
        height: px(S.side),
        marginLeft: px(-S.side / 2),
        marginTop: px(-S.side / 2),
        boxSizing: 'border-box',
        border: `${line}px solid ${FOCUS.yellow}`,
        borderRadius: px(3),
        opacity,
        transform: `translate(${px(dx)}px, ${px(dy)}px) scale(${scale})`,
        boxShadow: glow > 0 ? `0 0 ${px(glow)}px ${FOCUS.yellow}99` : 'none',
      }}
    >
      {/* the four short ticks at the middle of each side, pointing in */}
      <div style={{ ...tick, left: '50%', top: 0, width: line, height: px(S.tick), marginLeft: -line / 2 }} />
      <div style={{ ...tick, left: '50%', bottom: 0, width: line, height: px(S.tick), marginLeft: -line / 2 }} />
      <div style={{ ...tick, top: '50%', left: 0, height: line, width: px(S.tick), marginTop: -line / 2 }} />
      <div style={{ ...tick, top: '50%', right: 0, height: line, width: px(S.tick), marginTop: -line / 2 }} />
    </div>
  );
};

export const Focus: React.FC<RoundProps> = ({ slot, playFrom }) => {
  if (slot.key !== 'focus') throw new Error(`Focus: slot ${slot.slot} is ${slot.key}`);
  const t = useXmasFrame();
  const T = LAYOUT.tile;
  const dur = slot.sharpenSec * FPS;
  return (
    <>
      {slot.tiles.map((ref, i) => {
        const from = playFrom + i * FOCUS.stagger;
        const blur = focusBlur(t, from, dur);
        return (
          <div key={i} style={{ position: 'absolute', left: px(i * (T.size + T.gap)), top: 0, width: px(T.size), height: px(T.size) }}>
            <GlassTile
              imageId={clueIdOf(ref)}
              side="bonus"
              light={false}
              enterFrame={playFrom - 6 + i * 3}
              imageStyle={blur > 0.05 ? { filter: `blur(${px(blur)}px)` } : undefined}
            />
            <Square t={t} from={from} dur={dur} />
          </div>
        );
      })}
    </>
  );
};

export default Focus;
