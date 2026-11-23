/**
 * Shared by the xmas clue scripts: every clue image id used by the video, with its art label and baked-in text.
 * Source of truth is src/xmas/data.ts (docs/xmas/clues.csv is not in the repo). Ids come from the 80 movie clues
 * plus every `{ new: id }` reference in the bonus rounds.
 */
import { bonuses, movies } from '../src/xmas/data';
import type { ClueRef } from '../src/xmas/data';

export type ClueInfo = { id: string; label: string; bakedText: string | null };

const humanize = (id: string) => {
  const tail = id.replace(/^[a-z]+\d+_/i, '');
  return tail.charAt(0).toUpperCase() + tail.slice(1).replace(/[_-]+/g, ' ');
};

const walkRefs = (o: unknown, out: string[]) => {
  if (Array.isArray(o)) o.forEach((v) => walkRefs(v, out));
  else if (o && typeof o === 'object') {
    const r = o as Partial<ClueRef> & Record<string, unknown>;
    if (typeof (r as { new?: unknown }).new === 'string') out.push((r as { new: string }).new);
    Object.values(r).forEach((v) => walkRefs(v, out));
  }
};

export const clueInfos = (): ClueInfo[] => {
  const map = new Map<string, ClueInfo>();
  for (const m of movies) {
    for (const c of [m.clue1, m.clue2]) map.set(c.id, { id: c.id, label: c.label, bakedText: c.bakedText });
  }
  const news: string[] = [];
  walkRefs(bonuses, news);
  for (const id of news) if (!map.has(id)) map.set(id, { id, label: humanize(id), bakedText: null });
  return [...map.values()];
};

export const CLUES_DIR = 'public/xmas/clues';
export const PLACEHOLDER_DIR = 'public/xmas/clues/placeholders';
export const REAL_EXT = ['.png', '.webp', '.jpg'] as const;
