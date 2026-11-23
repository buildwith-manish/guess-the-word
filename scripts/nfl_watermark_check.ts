/** Overlap check for the NFL watermark. Run: npx tsx scripts/nfl_watermark_check.ts. Rectangles are 1280x720 reference units, estimated from code constants (not measured from a render). */
import { WATERMARK } from '../src/nfl/components/Watermark';
import { FRAME, SAFE, safeBox } from '../src/nfl/system';
import { BAND_TOP } from '../src/nfl/scenes/CardScene';
import { LEVEL_BANNER_BOX } from '../src/nfl/scenes/LevelBanner';

type R = { name: string; x0: number; y0: number; x1: number; y1: number };
const r = (name: string, x: number, y: number, w: number, h: number): R => ({ name, x0: x, y0: y, x1: x + w, y1: y + h });
const h = WATERMARK.height;
// logo box 1.1h plus 0.14h gap plus two words (about 5.6 em of 0.32h): about 3.1h wide; the logo overhangs 0.14h above and below
const badge = r('badge', WATERMARK.left, WATERMARK.top - 0.14 * h, 3.1 * h, h * 1.28);

const checked: R[] = [
  r('ScoreHud compact (right, top BAND_TOP, ~350x76)', safeBox.right - 350, BAND_TOP, 350, 76),
  r('PointsPill (centred, 200x64)', (FRAME.w - 200) / 2, BAND_TOP, 200, 64),
  r('Rookie LevelBanner (centred, card 1, first 2 s)', (FRAME.w - LEVEL_BANNER_BOX.w) / 2, LEVEL_BANNER_BOX.top, LEVEL_BANNER_BOX.w, LEVEL_BANNER_BOX.h),
  r('Two-Minute Warning badge (centred, top SAFE.top, 56 high, ~300 wide)', (FRAME.w - 300) / 2, SAFE.top, 300, 56),
  r('Card header ("ROOKIE", "n / 30")', safeBox.left, SAFE.top, safeBox.w, 64),
  // End-screen slots (last 15 s of the outro). The outro leaves the bottom half empty for YouTube's elements; these are the
  // rectangles assumed for them: the whole bottom half and three standard 16:9 / subscribe placements inside it.
  r('End screen: bottom half', 0, FRAME.h / 2, FRAME.w, FRAME.h / 2),
  r('End screen: video slot left', safeBox.left, 400, 380, 214),
  r('End screen: video slot right', safeBox.right - 380, 400, 380, 214),
  r('End screen: subscribe slot (centre)', FRAME.w / 2 - 60, 400, 120, 120),
];
const hit = (a: R, b: R) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
console.log(`badge: x ${badge.x0}..${badge.x1.toFixed(0)}  y ${badge.y0.toFixed(1)}..${badge.y1.toFixed(1)}`);
let bad = 0;
for (const c of checked) {
  const o = hit(badge, c);
  if (o) bad++;
  console.log(`${o ? 'OVERLAP' : 'clear  '}  ${c.name}  x ${c.x0.toFixed(0)}..${c.x1.toFixed(0)}  y ${c.y0.toFixed(0)}..${c.y1.toFixed(0)}`);
}
if (bad) process.exit(1);
