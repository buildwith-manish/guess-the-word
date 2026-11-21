/**
 * StateLevelCard (task 3e): the card between level blocks. Adapted from src/LevelCard.tsx: "LEVEL n / N",
 * the level name slammed in, "<count> STATES · <time> SECONDS EACH", an accent rule, and on the right a
 * tiny demo of the level's rule, drawn with the real components on ONE sample state of that level
 * (the first state of the level in states-data.ts):
 *   outline  StateShape draws          (no tier rule)
 *   crop     StateShape traced in      (outline draws itself)
 *   rotate   StateShape rotated        (the state's `rotation`, spun in, then a slight sway)
 *   pixel    blurred silhouette        (sharpens, then the neon outline)
 * The tier is read off the sample state (rotation / cropSide) and the last level (pixel), not typed per level.
 * Counts, seconds, colours: LEVELS / QUESTIONS from state-timing (states-settings.json, states-data.ts).
 *
 * Time: `frame` = design ticks since the segment started. `duration` is the segment length (the timeline
 * stretches the card to fit a level voiceover clip); the exit starts 12 ticks before its end. Default
 * settings.levelCardFrames.
 * Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../../Background';
import { COLORS, FONTS, SAFE_X, glass, px } from '../../style';
import { prog, slamIn, revealIn, cssEaseInOut, mix } from '../../anim';
import { backOut, linear } from '../../gsap-helpers';
import rootSettings from '../../../settings.json';
import settings from '../states-settings.json';
import { LEVELS, QUESTIONS, voiceLevel } from '../state-timing';
import { STATES } from '../states-data';
import type { StateInfo } from '../states-data';
import { StateShape } from '../components/StateShape';
import type { StateCue } from './stateRoundCues';

/** Beats in ticks from the start of the card. */
export const LEVEL_BEATS = { thump: 3, nameAt: 12, boom: 15, demoAt: 22, exit: 12 };

/** The four rule demos. Labels are copy (not data). */
export type Tier = 'outline' | 'crop' | 'rotate' | 'pixel';
const TIER_LABEL: Record<Tier, string> = {
  outline: 'FULL OUTLINE',
  crop: 'TRACED IN',
  rotate: 'ROTATED',
  pixel: 'BLURRED',
};

/** Demo timing in ticks counted from the demo's own start (LEVEL_BEATS.demoAt). */
const DEMO = { draw: 16, spin: 22, cropAt: 20, cropDur: 14, pixelDur: 26, fadeAt: 28, fadeDur: 8 };

/** The state shown in the demo of a level: its first state in video order. */
export const sampleState = (levelIndex: number): StateInfo =>
  STATES.find((s) => s.level === (LEVELS[levelIndex] ?? LEVELS[0]).name) ?? STATES[0];

export const tierOf = (levelIndex: number): Tier => {
  const s = sampleState(levelIndex);
  if (levelIndex === LEVELS.length - 1) return 'pixel';
  if (s.rotation) return 'rotate';
  if (s.cropSide) return 'crop';
  return 'outline';
};

const countFor = (name: string) => QUESTIONS.filter((q) => q.level === name).length;

/** Cues, ticks from the start of the card (absolute tick = seg.from + cue.frame). */
export const stateLevelCardCues = (): StateCue[] => [
  { frame: LEVEL_BEATS.thump, sfx: 'thump' },
  { frame: LEVEL_BEATS.boom, sfx: 'boom' },
  { frame: LEVEL_BEATS.demoAt, sfx: 'pop' },
];

/** Level voiceover clip placement (tick from the start of the card), or undefined without a clip. */
export const stateLevelCardVoice = (levelIndex: number): { frame: number; file: string; frames: number } | undefined => {
  const clip = voiceLevel((LEVELS[levelIndex] ?? LEVELS[0]).name);
  return clip ? { frame: rootSettings.voiceover.offsetFrames, file: clip.file, frames: clip.frames } : undefined;
};

const RuleDemo: React.FC<{ t: number; levelIndex: number; size: number; accent: string }> = ({ t, levelIndex, size, accent }) => {
  const s = sampleState(levelIndex);
  const tier = tierOf(levelIndex);
  const draw = prog(t, 0, DEMO.draw, cssEaseInOut);

  if (tier === 'pixel') {
    // blurred silhouette sharpening, then the outline
    const p = prog(t, 0, DEMO.pixelDur, linear);
    const fade = prog(t, DEMO.fadeAt, DEMO.fadeDur, cssEaseInOut);
    const blur = size * (settings.tiers.blur.start + (settings.tiers.blur.end - settings.tiers.blur.start) * p);
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - fade, filter: `blur(${blur}px)` }}>
          <StateShape stateKey={s.key} size={size} progress={1} fill={1} glow={0} mode="filled" accent={accent} />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: fade }}>
          <StateShape stateKey={s.key} size={size} progress={1} glow={1} accent={accent} />
        </div>
      </div>
    );
  }
  if (tier === 'crop') {
    // outline traces itself
    const trace = prog(t, 0, DEMO.cropAt + DEMO.cropDur, cssEaseInOut);
    return <StateShape stateKey={s.key} size={size} progress={trace} glow={draw} accent={accent} />;
  }
  if (tier === 'rotate') {
    const spin = prog(t, 0, DEMO.spin, cssEaseInOut);
    const sway = Math.sin((Math.max(0, t) / 30) * Math.PI * 2 * 0.8) * 4 * spin;
    const rotation = (s.rotation ?? 0) + mix(-180, 0, spin) + sway;
    return <StateShape stateKey={s.key} size={size} progress={draw} glow={draw} rotation={rotation} accent={accent} />;
  }
  return <StateShape stateKey={s.key} size={size} progress={draw} glow={draw} accent={accent} />;
};

/** "LEVEL n / N, name, count and seconds" on the left, the rule demo on the right. */
export const StateLevelCard: React.FC<{ frame: number; levelIndex: number; duration?: number }> = ({
  frame,
  levelIndex,
  duration = settings.levelCardFrames,
}) => {
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const exitP = prog(frame, duration - LEVEL_BEATS.exit, LEVEL_BEATS.exit, linear);

  const eyebrow = revealIn(frame, 2, 14, 18);
  const title = slamIn(frame, LEVEL_BEATS.nameAt, 16);
  const meta = revealIn(frame, 34, 16, 22);
  const pop = prog(frame, 10, 18, backOut);
  const demoIn = revealIn(frame, LEVEL_BEATS.demoAt, 16, 22);

  const demoSize = px(250);
  const tier = tierOf(levelIndex);

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={level.theme} />
      <AbsoluteFill
        style={{
          opacity: 1 - exitP,
          transform: `scale(${1 - 0.06 * exitP})`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(70),
          padding: `0 ${SAFE_X}px`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(24),
              letterSpacing: px(10),
              color: 'rgba(255,255,255,0.87)',
              opacity: eyebrow.opacity,
              transform: eyebrow.transform,
            }}
          >
            LEVEL {levelIndex + 1} / {LEVELS.length}
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(170),
              lineHeight: 1,
              letterSpacing: px(6),
              color: level.accent,
              opacity: title.opacity,
              transform: title.transform,
              filter: `${title.filter} drop-shadow(0 ${px(10)}px ${px(40)}px ${level.accent}66)`,
              margin: `${px(6)}px 0 ${px(18)}px`,
              whiteSpace: 'nowrap',
            }}
          >
            {level.name}
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(40),
              letterSpacing: px(3),
              color: COLORS.ink,
              opacity: meta.opacity,
              transform: meta.transform,
              whiteSpace: 'nowrap',
            }}
          >
            <b style={{ color: level.accent, fontWeight: 400 }}>{countFor(level.name)}</b> STATES ·{' '}
            <b style={{ color: level.accent, fontWeight: 400 }}>{level.time}</b> SECONDS EACH
          </div>
          <div
            style={{
              marginTop: px(26),
              height: px(4),
              width: px(560) * pop,
              borderRadius: px(4),
              background: `linear-gradient(90deg, ${level.accent}, transparent)`,
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: px(14),
            opacity: demoIn.opacity,
            transform: demoIn.transform,
          }}
        >
          <div
            style={{
              ...glass(px(36), 0.1),
              border: `${px(2)}px solid ${level.accent}`,
              padding: px(24),
              width: demoSize,
              height: demoSize,
              boxSizing: 'content-box',
            }}
          >
            <RuleDemo t={frame - LEVEL_BEATS.demoAt} levelIndex={levelIndex} size={demoSize} accent={level.accent} />
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: px(30), letterSpacing: px(4), color: level.accent }}>{TIER_LABEL[tier]}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
