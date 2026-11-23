/**
 * BonusOppositeDay (task 4e): bonus 4, "Appearance toggle / Smart Invert" idea.
 *
 * The prompt is shown as text. Part-way through the play phase the whole frame briefly inverts
 * its colours (about 1 s, invert-whoosh sfx) and returns, like an Appearance toggle flipping.
 * The sealed ink bubble is on screen from frame 0 (small, corner); it enlarges to centre at the
 * reveal and dissolves to the answer. No hearts are drawn or animated and there is no collision chip.
 *
 * Every string and duration comes from data.ts / timing.ts (via BonusWrapper). The invert beat
 * is placed relative to bonusTicks (play start), not to a hard-coded second. Sizes are
 * 1280x720 reference units scaled through px().
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, type Bonus } from '../data';
import { BonusWrapper, bonusTicks, px } from '../components/BonusWrapper';
import { InkBubble } from '../components/InkBubble';
import { sfxSrc } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, springAt } from '../system';
import { TIME_SCALE, secToFrames, bonusSec } from '../timing';

const BONUS_N = 4;
const bonus4 = (): Bonus => bonuses.find((b) => b.n === BONUS_N) as Bonus;
const answerOf = (b: Bonus): string => (Array.isArray(b.answer) ? b.answer[0] : b.answer);

/** Layout in 1280x720 reference units. Centre 80% = x 128..1152, y 72..648. */
const L = {
  promptTop: 300,
  promptH: 90,
  bubbleCentre: { x: 640, y: 470 },
} as const;

/** Beats in design ticks (30 fps), local to the bonus start. */
const INVERT_DELAY = 15; // after the play phase starts
const INVERT_RAMP = 5; // in and out
const INVERT_HOLD = 20; // 5 + 20 + 5 = 30 ticks = 1 s
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

export const bonusOppositeDayFrames = (): number => secToFrames(bonusSec);

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

/**
 * Colour inversion of everything painted below it (wallpaper, and also the BONUS pill and chip,
 * which BonusWrapper draws in the same layer). hue-rotate(180deg) keeps the hues readable.
 * The prompt and the ink bubble are drawn after this layer, so they are not inverted.
 */
const InvertVeil: React.FC<{ amount: number }> = ({ amount }) => {
  if (amount <= 0) return null;
  const f = `invert(${amount}) hue-rotate(${180 * amount}deg)`;
  return <AbsoluteFill style={{ backdropFilter: f, WebkitBackdropFilter: f }} />;
};

const Layer: React.FC<{ bonus: Bonus }> = ({ bonus }) => {
  const tick = useDesignFrame();
  const promptIn = springAt(tick, 8, 'snappy');
  const promptOut = 1 - clamp01((tick - oppositeDayTicks.slide) / 10);
  return (
    <AbsoluteFill>
      <InvertVeil amount={invertAmount(tick)} />

      {/* the prompt, shown as text; the voice says it too */}
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
          fontFamily: fontHeadline,
          fontWeight: 800,
          fontSize: px(56),
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: colours.ink,
          textAlign: 'center',
        }}
      >
        {bonus.prompt}
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
  return (
    <AbsoluteFill>
      <BonusWrapper bonus={bonus} />
      <Layer bonus={bonus} />
      {bonusOppositeDayCues().map((c, i) => (
        <Sequence key={i} from={Math.round(c.at * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
