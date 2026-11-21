import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE_X, px } from '../../style';
import { prog } from '../../anim';
import { IOS, IosBackground, spring, easeOut } from '../../ios';
import type { Cue } from '../../sound';
import cfg from '../search-settings.json';
import { ROUNDS } from '../search-data';
import { LEVELS, TIMELINE } from '../search-timing';
import { SearchBar } from '../components/SearchBar';
import '../../fonts';

/**
 * Level card (task 3d), copy-and-adapt of GTW's LevelCard: "LEVEL n / 3", the level name, the number
 * of characters and the clock seconds, and a tiny search bar that types one sample line.
 * The sample line is the shortest first search among the level's rounds (data, nothing typed by hand;
 * the first search is the hardest clue, so it gives nothing away). The 3D title option is not used.
 *
 * Length: `duration` ticks (default: this level's card in the timeline, which search-timing.ts stretches
 * to a voiceover clip). The card leaves over its last EXIT_TICKS.
 */

/**
 * Motion, shared with the other search overlays (reminder, end screen): entrances settle on the shared spring,
 * exits with the shared ease-out. Ticks unless noted.
 * Order of reading inside the card's fixed length: name by about 0.7 s, facts by about 1.1 s,
 * sample line typed by about 1.9 s, then it leaves over the last EXIT_TICKS.
 */
const ENTER_TICKS = 14;
const EXIT_TICKS = 9;
const EXIT_SCALE = 0.06;
const EYEBROW_AT = 0;
const NAME_AT = 6;
const META_AT = 20;
const DEMO_AT = 22;
/** Leave this many ticks between the end of the typing and the exit. */
const DEMO_SETTLE_TICKS = 6;
/** Layout, 1280x720 reference units. One stack, centred a little above the middle; sides keep SAFE_X. */
const STACK_TOP = 150;
const EYEBROW_Y = STACK_TOP;
const NAME_Y = STACK_TOP + 30;
const NAME_FONT = 150;
const META_Y = STACK_TOP + 205;
const RULE_Y = STACK_TOP + 265;
const DEMO_W = 300;
const DEMO_TOP = STACK_TOP + 295;
/** Quiet text on the card: labels sit below the numbers they describe. */
const LABEL_OPACITY = 0.7;

const defaultDuration = (levelIndex: number) =>
  TIMELINE.segments.find((s) => s.kind === 'levelCard' && s.levelIndex === levelIndex)?.duration ?? cfg.levelCardFrames;

/** All phase ticks of one level card, scene-local. Shared by the scene and its cues. */
export const levelCardPlan = (levelIndex: number, duration: number = defaultDuration(levelIndex)) => {
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const rounds = ROUNDS.filter((r) => r.level === level.name);
  const sample = rounds.map((r) => r.searches[0]).reduce((a, b) => (b.length < a.length ? b : a));
  const window = Math.max(1, duration - EXIT_TICKS - DEMO_SETTLE_TICKS - DEMO_AT);
  const typeTicks = Math.min(cfg.typing.ticksPerChar, window / sample.length);
  return { level, count: rounds.length, sample, typeTicks, demoAt: DEMO_AT, nameAt: NAME_AT, duration };
};

/** Sound cues, design ticks from the start of the card. */
export const searchLevelCardCues = (levelIndex: number, duration?: number): Cue[] => {
  const p = levelCardPlan(levelIndex, duration);
  const cues: Cue[] = [{ frame: p.nameAt, sfx: 'stamp' }]; // the level name slams in
  for (let k = 2; k <= p.sample.length; k += 2) {
    // TODO(6b): 'tick' stands in for a key-click; task 6b creates the real sound.
    cues.push({ frame: Math.round(p.demoAt + (k - 1) * p.typeTicks), sfx: 'tick', volume: 0.6, rate: 1.6 });
  }
  return cues.sort((a, b) => a.frame - b.frame);
};

export const SearchLevelCard: React.FC<{ frame: number; levelIndex: number; duration?: number }> = ({
  frame,
  levelIndex,
  duration,
}) => {
  const p = levelCardPlan(levelIndex, duration);
  const { level } = p;
  const exitP = prog(frame, p.duration - EXIT_TICKS, EXIT_TICKS, easeOut);

  // Everything rises in on the shared spring (ticks of ENTER_TICKS), a little apart; the demo bar fades in with it.
  const rise = (at: number, dist: number) => {
    const k = spring((frame - at) / ENTER_TICKS);
    return { opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * px(dist)}px)` };
  };
  const eyebrow = rise(EYEBROW_AT, 14);
  const title = rise(NAME_AT, 22);
  const meta = rise(META_AT, 16);
  const demoIn = Math.min(1, spring((frame - (p.demoAt - 8)) / 8) * 1.4);

  const abs = (top: number): React.CSSProperties => ({ position: 'absolute', left: SAFE_X, right: SAFE_X, top: px(top), textAlign: 'center' });

  return (
    <AbsoluteFill>
      <IosBackground accent={level.accent} />
      <AbsoluteFill style={{ opacity: 1 - exitP, transform: `scale(${1 - EXIT_SCALE * exitP})`, fontFamily: IOS.font }}>
        <div
          style={{
            ...abs(EYEBROW_Y),
            fontWeight: IOS.weight.semibold,
            fontSize: px(24),
            letterSpacing: px(24) * 0.02,
            color: IOS.color.secondary,
            opacity: eyebrow.opacity,
            transform: eyebrow.transform,
          }}
        >
          Level {levelIndex + 1} of {LEVELS.length}
        </div>
        <div
          style={{
            ...abs(NAME_Y),
            fontWeight: IOS.weight.bold,
            fontSize: px(NAME_FONT * 0.8),
            lineHeight: 1.2,
            letterSpacing: -px(NAME_FONT * 0.8) * 0.03,
            color: level.accent,
            opacity: title.opacity,
            transform: title.transform,
          }}
        >
          {level.name.charAt(0) + level.name.slice(1).toLowerCase()}
        </div>
        <div
          style={{
            ...abs(META_Y - 20),
            fontWeight: IOS.weight.medium,
            fontSize: px(32),
            color: IOS.color.secondary,
            whiteSpace: 'pre',
            opacity: meta.opacity,
            transform: meta.transform,
          }}
        >
          <span style={{ color: IOS.color.label, fontWeight: IOS.weight.semibold }}>{p.count}</span>
          <span> characters · </span>
          <span style={{ color: IOS.color.label, fontWeight: IOS.weight.semibold }}>{level.time}</span>
          <span> seconds each</span>
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: demoIn }}>
          <SearchBar
            searches={[p.sample]}
            starts={[p.demoAt]}
            typeTicks={p.typeTicks}
            accent={level.accent}
            size={DEMO_W}
            at={{ x: 640, y: DEMO_TOP - 20 }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
