/**
 * BonusChainReaction (task 4d): bonus 3, "Shortcuts" idea.
 *
 * Words come from bonus.prompt (split on "->"). The last letter of each word lights up and a
 * drawn chain-link ticks to the next word. The "?" slot shows the letter the answer must start
 * with (last letter of the previous word). The sealed ink bubble is on screen from frame 0
 * (small, corner), enlarges to centre at the reveal and dissolves last.
 *
 * Every string and every duration comes from data.ts / timing.ts. Sizes are 1280x720 reference
 * units scaled through px(). No hearts are drawn or animated.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, type Bonus } from '../data';
import { BonusWrapper, px, useBonus, useBonusGlass } from '../components/BonusWrapper';
import { InkBubble } from '../components/InkBubble';
import { sfxSrc } from '../sfx';
import { CHAIN_LAYOUT } from '../layout';
import { useDesignFrame } from '../shared/clock';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, springAt } from '../system';
import { TIME_SCALE, bonusTicksFor } from '../timing';

const BONUS_N = 3;
const bonus3 = (): Bonus => bonuses.find((b) => b.n === BONUS_N) as Bonus;
/** Phase boundaries of this bonus; intro and reveal stretch to their voice clips. */
const bonusTicks = bonusTicksFor(BONUS_N);

/** Layout in 1280x720 reference units, relative to the wrapper's mechanic slot (x 128..1152, y 262..648). */
const L = {
  // card row sits CHAIN_LAYOUT.cardTop below the slot top so the header chip (with its note) never touches it
  slotW: CHAIN_LAYOUT.slotW,
  cardW: CHAIN_LAYOUT.cardW,
  cardH: CHAIN_LAYOUT.cardH,
  cardTop: CHAIN_LAYOUT.cardTop,
  linkW: CHAIN_LAYOUT.linkW,
  ruleTop: CHAIN_LAYOUT.ruleTop,
  /** Centre of the enlarged bubble, absolute reference units (bubble is 300 high). */
  bubbleCentre: { x: 640, y: 500 },
} as const;

/** Chain beats in design ticks, local to the bonus start. */
const STAGGER_WORDS = 12; // word cards arrive during the intro
const WORD_FIRST = 6;
const LINK_SPAN = 0.6; // links spread over this share of the play phase
const LETTER_LAG = 5; // next word's first letter lights this many ticks after the link
const DISSOLVE_DELAY = 30; // after the reveal starts: slide settles first
const DISSOLVE_TICKS = 45;
const RULE_FADE = 10;

type Slot = { text: string; unknown: boolean };

const parseChain = (b: Bonus): Slot[] =>
  b.prompt
    .split('->')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ text, unknown: /^\?+$/.test(text) }));

const answerOf = (b: Bonus): string => (Array.isArray(b.answer) ? b.answer[0] : b.answer);

/** Tick (local) at which link i (word i -> slot i+1) lands. */
export const chainLinkTick = (i: number, links: number): number =>
  bonusTicks.intro + Math.round(((i + 0.5) * (bonusTicks.play - bonusTicks.intro) * LINK_SPAN) / links);

/** Tick the bubble starts to enlarge, and the dissolve start / end (local). */
export const chainSlideTick = bonusTicks.play;
export const chainDissolveFrom = bonusTicks.play + DISSOLVE_DELAY;
export const chainDissolveTo = chainDissolveFrom + DISSOLVE_TICKS;

/** Audio cues in design ticks (local). Linked to timing through bonusTicks only. */
export const bonusChainCues = (): { id: 'chain-link' | 'ink-dissolve' | 'card-in'; at: number; volume: number }[] => {
  const links = parseChain(bonus3()).length - 1;
  const cues: { id: 'chain-link' | 'ink-dissolve' | 'card-in'; at: number; volume: number }[] = [];
  for (let i = 0; i < links; i++) cues.push({ id: 'chain-link', at: chainLinkTick(i, links), volume: 0.8 });
  cues.push({ id: 'ink-dissolve', at: chainDissolveFrom, volume: 0.7 });
  return cues;
};

/** Voice text and start ticks. Clip hooks (clipPath/clipSec) can replace these once clips exist. */
export const bonusChainVoice = () => ({
  intro: bonus3().voiceIntro,
  introAt: 0,
  reveal: bonus3().voiceReveal,
  revealAt: chainDissolveTo,
});

/** Our own drawn chain link: two interlocked rounded loops, drawn on by dashoffset. */
const ChainLink: React.FC<{ progress: number; lit: number }> = ({ progress, lit }) => {
  const w = px(L.linkW);
  const col = lit > 0.5 ? colours.bonusGold : 'rgba(255,255,255,0.34)';
  const len = 100;
  const pop = 1 + 0.18 * Math.sin(Math.PI * clamp01(lit));
  return (
    <svg width={w} height={w} viewBox="0 0 48 48" style={{ transform: `scale(${pop})`, opacity: 0.25 + 0.75 * progress }}>
      <rect
        x="4" y="15" width="24" height="18" rx="9"
        fill="none" stroke={col} strokeWidth="4.5" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={(1 - progress) * len}
      />
      <rect
        x="20" y="15" width="24" height="18" rx="9"
        fill="none" stroke={col} strokeWidth="4.5" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={(1 - progress) * len}
      />
    </svg>
  );
};

const WordCard: React.FC<{
  slot: Slot;
  arrive: number;
  /** 0..1 glow on the first letter (or the hint letter in the unknown slot). */
  firstLit: number;
  /** 0..1 glow on the last letter. */
  lastLit: number;
  hint: string;
}> = ({ slot, arrive, firstLit, lastLit, hint }) => {
  const glass = useBonusGlass();
  const letters = Array.from(slot.text);
  const glow = (a: number): React.CSSProperties => ({
    color: a > 0.01 ? colours.bonusGold : colours.ink,
    textShadow: a > 0.01 ? `0 0 ${px(18 * a)}px rgba(255,214,10,${0.85 * a})` : 'none',
    display: 'inline-block',
    transform: `scale(${1 + 0.22 * a})`,
  });
  return (
    <div
      style={{
        width: px(L.cardW),
        height: px(L.cardH),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: arrive,
        transform: `translateY(${(1 - arrive) * px(22)}px) scale(${0.92 + 0.08 * arrive})`,
        ...glass(28, 0.12 + 0.1 * Math.max(firstLit, lastLit)),
        fontFamily: fontHeadline,
        fontWeight: 800,
        fontSize: px(44),
        letterSpacing: '-0.01em',
        color: colours.ink,
      }}
    >
      {slot.unknown ? (
        <span>
          <span style={glow(firstLit)}>{firstLit > 0.01 ? hint : '?'}</span>
          {firstLit > 0.01 ? <span style={{ color: colours.muted }}>…</span> : null}
        </span>
      ) : (
        <span>
          {letters.map((ch, i) => {
            const a = i === 0 ? firstLit : i === letters.length - 1 ? lastLit : 0;
            return (
              <span key={i} style={a > 0 ? glow(a) : { display: 'inline-block' }}>
                {ch}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
};

const Chain: React.FC = () => {
  const { bonus, tick } = useBonus();
  const slots = parseChain(bonus);
  const links = slots.length - 1;

  const lastLetterOf = (i: number) => {
    const t = slots[i].text;
    return t.charAt(t.length - 1).toUpperCase();
  };

  // light = 1 once the beat has landed (soft springs, no overshoot).
  const linkAt = (i: number) => chainLinkTick(i, links);

  const ruleOut = 1 - clamp01((tick - chainSlideTick) / RULE_FADE);
  const ruleIn = springAt(tick, Math.round(bonusTicks.chipAt + 6), 'soft');

  return (
    <div style={{ position: 'relative', width: px(L.slotW), paddingTop: px(L.cardTop) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {slots.map((s, i) => {
          const arrive = springAt(tick, WORD_FIRST + i * STAGGER_WORDS, 'soft');
          const lastLit = i < links ? springAt(tick, linkAt(i), 'soft') : 0;
          const firstLit = i === 0 ? 0 : springAt(tick, linkAt(i - 1) + LETTER_LAG, 'soft');
          return (
            <React.Fragment key={i}>
              <WordCard
                slot={s}
                arrive={arrive}
                firstLit={firstLit}
                lastLit={lastLit}
                hint={i > 0 ? lastLetterOf(i - 1) : ''}
              />
              {i < links ? (
                <ChainLink
                  progress={springAt(tick, linkAt(i) + 1, 'soft')}
                  lit={springAt(tick, linkAt(i) + 1, 'soft')}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {bonus.rule ? (
        <div
          style={{
            position: 'absolute',
            top: px(L.ruleTop),
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: ruleIn * ruleOut,
            fontFamily: fontHeadline,
            fontWeight: 700,
            fontSize: px(36),
            letterSpacing: '-0.01em',
            color: colours.ink,
          }}
        >
          {bonus.rule}
        </div>
      ) : null}
    </div>
  );
};

/** Dissolve progress 0..1 with an ease-in-out, driven only by the constants above. */
const dissolveAt = (tick: number): number => {
  const t = clamp01((tick - chainDissolveFrom) / (chainDissolveTo - chainDissolveFrom));
  return t * t * (3 - 2 * t);
};

/** Mount in a Sequence of length bonusSec. Bonus 3 only. */
export const BonusChainReaction: React.FC = () => {
  const bonus = bonus3();
  const cues = bonusChainCues();
  return (
    <AbsoluteFill>
      <BonusWrapper bonus={bonus}>
        <Chain />
      </BonusWrapper>
      <BubbleLayer answer={answerOf(bonus)} seed={bonus.n} />
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.round(c.at * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Sealed bubble: small from frame 0, centre at the reveal, dissolves last. */
const BubbleLayer: React.FC<{ answer: string; seed: number }> = ({ answer, seed }) => {
  const tick = useDesignFrame();
  return (
    <InkBubble
      answer={answer}
      seed={seed}
      state="auto"
      slideAt={chainSlideTick}
      dissolve={dissolveAt(tick)}
      centre={L.bubbleCentre}
    />
  );
};
