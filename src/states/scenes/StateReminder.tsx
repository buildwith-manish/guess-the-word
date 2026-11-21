/**
 * StateReminder (task 3e): the subscribe pop-up. The timeline puts a `reminder` segment after the
 * question ids in states-settings.json `reminder.after` (length `reminder.frames` ticks). Adapted from
 * src/Reminder.tsx: same layers (backdrop, title lockup if still on screen, HUD pill, watermark) and the
 * same pop-up motion (rise + scale in, hold, fade out, short rest), with a subscribe pill instead of the
 * "score so far" line: bell icon, SUBSCRIBE on a red chip, and the sub-line. The copy is the word quiz's
 * end-screen copy (root settings.json endScreen.subscribe / subscribeSub).
 *
 * Time: `frame` = design ticks since the segment started. The out-fade is placed from the END of the
 * segment (so changing reminder.frames keeps the rest beat); with the default 51 ticks it starts at
 * 33 ticks (1.1 s), like the word quiz.
 * Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../../Background';
import { Watermark } from '../../Watermark';
import { Icon } from '../../Icon';
import { COLORS, FONTS, K, glass, px } from '../../style';
import { prog, htmlEase, mix, ms } from '../../anim';
import { linear } from '../../gsap-helpers';
import rootSettings from '../../../settings.json';
import { HEIGHT } from '../state-timing';
import type { Segment } from '../types';
import { StateHudPill, StateTitleSlot } from './StateIris';
import type { StateCue } from './stateRoundCues';

export type ReminderSegment = Extract<Segment, { kind: 'reminder' }>;

/** Pop-up motion in ms (the word quiz's remind()): in, out, and the rest after the fade. */
export const REMINDER_BEATS = { inMs: 350, outMs: 300, restMs: 300 };

/** Ticks (from the start of the segment) of the pop-up: fully in, out-fade start, gone. */
export const reminderTimes = (duration: number) => {
  const inEnd = ms(REMINDER_BEATS.inMs);
  const outStart = Math.max(inEnd, duration - ms(REMINDER_BEATS.restMs) - ms(REMINDER_BEATS.outMs));
  return { inEnd, outStart, outEnd: outStart + ms(REMINDER_BEATS.outMs) };
};

/** Cues, ticks from the start of the reminder segment (absolute tick = seg.from + cue.frame). */
export const stateReminderCues = (): StateCue[] => [{ frame: 0, sfx: 'remind' }];

export const StateReminder: React.FC<{ frame: number; seg: ReminderSegment }> = ({ frame, seg }) => {
  const t = reminderTimes(seg.duration);
  const inP = prog(frame, 0, ms(REMINDER_BEATS.inMs), htmlEase);
  const outP = prog(frame, t.outStart, ms(REMINDER_BEATS.outMs), linear);
  const opacity = inP * (1 - outP);

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={seg.theme} />
      {seg.title ? <StateTitleSlot frame={frame} /> : null}
      <StateHudPill hud={seg.hud} />
      <Watermark />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: HEIGHT * 0.42,
          marginLeft: -px(300),
          width: px(600),
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(22),
          padding: `${px(18)}px ${px(26)}px`,
          ...glass(px(50), 0.12),
          background: 'linear-gradient(160deg, rgba(20,22,52,0.92), rgba(8,9,28,0.92))',
          boxShadow: `0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.55), 0 0 ${px(40)}px ${COLORS.red}59`,
          opacity,
          transform: `translate3d(0, ${mix(20 * K, 0, inP)}px, 0) scale(${mix(0.9, 1, inP)})`,
        }}
      >
        <Icon name="bell" size={px(56)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: px(6) }}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(40),
              letterSpacing: px(3),
              lineHeight: 1,
              color: '#fff',
              background: COLORS.red,
              borderRadius: px(10),
              padding: `${px(6)}px ${px(18)}px`,
              whiteSpace: 'nowrap',
            }}
          >
            {rootSettings.endScreen.subscribe}
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(20),
              letterSpacing: px(2),
              color: COLORS.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {rootSettings.endScreen.subscribeSub}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
