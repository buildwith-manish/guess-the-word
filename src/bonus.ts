/**
 * bonus.ts — deterministic bonus-round factory.
 * Same five round types as the reference quiz: odd-one-out, count-it,
 * word-scramble, emoji-math, spot-the-difference. Puzzles are seeded, so
 * index N always yields the same board (required for reproducible renders).
 */
import settings from '../settings.json';
import { makeRandom, pickN, range, shuffle } from './util';

export type BonusKind = 'odd' | 'count' | 'scramble' | 'math' | 'spot';

export type BonusPuzzle = {
  kind: BonusKind;
  name: string;
  question: string;
  answer: string;
  seconds: number;
  data: any;
};

const POOL = ['🍕', '🚗', '🐶', '🌙', '⚽', '🎸', '🍔', '🌵', '🎈', '🔔', '🍩', '🚀', '🦋', '🌻', '🎁', '🧩', '🏆', '🔑', '📷', '🎧', '🍦', '🐢', '🦄', '🍄'];

const LOOK: [string, string][] = [
  ['🙂', '🙃'],
  ['🍎', '🍏'],
  ['🐶', '🐕'],
  ['🌕', '🌝'],
  ['🔵', '🟦'],
  ['😀', '😃'],
  ['🕐', '🕑'],
  ['⭐', '🌟'],
];

const ODD = [
  { t: ['🍎', '🍌', '🥕', '🍇'], i: 2, a: 'The carrot is a vegetable. The rest are fruits.' },
  { t: ['🔥', '🌋', '☀️', '❄️'], i: 3, a: 'Snow is cold. The rest are hot.' },
  { t: ['🍅', '🍓', '🍒', '🍌'], i: 3, a: 'The banana isn’t red.' },
  { t: ['⚽', '🏀', '🏐', '🏈'], i: 3, a: 'The football is oval. The rest are round.' },
  { t: ['🦈', '🐬', '🐟', '🐙'], i: 1, a: 'A dolphin is a mammal. The rest aren’t.' },
  { t: ['🐍', '🦎', '🐢', '🐸'], i: 3, a: 'A frog is an amphibian. The rest are reptiles.' },
  { t: ['🕷️', '🐜', '🐝', '🦋'], i: 0, a: 'A spider has 8 legs. The rest are insects.' },
  { t: ['🦇', '🐦', '🦅', '🦉'], i: 0, a: 'A bat is a mammal, not a bird.' },
  { t: ['🔵', '🔵', '🔵', '🟦', '🔵'], i: 3, a: 'One is a square, the rest are circles.' },
  { t: ['🍀', '🍀', '☘️', '🍀', '🍀'], i: 2, a: 'Only one clover has 3 leaves.' },
  { t: ['🐶', '🐶', '🐶', '🐕', '🐶', '🐶'], i: 3, a: 'One dog is a full-body dog.' },
  { t: ['🕐', '🕐', '🕑', '🕐', '🕐'], i: 2, a: 'It says 2:00. The rest say 1:00.' },
  { t: ['🌑', '🌑', '🌑', '🌒', '🌑', '🌑'], i: 3, a: 'One moon has a bright sliver.' },
];

const SCR: [string, string][] = [
  ['PIZZA', '🍕'],
  ['TIGER', '🐯'],
  ['ROCKET', '🚀'],
  ['GUITAR', '🎸'],
  ['PLANET', '🪐'],
  ['DRAGON', '🐉'],
  ['CASTLE', '🏰'],
  ['PENGUIN', '🐧'],
  ['VOLCANO', '🌋'],
  ['DOLPHIN', '🐬'],
  ['LIBRARY', ''],
  ['MYSTERY', ''],
  ['JOURNEY', ''],
  ['ELEPHANT', ''],
];

const CNT: [string, string[]][] = [
  ['🐸', ['🐢', '🦎', '🐍', '🐊']],
  ['🍎', ['🍅', '🍒', '🍓', '🌶️']],
  ['⭐', ['🌙', '☁️', '⚡', '🔥']],
  ['🐝', ['🦋', '🐞', '🦗', '🐜']],
  ['🎈', ['🎁', '🎀', '🎉', '🎊']],
  ['🐱', ['🐶', '🐭', '🐹', '🐰']],
];

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

const makeOdd = (d: number, pick: ReturnType<typeof makePicker>): BonusPuzzle => {
  const p = ODD[pick(ODD.length, 'odd', d)];
  return {
    kind: 'odd',
    name: 'ODD ONE OUT',
    question: 'WHICH ONE DOESN’T BELONG?',
    answer: p.a,
    seconds: p.t.length > 4 ? 10 : 8,
    data: { tiles: p.t, answerIndex: p.i, small: p.t.length > 4 },
  };
};

const makeMath = (d: number, rand: () => number): BonusPuzzle => {
  const icons = pickN(['🍎', '🍌', '🍕', '🍩', '🍓', '⭐', '🐶', '🎈', '🍪', '🚗'], 3, rand);
  if (d < 0.34) {
    const a = int(rand, 3, 9);
    const b = int(rand, 1, 5);
    return {
      kind: 'math',
      name: 'EMOJI MATH',
      question: 'SOLVE THE LAST ONE!',
      answer: `${icons[0]} = ${a} and ${icons[1]} = ${b}, so ${icons[0]} + ${icons[1]} = ${a + b}.`,
      seconds: 10,
      data: {
        rows: [
          { icons: [icons[0], icons[0]], value: String(2 * a) },
          { icons: [icons[1], icons[1]], value: String(2 * b) },
          { icons: [icons[0], icons[1]], value: '?' },
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
      answer: `${icons[0]} = ${a} and ${icons[1]} = ${b}, so the answer is ${2 * b + a}.`,
      seconds: 12,
      data: {
        rows: [
          { icons: [icons[0], icons[0], icons[0]], value: String(3 * a) },
          { icons: [icons[0], icons[1]], value: String(a + b) },
          { icons: [icons[1], icons[1], icons[0]], value: '?' },
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
  return {
    kind: 'math',
    name: 'EMOJI MATH',
    question: 'SOLVE THE LAST ONE!',
    answer: `${icons[0]}=${a}, ${icons[1]}=${b}, ${icons[2]}=${c}. Total ${a + b + c}.`,
    seconds: 15,
    data: {
      rows: [
        { icons: [icons[0], icons[1]], value: String(a + b) },
        { icons: [icons[1], icons[2]], value: String(b + c) },
        { icons: [icons[0], icons[2]], value: String(a + c) },
        { icons: [icons[0], icons[1], icons[2]], value: '?' },
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
  return {
    kind: 'count',
    name: 'COUNT IT',
    question: `HOW MANY ${target} ARE THERE?`,
    answer: `There are ${count} ${target}!`,
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

const makeSpot = (d: number, rand: () => number): BonusPuzzle => {
  const index = Math.floor(rand() * 9);
  let left: string[];
  let right: string[];
  if (d > 0.5) {
    const pair = LOOK[Math.floor(rand() * LOOK.length)];
    const flat = LOOK.flat();
    left = pickN(POOL.filter((e) => !flat.includes(e)), 9, rand);
    left[index] = pair[0];
    right = left.slice();
    right[index] = pair[1];
  } else {
    left = pickN(POOL, 9, rand);
    right = left.slice();
    right[index] = POOL.filter((e) => !left.includes(e))[0];
  }
  return {
    kind: 'spot',
    name: 'SPOT THE DIFFERENCE',
    question: 'FIND THE ONE THAT CHANGED!',
    answer: `${left[index]} changed into ${right[index]}!`,
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
): BonusPuzzle[] => {
  const pick = makePicker();
  const order = settings.bonus.order as BonusKind[];
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
