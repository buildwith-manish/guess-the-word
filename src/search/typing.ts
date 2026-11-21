/** typing.ts: when each character of a typed search appears.
 *
 *  Pure functions, no React and no font imports, so the sound cues, the scene and the node scripts all
 *  read the same character times.
 *
 *  A person does not type at a perfectly even speed. Each character gets a weight: a small seeded
 *  jitter, a short hesitation at the start of a word, a longer one after a comma or full stop. The weights
 *  are scaled so they add up to the number of characters, so a search of `length` characters still takes
 *  exactly `length * typeTicks` ticks in total. Slot maths (searchUnits, slideStart) therefore does not change.
 *
 *  All times are 30 fps design ticks. `start` is the tick of the first character. */

/** Random speed change per character, as a share of an even step. Motion constant. */
const JITTER = 0.35;
/** Extra pause before the first letter of a word, as a share of an even step. Motion constant. */
const WORD_PAUSE = 0.45;
/** Extra pause after a comma, full stop or dash, as a share of an even step. Motion constant. */
const PUNCT_PAUSE = 0.9;

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const cache = new Map<string, number[]>();

/** cum[j] = steps (in typeTicks units) taken before character j+1 appears; cum[0] = 0, cum[length] = length. */
const cumulative = (text: string): number[] => {
  const hit = cache.get(text);
  if (hit) return hit;
  const n = text.length;
  const w: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = 1 + (hash(i * 3.7 + n) * 2 - 1) * JITTER;
    const prev = i > 0 ? text[i - 1] : '';
    if (prev === ' ') v += WORD_PAUSE;
    if (prev === ',' || prev === '.' || prev === '-') v += PUNCT_PAUSE;
    w.push(v);
  }
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const cum = [0];
  w.forEach((v) => cum.push(cum[cum.length - 1] + (v / total) * n));
  cache.set(text, cum);
  return cum;
};

/** Tick at which character k (1-based) appears. Character 1 lands exactly on `start`. */
export const charTick = (start: number, text: string, k: number, typeTicks: number): number => {
  const cum = cumulative(text);
  const j = Math.max(1, Math.min(text.length, k)) - 1;
  return start + cum[j] * typeTicks;
};

/** Closest two typing ticks may be, in design ticks (0.1 s). A nearer pair (a one-letter word typed fast) sounds like a double tick. */
const MIN_TICK_GAP = 3;

/** The 1-based character numbers that start a word (first non-space character, or after a space). */
const wordStarts = (text: string): number[] => {
  const out: number[] = [];
  for (let k = 1; k <= text.length; k++) {
    if (text[k - 1] !== ' ' && (k === 1 || text[k - 2] === ' ')) out.push(k);
  }
  return out;
};

/** Ticks at which the typing sound plays for `text` typed from `start`: one per word, on the tick its first character
 *  appears, at least MIN_TICK_GAP apart. Per character would be 10 to 15 sounds a second at normal speed, a buzz. */
export const typingTickFrames = (start: number, text: string, typeTicks: number): number[] => {
  const out: number[] = [];
  for (const k of wordStarts(text)) {
    const f = Math.round(charTick(start, text, k, typeTicks));
    if (out.length === 0 || f - out[out.length - 1] >= MIN_TICK_GAP) out.push(f);
  }
  return out;
};

/** How many characters of `text` are visible at `frame`. */
export const typedChars = (frame: number, start: number, text: string, typeTicks: number): number => {
  if (frame < start) return 0;
  const cum = cumulative(text);
  const steps = (frame - start) / typeTicks;
  let k = 0;
  while (k < text.length && cum[k] <= steps + 1e-9) k++;
  return k;
};
