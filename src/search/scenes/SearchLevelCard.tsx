import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONTS, px } from '../../style';
import { Background } from '../../Background';
import { prog, slamIn, revealIn } from '../../anim';
import { backOut, linear } from '../../gsap-helpers';
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

/** Motion constants (ticks unless noted). */
const EXIT_TICKS = 12;
const EYEBROW_AT = 2;
const NAME_AT = 12;
const META_AT = 30;
const DEMO_AT = 24;
/** Leave this many ticks between the end of the typing and the exit. */
const DEMO_SETTLE_TICKS = 6;
/** Layout, 1280x720 reference units. */
const EYEBROW_Y = 70;
const NAME_Y = 100;
const NAME_FONT = 150;
const META_Y = 275;
const RULE_Y = 335;
const DEMO_W = 300;
const DEMO_TOP = 365;

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
  const exitP = prog(frame, p.duration - EXIT_TICKS, EXIT_TICKS, linear);

  const eyebrow = revealIn(frame, EYEBROW_AT, 14, 18);
  const title = slamIn(frame, NAME_AT, 16);
  const meta = revealIn(frame, META_AT, 16, 22);
  const pop = prog(frame, 10, 18, backOut);
  const demoIn = prog(frame, p.demoAt - 8, 8, linear);

  const abs = (top: number): React.CSSProperties => ({ position: 'absolute', left: 0, width: '100%', top: px(top), textAlign: 'center' });

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={level.theme} energy={0} />
      <AbsoluteFill style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.06 * exitP})` }}>
        <div
          style={{
            ...abs(EYEBROW_Y),
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
            ...abs(NAME_Y),
            fontFamily: FONTS.display,
            fontSize: px(NAME_FONT),
            lineHeight: 1.2,
            letterSpacing: px(6),
            color: level.accent,
            opacity: title.opacity,
            transform: title.transform,
            filter: `${title.filter} drop-shadow(0 ${px(10)}px ${px(40)}px ${level.accent}66)`,
          }}
        >
          {level.name}
        </div>
        <div
          style={{
            ...abs(META_Y),
            fontFamily: FONTS.display,
            fontSize: px(46),
            letterSpacing: px(3),
            color: '#fff',
            opacity: meta.opacity,
            transform: meta.transform,
          }}
        >
          <b style={{ color: level.accent, fontWeight: 400 }}>{p.count}</b> CHARACTERS ·{' '}
          <b style={{ color: level.accent, fontWeight: 400 }}>{level.time}</b> SECONDS EACH
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: px(RULE_Y),
            marginLeft: -px(280) * pop,
            height: px(4),
            width: px(560) * pop,
            borderRadius: px(4),
            background: `linear-gradient(90deg, transparent, ${level.accent}, transparent)`,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, opacity: demoIn }}>
          <SearchBar
            searches={[p.sample]}
            starts={[p.demoAt]}
            typeTicks={p.typeTicks}
            accent={level.accent}
            size={DEMO_W}
            at={{ x: 640, y: DEMO_TOP }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
