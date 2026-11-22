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
 *   D-clean one banner + one claim, big shape, arrow     (v2 of A: no repeated title, less text)
 *   E-warm  D-clean on a warm purple-to-orange backdrop  (same layout, colours only)
 *
 * Title these are made for: "Guess the US State by Its Shape | Can You Get 50/50?"
 * Style follows what works in this niche: saturated background, big banner, 1-3 huge objects, one short claim.
 * Rendering uses Chromium through Playwright (npm i -D playwright, then npx playwright install chromium); no network.
 * Upload the .jpg (YouTube's limit is 2 MB; the .png of some variants runs just over).
 *
 * Usage: node scripts/make-states-thumbnails.js [ids...]   e.g. `D-clean E-warm` renders only those (A, B, C stay
 * untouched); no ids renders all. Env CHROME_PATH = a Chromium/headless-shell binary to use instead of Playwright's own.
 * Every run that has A-hero, D-clean and E-warm on disk also writes the small-size comparison sheet.
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


// ---------------------------------------------------------------- D / E: clean layout (one banner + one claim)
// Everything the layout draws must stay at least SAFE px from the canvas edge: the white frame is 12 px (+5 px navy
// inside it) and the brief asks for 24 px or more clear of the frame.
const SAFE = 44;

/** Where a state outline goes: `target` = size in px of its larger visible side (outline included), `left` = left edge
 *  of that visible box, `cy` = vertical centre. The 1000-unit shape box is scaled so the navy outline (60 units wide, 30 each side) fits. */
const NAVY_STROKE = 60;
const placeShape = (name, target, left, cy) => {
  const s = get(name);
  const k = target / (Math.max(s.w, s.h) + NAVY_STROKE);
  const visW = (s.w + NAVY_STROKE) * k;
  const visH = (s.h + NAVY_STROKE) * k;
  // the shape is centred in its 1000x1000 box (src/states/geo.ts)
  const bx = left - ((1000 - s.w) / 2 - NAVY_STROKE / 2) * k;
  const top = cy - visH / 2;
  const by = top - ((1000 - s.h) / 2 - NAVY_STROKE / 2) * k;
  return { s, k, size: 1000 * k, bx, by, visW, visH, left, top, right: left + visW, bottom: top + visH };
};

/** The outline in the A-hero style (dark outline, white edge, gradient fill) with a chosen fill and glow. */
const cleanShape = (pl, fillStops, glow, id) => `<svg class="shape" width="${pl.size}" height="${pl.size}" viewBox="0 0 1000 1000" style="left:${pl.bx}px; top:${pl.by}px; filter: drop-shadow(0 22px 0 rgba(3,10,60,0.55)) drop-shadow(0 0 40px ${glow});">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${fillStops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs>
  <path d="${pl.s.shape}" fill="none" stroke="${C.navy}" stroke-width="${NAVY_STROKE}" stroke-linejoin="round" fill-rule="evenodd"/>
  <path d="${pl.s.shape}" fill="none" stroke="${C.white}" stroke-width="30" stroke-linejoin="round" fill-rule="evenodd"/>
  <path data-safe="shape" data-pad="${(NAVY_STROKE / 2) * pl.k}" d="${pl.s.shape}" fill="url(#${id})" stroke="${C.navy}" stroke-width="6" stroke-linejoin="round" fill-rule="evenodd"/>
</svg>`;

/** A block arrow pointing left (tip at the left): navy outline, white edge, red fill, like the ribbon. */
const arrow = (left, cy, width, rotate) => {
  const h = (width * 140) / 300;
  const d = 'M 8 70 L 112 8 L 112 40 L 292 40 L 292 100 L 112 100 L 112 132 Z';
  return `<svg data-safe="arrow" width="${width}" height="${h}" viewBox="0 0 300 140" style="position:absolute; left:${left}px; top:${cy - h / 2}px; overflow:visible; transform: rotate(${rotate}deg); transform-origin: 0% 50%; filter: drop-shadow(0 9px 0 ${C.navy}) drop-shadow(0 16px 20px rgba(0,0,0,0.45));">
  <defs><linearGradient id="arrowg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.red}"/><stop offset="1" stop-color="${C.redDeep}"/></linearGradient></defs>
  <path d="${d}" fill="none" stroke="${C.navy}" stroke-width="30" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="${C.white}" stroke-width="16" stroke-linejoin="round"/>
  <path d="${d}" fill="url(#arrowg)" stroke="${C.navy}" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
};

/** D and E share this layout; only the backdrop css and the shape colours come from `theme`. */
const clean = (theme) => {
  const pl = placeShape('Michigan', 560, SAFE + 12, 360);
  const colLeft = pl.right + 40;
  const tipX = pl.right + 16;
  const tipY = pl.top + 0.66 * pl.visH; // the lower peninsula's east edge, the widest part of the outline
  const ribbonRight = 74;
  return shell(
    `
  ${cleanShape(pl, theme.fill, theme.glow, 'gg2')}
  <div class="banner stroke" data-safe="banner" style="left:${colLeft}px; right:${SAFE + 8}px; top:${SAFE + 4}px; font-size:156px;">NAME IT!</div>
  <div class="q" style="width:136px; height:136px; left:${colLeft + 34}px; top:208px; font-size:120px; transform: rotate(9deg);" data-safe="badge">?</div>
  ${arrow(tipX, tipY + 6, 270, -4)}
  <div class="ribbon" data-safe="ribbon" style="right:${ribbonRight}px; top:${tipY - 74}px; transform: rotate(-4deg); text-align:center;">
    <span class="stroke" style="font-size:66px; padding:10px 34px 0; -webkit-text-stroke: 8px ${C.navy};">CAN YOU GET</span>
    <span class="stroke" style="font-size:118px; padding:0 34px 12px; -webkit-text-stroke: 10px ${C.navy};">50/50?</span>
  </div>
`,
    theme.css,
  );
};

const D_THEME = {
  css: '',
  fill: [[0, C.yellowHi], [0.45, C.yellow], [1, C.gold]],
  glow: 'rgba(255,214,60,0.45)',
};

// E: same layout; deep purple to orange radial (rays, vignette and frame are the same). The shape is WHITE, not gold:
// gold on the orange glow behind it was warm-on-warm (luminance ratio about 2.4:1 against about 3.6:1 for white),
// and the navy outline + white edge are kept. E_SHAPE_FILL=gold|cyan overrides it for comparison.
const E_BG = `.t { background: radial-gradient(circle at 34% 52%, #ff8f1f 0%, #e5532e 20%, #92298f 52%, #3a0f6e 80%, #1b0644 100%); }`;
const E_SHAPE_FILL = process.env.E_SHAPE_FILL || 'white';
const E_FILLS = {
  gold: { fill: D_THEME.fill, glow: 'rgba(255,214,60,0.45)' },
  white: { fill: [[0, '#ffffff'], [1, '#dfe6ff']], glow: 'rgba(255,255,255,0.4)' },
  cyan: { fill: [[0, '#b6f6ff'], [0.5, '#19d9ff'], [1, '#0a9fe0']], glow: 'rgba(60,220,255,0.5)' },
};
const E_THEME = { css: E_BG, ...E_FILLS[E_SHAPE_FILL] };

const D = () => clean(D_THEME);
const E = () => clean(E_THEME);

const VARIANTS = [
  ['A-hero', A],
  ['B-grid', B],
  ['C-map', C_MAP],
  ['D-clean', D],
  ['E-warm', E],
];

const JPG_LIMIT = 1.9 * 1024 * 1024; // YouTube's limit is 2 MB

/** Fails if anything marked data-safe sits closer than SAFE px to the canvas edge. Prints the measured boxes. */
const checkSafe = async (page, id) => {
  const rects = await page.evaluate(() =>
    [...document.querySelectorAll('[data-safe]')].map((el) => {
      const r = el.getBoundingClientRect();
      const pad = parseFloat(el.getAttribute('data-pad') || '0');
      return { name: el.getAttribute('data-safe'), l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad };
    }),
  );
  const bad = [];
  for (const q of rects) {
    const edge = Math.min(q.l, q.t, 1280 - q.r, 720 - q.b);
    console.log(`  ${id} ${q.name.padEnd(7)} x ${q.l.toFixed(0)}..${q.r.toFixed(0)}  y ${q.t.toFixed(0)}..${q.b.toFixed(0)}  nearest edge ${edge.toFixed(0)} px`);
    if (edge < SAFE) bad.push(`${q.name} is ${edge.toFixed(0)} px from the edge`);
  }
  if (bad.length) throw new Error(`${id}: closer than ${SAFE} px to the canvas edge: ${bad.join('; ')}`);
};

/** A, D and E side by side at 336x189 and at 168x94 (what a phone / sidebar shows), for looking at them small. */
const makeSheet = async (browser) => {
  const ids = ['A-hero', 'D-clean', 'E-warm'];
  const files = ids.map((id) => path.join(OUT, `states-thumb-${id}.jpg`));
  if (!files.every((f) => fs.existsSync(f))) return;
  const img = (f, w, h) => `<img src="file://${f}" width="${w}" height="${h}">`;
  const row = (w, h) => `<div class="row">${files.map((f) => img(f, w, h)).join('')}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #0f0f0f; padding: 20px; width: ${3 * 336 + 2 * 20}px; font: 12px sans-serif; color: #aaa; }
    .row { display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-start; }
    img { display: block; }
  </style></head><body>${row(336, 189)}${row(168, 94)}<div>left to right: A-hero, D-clean, E-warm. Top row 336x189, bottom row 168x94.</div></body></html>`;
  const file = path.join(OUT, 'states-thumb-compare-A-D-E.html');
  fs.writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width: 3 * 336 + 80, height: 189 + 94 + 100 }, deviceScaleFactor: 1 });
  await page.goto('file://' + file);
  await page.waitForLoadState('load');
  const png = path.join(OUT, 'states-thumb-compare-A-D-E.png');
  await page.screenshot({ path: png, type: 'png', fullPage: true });
  await page.close();
  console.log('sheet', png);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const todo = only.length ? VARIANTS.filter(([id]) => only.includes(id)) : VARIANTS;
  if (only.length && todo.length !== only.length) throw new Error('unknown variant in: ' + only.join(' '));
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  for (const [id, build] of todo) {
    const html = build();
    const htmlFile = path.join(OUT, `states-thumb-${id}.html`);
    fs.writeFileSync(htmlFile, html);
    await page.goto('file://' + htmlFile);
    await page.evaluate(() => document.fonts.ready);
    await checkSafe(page, id);
    const png = path.join(OUT, `states-thumb-${id}.png`);
    await page.screenshot({ path: png, type: 'png' });
    // YouTube accepts up to 2 MB: the PNG can run over, so every variant also gets a JPG (the one to upload).
    const jpg = path.join(OUT, `states-thumb-${id}.jpg`);
    let quality = 94;
    for (;;) {
      await page.screenshot({ path: jpg, type: 'jpeg', quality });
      if (fs.statSync(jpg).size <= JPG_LIMIT || quality <= 70) break;
      quality -= 4;
    }
    if (fs.statSync(jpg).size > JPG_LIMIT) throw new Error(id + ': jpg still over 2 MB at quality ' + quality);
    console.log(id, 'png ' + (fs.statSync(png).size / 1024).toFixed(0) + ' KiB, jpg ' + (fs.statSync(jpg).size / 1024).toFixed(0) + ' KiB (q' + quality + ')');
  }
  await makeSheet(browser);
  await browser.close();
})().catch((e) => {
  console.error('make-states-thumbnails failed:', e);
  process.exit(1);
});
