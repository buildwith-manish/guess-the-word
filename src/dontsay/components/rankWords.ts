/**
 * rankWords.ts — turns a rank tier's numeric range into its spoken line (task 4g).
 *
 * No score, range or total is ever written here as a literal: numberWords() spells out
 * whatever number it is given, so RankCard.tsx and Scoreboard.tsx can build every voice
 * line ("Zero to fifteen: Echo.", "That was all fifty.") straight from data.ts (`ranks`,
 * `rounds.length + bonuses.length`) instead of hard-coding the words that happen to match
 * today's numbers.
 */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
] as const;
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] as const;

/** 0-99 spelled out in lower-case words, hyphenated compounds ("twenty-eight"). */
export const numberWords = (n: number): string => {
  if (n < 0) return `minus ${numberWords(-n)}`;
  if (n < 20) return ONES[n] ?? String(n);
  if (n > 99) return String(n); // ranks never reach three digits; fall back rather than guess
  const tens = TENS[Math.floor(n / 10)];
  const ones = n % 10;
  return ones ? `${tens}-${ONES[ones]}` : tens;
};

const capitalize = (s: string): string => (s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export type RankTierLike = { name: string; min: number; max: number };

/**
 * The spoken line for one rank tier, e.g. "Sixteen to twenty-seven: Parrot." The top tier
 * (the one with no ceiling in practice) reads "Forty-six or more: One of a Kind." instead of
 * repeating its max. Pass `isTop` for the last tier in ascending (lowest-first) order.
 */
export const rankVoiceLine = (rank: RankTierLike, isTop: boolean): string =>
  isTop
    ? capitalize(`${numberWords(rank.min)} or more: ${rank.name}.`)
    : capitalize(`${numberWords(rank.min)} to ${numberWords(rank.max)}: ${rank.name}.`);
