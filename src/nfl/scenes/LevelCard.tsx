import React from 'react';
import { levels, levelText, type Level } from '../data';
import { cue, type SfxCue, type SfxId } from '../sfx';
import { GRID, ICON_CELL, cellPos, clamp01, exitClip, launchRect } from '../shared/levelTransition';
import { FRAME, SAFE, SPRINGS, colors, easeOut, levelBackground, px, springAt, springOver, textStyle } from '../system';
import { levelCardBeats, secToTicks } from '../timing';

/**
 * Level card for Starter and Hall of Fame: an app launches from a home-screen icon with a spring zoom, the title and
 * subtitle rise in, then an iris wipe closes it. Rookie has no card (see LevelBanner).
 * `frame` is the local design tick (30 fps) from the start of the segment; `ticks` is the segment length from timing.ts,
 * so the wipe always ends the card whatever length the level clip gave it. Text comes from data.ts, beats from timing.ts.
 */
export type LevelCardLevel = Exclude<Level, 'rookie'>;

export type LevelCardProps = {
  level: LevelCardLevel;
  frame: number;
  /** Segment length in ticks (timing.ts `levelCard` segment: `to - from`). */
  ticks: number;
};

/** Beat ticks from the segment start. Exported so the frame list and the cues read the same numbers. */
export const levelCardMarks = (ticks: number) => {
  const b = levelCardBeats;
  const exitLen = secToTicks(b.exitLen);
  return {
    gridIn: secToTicks(b.gridIn),
    press: secToTicks(b.pressAt),
    launch: secToTicks(b.launchAt),
    text: secToTicks(b.textAt),
    stagger: secToTicks(b.textStagger),
    exitLen,
    exitAt: ticks - exitLen - secToTicks(b.tail),
  };
};

const levelSfx: Record<Level, SfxId> = { rookie: 'level-rookie', starter: 'level-starter', hof: 'level-hof' };

/** SFX cue for the card, in design ticks from the start of the video: the level sound lands when the icon launches. */
export const levelCardCues = (level: LevelCardLevel, start: number): SfxCue[] => [cue(levelSfx[level], start + secToTicks(levelCardBeats.launchAt))];

/** Where the level clip starts (the audio map supplies the clip): when the title is up. */
export const levelCardVoice = (level: LevelCardLevel, start: number) => ({ type: 'level' as const, key: level, tick: start + secToTicks(levelCardBeats.textAt) });

export const LevelCard: React.FC<LevelCardProps> = ({ level, frame, ticks }) => {
  const m = levelCardMarks(ticks);
  const color = colors.level[level];
  const text = levelText[level];

  const sa = (at: number, preset: keyof typeof SPRINGS): number => (frame < at ? 0 : springAt(frame, at, preset));
  const gridP = easeOut(clamp01(frame / m.gridIn));
  const exitP = clamp01((frame - m.exitAt) / m.exitLen);
  // press squash: a short spring from the press to the launch; the zoom is the slow preset from the launch
  const pressed = frame < m.press ? 0 : springOver(Math.min(frame, m.launch), m.press, Math.max(1, m.launch - m.press));
  const launch = sa(m.launch, 'slow');
  const rect = launchRect(level, pressed, launch);
  const [ic, ir] = ICON_CELL[level];
  const iconNumber = levels.indexOf(level) + 1;

  const titleP = sa(m.text, 'gentle');
  const subP = sa(m.text + m.stagger, 'gentle');
  const rise = (p: number): React.CSSProperties => ({ opacity: clamp01(p), transform: `translateY(${px(24 * (1 - clamp01(p)))}px)` });

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[level], overflow: 'hidden' }}>
      {/* home screen: glass icons, the level's own icon is the one that launches */}
      <div style={{ position: 'absolute', inset: 0, opacity: gridP * (1 - exitP) }}>
        {Array.from({ length: GRID.rows }, (_, r) =>
          Array.from({ length: GRID.cols }, (_, c) => {
            if (c === ic && r === ir) return null;
            const p = cellPos(c, r);
            return (
              <div
                key={`${c}-${r}`}
                style={{
                  position: 'absolute',
                  left: px(p.x),
                  top: px(p.y),
                  width: px(GRID.icon),
                  height: px(GRID.icon),
                  borderRadius: px(GRID.iconRadius),
                  background: colors.glass,
                  border: `${px(1)}px solid ${colors.hairline}`,
                }}
              />
            );
          }),
        )}
      </div>

      <div style={{ position: 'absolute', inset: 0, clipPath: exitClip(level, frame, m.exitAt, m.exitLen) }}>
        {/* the launching icon: fills the frame at launch = 1 */}
        <div
          style={{
            position: 'absolute',
            left: px(rect.left),
            top: px(rect.top),
            width: px(rect.width),
            height: px(rect.height),
            borderRadius: px(rect.radius),
            background: `linear-gradient(160deg, ${color} 0%, ${color}D9 100%)`,
            opacity: gridP,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div style={{ ...textStyle('title'), color: colors.onAccent, opacity: 1 - clamp01(launch * 3) }}>{iconNumber}</div>
        </div>

        {/* title and subtitle: centre of the frame, inside the safe box */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: px(16),
            padding: `0 ${px(SAFE.x)}px`,
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        >
          <div style={{ ...textStyle('title'), color: colors.onAccent, maxWidth: px(FRAME.w - 2 * SAFE.x), ...rise(titleP) }}>{text.title}</div>
          <div style={{ ...textStyle('name'), color: colors.onAccent, opacity: 0.78 * clamp01(subP), transform: rise(subP).transform }}>{text.subtitle}</div>
        </div>
      </div>
    </div>
  );
};
