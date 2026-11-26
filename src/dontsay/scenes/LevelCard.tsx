/**
 * LevelCard.tsx: the level intro card of "Don't Say The Same As Me" (task 4a).
 *
 * Calm zoom: the level colour card fades in while it grows from 97% to 100% (the `soft` spring, no
 * overshoot), holds, then fades out while it drifts out to 102% (easeOut over EXIT_TICKS).
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
import { WIDTH, levelCardSecFor, secToTicks, useDontSayFrame } from '../timing';
import { colours, easeOut, fontHeadline, fontNumeric, glassSurface, springAt } from '../system';
import { levelCardId, type SfxId } from '../sfx';
import { SettingsCard, settingsCardCues } from './SettingsCard';
import '../shared/fonts';

/** 1280x720 reference units -> render pixels (2560x1440). */
const px = (v: number): number => (v * WIDTH) / 1280;

const COPY = { round: 'Round', of: 'of' } as const;

const LEVELS = (Object.keys(levelColors) as unknown as string[]).map(Number).sort((a, b) => a - b) as Level[];
const FIRST_LEVEL = LEVELS[0];
const LAST_LEVEL = LEVELS[LEVELS.length - 1];

const EXIT_TICKS = 12;
/** Card scale at the start of the entrance and at the end of the exit (about 19 ref units at the edge). */
const ZOOM_IN_FROM = 0.97;
const ZOOM_OUT_TO = 1.02;
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

export type LevelCue = { name: string; id: SfxId; tick: number; volume: number };
/** SFX for the card: the level-card swell at tick 0 (one per level colour). */
export const levelCardCues = (level: Level, sheet = false): LevelCue[] => [
  { name: 'swell', id: levelCardId(level), tick: 0, volume: 0.9 },
  ...(sheet ? settingsCardCues().map((c) => ({ ...c, tick: c.tick + LEVEL_SHEET_AT })) : []),
];

export type LevelCardProps = {
  level: Level;
  /** Local design tick (30 fps); defaults to the clock of the enclosing Sequence. */
  frame?: number;
  /** Total length in seconds. Default levelCardSecFor(level). */
  durationSec?: number;
  /** Also slide the rules sheet (SettingsCard) up over the card at LEVEL_SHEET_AT. Default false. */
  sheet?: boolean;
};

export const LevelCard: React.FC<LevelCardProps> = ({ level, frame: frameProp, durationSec: durationProp, sheet = false }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const total = secToTicks(durationProp ?? levelCardSecFor(level));

  const L = levelColors[level];
  const copy = levelCardCopy(level);

  // Entrance: soft spring drives fade and zoom together. Exit: easeOut over the last EXIT_TICKS.
  const inP = springAt(frame, 0, 'soft');
  const exitP = easeOut((frame - (total - EXIT_TICKS)) / EXIT_TICKS);
  const shown = inP * (1 - exitP);
  const scale = ZOOM_IN_FROM + (1 - ZOOM_IN_FROM) * inP + (ZOOM_OUT_TO - 1) * exitP;

  // Content arrives after the card is mostly open, staggered 4-8 ticks.
  const arrive = (at: number) => springAt(frame, at, 'soft') * (1 - exitP);
  const rise = (a: number) => `translateY(${(1 - a) * px(16)}px)`;
  const title = arrive(8);
  const reset = arrive(16);
  const counter = arrive(22);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* the card: level colour fills the frame */}
      <div style={{
        position: 'absolute', inset: 0, opacity: shown,
        transform: `scale(${scale})`,
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${L.wallpaper[0]} 0%, ${L.wallpaper[1]} 100%)`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(90% 70% at 50% 8%, ${L.accent}8C 0%, transparent 70%)` }} />
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
