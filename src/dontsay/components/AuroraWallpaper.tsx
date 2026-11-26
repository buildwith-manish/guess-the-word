/**
 * AuroraWallpaper: the dark level wallpaper shared by the round screen and the bonus screens.
 * Base = levelBackground[level] (near-black, one 13% accent light at the top) plus two faint orbs
 * in the level accent only (13% each), drifting on one slow loop per minute.
 * `clock` is the VIDEO clock in design ticks (segment start + local tick), so the drift carries
 * across segments instead of restarting. Sizes are 1280x720 reference units through px().
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { levelColors, type Level } from '../data';
import { levelBackground } from '../system';
import { FPS, WIDTH } from '../timing';

const REF_W = 1280;
const REF_H = 720;
const px = (v: number): number => (v * WIDTH) / REF_W;

const DRIFT_LOOP_TICKS = 60 * FPS;
const ORB_ALPHA = Math.round(0.13 * 255).toString(16).padStart(2, '0');

export const AuroraWallpaper: React.FC<{ level: Level; clock: number }> = ({ level, clock }) => {
  const accent = levelColors[level].accent;
  const drift = (ph: number, amp: number): number => Math.sin((clock / DRIFT_LOOP_TICKS) * Math.PI * 2 + ph) * amp;
  const orbs = [
    { x: 16 + drift(0, 6), y: 86 + drift(1, 5), size: 980 },
    { x: 86 + drift(2, 6), y: 30 + drift(3, 6), size: 860 },
  ];
  return (
    <AbsoluteFill style={{ background: levelBackground[level], overflow: 'hidden' }}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: px((o.x / 100) * REF_W - o.size / 2),
            top: px((o.y / 100) * REF_H - o.size / 2),
            width: px(o.size),
            height: px(o.size),
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}${ORB_ALPHA} 0%, transparent 68%)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
