import React from 'react';
import { useDesignFrame } from '../clock';
import { FPS } from '../timing';
import { IOS } from './tokens';

/**
 * Calm backdrop: near-black with two very slow, very faint lights in the accent colour, so frosted surfaces have
 * something soft to blur. No grid, no particles. A full loop takes about a minute.
 */
const LOOP_SECONDS = [52, 64];
const LIGHT_PERCENT = 13; // strength of each light
const LIGHT_SIZE = 62; // percent of the frame

export const IosBackground: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useDesignFrame();
  const a = LOOP_SECONDS.map((s, i) => (frame / (s * FPS)) * Math.PI * 2 + i * 2.4);
  const light = `color-mix(in srgb, ${accent} ${LIGHT_PERCENT}%, transparent)`;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${IOS.color.bgRaised}, ${IOS.color.bg})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            `radial-gradient(ellipse ${LIGHT_SIZE}% ${LIGHT_SIZE}% at ${70 + 12 * Math.sin(a[0])}% ${28 + 10 * Math.cos(a[0])}%, ${light}, transparent 70%)`,
            `radial-gradient(ellipse ${LIGHT_SIZE}% ${LIGHT_SIZE}% at ${26 + 10 * Math.cos(a[1])}% ${74 + 8 * Math.sin(a[1])}%, ${light}, transparent 70%)`,
          ].join(', '),
        }}
      />
    </div>
  );
};
