/**
 * questions.js — the 50-question bank (single source of truth).
 *
 * clueA / clueB : PNG file names in public/emoji-icons/ (A = first half, B = second half)
 * split         : 0-based position of the 2nd free letter. During the clock letter 1 flips
 *                 at 1/3 elapsed and letter `split` at 2/3 elapsed (same table as the
 *                 reference HTML's SPLIT string).
 * fact          : optional "did you know" line; shown on every 3rd question (ids 3, 6, 9 ...).
 *                 Keep it to ~8 words so the voice-over can read it.
 *
 * `npm run data` turns this file into src/rounds.json.
 */
const SPLIT = ['3444434633', '4355433353', '5464443543', '4345343335', '6334435555'].join('');

const FACTS = {
  3: 'Some treehouses are lived in all year round.',
  6: 'Snow looks white but is clear ice.',
  9: 'An eggshell has thousands of tiny pores.',
  12: 'The oldest known lock is about 4,000 years old.',
  15: 'Alexandria’s lighthouse was a Seven Wonder.',
  21: 'Motion sickness is your eyes and ears disagreeing.',
  24: 'Lovebirds are small parrots from Africa.',
  27: 'The thumbtack was patented in 1900.',
  30: 'Butterflies taste with their feet.',
  33: 'A wolf pack is usually one family.',
  36: 'One bee makes only 1/12 teaspoon of honey.',
  42: 'Bean plants climb by twisting around supports.',
  45: 'Whirlpools form where opposing currents meet.',
  48: 'Your feet hold a quarter of your bones.',
};

const Q = (id, word, level, hint = '') => ({
  id,
  word,
  clueA: `Q${String(id).padStart(2, '0')}_A_${word[0]}${word.slice(1).toLowerCase()}.png`,
  clueB: `Q${String(id).padStart(2, '0')}_B_${word[0]}${word.slice(1).toLowerCase()}.png`,
  level,
  split: Math.max(1, Math.min(word.length - 1, Number(SPLIT[id - 1]))),
  fact: FACTS[id] || '',
  hint, // clue combo, for your reference only
});

module.exports = [
  // ---------- EASY (1-20) ----------
  Q(1, 'RAINCOAT', 'EASY', 'rain + coat'),
  Q(2, 'CATFISH', 'EASY', 'cat + fish'),
  Q(3, 'TREEHOUSE', 'EASY', 'tree + house'),
  Q(4, 'MAILBOX', 'EASY', 'mail + box'),
  Q(5, 'COWBELL', 'EASY', 'cow + bell'),
  Q(6, 'SNOWBALL', 'EASY', 'snow + ball'),
  Q(7, 'FIREWOOD', 'EASY', 'fire + wood'),
  Q(8, 'NOTEBOOK', 'EASY', 'note + book'),
  Q(9, 'EGGSHELL', 'EASY', 'egg + shell'),
  Q(10, 'HANDBAG', 'EASY', 'hand + bag'),
  Q(11, 'HORSESHOE', 'EASY', 'horse + shoe'),
  Q(12, 'KEYHOLE', 'EASY', 'key + hole'),
  Q(13, 'PANCAKE', 'EASY', 'pan + cake'),
  Q(14, 'TEASPOON', 'EASY', 'tea + spoon'),
  Q(15, 'LIGHTHOUSE', 'EASY', 'light + house'),
  Q(16, 'BULLFROG', 'EASY', 'bull + frog'),
  Q(17, 'MOUSETRAP', 'EASY', 'mouse + trap'),
  Q(18, 'ARMCHAIR', 'EASY', 'arm + chair'),
  Q(19, 'ANTHILL', 'EASY', 'ant + hill'),
  Q(20, 'WATERFALL', 'EASY', 'water + fall (US fall = autumn)'),

  // ---------- MEDIUM (21-35) ----------
  Q(21, 'CARSICK', 'MEDIUM', 'car + sick'),
  Q(22, 'SANDPAPER', 'MEDIUM', 'sand + paper'),
  Q(23, 'BIRDBATH', 'MEDIUM', 'bird + bath'),
  Q(24, 'LOVEBIRD', 'MEDIUM', 'love + bird'),
  Q(25, 'WATCHDOG', 'MEDIUM', 'watch + dog'),
  Q(26, 'WINDSHIELD', 'MEDIUM', 'wind + shield'),
  Q(27, 'THUMBTACK', 'MEDIUM', 'thumb + tack'),
  Q(28, 'SEAWEED', 'MEDIUM', 'sea + weed'),
  Q(29, 'MEATLOAF', 'MEDIUM', 'meat + loaf'),
  Q(30, 'BUTTERFLY', 'MEDIUM', 'butter + fly'),
  Q(31, 'CROSSWALK', 'MEDIUM', 'cross + walk'),
  Q(32, 'ROADRUNNER', 'MEDIUM', 'road + runner'),
  Q(33, 'WOLFPACK', 'MEDIUM', 'wolf + pack'),
  Q(34, 'GOALPOST', 'MEDIUM', 'goal + post'),
  Q(35, 'BLUETOOTH', 'MEDIUM', 'blue + tooth'),

  // ---------- HARD (36-50) ----------
  Q(36, 'HONEYMOON', 'HARD', 'honey + moon'),
  Q(37, 'DAYDREAM', 'HARD', 'day + dream'),
  Q(38, 'CARTWHEEL', 'HARD', 'cart + wheel'),
  Q(39, 'SWEETHEART', 'HARD', 'sweet + heart'),
  Q(40, 'WISHBONE', 'HARD', 'wish + bone'),
  Q(41, 'SHORTCUT', 'HARD', 'short + cut'),
  Q(42, 'BEANSTALK', 'HARD', 'bean + stalk'),
  Q(43, 'NIGHTMARE', 'HARD', 'night + mare'),
  Q(44, 'SEESAW', 'HARD', 'see + saw'),
  Q(45, 'WHIRLPOOL', 'HARD', 'whirl + pool'),
  Q(46, 'WALLFLOWER', 'HARD', 'wall + flower'),
  Q(47, 'HAMSTRING', 'HARD', 'ham + string'),
  Q(48, 'BAREFOOT', 'HARD', 'bear (sounds like bare) + foot'),
  Q(49, 'QUARTERBACK', 'HARD', 'quarter + back'),
  Q(50, 'HOGWASH', 'HARD', 'hog + wash'),
];
