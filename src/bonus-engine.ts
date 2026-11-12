/**
 * bonus-engine.ts — deterministic bonus-round factory.
 * Same five round types as the reference quiz: odd-one-out, count-it,
 * word-scramble, emoji-math, spot-the-difference. Puzzles are seeded, so
 * index N always yields the same board (required for reproducible renders).
 *
 * ICON SYSTEM
 * -----------
 * Every puzzle stores *icon names* (strings like 'apple', 'clock1') instead of
 * emoji characters. src/bonus-icons.tsx is the only place that turns a name
 * into a PNG URL / readable label, so the engine data stays serializable and
 * the rendering lives in one spot. The PNG set lives in public/bonus-icons/
 * (see bonus-icons.zip — 21 transparent 1280×1280 PNGs).
 *
 * Icon → round mapping (matches the bonus-icons.zip manifest):
 *   1 Odd One Out      : apple banana carrot grapes
 *   2 Count It         : frog  snake  lizard turtle crocodile
 *   3 Word Scramble    : penguin (hint icon)
 *   4 Emoji Math       : star apple car
 *   5 Spot the Diff    : key pizza clock1 clock2 trophy turtle balloon guitar sunflower bell
 *
 * Reused PNGs: bell.png, key.png and car.png are copies of the repo's
 * Q05_B_Cowbell.png, Q12_A_Keyhole.png and Q21_A_Carsick.png.
 */
import settings from '../settings.json';
import { makeRandom, pickN, range, shuffle } from './util';
import type { IconName } from './bonus-icons';
import { iconLabel } from './bonus-icons';

export type BonusKind =
  | 'odd'
  | 'count'
  | 'scramble'
  | 'math'
  | 'spot'
  // brand-photo rounds used by the pixel quiz (see src/pixel/brand-bonus.ts)
  | 'colormatch'
  | 'memory'
  | 'zoom'
  | 'oddbrand';

export type BonusPuzzle = {
  kind: BonusKind;
  name: string;
  question: string;
  answer: string;
  seconds: number;
  data: any;
};

/**
 * Background icons for the spot-the-difference grid (8 items).
 * clock1 / clock2 are the LOOK pair (the one similar pair where the change
 * happens), defined separately below.
 */
const SPOT_POOL: IconName[] = [
  'key', 'pizza', 'trophy', 'turtle',
  'balloon', 'guitar', 'sunflower', 'bell',
];

/** The single "similar pair" for spot-the-difference: clock1 (1:00) → clock2 (2:00). */
const LOOK: [IconName, IconName][] = [
  ['clock1', 'clock2'],
];

/**
 * Odd-One-Out boards. `t` is the tile list (icon names), `i` is the answer
 * index, `a` is the spoken + on-screen answer (plain English, no emoji).
 *
 * Only one ODD puzzle is picked per render (5 bonus rounds, 5 different
 * types), so the apple/banana/carrot/grapes board (index 0) is the one that
 * ships. The rest are kept so the engine still works if the round count is
 * raised later — every board uses icons that exist in public/bonus-icons/.
 */
const ODD: { t: IconName[]; i: number; a: string }[] = [
  { t: ['apple', 'banana', 'carrot', 'grapes'], i: 2, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['apple', 'banana', 'grapes', 'carrot'], i: 3, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['carrot', 'apple', 'banana', 'grapes'], i: 0, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['grapes', 'banana', 'apple', 'carrot'], i: 3, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['banana', 'carrot', 'grapes', 'apple'], i: 3, a: 'The apple is a pome fruit. The rest are not.' },
  { t: ['apple', 'grapes', 'banana', 'carrot'], i: 3, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['carrot', 'grapes', 'banana', 'apple'], i: 0, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['grapes', 'apple', 'carrot', 'banana'], i: 2, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['banana', 'apple', 'grapes', 'carrot'], i: 3, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['apple', 'carrot', 'banana', 'grapes'], i: 1, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['grapes', 'carrot', 'banana', 'apple'], i: 1, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['carrot', 'banana', 'apple', 'grapes'], i: 0, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['banana', 'grapes', 'carrot', 'apple'], i: 2, a: 'The carrot is a vegetable. The rest are fruits.' },
];

/**
 * Word-Scramble entries: [WORD, hintIcon]. The hint icon shows next to the
 * scrambled letters. Only one is picked per render — penguin (index 7) is the
 * one that ships at the default seed, but every entry has a real icon so any
 * pick works.
 */
const SCR: [string, IconName | ''][] = [
  ['PIZZA', 'pizza'],
  ['APPLE', 'apple'],
  ['GUITAR', 'guitar'],
  ['TROPHY', 'trophy'],
  ['BALLOON', 'balloon'],
  ['SUNFLOWER', 'sunflower'],
  ['BANANA', 'banana'],
  ['PENGUIN', 'penguin'],
  ['CROCODILE', 'crocodile'],
  ['TURTLE', 'turtle'],
  ['LIZARD', ''],
  ['STAR', 'star'],
  ['BELL', 'bell'],
  ['CARROT', 'carrot'],
];

/**
 * Count-It boards: [targetIcon, [other icons]]. The target is the one the
 * viewer counts; others are the decoys. Only one is picked per render — the
 * frog/snake/lizard/turtle/crocodile board (index 0) ships at the default
 * seed, but every board uses icons that exist.
 */
const CNT: [IconName, IconName[]][] = [
  ['frog',      ['snake', 'lizard', 'turtle', 'crocodile']],
  ['apple',     ['banana', 'carrot', 'grapes', 'star']],
  ['star',      ['bell', 'key', 'sunflower', 'trophy']],
  ['turtle',    ['frog', 'snake', 'lizard', 'crocodile']],
  ['balloon',   ['bell', 'key', 'guitar', 'trophy']],
  ['penguin',   ['frog', 'turtle', 'lizard', 'snake']],
];

/** Math pool: the three icons that can appear in an emoji-math row. */
const MATH_POOL: IconName[] = ['star', 'apple', 'car'];

/** Picks the nearest unused item to a difficulty target (avoids repeats). */
const makePicker = () => {
  const used: Record<string, Set<number>> = {};
  return (len: number, key: string, d: number) => {
    const set = used[key] ?? (used[key] = new Set<number>());
    const target = Math.min(len - 1, Math.floor(d * len));
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < len; i++) {
      if (set.has(i)) continue;
      const dist = Math.abs(i - target);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best < 0) {
      set.clear();
      best = target;
    }
    set.add(best);
    return best;
  };
};

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/** Capitalize the first letter of an icon label for sentence position. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const makeOdd = (d: number, pick: ReturnType<typeof makePicker>): BonusPuzzle => {
  const p = ODD[pick(ODD.length, 'odd', d)];
  return {
    kind: 'odd',
    name: 'ODD ONE OUT',
    question: 'WHICH ONE DOESN\u2019T BELONG?',
    answer: p.a,
    seconds: p.t.length > 4 ? 10 : 8,
    data: { tiles: p.t, answerIndex: p.i, small: p.t.length > 4 },
  };
};

const makeMath = (d: number, rand: () => number): BonusPuzzle => {
  // pickN with n === pool length returns the whole pool shuffled — always
  // star, apple, car (in a seeded order), so the math round always uses the
  // three icons the user provided.
  const icons = pickN(MATH_POOL, 3, rand);
  const [aIcon, bIcon, cIcon] = icons;
  const aLbl = iconLabel(aIcon);
  const bLbl = iconLabel(bIcon);
  if (d < 0.34) {
    const a = int(rand, 3, 9);
    const b = int(rand, 1, 5);
    return {
      kind: 'math',
      name: 'EMOJI MATH',
      question: 'SOLVE THE LAST ONE!',
      answer: `${cap(aLbl)} = ${a} and ${cap(bLbl)} = ${b}, so ${cap(aLbl)} + ${cap(bLbl)} = ${a + b}.`,
      seconds: 10,
      data: {
        rows: [
          { icons: [aIcon, aIcon], value: String(2 * a) },
          { icons: [bIcon, bIcon], value: String(2 * b) },
          { icons: [aIcon, bIcon], value: '?' },
        ],
        answer: a + b,
        askRow: 2,
        fontSize: 72,
      },
    };
  }
  if (d < 0.67) {
    const a = int(rand, 2, 8);
    const b = int(rand, 1, 5);
    return {
      kind: 'math',
      name: 'EMOJI MATH',
      question: 'SOLVE THE LAST ONE!',
      answer: `${cap(aLbl)} = ${a} and ${cap(bLbl)} = ${b}, so the answer is ${2 * b + a}.`,
      seconds: 12,
      data: {
        rows: [
          { icons: [aIcon, aIcon, aIcon], value: String(3 * a) },
          { icons: [aIcon, bIcon], value: String(a + b) },
          { icons: [bIcon, bIcon, aIcon], value: '?' },
        ],
        answer: 2 * b + a,
        askRow: 2,
        fontSize: 72,
      },
    };
  }
  const a = int(rand, 2, 7);
  let b = int(rand, 2, 7);
  while (b === a) b = int(rand, 2, 7);
  let c = int(rand, 2, 7);
  while (c === a || c === b) c = int(rand, 2, 7);
  const cLbl = iconLabel(cIcon);
  return {
    kind: 'math',
    name: 'EMOJI MATH',
    question: 'SOLVE THE LAST ONE!',
    answer: `${cap(aLbl)}=${a}, ${cap(bLbl)}=${b}, ${cap(cLbl)}=${c}. Total ${a + b + c}.`,
    seconds: 15,
    data: {
      rows: [
        { icons: [aIcon, bIcon], value: String(a + b) },
        { icons: [bIcon, cIcon], value: String(b + c) },
        { icons: [aIcon, cIcon], value: String(a + c) },
        { icons: [aIcon, bIcon, cIcon], value: '?' },
      ],
      answer: a + b + c,
      askRow: 3,
      fontSize: 58,
    },
  };
};

const makeCount = (d: number, rand: () => number): BonusPuzzle => {
  const [target, others] = CNT[Math.floor(rand() * CNT.length)];
  const total = d > 0.5 ? 30 : 28;
  const count = 5 + Math.round(d * 6);
  const hits = new Set(shuffle(range(total), rand).slice(0, count));
  const cells = range(total).map((i) => ({
    ch: hits.has(i) ? target : others[Math.floor(rand() * others.length)],
    hit: hits.has(i),
  }));
  const targetLbl = iconLabel(target);
  return {
    kind: 'count',
    name: 'COUNT IT',
    question: `HOW MANY ${targetLbl.toUpperCase()}S ARE THERE?`,
    answer: `There are ${count} ${targetLbl}s!`,
    seconds: 8 + Math.round(d * 4),
    data: { cells, target, count },
  };
};

const makeScramble = (d: number, rand: () => number, pick: ReturnType<typeof makePicker>): BonusPuzzle => {
  const [word, hint] = SCR[pick(SCR.length, 'scr', d)];
  let scrambled = word;
  for (let guard = 0; guard < 20 && scrambled === word; guard++) {
    scrambled = shuffle(Array.from(word), rand).join('');
  }
  return {
    kind: 'scramble',
    name: 'WORD SCRAMBLE',
    question: 'UNSCRAMBLE THE WORD!',
    answer: `The word is ${word}!`,
    seconds: word.length > 7 ? 13 : word.length > 5 ? 11 : 9,
    data: { word, scrambled, hint },
  };
};

/**
 * Spot the difference: build a 3×3 grid (9 cells) of icons. The left grid
 * has 8 background icons + 1 LOOK item (clock1). The right grid is identical
 * except the LOOK item is replaced with its pair (clock2). The viewer finds
 * the one cell that changed.
 *
 * clock1.png (1:00) and clock2.png (2:00) use the same position and scale;
 * only the hour hand differs, so there is exactly one real change.
 */
const makeSpot = (d: number, rand: () => number): BonusPuzzle => {
  const index = Math.floor(rand() * 9);
  const [pair0, pair1] = LOOK[Math.floor(rand() * LOOK.length)];
  // 8 background icons (shuffled, all unique)
  const background = shuffle(SPOT_POOL, rand).slice(0, 8);
  // left = background with pair0 inserted at `index` (9 cells total)
  const left: IconName[] = background.slice(0, index);
  left.push(pair0);
  left.push(...background.slice(index));
  // right = same as left, but with pair1 at `index`
  const right = left.slice();
  right[index] = pair1;
  return {
    kind: 'spot',
    name: 'SPOT THE DIFFERENCE',
    question: 'FIND THE ONE THAT CHANGED!',
    answer: `The clock changed from ${iconLabel(pair0)} to ${iconLabel(pair1)}!`,
    seconds: 10 + Math.round(d * 3),
    data: { left, right, index },
  };
};

/**
 * Build `count` bonus rounds, easy -> hard, cycling through
 * settings.bonus.order. Same seed => same puzzles => same video.
 */
export const buildBonusPuzzles = (
  count = settings.bonus.after.length,
  seed = 20260101,
  /** round types to cycle through, easy -> hard (defaults to settings.bonus.order) */
  order: BonusKind[] = settings.bonus.order as BonusKind[],
): BonusPuzzle[] => {
  const pick = makePicker();
  return range(count).map((i) => {
    const rand = makeRandom(seed + i * 977);
    const d = count > 1 ? i / (count - 1) : 0.5;
    switch (order[i % order.length]) {
      case 'odd':
        return makeOdd(d, pick);
      case 'count':
        return makeCount(d, rand);
      case 'scramble':
        return makeScramble(d, rand, pick);
      case 'math':
        return makeMath(d, rand);
      case 'spot':
      default:
        return makeSpot(d, rand);
    }
  });
};
