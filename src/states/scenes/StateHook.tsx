/**
 * StateHook (task 3d): the opening of "Guess the US State from Its Shape", about 12 seconds.
 *
 *   silence    0 .. silence                  background only, no sound
 *   drops      ten state shapes fall one after another onto their place in the US map and snap (small overshoot)
 *   snap       the full map (MiniMap scaled up) fades in under them, flash + boom, the ten stay lit
 *   question   "Can you name all 50 states by their shape?"
 *   lockup     "GUESS THE STATE" tiles, STATE igniting last (StateTitleLockup)
 *   rules      one line built from the data: number of states, number of levels, seconds per level
 *
 * The beat times are authored below (HOOK_BEATS, seconds); everything the viewer reads that is a fact comes from
 * state-timing (TOTAL, LEVELS) and states-data (the ten shapes are the first ten states in video order).
 *
 * Voiceover: if manifest.intro has a clip, the scene lasts at least offsetFrames + clip + tailFrames (the same
 * rule as the timeline's fitClip); the extra time is added to the end hold. The clip starts offsetFrames in.
 *
 * `frame` = local design tick (30 per second) of the hook. NOTE: TIMELINE's hook segment is still
 * root settings timing.hookA + hookB (= 8 s) in state-timing.ts: it has to use stateHookPlan().duration to match.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { prog, clamp01 } from '../../anim';
import { px } from '../../style';
import { IOS, IosBackground } from '../../ios';
import { enter, iosOut, sprFit } from '../motion';
import {RADIUS, glassPanel, COLOR } from '../look';
import root from '../../../settings.json';
import { FPS, HEIGHT, LEVELS, TOTAL, WIDTH, voiceIntro } from '../state-timing';
import { STATES } from '../states-data';
import { MiniMap, getMiniRect, levelAccent, miniMapHeight } from '../components/MiniMap';
import type { Rect } from '../components/MiniMap';
import { StateShape, getShapeBox } from '../components/StateShape';
import { StateTitleLockup, lockupTimes } from '../components/StateTitleLockup';
import type { StateCue, StateSfx } from './stateRoundCues';

const sec = (s: number) => Math.round(s * FPS);

/** Authored beat times of the hook, in ticks from the start of the scene. */
export const HOOK_BEATS = {
  /** nothing happens for this long */
  silence: sec(1),
  /** how many shapes drop (the first ones in video order) */
  drops: 10,
  /** gap between two drops, and how long one fall takes */
  dropEvery: sec(0.25),
  dropFall: sec(0.5),
  /** the full map fades in over this */
  mapFade: sec(0.5),
  /** the question line is up from questionIn, starts fading at questionOut and must be gone by lockupAt (questionOut + questionFade) */
  questionIn: sec(4.5),
  questionOut: sec(7.7),
  questionFade: sec(0.3),
  /** the lockup starts (the question has gone) */
  lockupAt: sec(8),
  /** the rules line appears */
  rulesAt: sec(10),
  /** length without a voiceover clip: about 12 s */
  base: sec(12),
};

const LAYOUT = {
  /** US map width as a fraction of the frame width, and its vertical centre as a fraction of the height */
  mapW: 0.56,
  mapCy: 0.6,
  /** lockup tile scale (1 = the GTW title size) */
  lockupScale: 1.6,
  glow: 0,
};

export type StateHookPlan = typeof HOOK_BEATS & {
  /** tick the full map snaps in */
  snapAt: number;
  /** scene length: base, stretched by the intro voiceover clip */
  duration: number;
  /** the intro clip, if the manifest has one (starts offsetFrames in) */
  vo?: { file: string; start: number; frames: number };
};

export const stateHookPlan = (): StateHookPlan => {
  const B = HOOK_BEATS;
  const clip = voiceIntro();
  const vo = root.voiceover;
  const voEnd = clip ? vo.offsetFrames + clip.frames + vo.tailFrames : 0;
  return {
    ...B,
    snapAt: B.silence + (B.drops - 1) * B.dropEvery + B.dropFall,
    duration: Math.max(B.base, voEnd),
    vo: clip ? { file: clip.file, start: vo.offsetFrames, frames: clip.frames } : undefined,
  };
};

export const HOOK_PLAN = stateHookPlan();

/** The sentence under the lockup, built from the data. */
export const hookRulesLine = (): string =>
  `${TOTAL} STATES · ${LEVELS.length} LEVELS · ${LEVELS.map((l) => l.time).join(' / ')} SECONDS`;

export const hookQuestionLine = (): string => `Can you name all ${TOTAL} states by their shape?`;

// ---------------------------------------------------------------- sound
/** Cue list of the hook: same shape as stateRoundCues, ticks from the start of the scene. */
export const stateHookCues = (): StateCue[] => {
  const P = HOOK_PLAN;
  const cues: StateCue[] = [];
  const add = (frame: number, sfx: StateSfx) => cues.push({ frame, sfx });

  // silence first: the first sound is the first shape landing
  for (let i = 0; i < P.drops; i++) add(P.silence + i * P.dropEvery + P.dropFall, 'thump');
  add(P.snapAt, 'boom');
  add(P.questionIn, 'whoosh');
  add(P.lockupAt, 'title');
  add(P.lockupAt + lockupTimes().igniteAt, 'flare');
  add(P.rulesAt, 'pop');

  return cues.sort((a, b) => a.frame - b.frame);
};

// ---------------------------------------------------------------- scene
/** One state shape falling from above onto its place in the map. */
const DropShape: React.FC<{ stateKey: string; map: Rect; f: number; start: number; fade: number }> = ({
  stateKey,
  map,
  f,
  start,
  fade,
}) => {
  if (f < start) return null;
  const target = getMiniRect(stateKey, map);
  // box side so the fitted shape fills the state's bbox on the map, centred on it
  const probe = getShapeBox(stateKey, target.w);
  const box = target.w * Math.min(target.w / probe.w, target.h / probe.h);
  const left = target.x + target.w / 2 - box / 2;
  const top = target.y + target.h / 2 - box / 2;
  const p = sprFit(f, start, HOOK_BEATS.dropFall, 'normal'); // lands exactly at the end of the fall
  const fallY = -(1 - p) * (top + box);
  return (
    <div style={{ position: 'absolute', left, top, width: box, height: box, transform: `translateY(${fallY}px)`, opacity: fade }}>
      <StateShape stateKey={stateKey} size={box} fill={1} glow={LAYOUT.glow} accent={levelAccent(stateKey)} />
    </div>
  );
};

export const StateHook: React.FC<{ frame: number }> = ({ frame: f }) => {
  const P = HOOK_PLAN;
  const dropKeys = STATES.slice(0, P.drops).map((s) => s.key);

  const mapW = WIDTH * LAYOUT.mapW;
  const mapH = miniMapHeight(mapW);
  const map: Rect = { x: (WIDTH - mapW) / 2, y: HEIGHT * LAYOUT.mapCy - mapH / 2, w: mapW, h: mapH };

  const mapIn = prog(f, P.snapAt, P.mapFade, iosOut);

  // question line: fade + rise in, fade out
  const qE = enter(f, P.questionIn, 'normal', 20);
  const qIn = qE.opacity;
  const qOut = 1 - iosOut((f - P.questionOut) / P.questionFade); // gone by lockupAt (same length as before)
  const showQuestion = f >= P.questionIn && f < P.questionOut + P.questionFade;

  // rules line: fade + rise in
  const rulesE = enter(f, P.rulesAt, 'quick', 16);
  const rulesIn = rulesE.opacity;

  const textZone: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: WIDTH,
    height: map.y,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <AbsoluteFill>
      <IosBackground accent={LEVELS[0].accent} />

      {/* the full US map, under the ten dropped shapes */}
      <div style={{ position: 'absolute', left: map.x, top: map.y, width: map.w, height: map.h, opacity: mapIn }}>
        <MiniMap answered={dropKeys} size={map.w} frame={f} />
      </div>
      {dropKeys.map((key, i) => (
        <DropShape
          key={key}
          stateKey={key}
          map={map}
          f={f}
          start={P.silence + i * P.dropEvery}
          fade={1 - clamp01(mapIn)}
        />
      ))}

      <div style={textZone}>
        {showQuestion ? (
          <div
            style={{
              maxWidth: WIDTH * 0.86,
              textAlign: 'center',
              fontFamily: IOS.font,
              fontWeight: IOS.weight.semibold,
              fontSize: px(54),
              lineHeight: 1.15,
              letterSpacing: px(-1),
              color: COLOR.text.primary,
              opacity: qIn * qOut,
              transform: qE.transform,
            }}
          >
            {hookQuestionLine()}
          </div>
        ) : null}

        {f >= P.lockupAt ? (
          <>
            <StateTitleLockup frame={f - P.lockupAt} scale={LAYOUT.lockupScale} />
            {f >= P.rulesAt ? (
              <div
                style={{
                  ...glassPanel(px(RADIUS.pill), LEVELS[0].accent, 0.4),
                  marginTop: px(26),
                  padding: `${px(10)}px ${px(36)}px`,
                  fontFamily: IOS.font,
                  fontWeight: IOS.weight.medium,
                  fontSize: px(30),
                  color: COLOR.text.label,
                  whiteSpace: 'nowrap',
                  opacity: rulesIn,
                  transform: rulesE.transform,
                }}
              >
                {hookRulesLine()}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
