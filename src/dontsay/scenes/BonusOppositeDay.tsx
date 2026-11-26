/**
 * BonusOppositeDay (task 4e): bonus 4, "Appearance toggle / Smart Invert" idea.
 *
 * The prompt sits on a glass card. Part-way through the play phase the WALLPAPER briefly inverts
 * (a lighter dark wash, never near-white; about 1 s, invert-whoosh sfx) and returns, like an
 * Appearance toggle flipping. The pills, chip, prompt card and bubble are never inverted.
 * The sealed ink bubble is on screen from frame 0 (small, corner); it enlarges to centre at the
 * reveal and dissolves to the answer. No hearts are drawn or animated and there is no collision chip.
 *
 * Every string and duration comes from data.ts / timing.ts (via BonusWrapper). The invert beat
 * is placed relative to bonusTicks (play start), not to a hard-coded second. Sizes are
 * 1280x720 reference units scaled through px().
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, rounds, type Bonus, type Level } from '../data';
import { BonusWrapper, bonusGlass, px } from '../components/BonusWrapper';
import { InkBubble } from '../components/InkBubble';
import { sfxSrc } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, springAt } from '../system';
import { TIME_SCALE, secToFrames, bonusSecFor, bonusTicksFor } from '../timing';

const BONUS_N = 4;
const bonus4 = (): Bonus => bonuses.find((b) => b.n === BONUS_N) as Bonus;
/** Phase boundaries of this bonus; intro and reveal stretch to their voice clips. */
const bonusTicks = bonusTicksFor(BONUS_N);
const answerOf = (b: Bonus): string => (Array.isArray(b.answer) ? b.answer[0] : b.answer);

/** Layout in 1280x720 reference units. Centre 80% = x 128..1152, y 72..648. */
const L = {
  promptTop: 300,
  promptH: 100,
  promptRadius: 34,
  bubbleCentre: { x: 640, y: 470 },
} as const;

/** Beats in design ticks (30 fps), local to the bonus start. */
const INVERT_DELAY = 15; // after the play phase starts
const INVERT_RAMP = 5; // in and out
const INVERT_HOLD = 20; // 5 + 20 + 5 = 30 ticks = 1 s
/** Peak CSS invert() amount on the wallpaper. 0.5 would be flat grey, 1 near-white; 0.08 keeps text contrast >= 4.5:1 at the card centre (see docs/dontsay-progress.md). */
export const INVERT_PEAK = 0.08;
const DISSOLVE_DELAY = 30; // after the reveal starts: the slide settles first
const DISSOLVE_TICKS = 45;

export const oppositeDayTicks = (() => {
  // Invert sits in the play phase, after the prompt and chip have landed.
  const start = bonusTicks.intro + INVERT_DELAY;
  const end = start + INVERT_RAMP + INVERT_HOLD + INVERT_RAMP;
  const slide = bonusTicks.play;
  const dissolveFrom = bonusTicks.play + DISSOLVE_DELAY;
  const dissolveTo = dissolveFrom + DISSOLVE_TICKS;
  return { invertStart: start, invertEnd: end, slide, dissolveFrom, dissolveTo } as const;
})();

export const bonusOppositeDayCues = (): { id: 'invert-whoosh' | 'chip-land' | 'ink-dissolve'; at: number; volume: number }[] => [
  { id: 'chip-land', at: bonusTicks.chipAt, volume: 0.6 },
  { id: 'invert-whoosh', at: oppositeDayTicks.invertStart, volume: 0.8 },
  { id: 'ink-dissolve', at: oppositeDayTicks.dissolveFrom, volume: 0.7 },
];

/** Voice text and start ticks. Clip hooks (clipPath/clipSec) can replace these once clips exist. */
export const bonusOppositeDayVoice = () => ({
  intro: bonus4().voiceIntro,
  introAt: 0,
  reveal: bonus4().voiceReveal,
  revealAt: oppositeDayTicks.dissolveTo,
});

export const bonusOppositeDayFrames = (): number => secToFrames(bonusSecFor(BONUS_N));

const invertAmount = (tick: number): number => {
  const { invertStart: s } = oppositeDayTicks;
  const up = clamp01((tick - s) / INVERT_RAMP);
  const down = 1 - clamp01((tick - (s + INVERT_RAMP + INVERT_HOLD)) / INVERT_RAMP);
  return Math.min(up, down);
};

const dissolveAt = (tick: number): number => {
  const t = clamp01((tick - oppositeDayTicks.dissolveFrom) / (oppositeDayTicks.dissolveTo - oppositeDayTicks.dissolveFrom));
  return t * t * (3 - 2 * t);
};

const Layer: React.FC<{ bonus: Bonus; level: Level }> = ({ bonus, level }) => {
  const tick = useDesignFrame();
  const promptIn = springAt(tick, 8, 'soft');
  const promptOut = 1 - clamp01((tick - oppositeDayTicks.slide) / 10);
  return (
    <AbsoluteFill>
      {/* the prompt on a glass card (same recipe as the round prompt card); readable in both wallpaper states */}
      <div
        style={{
          position: 'absolute',
          left: px(128),
          right: px(128),
          top: px(L.promptTop),
          height: px(L.promptH),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: promptIn * promptOut,
          transform: `translateY(${(1 - promptIn) * px(16)}px)`,
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            padding: `${px(14)}px ${px(48)}px`,
            textAlign: 'center',
            ...bonusGlass(L.promptRadius, 0.1, level),
            fontFamily: fontHeadline,
            fontWeight: 800,
            fontSize: px(56),
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: colours.ink,
          }}
        >
          {bonus.prompt}
        </div>
      </div>

      {/* sealed bubble: small from frame 0, centre at the reveal, dissolves last */}
      <InkBubble
        answer={answerOf(bonus)}
        seed={bonus.n}
        state="auto"
        slideAt={oppositeDayTicks.slide}
        dissolve={dissolveAt(tick)}
        centre={L.bubbleCentre}
      />
    </AbsoluteFill>
  );
};

/** Mount in a Sequence of length bonusSec. Bonus 4 only. */
export const BonusOppositeDay: React.FC = () => {
  const bonus = bonus4();
  const tick = useDesignFrame();
  // same level the wrapper uses (the level of the round the bonus follows)
  const level: Level = rounds.find((r) => r.n === bonus.afterRound)?.level ?? 1;
  return (
    <AbsoluteFill>
      <BonusWrapper bonus={bonus} level={level} wallpaperInvert={invertAmount(tick) * INVERT_PEAK} />
      <Layer bonus={bonus} level={level} />
      {bonusOppositeDayCues().map((c, i) => (
        <Sequence key={i} from={Math.round(c.at * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
