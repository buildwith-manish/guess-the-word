import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from './Background';
import { Hud } from './Hud';
import { Watermark } from './Watermark';
import { FONTS, px } from './style';
import { prog, htmlEase, mix } from './anim';
import { linear } from './gsap-helpers';
import type { Segment } from './types';
import settings from '../settings.json';

type ReminderSegment = Extract<Segment, { kind: 'reminder' }>;

/**
 * "Still counting? ❌" — the HTML's remind() pop-up after Q10 / Q25 / Q40:
 * 350 ms in (rise + scale .9 -> 1), hold to 1.1 s, 300 ms out, 300 ms rest.
 * Pill geometry is the HTML's (#remind: top 318, 480 wide, Poppins 800 34px),
 * scaled to 1080p by px().
 */
export const Reminder: React.FC<{ frame: number; seg: ReminderSegment }> = ({ frame, seg }) => {
  const FPS = settings.fps;
  const inP = prog(frame, 0, Math.round(0.35 * FPS), htmlEase);
  const outP = prog(frame, Math.round(1.1 * FPS), Math.round(0.3 * FPS), linear);
  const opacity = inP * (1 - outP);

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={seg.theme} />
      <Hud
        label={seg.hud.label}
        number={seg.hud.number}
        total={seg.hud.total}
        erases={seg.hud.erases}
        frame={999}
      />
      <Watermark frame={999} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(318),
          width: px(480),
          marginLeft: -px(240),
          textAlign: 'center',
          padding: `${px(16)}px 0`,
          borderRadius: px(50),
          background: 'rgba(0,0,0,0.8)',
          border: `${px(2)}px solid rgba(255,255,255,0.27)`,
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(34),
          letterSpacing: px(2),
          color: '#fff',
          whiteSpace: 'nowrap',
          boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.53)`,
          opacity,
          transform: `translate3d(0, ${mix(20, 0, inP)}px, 0) scale(${mix(0.9, 1, inP)})`,
        }}
      >
        {settings.text.reminder}
      </div>
    </AbsoluteFill>
  );
};
