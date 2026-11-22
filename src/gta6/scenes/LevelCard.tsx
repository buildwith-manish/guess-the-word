import React from 'react';
import {FRAME, colors, levelBackground, springAt, textStyle, u} from '../system';
import {levels} from '../data';
import type {Level} from '../data';
import {levelCardSec, secToTicks, segments, ticksToSec} from '../timing';
import {cue} from '../sfx';
import type {SfxCue, SfxId} from '../sfx';

/**
 * Level card (task 5b).
 *
 * The card opens like an app launching from a home-screen icon: a plain
 * grid of blank icons, the level's icon is pressed, then springs up to fill
 * the frame. The text rises in, and near the end the card closes with an
 * iris wipe (circle / curtain / sweep, the clip shapes of the search
 * video's iris) onto the level background, which is the background the
 * first item of the level starts on.
 *
 * Pure function of `frame` (local design ticks, 30 per second, 0 at the
 * start of the levelCard segment). Mount it in a Sequence at seg.from, with
 * `frame` = the local tick. Length = `levelCardSec` from timing.ts.
 *
 * Words come from data.ts / timing.ts: the level name from the level key,
 * the number from its position in `levels`, the seconds from the first
 * question of that level in `segments`. The only literal text is the
 * sentence frame ("Level", "seconds a question") and the number words.
 */

// Beat lengths in seconds (visual only; the card length is levelCardSec).
export const LEVEL_CARD = {
  gridIn: 0.2, // home screen fades in
  pressAt: 0.3, // the icon is pressed
  launchAt: 0.4, // spring zoom starts, sfx cue lands here
  textAt: 0.7, // title rises
  textStagger: 0.12, // subtitle after title
  exitLen: 0.5, // iris wipe length
  tail: 0.1, // seconds of bare level background after the wipe
} as const;

const tk = (sec: number) => secToTicks(sec);

// Which iris clip fits which level.
type Variant = 'circle' | 'curtain' | 'sweep';
const VARIANT: Record<Level, Variant> = {easy: 'circle', medium: 'curtain', hard: 'sweep'};

const LEVEL_SFX: Record<Level, SfxId> = {
  easy: 'chime-easy',
  medium: 'ping-medium',
  hard: 'pulse-hard',
};

const NUMBER_WORDS = ['one', 'two', 'three'];

// Home-screen grid (1920x1080 units).
const ICON = 150;
const ICON_GAP = 48;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const ICON_RADIUS = 34;
// Cell (col,row) of the level icon, one cell further right per level.
const ICON_CELL: Record<Level, [number, number]> = {easy: [1, 1], medium: [2, 1], hard: [3, 1]};

// Skew of the sweep edge and circle size, same values as the search iris.
const SWEEP_SKEW = 12;
const CIRCLE_MAX = 80;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Clip shape at progress p (1 = card fully covers, 0 = nothing). */
const wipeClip = (variant: Variant, p: number): string => {
  if (variant === 'sweep') {
    const e = -SWEEP_SKEW + p * (100 + 2 * SWEEP_SKEW);
    return `polygon(0 0, ${e + SWEEP_SKEW}% 0, ${e - SWEEP_SKEW}% 100%, 0 100%)`;
  }
  if (variant === 'curtain') {
    const half = 50 * p;
    return `inset(0 ${50 - half}% 0 ${50 - half}%)`;
  }
  return `circle(${CIRCLE_MAX * p}% at 50% 50%)`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Seconds per question for a level: the timer span of its first question in the timeline. */
export const levelSeconds = (level: Level): number => {
  const seg = segments.find((s) => s.kind === 'item' && s.item.level === level && s.item.kind === 'q');
  if (!seg || seg.kind !== 'item') return 0;
  return Math.round(ticksToSec(seg.phases.timer.to - seg.phases.timer.from));
};

/** The two lines of the card, from data/timing. */
export const levelCardText = (level: Level): {title: string; line: string} => {
  const idx = levels.indexOf(level);
  const word = NUMBER_WORDS[idx] ?? String(idx + 1);
  const sec = levelSeconds(level);
  return {
    title: `Level ${word}: ${cap(level)}`,
    line: `${sec} ${sec === 1 ? 'second' : 'seconds'} a question`,
  };
};

/** Local tick where the zoom starts. */
export const levelCardLaunchTick = () => tk(LEVEL_CARD.launchAt);

/** Local tick where the iris wipe starts. */
export const levelCardExitTick = () => secToTicks(levelCardSec) - tk(LEVEL_CARD.exitLen) - tk(LEVEL_CARD.tail);

/**
 * Sound cue for one level card. `start` = absolute design tick of the
 * segment (seg.from). Frames are absolute design ticks.
 */
export const levelCardCues = (level: Level, start = 0): SfxCue[] => [
  cue(LEVEL_SFX[level], start + levelCardLaunchTick()),
];

export type LevelCardProps = {
  level: Level;
  /** Local design tick, 0 at the start of the levelCard segment. */
  frame: number;
};

export const LevelCard: React.FC<LevelCardProps> = ({level, frame}) => {
  const accent = colors.level[level];
  const text = levelCardText(level);
  const idx = levels.indexOf(level);

  const launchAt = tk(LEVEL_CARD.launchAt);
  const pressAt = tk(LEVEL_CARD.pressAt);
  const gridIn = clamp01(frame / tk(LEVEL_CARD.gridIn));

  // Press squash, then spring zoom.
  const pressed = springAt(frame, pressAt, 'snappy');
  const launch = springAt(frame, launchAt, 'snappy');

  // Icon rect on the home screen (1920x1080 units).
  const gridW = GRID_COLS * ICON + (GRID_COLS - 1) * ICON_GAP;
  const gridH = GRID_ROWS * ICON + (GRID_ROWS - 1) * ICON_GAP;
  const gridL = (FRAME.w - gridW) / 2;
  const gridT = (FRAME.h - gridH) / 2;
  const cellPos = (c: number, r: number) => ({
    x: gridL + c * (ICON + ICON_GAP),
    y: gridT + r * (ICON + ICON_GAP),
  });
  const [cc, cr] = ICON_CELL[level];
  const iconPos = cellPos(cc, cr);
  const k = 1 - 0.1 * pressed; // pressed size
  const size0 = ICON * k;
  const left0 = iconPos.x + (ICON - size0) / 2;
  const top0 = iconPos.y + (ICON - size0) / 2;

  const cardL = u(lerp(left0, 0, launch));
  const cardT = u(lerp(top0, 0, launch));
  const cardW = u(lerp(size0, FRAME.w, launch));
  const cardH = u(lerp(size0, FRAME.h, launch));
  const cardR = Math.max(0, u(lerp(ICON_RADIUS * k, 0, launch)));

  // Iris wipe out onto the level background.
  const exitAt = levelCardExitTick();
  const exitP = clamp01((frame - exitAt) / tk(LEVEL_CARD.exitLen));
  const exitEase = 1 - Math.pow(1 - exitP, 3);
  const exiting = frame >= exitAt;
  const clip = exiting ? wipeClip(VARIANT[level], 1 - exitEase) : undefined;

  const titleIn = springAt(frame, tk(LEVEL_CARD.textAt), 'gentle');
  const lineIn = springAt(frame, tk(LEVEL_CARD.textAt) + tk(LEVEL_CARD.textStagger), 'gentle');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: levelBackground[level],
      }}
    >
      {/* home screen: blank icons, fades in and out as the app launches */}
      <div style={{position: 'absolute', inset: 0, opacity: gridIn * (1 - launch)}}>
        {Array.from({length: GRID_COLS * GRID_ROWS}, (_, n) => {
          const c = n % GRID_COLS;
          const r = Math.floor(n / GRID_COLS);
          if (c === cc && r === cr) return null;
          const p = cellPos(c, r);
          return (
            <div
              key={n}
              style={{
                position: 'absolute',
                left: u(p.x),
                top: u(p.y),
                width: u(ICON),
                height: u(ICON),
                borderRadius: u(ICON_RADIUS),
                background: colors.glass,
                border: `1px solid ${colors.hairline}`,
              }}
            />
          );
        })}
      </div>

      {/* the level app: icon first, then the full-screen card */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: clip,
          opacity: gridIn,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: cardL,
            top: cardT,
            width: cardW,
            height: cardH,
            borderRadius: cardR,
            background: `linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.35)), ${accent}`,
            boxShadow: `0 ${u(18)}px ${u(48)}px ${colors.shadow}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* numeral on the icon, gone as the card grows */}
          <div
            style={{
              ...textStyle('number'),
              color: colors.onAccent,
              opacity: clamp01(1 - launch * 3),
              position: 'absolute',
            }}
          >
            {idx + 1}
          </div>
        </div>

        {/* text, laid out on the full frame (not scaled with the card) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: u(20),
            color: colors.onAccent,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              ...textStyle('title'),
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * u(24)}px)`,
            }}
          >
            {text.title}
          </div>
          <div
            style={{
              ...textStyle('body'),
              opacity: lineIn * 0.85,
              transform: `translateY(${(1 - lineIn) * u(18)}px)`,
            }}
          >
            {text.line}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelCard;
