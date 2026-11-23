/**
 * Writes public/xmas/clues/placeholders/<id>.svg for every clue id that has no real file in public/xmas/clues/.
 * Run: npx tsx scripts/make_xmas_placeholders.ts && npx tsx scripts/build_xmas_clue_index.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CLUES_DIR, PLACEHOLDER_DIR, REAL_EXT, clueInfos } from './xmas_clue_ids';

const root = resolve(__dirname, '..');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap on a character budget per line. */
const wrap = (text: string, max: number): string[] => {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
};

const svgFor = (label: string, baked: string | null): string => {
  const S = 512;
  const labelLines = wrap(label, 13).slice(0, 4);
  const labelSize = labelLines.length > 2 ? 40 : 48;
  const lh = labelSize * 1.2;
  // With baked text, the big baked text sits in the middle and the label goes above it, smaller.
  const bakedSize = baked ? (baked.length <= 3 ? 190 : 120) : 0;
  const text: string[] = [];
  if (baked) {
    text.push(`<text x="256" y="${290 + bakedSize * 0.3}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${bakedSize}" fill="#FFFFFF">${esc(baked)}</text>`);
    const small = wrap(label, 22).slice(0, 2);
    small.forEach((l, i) =>
      text.push(`<text x="256" y="${96 + i * 34}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="28" fill="#C9CED8">${esc(l)}</text>`),
    );
  } else {
    const startY = 256 - ((labelLines.length - 1) * lh) / 2 + labelSize * 0.35;
    labelLines.forEach((l, i) =>
      text.push(`<text x="256" y="${startY + i * lh}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${labelSize}" fill="#FFFFFF">${esc(l)}</text>`),
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2E3A"/><stop offset="1" stop-color="#14161D"/></linearGradient></defs>
<rect x="6" y="6" width="500" height="500" rx="64" fill="url(#g)" stroke="#8A93A8" stroke-opacity="0.55" stroke-width="3"/>
${text.join('\n')}
<rect x="176" y="452" width="160" height="34" rx="17" fill="#F5C451" fill-opacity="0.22" stroke="#F5C451" stroke-opacity="0.7"/>
<text x="256" y="476" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="16" letter-spacing="2" fill="#F5C451">PLACEHOLDER</text>
</svg>
`;
};

const hasReal = (id: string) => REAL_EXT.some((e) => existsSync(join(root, CLUES_DIR, id + e)));

mkdirSync(join(root, PLACEHOLDER_DIR), { recursive: true });
let written = 0;
let skipped = 0;
for (const c of clueInfos()) {
  if (hasReal(c.id)) {
    skipped++;
    continue;
  }
  writeFileSync(join(root, PLACEHOLDER_DIR, c.id + '.svg'), svgFor(c.label, c.bakedText));
  written++;
}
console.log(`placeholders written: ${written}, skipped (real file exists): ${skipped}`);
