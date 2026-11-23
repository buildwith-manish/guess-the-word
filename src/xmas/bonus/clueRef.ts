import { movies } from '../data';
import type { ClueRef } from '../data';

/** The clue image id a ClueRef points at: a slot's own clue (movie slots only) or a new image's id. Throws on a bad ref. */
export const clueIdOf = (ref: ClueRef): string => {
  if ('new' in ref) return ref.new;
  const m = movies.find((x) => x.slot === ref.slot);
  if (!m) throw new Error(`clueIdOf: slot ${ref.slot} is not a movie slot`);
  return ref.clue === 1 ? m.clue1.id : m.clue2.id;
};
