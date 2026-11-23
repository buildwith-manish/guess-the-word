/**
 * BonusMindReader (task 4b): bonus 1, "Keyboard prediction" idea.
 *
 * The rule flips: the viewer says what they think the bubble holds. The sealed ink bubble is on
 * screen from frame 0 (small, corner); it enlarges to centre at the reveal and dissolves to the
 * answer. An own-drawn keyboard prediction strip sits at the bottom: its centre cell becomes the
 * match cell and shows the points earned. A match earns the point (decision 17: a deliberate
 * gimme after Level 1). No hearts are drawn or animated and there is no collision chip.
 *
 * Every string and every duration comes from data.ts / timing.ts. The earned-points text is
 * parsed from bonus.passCondition. Sizes are 1280x720 reference units scaled through px().
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, type Bonus } from '../data';
import { BonusWrapper, bonusGlass, bonusTicks, px } from '../components/BonusWrapper';
import { InkBubble } from '../components/InkBubble';
import { sfxSrc } from '../sfx';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, fontNumeric, springAt } from '../system';
import { TIME_SCALE, secToFrames, bonusSec } from '../timing';

const BONUS_N = 1;
const bonus1 = (): Bonus => bonuses.find((b) => b.n === BONUS_N) as Bonus;
const answerOf = (b: Bonus): string => (Array.isArray(b.answer) ? b.answer[0] : b.answer);

/** Layout in 1280x720 reference units (absolute). Centre 80% = x 128..1152, y 72..648. */
const L = {
  promptTop: 232,
  promptH: 52,
  ruleY: 440,
  /** Centre of the enlarged bubble (it is 300 high: y 290..590). */
  bubbleCentre: { x: 640, y: 440 },
  stripW: 780,
  stripH: 50,
  stripBottom: 72, // strip ends on the 648 safe line
} as const;

/** Beats in design ticks (30 fps), local to the bonus start. */
const DISSOLVE_DELAY = 30; // after the reveal starts: the slide settles first
const DISSOLVE_TICKS = 45;
const RULE_FADE = 10;

export const mindReaderSlideTick = bonusTicks.play;
export const mindReaderDissolveFrom = bonusTicks.play + DISSOLVE_DELAY;
export const mindReaderDissolveTo = mindReaderDissolveFrom + DISSOLVE_TICKS;
/** The match cell lights the moment the answer is fully revealed. */
export const mindReaderMatchAt = mindReaderDissolveTo;

/** Earned-points label from the pass condition ("Match me = 1 point" -> "+1 point"). */
export const earnedLabel = (b: Bonus): string => {
  const m = b.passCondition.match(/=\s*(.+)$/);
  return m ? `+${m[1].trim()}` : b.passCondition;
};

export const bonusMindReaderCues = (): { id: 'ink-dissolve' | 'safe-pulse' | 'chip-land'; at: number; volume: number }[] => [
  { id: 'chip-land', at: bonusTicks.chipAt, volume: 0.6 },
  { id: 'ink-dissolve', at: mindReaderDissolveFrom, volume: 0.7 },
  { id: 'safe-pulse', at: mindReaderMatchAt, volume: 0.7 },
];

/** Voice text and start ticks. Clip hooks (clipPath/clipSec) can replace these once clips exist. */
export const bonusMindReaderVoice = () => ({
  intro: bonus1().voiceIntro,
  introAt: 0,
  reveal: bonus1().voiceReveal,
  revealAt: mindReaderDissolveTo,
});

export const bonusMindReaderFrames = (): number => secToFrames(bonusSec);

const dissolveAt = (tick: number): number => {
  const t = clamp01((tick - mindReaderDissolveFrom) / (mindReaderDissolveTo - mindReaderDissolveFrom));
  return t * t * (3 - 2 * t);
};

/** Our own drawn typing dots (neutral prediction cells). */
const Dots: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size * 3} height={size} viewBox="0 0 30 10">
    {[5, 15, 25].map((cx) => (
      <circle key={cx} cx={cx} cy={5} r={3} fill="rgba(235,235,245,0.38)" />
    ))}
  </svg>
);

/** Our own drawn padlock. */
const Lock: React.FC<{ size: number; colour: string }> = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke={colour} strokeWidth="2.2" strokeLinecap="round" />
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="3.2" fill={colour} />
  </svg>
);

/** Our own drawn tick mark. */
const Check: React.FC<{ size: number; colour: string }> = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.6 4.6L19 7.5" stroke={colour} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Strip: React.FC<{ tick: number; points: string }> = ({ tick, points }) => {
  const stripIn = springAt(tick, Math.round(bonusTicks.chipAt + 4), 'gentle');
  const match = springAt(tick, mindReaderMatchAt, 'pop');
  const sealed = 1 - clamp01(match * 2);
  const cellW = px(L.stripW / 3);
  const cell: React.CSSProperties = {
    width: cellW,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: px(L.stripBottom),
        width: px(L.stripW),
        height: px(L.stripH),
        marginLeft: -px(L.stripW) / 2,
        opacity: stripIn,
        transform: `translateY(${(1 - stripIn) * px(20)}px)`,
        display: 'flex',
        alignItems: 'center',
        ...bonusGlass(18, 0.1),
        overflow: 'hidden',
      }}
    >
      <div style={cell}>
        <Dots size={px(10)} />
      </div>
      <div style={{ width: px(0.5), height: '56%', background: colours.hairline }} />
      <div
        style={{
          ...cell,
          position: 'relative',
          background: `rgba(52,199,89,${0.22 * match})`,
          boxShadow: match > 0.01 ? `0 0 ${px(26 * match)}px rgba(52,199,89,${0.5 * match})` : 'none',
        }}
      >
        <div style={{ position: 'absolute', opacity: sealed, display: 'flex', alignItems: 'center' }}>
          <Lock size={px(26)} colour="rgba(255,214,10,0.8)" />
        </div>
        <div
          style={{
            position: 'absolute',
            opacity: match,
            transform: `scale(${0.8 + 0.2 * match})`,
            display: 'flex',
            alignItems: 'center',
            gap: px(8),
            fontFamily: fontNumeric,
            fontWeight: 800,
            fontSize: px(28),
            color: colours.safe,
            whiteSpace: 'nowrap',
          }}
        >
          <Check size={px(26)} colour={colours.safe} />
          {points}
        </div>
      </div>
      <div style={{ width: px(0.5), height: '56%', background: colours.hairline }} />
      <div style={cell}>
        <Dots size={px(10)} />
      </div>
    </div>
  );
};

const Layer: React.FC<{ bonus: Bonus }> = ({ bonus }) => {
  const tick = useDesignFrame();
  const promptIn = springAt(tick, 8, 'snappy');
  const ruleIn = springAt(tick, Math.round(bonusTicks.chipAt + 6), 'gentle');
  const ruleOut = 1 - clamp01((tick - mindReaderSlideTick) / RULE_FADE);
  return (
    <AbsoluteFill>
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
          opacity: promptIn,
          transform: `translateY(${(1 - promptIn) * px(16)}px)`,
          fontFamily: fontHeadline,
          fontWeight: 800,
          fontSize: px(40),
          letterSpacing: '-0.02em',
          color: colours.ink,
          textAlign: 'center',
        }}
      >
        {bonus.prompt}
      </div>

      {/* the flipped rule, until the bubble enlarges */}
      {bonus.rule ? (
        <div
          style={{
            position: 'absolute',
            left: px(128),
            right: px(128),
            top: px(L.ruleY) - px(30),
            height: px(60),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: ruleIn * ruleOut,
            fontFamily: fontHeadline,
            fontWeight: 700,
            fontSize: px(44),
            letterSpacing: '-0.01em',
            color: colours.ink,
            textAlign: 'center',
          }}
        >
          {bonus.rule}
        </div>
      ) : null}

      <Strip tick={tick} points={earnedLabel(bonus)} />

      {/* sealed bubble: small from frame 0, centre at the reveal, dissolves last */}
      <InkBubble
        answer={answerOf(bonus)}
        seed={bonus.n}
        state="auto"
        slideAt={mindReaderSlideTick}
        dissolve={dissolveAt(tick)}
        centre={L.bubbleCentre}
      />
    </AbsoluteFill>
  );
};

/** Mount in a Sequence of length bonusSec. Bonus 1 only. */
export const BonusMindReader: React.FC = () => {
  const bonus = bonus1();
  return (
    <AbsoluteFill>
      <BonusWrapper bonus={bonus} />
      <Layer bonus={bonus} />
      {bonusMindReaderCues().map((c, i) => (
        <Sequence key={i} from={Math.round(c.at * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
