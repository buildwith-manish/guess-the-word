import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from './Background';
import { Hud } from './Hud';
import { Watermark } from './Watermark';
import { TitleLockup } from './TitleLockup';
import { FONTS, px, glass, COLORS } from './style';
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
      {seg.title ? <TitleLockup frame={frame} animate={false} /> : null}
      <Hud
        label={seg.hud.label}
        number={seg.hud.number}
        total={seg.hud.total}
        erases={seg.hud.erases}
        frame={999}
      />
      <Watermark />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(300),
          width: px(480),
          marginLeft: -px(240),
          textAlign: 'center',
          padding: `${px(16)}px 0`,
          ...glass(px(50), 0.12),
          background: 'linear-gradient(160deg, rgba(20,22,52,0.92), rgba(8,9,28,0.92))',
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(34),
          letterSpacing: px(2),
          color: COLORS.ink,
          whiteSpace: 'nowrap',
          boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.55), 0 0 ${px(40)}px rgba(255,77,106,0.35)`,
          opacity,
          transform: `translate3d(0, ${mix(20, 0, inP)}px, 0) scale(${mix(0.9, 1, inP)})`,
        }}
      >
        {settings.text.reminder}
      </div>
    </AbsoluteFill>
  );
};
