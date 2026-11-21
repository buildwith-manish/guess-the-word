import React from 'react';
import { COLORS, FONTS, glass, px } from '../../style';
import { prog, htmlEase, clamp01 } from '../../anim';
import { Background } from '../../Background';
import { Flash } from '../../Fx';
import type { Cue } from '../../sound';
import { makeRandom } from '../../util';
import cfg from '../search-settings.json';
import { ROUNDS } from '../search-data';
import { LEVELS, TIMELINE, themeForRound } from '../search-timing';
import { HOLD_CHARS, SLIDE_CHARS, SearchBar, slideEnd } from '../components/SearchBar';
import { charTick } from '../typing';
import { SearchTitleLockup } from '../components/SearchTitleLockup';
import '../../fonts';

/**
 * Hook of the search video (task 3c, polished in 7f): the headline and the sample search bar are on
 * screen from the first tick and typing starts at once (round 1's first three searches). The headline
 * takes a glitch hit on a music beat (tick GLITCH_HIT_TICKS), then settles and stays clear while the
 * bar keeps typing. Then the title lockup and a rules line. Round 1's answer is never read here.
 *
 * Length: the scene lasts `duration` ticks (default: the hook segment of the timeline, which
 * search-timing.ts already stretches to a voiceover intro clip). Every phase is a share of it,
 * so a longer scene (a longer intro clip) stretches the phases.
 */

/** On-screen words. search-settings.json has no keys for them, so they are named here. */
const TEXT = {
  headline: 'Whose search history is this?',
  title: 'SEARCH HISTORY',
  subtitle: 'Guess the character',
  searchesLabel: 'searches per round',
  charactersLabel: 'characters',
  levelsLabel: 'levels',
};

/** Phase shares of the scene length (they sum to 1; the rules line sits inside the lockup share). Motion constants. */
const SHARE = { typing: 0.5, settle: 0.13, lockup: 0.37 };
/** Where inside the lockup share the rules line starts. */
const RULES_IN_LOCKUP = 0.7;
/** How many of round 1's searches the sample bar types. */
const SAMPLE_SEARCHES = 3;

/** Layout, 1280x720 reference units. Motion constants. */
const BAR_SIZE = 560;
const BAR_TOP = 150;
const HEADLINE_Y = 40;
const HEADLINE_FONT = 58;
const LOCKUP_TOP = 215;
const LOCKUP_SCALE = 1.6;
const RULES_Y = 450;
const FADE_OUT_SECONDS = 0.3;

/**
 * The glitch hit lands on a music beat. The music loop is 256 ticks = 16 beats (112.5 BPM, see
 * scripts/generate-audio.js), so one beat is 16 ticks (0.53 s). This assumes the hook starts on the
 * music's first beat, which was not checked against the soundtrack. Motion constant.
 */
const BEAT_TICKS = 16;
const GLITCH_HIT_TICKS = BEAT_TICKS;
/** The headline fades in over these ticks, so it is clear from the first frames. Motion constant. */
const HEADLINE_ENTER_TICKS = 2;
/** On the hit the headline punches in (scale 1 + KICK, back to 1) and a soft flash fires. Motion constants. */
const HIT_KICK = 0.05;
const HIT_KICK_TICKS = 6;
const HIT_FLASH_MS = 360;
const HIT_FLASH_PEAK = 0.3;
/** Key-click pitch: playbackRate varies by +/- this fraction per click (same value as searchRoundCues.ts). */
const CLICK_JITTER = 0.12;
/** Seed of the hook's click stream. The rounds use 1..N, so 1000 keeps the streams apart. */
const CLICK_SEED = 1000;

/** Glitch burst. Motion constants. */
const GLITCH_BURST_SECONDS = 0.45;
const GLITCH_STEP_TICKS = 2;
const GLITCH_SHIFT = 22;
const GLITCH_BAND = 0.3;
const RULE_CHIP_STAGGER_TICKS = 4;
const RULE_CHIP_FADE_TICKS = 10;

const FPS_DESIGN = 30;
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const defaultDuration = () => TIMELINE.segments.find((s) => s.kind === 'hook')?.duration ?? 0;

/** All phase ticks of the hook, scene-local. Shared by the scene and its cues. */
export const hookPlan = (duration: number = defaultDuration()) => {
  const searches = ROUNDS[0].searches.slice(0, SAMPLE_SEARCHES);
  const typeStart = 0; // typing is visible from the first tick
  const window = duration * SHARE.typing;
  const units = searches.reduce((n, s) => n + s.length + HOLD_CHARS, 0) + SLIDE_CHARS;
  const typeTicks = Math.min(cfg.typing.ticksPerChar, window / units);
  // Each search starts when the previous one begins to slide into the list.
  const starts: number[] = [];
  let at = typeStart;
  searches.forEach((s) => {
    starts.push(at);
    at += (s.length + HOLD_CHARS) * typeTicks;
  });
  const lockupAt = duration * (SHARE.typing + SHARE.settle);
  const glitchAt = Math.min(GLITCH_HIT_TICKS, lockupAt); // on the first beat, while the bar is still typing
  const rulesAt = lockupAt + duration * SHARE.lockup * RULES_IN_LOCKUP;
  return { duration, searches, typeStart, typeTicks, starts, glitchAt, lockupAt, rulesAt };
};

/** Sound cues, design ticks from the start of the hook. */
export const searchHookCues = (duration: number = defaultDuration()): Cue[] => {
  const p = hookPlan(duration);
  const cues: Cue[] = [];
  const rand = makeRandom(CLICK_SEED); // one stream, drawn in click order, so every render is identical
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) =>
    cues.push({ frame: Math.round(frame), sfx, ...extra });

  p.searches.forEach((text, i) => {
    for (let k = 2; k <= text.length; k += 2) {
      add(charTick(p.starts[i], text, k, p.typeTicks), 'key-click', { rate: 1 + (rand() * 2 - 1) * CLICK_JITTER });
    }
    // Soft "send" when the search has landed in the list ('send' has its gain baked in, task 7d).
    add(slideEnd(p.starts[i], text.length, p.typeTicks), 'send');
  });
  add(p.glitchAt, 'thump'); // glitch hit
  add(p.glitchAt + GLITCH_BURST_SECONDS * FPS_DESIGN, 'blip'); // glitch settles
  add(p.lockupAt, 'title');
  add(p.rulesAt, 'rule-sweep');
  return cues.sort((a, b) => a.frame - b.frame);
};

// ------------------------------------------------------------------ glitch

const GlitchHeadline: React.FC<{ frame: number; hitAt: number; text: string; accent: string }> = ({
  frame,
  hitAt,
  text,
  accent,
}) => {
  // Clear from the first ticks; the glitch is a burst that starts at hitAt and settles back to the clean text.
  const t = frame - hitAt;
  const burst = clamp01(t / (GLITCH_BURST_SECONDS * FPS_DESIGN)); // 0..1 over the burst
  const active = t >= 0 && burst < 1;
  const step = Math.floor(Math.max(0, t) / GLITCH_STEP_TICKS);
  const amp = active ? px(GLITCH_SHIFT) * (1 - burst) : 0;
  const flicker = active && hash(step * 5.3) < 0.28 * (1 - burst) * 2 ? 0.15 : 1;
  const jitter = active ? (hash(step * 2.1) - 0.5) * 2 * amp * 0.4 : 0;
  const kick = t >= 0 ? 1 - prog(frame, hitAt, HIT_KICK_TICKS, htmlEase) : 0;
  const band = (seed: number) => {
    const top = hash(seed) * (1 - GLITCH_BAND);
    return `inset(${top * 100}% 0 ${(1 - top - GLITCH_BAND) * 100}% 0)`;
  };
  const layer = (color: string, seed: number, sign: number): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    color,
    transform: `translateX(${sign * amp * (0.4 + hash(seed))}px)`,
    clipPath: band(seed + 1),
    opacity: active ? 0.9 : 0,
  });
  const style: React.CSSProperties = {
    fontFamily: FONTS.display,
    fontSize: px(HEADLINE_FONT),
    letterSpacing: px(2),
    textAlign: 'center',
    whiteSpace: 'pre',
    lineHeight: 1.1,
  };
  const enter = prog(frame, 0, HEADLINE_ENTER_TICKS, htmlEase);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width: '100%',
        top: px(HEADLINE_Y),
        display: 'flex',
        justifyContent: 'center',
        opacity: enter,
      }}
    >
      <div style={{ position: 'relative', opacity: flicker, transform: `translateX(${jitter}px) scale(${1 + HIT_KICK * kick})` }}>
        <div style={{ ...style, color: COLORS.ink, textShadow: `0 0 ${px(24)}px ${accent}` }}>{text}</div>
        <div style={{ ...style, ...layer(accent, step * 3.7, -1) }}>{text}</div>
        <div style={{ ...style, ...layer(COLORS.red, step * 7.9, 1) }}>{text}</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------- scene

export const SearchHook: React.FC<{ frame: number; duration?: number }> = ({ frame, duration }) => {
  const p = hookPlan(duration);
  const round = ROUNDS[0];
  const level = LEVELS.find((l) => l.name === round.level) ?? LEVELS[0];

  // The headline and the bar are there from tick 0; both leave together when the lockup starts.
  const gone = prog(frame, p.lockupAt, FADE_OUT_SECONDS * FPS_DESIGN);
  const oldOpacity = 1 - gone;

  const rules = [
    { n: round.searches.length, label: TEXT.searchesLabel },
    { n: ROUNDS.length, label: TEXT.charactersLabel },
    { n: LEVELS.length, label: TEXT.levelsLabel },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Background frame={frame} theme={themeForRound(0)} />

      <div style={{ position: 'absolute', inset: 0, opacity: oldOpacity }}>
        <SearchBar
          searches={[...p.searches]}
          starts={p.starts}
          typeTicks={p.typeTicks}
          accent={level.accent}
          size={BAR_SIZE}
          at={{ x: 640, y: BAR_TOP }}
        />
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: oldOpacity }}>
        <GlitchHeadline frame={frame} hitAt={p.glitchAt} text={TEXT.headline} accent={level.accent} />
      </div>

      <Flash frame={frame} start={p.glitchAt} ms={HIT_FLASH_MS} peak={HIT_FLASH_PEAK} />

      <SearchTitleLockup frame={frame} from={p.lockupAt} title={TEXT.title} subtitle={TEXT.subtitle} top={LOCKUP_TOP} scale={LOCKUP_SCALE} />

      {frame >= p.rulesAt ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: px(RULES_Y),
            display: 'flex',
            justifyContent: 'center',
            gap: px(16),
          }}
        >
          {rules.map((r, i) => {
            const k = prog(frame, p.rulesAt + i * RULE_CHIP_STAGGER_TICKS, RULE_CHIP_FADE_TICKS, htmlEase);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: px(8),
                  padding: `${px(8)}px ${px(18)}px`,
                  fontFamily: FONTS.body,
                  fontSize: px(17),
                  fontWeight: 600,
                  color: COLORS.muted,
                  opacity: k,
                  transform: `translateY(${(1 - k) * px(10)}px)`,
                  ...glass(px(14)),
                }}
              >
                <span style={{ fontFamily: FONTS.display, fontSize: px(26), color: level.accent }}>{r.n}</span>
                {r.label}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
