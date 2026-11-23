/**
 * Build-time clue fit check (iOS-6). Run: npx tsx scripts/check_nfl_clues.ts
 * Fails (exit 1) if a clue needs more than HERO.lines lines in the hero at the minimum size, or more than HISTORY.lines
 * lines in a history row. Prints card, clue number and lines needed. Also prints the hero size each clue gets.
 * Uses src/nfl/components/clueLayout.ts (Inter 600 metrics, no DOM), the same function the ClueStack renders with.
 */
import { cards } from '../src/nfl/data';
import { HERO, HISTORY, clueFailures, heroFit, historyFit } from '../src/nfl/components/clueLayout';

const fails = clueFailures(cards);
let smallest = HERO.max;
let longest = { card: 0, clue: 0, lines: 0, size: 0 };
for (const c of cards) {
  c.clues.forEach((t, i) => {
    const h = heroFit(t);
    smallest = Math.min(smallest, h.size);
    if (h.lines.length > longest.lines || (h.lines.length === longest.lines && h.size < longest.size)) longest = { card: c.n, clue: i + 1, lines: h.lines.length, size: h.size };
  });
}
console.log(`hero size range ${HERO.min}-${HERO.max} (max ${HERO.lines} lines); history ${HISTORY.size} (max ${HISTORY.lines} lines)`);
console.log(`smallest hero size actually used: ${smallest}; most lines in the hero: ${longest.lines} (card ${longest.card} clue ${longest.clue} at ${longest.size})`);
for (const [n, k] of [[2, 1], [14, 1], [28, 3], [29, 1]] as const) {
  const c = cards[n - 1];
  console.log(`card ${n} clue ${k}: hero ${heroFit(c.clues[k - 1]).lines.length} lines @${heroFit(c.clues[k - 1]).size}; history ${historyFit(c.clues[k - 1]).lines.length} lines`);
}
if (fails.length) {
  console.log(`${fails.length} FAIL:`);
  fails.forEach((f) => console.log(`  card ${f.card} clue ${f.clue} ${f.where}: needs ${f.lines} lines, allowed ${f.allowed}`));
  process.exit(1);
}
console.log('all clues fit');
