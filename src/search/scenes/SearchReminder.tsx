import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE_X, px } from '../../style';
import { prog, mix } from '../../anim';
import { IOS, iosSurface, spring, easeOut } from '../../ios';
import { FPS } from '../../timing';
import type { Cue } from '../../sound';
import type { Segment } from '../types';
import { LEVELS } from '../search-timing';
import { SearchStage } from '../components/SearchStage';
import '../../fonts';

type ReminderSegment = Extract<Segment, { kind: 'reminder' }>;

/**
 * Subscribe pop-up (task 3d), copy-and-adapt of GTW's Reminder: a pill rises in over the round's
 * backdrop (SearchStage draws the backdrop and the HUD pill, no slots). The scene length comes
 * from the segment (search-settings.json reminder.ticks), so the pill leaves in its last
 * OUT_REST_SECONDS + OUT_SECONDS whatever that value is.
 * The pill text is a constant here: search-settings.json has no key for it, and it names no brand.
 */
const TEXT = '🔔 Enjoying this? Subscribe';
/** Same entrance and exit as the level card: shared spring in over ENTER_TICKS, shared ease-out out over OUT_SECONDS. */
const ENTER_TICKS = 14;
const EXIT_SCALE = 0.06;
const OUT_SECONDS = 0.3;
const OUT_REST_SECONDS = 0.3;
/** Pill geometry in reference units (GTW's). */
const PILL_TOP = 300;
const PILL_W = 520;
const PILL_FONT = 32;

const outStart = (duration: number) => duration - (OUT_SECONDS + OUT_REST_SECONDS) * FPS;

/** Sound cues, design ticks from the start of the pop-up. */
export const searchReminderCues = (): Cue[] => [{ frame: 0, sfx: 'remind' }];

export const SearchReminder: React.FC<{ frame: number; seg: ReminderSegment }> = ({ frame, seg }) => {
  const inP = spring(frame / ENTER_TICKS);
  const outP = prog(frame, outStart(seg.duration), Math.round(OUT_SECONDS * FPS), easeOut);
  const opacity = Math.min(1, inP * 1.4) * (1 - outP);
  const accent = LEVELS.find((l) => l.name === seg.hud.label)?.accent ?? IOS.color.red;

  return (
    <AbsoluteFill>
      <SearchStage theme={seg.theme} accent={accent} hud={seg.hud} energy={0} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(PILL_TOP),
          width: px(PILL_W),
          maxWidth: `calc(100% - ${2 * SAFE_X}px)`,
          transformOrigin: '50% 50%',
          marginLeft: -px(PILL_W / 2),
          textAlign: 'center',
          padding: `${px(16)}px 0`,
          ...iosSurface(px(50)),
          fontFamily: IOS.font,
          fontWeight: IOS.weight.semibold,
          fontSize: px(PILL_FONT),
          color: IOS.color.label,
          whiteSpace: 'nowrap',
          opacity,
          transform: `translate3d(0, ${mix(px(14), 0, inP)}px, 0) scale(${mix(0.96, 1, inP) * (1 - EXIT_SCALE * outP)})`,
        }}
      >
        {TEXT}
      </div>
    </AbsoluteFill>
  );
};
