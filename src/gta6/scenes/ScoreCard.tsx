import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FrostCard } from '../components';
import { extraIds, items, levels } from '../data';
import type { Item, Level } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { FRAME, colors, levelBackground, springAt, textStyle, u } from '../system';
import { easyPassMark, scoreCardSec, secToTicks } from '../timing';

/**
 * Score card, shown after the item whose extra ids contain "easyScoreCard" / "mediumScoreCard" / "hardScoreCard"
 * (timing.ts puts the segment there; `scoreCardVariant` reads the same id to pick the variant and its line).
 *
 *   frame  local design tick, 0 at the start of the scoreCard segment (length `scoreCardSec`)
 *   after  the item the card follows (segment.after)
 *
 * Summary = three activity rings (one per level, outer = first level). A ring fills with the share of that level's
 * questions (kind "q") played up to `after`; the centre shows questions played / all questions. Nothing is scored
 * on screen (answers are not tracked), same as ScoreHud. Lines (script):
 *   easy    "If you got {easyPassMark} or more, you're a real fan"
 *   medium  "{N} questions left"   (N = questions after `after`)
 *   hard    "That was Question {after.n}"
 * Only sentence frames and number words are written here.
 */

export const SCORE_BEATS = { cardIn: 0, ringsAt: 10, ringsLen: 36, textAt: 14 } as const; // ticks

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SUFFIX = 'ScoreCard';
/** Variant (level) named by the item's score-card extra id, e.g. "mediumScoreCard" -> "medium". Undefined if none. */
export const scoreCardVariant = (item: Item): Level | undefined => {
  const id = extraIds(item).find((e) => e.endsWith(SUFFIX));
  const key = id?.slice(0, -SUFFIX.length);
  return levels.find((l) => l === key);
};

const isQ = (i: Item) => i.kind === 'q';
const totalQ = items.filter(isQ).length;
const playedQ = (after: Item): number => items.filter((i) => isQ(i) && i.order <= after.order).length;
const leftQ = (after: Item): number => totalQ - playedQ(after);
const levelProgress = (level: Level, after: Item): number => {
  const all = items.filter((i) => isQ(i) && i.level === level);
  const done = all.filter((i) => i.order <= after.order);
  return all.length ? done.length / all.length : 0;
};

export const scoreCardLine = (variant: Level, after: Item): string => {
  switch (variant) {
    case 'easy':
      return `If you got ${easyPassMark} or more, you're a real fan`;
    case 'medium':
      return `${cap(numberWord(leftQ(after)))} ${leftQ(after) === 1 ? 'question' : 'questions'} left`;
    case 'hard':
      return `That was Question ${after.n}`;
  }
};

/** Sound cue, `start` = absolute design tick of the segment. */
export const scoreCardCues = (start = 0): SfxCue[] => [cue('scorecard', start + SCORE_BEATS.ringsAt)];

const RINGS = { size: 560, stroke: 40, gap: 14, outer: 250 } as const;

const Rings: React.FC<{ frame: number; after: Item }> = ({ frame, after }) => {
  const fill = Math.min(1, Math.max(0, (frame - SCORE_BEATS.ringsAt) / SCORE_BEATS.ringsLen));
  const eased = 1 - Math.pow(1 - fill, 3);
  const c = RINGS.size / 2;
  return (
    <svg width={u(RINGS.size)} height={u(RINGS.size)} viewBox={`0 0 ${RINGS.size} ${RINGS.size}`}>
      {levels.map((level, i) => {
        const r = RINGS.outer - i * (RINGS.stroke + RINGS.gap);
        const len = 2 * Math.PI * r;
        const p = levelProgress(level, after) * eased;
        return (
          <g key={level} transform={`rotate(-90 ${c} ${c})`}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={colors.level[level]} strokeOpacity={0.2} strokeWidth={RINGS.stroke} />
            {p > 0 && (
              <circle
                cx={c} cy={c} r={r} fill="none" stroke={colors.level[level]} strokeWidth={RINGS.stroke} strokeLinecap="round"
                strokeDasharray={`${len * p} ${len}`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

export type ScoreCardProps = { level: Level; after: Item; frame: number };

export const ScoreCard: React.FC<ScoreCardProps> = ({ level, after, frame }) => {
  const variant = scoreCardVariant(after) ?? level;
  const accent = colors.level[variant];
  const text = springAt(frame, SCORE_BEATS.textAt, 'gentle');
  const rise = (1 - text) * u(24);
  const CARD = { w: 1500, h: 700 };
  return (
    <AbsoluteFill style={{ background: levelBackground[variant] }}>
      <div style={{ position: 'absolute', left: u((FRAME.w - CARD.w) / 2), top: u((FRAME.h - CARD.h) / 2) }}>
        <FrostCard width={CARD.w} height={CARD.h} frame={frame} at={SCORE_BEATS.cardIn} level={variant} padding={0}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', left: u(70), top: u((CARD.h - RINGS.size) / 2) }}>
              <Rings frame={frame} after={after} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: text }}>
                <div style={{ ...textStyle('number'), color: colors.ink }}>{playedQ(after)}</div>
                <div style={{ ...textStyle('caption'), color: colors.muted }}>{`/ ${totalQ}`}</div>
              </div>
            </div>
            <div style={{ position: 'absolute', left: u(70 + RINGS.size + 80), right: u(70), top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: u(24), opacity: text, transform: `translateY(${rise}px)` }}>
              <div style={{ ...textStyle('title'), color: accent }}>{cap(variant)}</div>
              <div style={{ ...textStyle('question'), color: colors.ink }}>{scoreCardLine(variant, after)}</div>
            </div>
          </div>
        </FrostCard>
      </div>
    </AbsoluteFill>
  );
};

/** Length from timing.ts. */
export const scoreCardTicks = secToTicks(scoreCardSec);
export default ScoreCard;
