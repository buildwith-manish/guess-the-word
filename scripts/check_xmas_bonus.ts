/**
 * Prints the beats, cues and answer-pill layout of every bonus slot. Run: npx tsx scripts/check_xmas_bonus.ts
 * Ticks are design ticks (30/s); render frame = tick x 2. Exit 1 if an answer does not fit or a pill leaves the safe band.
 */
import { bonuses } from '../src/xmas/data';
import { bonusBeats, bonusCues, bonusSceneFrames } from '../src/xmas/scenes/BonusScene';
import { revealLayout } from '../src/xmas/components/BonusReveal';
import { passRuleText } from '../src/xmas/bonus/registry';
import { SAFE } from '../src/xmas/system';

let bad = 0;
for (const s of bonuses) {
  const b = bonusBeats(s);
  const L = revealLayout(s.answers);
  const out = L.filter((r) => !r.fits || r.cx - r.w / 2 < SAFE.left || r.cx + r.w / 2 > SAFE.right || r.cy - r.h / 2 < SAFE.top || r.cy + r.h / 2 > SAFE.bottom);
  if (out.length) bad++;
  console.log(
    `bonus ${s.bonus} slot ${s.slot} ${s.name}: ${b.total} ticks (${bonusSceneFrames(s)} frames); play ${b.playFrom}..${b.playTo}, answers ${b.answersFrom}; ${s.answers.length} pill(s) y ${L[0].cy}..${L[L.length - 1].cy}; pass rule ${passRuleText(s) ?? '-'}${out.length ? '  PROBLEM' : ''}`,
  );
}
const s1 = bonuses[0];
console.log('bonus 1 cues:', bonusCues(s1, 0).map((c) => `${c.sfx}@${c.frame}`).join(' '));
process.exit(bad ? 1 : 0);
