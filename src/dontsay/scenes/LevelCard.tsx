/**
 * LevelCard.tsx: the level intro card of "Don't Say The Same As Me" (task 4a).
 *
 * Opens like an app launching from a home-screen icon: the level colour springs up from a small
 * icon-sized rounded square at the lower right until it fills the frame (spring 'pop', via
 * levelCardLaunch), holds, then shrinks back toward the icon (levelCardExit).
 * On the card: level title, the hearts reset line, and the round counter reset to the level's first round.
 * The reset is mentioned on every level (decision 5). No heart is drawn, animated or lost (decision 1/14).
 *
 * Everything the viewer reads or hears that is data comes from data.ts / timing.ts:
 *   title and reset line are split out of `levelColors[level].voice` (the spoken intro);
 *   the counter comes from `rounds`; the length from `levelCardSec`.
 * The only copy owned here is the counter label and the icon glyph. Sizes are 1280x720 reference
 * units rendered through px(). Text stays inside the centre 80% (1024 x 576 ref).
 */
import React from 'react';
import { levelColors, rounds, type Level } from '../data';
import { WIDTH, levelCardSec, secToTicks, useDontSayFrame } from '../timing';
import { colours, fontHeadline, fontNumeric, glassSurface, springAt } from '../system';
import { levelCardId, type SfxId } from '../sfx';
import { levelCardLaunch, levelCardExit } from '../shared/levelCard';
import { clamp01 } from '../shared/fade';
import { SettingsCard, settingsCardCues } from './SettingsCard';
import '../shared/fonts';

/** 1280x720 reference units -> render pixels (2560x1440). */
const px = (v: number): number => (v * WIDTH) / 1280;

const COPY = { round: 'Round', of: 'of' } as const;

const LEVELS = (Object.keys(levelColors) as unknown as string[]).map(Number).sort((a, b) => a - b) as Level[];
const FIRST_LEVEL = LEVELS[0];
const LAST_LEVEL = LEVELS[LEVELS.length - 1];

/** Home-screen icon centre, in reference units (lower right). */
const ICON = { x: 1280 * 0.82, y: 720 * 0.82 } as const;
const ICON_SIZE = 150; // ref units, the "icon" the card grows out of
const EXIT_TICKS = 12;
/** Tick at which the optional rules sheet slides up over the card (see `sheet` prop). */
export const LEVEL_SHEET_AT = 54;

const sentences = (level: Level): string[] =>
  levelColors[level].voice.split('.').map((s) => s.trim()).filter(Boolean);

/** Copy for a level card, all derived from data.ts. */
export const levelCardCopy = (level: Level): { title: string; reset: string; roundIndex: number; roundCount: number } => {
  const s = sentences(level);
  const head = s[0]; // "Level one" / "Final level"
  const tail = level === LAST_LEVEL ? s[s.length - 1] : levelColors[level].name; // L5: "Two rules at once"
  const reset = level === FIRST_LEVEL ? s[2] : s[1]; // "Three fresh hearts" / "Hearts reset"
  const inLevel = rounds.filter((r) => r.level === level);
  return { title: `${head}: ${tail}`, reset, roundIndex: 1, roundCount: inLevel.length };
};

/** Narration for the level intro (spoken over the card). Clip id is a guess: `level_<n>`. */
export const levelCardVoice = (level: Level): { text: string; clipId: string } => ({
  text: levelColors[level].voice,
  clipId: `level_${level}`,
});

export type LevelCue = { name: string; id: SfxId; tick: number; volume: number };
/** SFX for the card: the level-card swell at tick 0 (one per level colour). */
export const levelCardCues = (level: Level, sheet = false): LevelCue[] => [
  { name: 'swell', id: levelCardId(level), tick: 0, volume: 0.9 },
  ...(sheet ? settingsCardCues().map((c) => ({ ...c, tick: c.tick + LEVEL_SHEET_AT })) : []),
];

const IconGlyph: React.FC<{ colour: string }> = ({ colour }) => (
  <svg width={px(70)} height={px(84)} viewBox="0 0 54 66" style={{ display: 'block' }}>
    <path d="M14 26 V18 a13 13 0 0 1 26 0 V26" fill="none" stroke={colour} strokeWidth="5" strokeLinecap="round" />
    <rect x="3" y="24" width="48" height="40" rx="11" fill={colour} />
  </svg>
);

export type LevelCardProps = {
  level: Level;
  /** Local design tick (30 fps); defaults to the clock of the enclosing Sequence. */
  frame?: number;
  /** Total length in seconds. Default levelCardSec. */
  durationSec?: number;
  /** Also slide the rules sheet (SettingsCard) up over the card at LEVEL_SHEET_AT. Default false. */
  sheet?: boolean;
};

export const LevelCard: React.FC<LevelCardProps> = ({ level, frame: frameProp, durationSec = levelCardSec, sheet = false }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const total = secToTicks(durationSec);

  const L = levelColors[level];
  const copy = levelCardCopy(level);

  // Launch / exit (helpers give the spring progress; the transform is rebuilt in px()).
  const launch = levelCardLaunch(frame, 0);
  const exitP = 1 - levelCardExit(frame, 0, total, EXIT_TICKS).opacity;
  const p = launch.p * (1 - exitP);
  const cx = 640;
  const cy = 360;
  const tx = px((ICON.x - cx) * (1 - p));
  const ty = px((ICON.y - cy) * (1 - p));
  const s0 = ICON_SIZE / 720; // icon height / frame height
  const scale = s0 + (1 - s0) * p;
  const radius = px(150) * (1 - clamp01(p)) + px(0); // corners square off as it fills the frame
  const shown = Math.min(1, frame / 6) * (1 - exitP);

  // Content arrives after the card is mostly open, staggered 4-8 ticks.
  const arrive = (at: number) => springAt(frame, at, 'smooth') * (1 - exitP);
  const rise = (a: number) => `translateY(${(1 - a) * px(28)}px)`;
  const title = arrive(8);
  const reset = arrive(16);
  const counter = arrive(22);
  const glyphOpacity = 1 - clamp01(p * 2);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* scene behind dims while the card launches */}
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: launch.dim * (1 - exitP) }} />
      {/* the app: level colour fills the frame */}
      <div style={{
        position: 'absolute', inset: 0, opacity: shown,
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        borderRadius: radius / Math.max(scale, 0.05),
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${L.wallpaper[0]} 0%, ${L.wallpaper[1]} 100%)`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(90% 70% at 50% 8%, ${L.accent}8C 0%, transparent 70%)` }} />
        {/* icon glyph, visible only while the card is still icon-sized */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: glyphOpacity }}>
          <IconGlyph colour="#fff" />
        </div>
        {/* content, inside the centre 80% */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(30) }}>
          <div style={{ width: px(960), textAlign: 'center', opacity: title, transform: rise(title),
            fontFamily: fontHeadline, fontWeight: 800, fontSize: px(84), lineHeight: 1.05, letterSpacing: '-0.03em', color: colours.ink,
            textShadow: `0 ${px(2)}px ${px(18)}px rgba(0,0,0,0.35)` }}>
            {copy.title}
          </div>
          <div style={{ ...glassSurface(px(34), { tint: L.accent }), opacity: reset, transform: rise(reset),
            padding: `${px(14)}px ${px(36)}px`, fontFamily: fontHeadline, fontWeight: 700, fontSize: px(44), letterSpacing: '-0.01em', color: colours.ink }}>
            {copy.reset}
          </div>
          <div style={{ opacity: counter, transform: rise(counter), fontFamily: fontNumeric, fontWeight: 800, fontSize: px(40),
            letterSpacing: '0.02em', color: colours.ink, fontVariantNumeric: 'tabular-nums' }}>
            {COPY.round} {copy.roundIndex} {COPY.of} {copy.roundCount}
          </div>
        </div>
      </div>
      {sheet && frame >= LEVEL_SHEET_AT ? (
        <SettingsCard level={level} frame={frame - LEVEL_SHEET_AT} durationSec={(total - LEVEL_SHEET_AT) / 30} />
      ) : null}
    </div>
  );
};
