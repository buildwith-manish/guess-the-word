/**
 * StateBackdrop (round two, Step 5): 3 very soft blobs in the level accent that give the glass panels something to blur.
 * States-only (the shared IosBackground is untouched); mounted in StateStage right above IosBackground. Same accent per
 * level, no new colours. Drift is a seeded sine of the design frame (<= BLOBS.driftPx), so it is a pure function of the frame.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { FPS } from '../state-timing';
import { px } from '../../style';
import { makeRandom } from '../../util';
import { BLOBS } from '../look';

const PH = (() => {
  const r = makeRandom(707);
  return BLOBS.items.map(() => [r() * Math.PI * 2, r() * Math.PI * 2]);
})();

export const StateBackdrop: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useDesignFrame();
  const t = frame / FPS; // seconds
  const TAU = Math.PI * 2;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {BLOBS.items.map((b, i) => {
        const loop = BLOBS.loopSeconds[i % BLOBS.loopSeconds.length];
        const dx = px(BLOBS.driftPx) * Math.sin((t / loop) * TAU + PH[i][0]);
        const dy = px(BLOBS.driftPx) * Math.sin((t / (loop * 1.3)) * TAU + PH[i][1]);
        const light = `color-mix(in srgb, ${accent} ${Math.round(b.alpha * 100)}%, transparent)`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
              background: `radial-gradient(ellipse ${b.size}% ${b.size * 1.6}% at ${b.x}% ${b.y}%, ${light}, transparent 70%)`,
            }}
          />
        );
      })}
    </div>
  );
};
