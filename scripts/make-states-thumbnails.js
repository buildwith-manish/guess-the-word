#!/usr/bin/env node
'use strict';

/**
 * make-states-thumbnails.js  (npm run states:thumbs)
 *
 * YouTube thumbnails for "Guess the US State from Its Shape", from the real state outlines in
 * src/states/states-geo.json. Writes thumbnails/states/*.png (1920x1080, 16:9) and the .html they come from.
 *
 *   A-hero  one giant state, "?" badge, 50/50 ribbon   (main)
 *   B-grid  eight tiles of shapes, "GUESS 50 STATES"    (quantity hook)
 *   C-map   the whole map with one state lit, "?"       (alternate)
 *
 * Title these are made for: "Guess the US State by Its Shape | Can You Get 50/50?"
 * Style follows what works in this niche: saturated background, big banner, 1-3 huge objects, one short claim.
 * Rendering uses Chromium through Playwright (npm i -D playwright, then npx playwright install chromium); no network.
 * Upload the .jpg (YouTube's limit is 2 MB; the .png of some variants runs just over).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'thumbnails', 'states');
const geo = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'states', 'states-geo.json'), 'utf8'));
const byName = new Map(geo.states.map((s) => [s.name, s]));
const get = (n) => {
  const s = byName.get(n);
  if (!s) throw new Error('unknown state ' + n);
  return s;
};

const FONT = 'file://' + path.join(ROOT, 'public', 'fonts', 'Anton-Regular.woff2');

const C = {
  navy: '#07124a',
  blue1: '#3a74ff',
  blue2: '#1237b8',
  blue3: '#081a63',
  yellow: '#ffd21f',
  yellowHi: '#fff07a',
  gold: '#ffb000',
  red: '#ff2d4d',
  redDeep: '#c4002a',
  white: '#ffffff',
};

const CSS = `
@font-face { font-family: 'Anton'; src: url('${FONT}') format('woff2'); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1280px; height: 720px; overflow: hidden; background: #000; }
.t {
  position: relative; width: 1280px; height: 720px; overflow: hidden;
  font-family: 'Anton', 'Impact', sans-serif; color: ${C.white};
  background:
    radial-gradient(circle at 36% 54%, ${C.blue1} 0%, ${C.blue2} 52%, ${C.blue3} 100%);
}
.rays { position: absolute; inset: -40%; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.075) 0 5deg, rgba(255,255,255,0) 5deg 10deg); transform-origin: 50% 50%; }
.vig { position: absolute; inset: 0; background: radial-gradient(circle at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,10,0.55) 100%); }
.frame { position: absolute; inset: 0; border: 12px solid ${C.white}; border-radius: 6px; box-shadow: inset 0 0 0 5px ${C.navy}; }
.stroke { -webkit-text-stroke: 11px ${C.navy}; paint-order: stroke fill; text-shadow: 0 7px 0 ${C.navy}, 0 14px 22px rgba(0,0,0,0.5); }
.banner { position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-size: 132px; line-height: 1; letter-spacing: 3px; white-space: nowrap; }
.y { color: ${C.yellow}; }
.ribbon { position: absolute; background: linear-gradient(180deg, ${C.red}, ${C.redDeep}); border: 7px solid ${C.white}; box-shadow: 0 10px 0 ${C.navy}, 0 18px 28px rgba(0,0,0,0.5); border-radius: 14px; }
.ribbon span { display: block; font-size: 118px; line-height: 1; padding: 6px 30px 10px; }
.q { position: absolute; width: 190px; height: 190px; border-radius: 50%; background: ${C.white}; border: 9px solid ${C.navy}; box-shadow: 0 10px 0 ${C.navy}, 0 18px 30px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: ${C.red}; font-size: 170px; line-height: 1; padding-top: 14px; }
.shape { position: absolute; overflow: visible; }
svg { display: block; overflow: visible; }
`;

/** One state outline: dark outline, white edge, gold fill, soft shadow. `box` = the 1000x1000 shape box. */
const heroShape = (name, size) => {
  const s = get(name);
  return `<svg class="shape" width="${size}" height="${size}" viewBox="0 0 1000 1000" style="filter: drop-shadow(0 26px 0 rgba(3,10,60,0.55)) drop-shadow(0 0 40px rgba(255,214,60,0.45));">
  <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.yellowHi}"/><stop offset="0.45" stop-color="${C.yellow}"/><stop offset="1" stop-color="${C.gold}"/></linearGradient></defs>
  <path d="${s.shape}" fill="none" stroke="${C.navy}" stroke-width="60" stroke-linejoin="round" fill-rule="evenodd"/>
  <path d="${s.shape}" fill="none" stroke="${C.white}" stroke-width="30" stroke-linejoin="round" fill-rule="evenodd"/>
  <path d="${s.shape}" fill="url(#gg)" stroke="${C.navy}" stroke-width="6" stroke-linejoin="round" fill-rule="evenodd"/>
</svg>`;
};

const shell = (inner, extraCss = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extraCss}</style></head><body><div class="t"><div class="rays"></div>${inner}<div class="vig"></div><div class="frame"></div></div></body></html>`;

// ---------------------------------------------------------------- A: hero
const A = () =>
  shell(`
  <div class="banner stroke">GUESS THE <span class="y">STATE</span></div>
  <div style="position:absolute; left:160px; top:182px;">${heroShape('Michigan', 485)}</div>
  <div class="q" style="left:545px; top:176px; transform: rotate(9deg);">?</div>
  <div class="ribbon" style="right:56px; bottom:60px; transform: rotate(-5deg);"><span class="stroke" style="-webkit-text-stroke: 9px ${C.navy};">50/50?</span></div>
  <div class="stroke" style="position:absolute; right:78px; top:232px; width:430px; text-align:center; font-size:96px; line-height:1.02; -webkit-text-stroke: 9px ${C.navy};">BY ITS<br><span class="y">SHAPE</span></div>
`);

// ---------------------------------------------------------------- B: grid
const TILES = [
  ['Texas', '#ff4d6a'],
  ['Florida', '#19c37d'],
  ['California', '#ff9f0a'],
  ['Michigan', '#a05bff'],
  ['Louisiana', '#00b7ff'],
  ['Oklahoma', '#ff6b2c'],
  ['Idaho', '#ff3fa4'],
  ['Nevada', '#37d6c8'],
];
const tile = (name, color, i) => {
  const s = get(name);
  const col = i % 4;
  const row = Math.floor(i / 4);
  const w = 292;
  const h = 252;
  const x = 40 + col * (w + 12);
  const y = 188 + row * (h + 12);
  const k = 190; // shape box px
  return `<div style="position:absolute; left:${x}px; top:${y}px; width:${w}px; height:${h}px; border-radius:22px; background: linear-gradient(160deg, ${color}, ${C.navy} 135%); border: 6px solid ${C.white}; box-shadow: 0 9px 0 ${C.navy}, 0 16px 24px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center;">
    <svg width="${k}" height="${k}" viewBox="0 0 1000 1000" style="filter: drop-shadow(0 8px 0 rgba(0,0,0,0.35));">
      <path d="${s.shape}" fill="${C.white}" stroke="${C.navy}" stroke-width="34" stroke-linejoin="round" paint-order="stroke" fill-rule="evenodd"/>
    </svg>
    <div style="position:absolute; right:12px; bottom:2px; font-size:66px; line-height:1; color:${C.white}; -webkit-text-stroke: 7px ${C.navy}; paint-order: stroke fill;">?</div>
  </div>`;
};
const B = () =>
  shell(`
  <div class="banner stroke" style="font-size:128px;">GUESS <span class="y" style="font-size:158px;">50</span> STATES</div>
  ${TILES.map(([n, c], i) => tile(n, c, i)).join('')}
`);

// ---------------------------------------------------------------- C: map with one state lit
const C_MAP = () => {
  const lit = 'Missouri';
  const paths = geo.states
    .filter((s) => s.name !== lit)
    .map((s) => `<path d="${s.mini}" fill="rgba(10,28,110,0.78)" stroke="rgba(190,212,255,0.85)" stroke-width="1.4" stroke-linejoin="round" fill-rule="evenodd"/>`)
    .join('');
  const t = get(lit);
  const cx = t.miniCentroid[0];
  const cy = t.miniCentroid[1];
  return shell(`
  <div class="banner stroke" style="font-size:112px; top:24px;">WHICH <span class="y">STATE</span>?</div>
  <svg class="shape" width="900" height="563" viewBox="0 0 975 610" style="left:34px; top:140px;">
    <g style="filter: drop-shadow(0 7px 0 rgba(3,10,60,0.55));">${paths}</g>
    <g style="filter: drop-shadow(0 0 22px rgba(255,214,60,0.9)) drop-shadow(0 7px 0 rgba(3,10,60,0.6));">
      <path d="${t.mini}" fill="${C.yellow}" stroke="${C.white}" stroke-width="3.5" stroke-linejoin="round" fill-rule="evenodd"/>
    </g>
    <text x="${cx}" y="${cy + 27}" text-anchor="middle" font-family="Anton" font-size="84" fill="${C.red}" stroke="${C.navy}" stroke-width="7" paint-order="stroke">?</text>
  </svg>
  <div class="ribbon" style="right:34px; top:300px; transform: rotate(5deg);"><span class="stroke" style="font-size:92px; -webkit-text-stroke: 7px ${C.navy}; padding: 6px 22px 10px;">50/50?</span></div>
  <div class="stroke y" style="position:absolute; right:40px; top:470px; width:300px; text-align:center; font-size:70px; line-height:1.05; -webkit-text-stroke: 7px ${C.navy};">BY ITS<br>SHAPE</div>
`);
};

const VARIANTS = [
  ['A-hero', A],
  ['B-grid', B],
  ['C-map', C_MAP],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  for (const [id, build] of VARIANTS) {
    const html = build();
    const htmlFile = path.join(OUT, `states-thumb-${id}.html`);
    fs.writeFileSync(htmlFile, html);
    await page.goto('file://' + htmlFile);
    await page.evaluate(() => document.fonts.ready);
    const png = path.join(OUT, `states-thumb-${id}.png`);
    await page.screenshot({ path: png, type: 'png' });
    // YouTube accepts up to 2 MB: the PNG can run over, so every variant also gets a JPG (the one to upload).
    const jpg = path.join(OUT, `states-thumb-${id}.jpg`);
    await page.screenshot({ path: jpg, type: 'jpeg', quality: 94 });
    console.log(id, 'png ' + (fs.statSync(png).size / 1024).toFixed(0) + ' KiB, jpg ' + (fs.statSync(jpg).size / 1024).toFixed(0) + ' KiB');
  }
  await browser.close();
})().catch((e) => {
  console.error('make-states-thumbnails failed:', e);
  process.exit(1);
});
