/**
 * Date helpers for the extras. The cards never contain a date: the scene passes a date string, usually cut out of the
 * item's own text with these helpers (`item.reveal`, `item.didYouKnow`). Nothing here knows any specific date.
 */
const MONTH =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const FULL = `\\b${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`;
const MONTH_YEAR = `\\b${MONTH}\\.?\\s+\\d{4}\\b`;
const YEAR = '\\b(?:19|20)\\d{2}\\b';

/** Every date-like piece of `text`, in reading order: "Month D, YYYY", then "Month YYYY", then a bare year. */
export const extractDates = (text: string): string[] => text.match(new RegExp(`${FULL}|${MONTH_YEAR}|${YEAR}`, 'g')) ?? [];

/** The most complete date in `text` (a full date beats a month and year beats a bare year), or undefined. */
export const dateFromText = (text: string): string | undefined => {
  const found = extractDates(text);
  const rank = (s: string) => (new RegExp(`^${FULL}$`).test(s) ? 3 : new RegExp(`^${MONTH_YEAR}$`).test(s) ? 2 : 1);
  return found.slice().sort((a, b) => rank(b) - rank(a))[0];
};

export type DateParts = { month?: string; day?: string; year?: string };

/** Splits one date string ("Month D, YYYY", "Month YYYY" or "YYYY") into month, day and year as written. */
export const parseDate = (date: string): DateParts => {
  const m = date.match(new RegExp(`^(${MONTH})\\.?\\s+(?:(\\d{1,2})(?:st|nd|rd|th)?,?\\s+)?(\\d{4})$`));
  if (m) return { month: m[1], day: m[2], year: m[3] };
  const y = date.match(/(\d{4})/);
  return y ? { year: y[1] } : {};
};
