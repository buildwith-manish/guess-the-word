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
import { Watermark } from '../../Watermark';
import { Icon } from '../../Icon';
import { px } from '../../style';
import { IOS, IosBackground, iosSurface, spring } from '../../ios';
import { prog, ms } from '../../anim';
import { linear } from '../../gsap-helpers';
import rootSettings from '../../../settings.json';
import { BONUS_THEME, HEIGHT, LEVELS } from '../state-timing';
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
  const inP = spring(frame / ms(REMINDER_BEATS.inMs));
  const outP = prog(frame, t.outStart, ms(REMINDER_BEATS.outMs), linear);
  const opacity = inP * (1 - outP);

  return (
    <AbsoluteFill>
      <IosBackground accent={LEVELS.find((l) => l.theme[0] === seg.theme[0] && l.theme[1] === seg.theme[1])?.accent ?? BONUS_THEME[0]} />
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
          ...iosSurface(px(IOS.radius.xl)),
          opacity,
          transform: `translateY(${(1 - inP) * px(24)}px) scale(${0.96 + 0.04 * inP})`,
        }}
      >
        <Icon name="bell" size={px(56)} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: px(8), fontFamily: IOS.font }}>
          <div
            style={{
              fontWeight: IOS.weight.semibold,
              fontSize: px(34),
              lineHeight: 1,
              color: '#fff',
              background: IOS.color.red,
              borderRadius: px(IOS.radius.sm),
              padding: `${px(8)}px ${px(18)}px`,
              whiteSpace: 'nowrap',
            }}
          >
            {rootSettings.endScreen.subscribe}
          </div>
          <div style={{ fontWeight: IOS.weight.medium, fontSize: px(22), color: IOS.color.secondary, whiteSpace: 'nowrap' }}>
            {rootSettings.endScreen.subscribeSub}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
