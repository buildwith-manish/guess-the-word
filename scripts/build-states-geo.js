#!/usr/bin/env node
/**
 * scripts/build-states-geo.js
 * Builds src/states/states-geo.json from us-atlas (US Census Bureau
 * cartographic boundaries). Run: npm run states:geo
 *
 * Per state: fips, name, shape (1000x1000 box, aspect kept, centred), w, h,
 * mini (975x610 Albers map path incl. AK/HI insets) + miniBBox/miniCentroid,
 * borders (land neighbours, topojson-client neighbors), cells at 12/24/48.
 */
const fs = require('fs');
const path = require('path');

const BOX = 1000;
const MINI_W = 975;
const MINI_H = 610;
const RESOLUTIONS = [12, 24, 48];
// Coastline smoothing: share of the finest points kept (topojson-simplify quantile). 1 = no simplification.
const KEEP = Number(process.env.GEO_KEEP || 0.7);
const SHAPE_DIGITS = 1;
const MINI_DIGITS = 1;
// Alaska: 'lonlat' = per-state conic fitted from lon/lat, 'albers' = inset geometry.
const ALASKA_SOURCE = process.env.ALASKA_SOURCE || 'lonlat';
const OUT = path.join(__dirname, '..', 'src', 'states', 'states-geo.json');
const EXCLUDE = new Set(['11', '72']); // DC, Puerto Rico (territories are also not in the 50)

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

(async () => {
  const topojson = require('topojson-client');
  const d3geo = await import('d3-geo');
  const { polygonContains } = await import('d3-polygon');

  const { presimplify, simplify, quantile } = require('topojson-simplify');
  const smooth = (t) => {
    if (KEEP >= 1) return t;
    const pre = presimplify(t);
    return simplify(pre, quantile(pre, KEEP));
  };
  const topo = smooth(JSON.parse(fs.readFileSync(require.resolve('us-atlas/states-10m.json'), 'utf8')));
  const albers = smooth(JSON.parse(fs.readFileSync(require.resolve('us-atlas/states-albers-10m.json'), 'utf8')));

  const geoms = topo.objects.states.geometries;
  const albersGeoms = albers.objects.states.geometries;
  const albersById = new Map(albersGeoms.map((g) => [g.id, g]));

  // The 50 states: everything except DC and territories (FIPS > 56).
  const keep = geoms.filter((g) => !EXCLUDE.has(g.id) && Number(g.id) <= 56);
  if (keep.length !== 50) {
    throw new Error(`Expected 50 states, got ${keep.length}`);
  }
  for (const g of keep) {
    if (!albersById.has(g.id)) throw new Error(`No Albers geometry for ${g.id} ${g.properties.name}`);
  }

  // Neighbours from shared arcs (topojson-client), indices -> names, only the 50.
  const nbIdx = topojson.neighbors(geoms);
  const nameOf = new Map(geoms.map((g) => [g.id, g.properties.name]));
  const keepIds = new Set(keep.map((g) => g.id));

  const lonlatFeatures = topojson.feature(topo, topo.objects.states).features;
  const albersFeatures = topojson.feature(albers, albers.objects.states).features;
  const featById = (arr, id) => arr.find((f) => f.id === id);

  /** Collect projected rings (after clipping) of a feature. */
  function projectedRings(feature, projection) {
    const rings = [];
    let cur = null;
    d3geo.geoStream(feature, projection.stream({
      point(x, y) { cur.push([x, y]); },
      lineStart() { cur = []; },
      lineEnd() { if (cur.length) rings.push(cur); cur = null; },
      polygonStart() {},
      polygonEnd() {},
      sphere() {},
    }));
    return rings;
  }

  /** Even-odd test: a point is inside when it falls in an odd number of rings. */
  function inside(rings, x, y) {
    let n = 0;
    for (const r of rings) if (polygonContains(r, [x, y])) n++;
    return (n & 1) === 1;
  }

  function cellBits(rings, N) {
    const step = BOX / N;
    let s = '';
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        s += inside(rings, (i + 0.5) * step, (j + 0.5) * step) ? '1' : '0';
      }
    }
    return s;
  }

  function shapeProjection(feature, source) {
    let proj;
    if (source === 'albers') {
      proj = d3geo.geoIdentity();
    } else {
      const [cx, cy] = d3geo.geoCentroid(feature);
      const [[, s], [, n]] = d3geo.geoBounds(feature);
      const lat0 = s, lat1 = n; // note: s<n for all states
      proj = d3geo.geoConicEqualArea()
        .rotate([-cx, 0])
        .center([0, cy])
        .parallels([lat0 + (lat1 - lat0) / 6, lat1 - (lat1 - lat0) / 6]);
    }
    return proj.fitExtent([[0, 0], [BOX, BOX]], feature);
  }

  const miniPath = d3geo.geoPath(null).digits(MINI_DIGITS);

  const states = [];
  const report = { alaska: null, hawaii: null };

  for (const g of keep) {
    const name = g.properties.name;
    const lonlat = featById(lonlatFeatures, g.id);
    const alb = featById(albersFeatures, g.id);
    const source = name === 'Alaska' ? ALASKA_SOURCE : 'lonlat';
    const feature = source === 'albers' ? alb : lonlat;
    const proj = shapeProjection(feature, source);
    const pathGen = d3geo.geoPath(proj).digits(SHAPE_DIGITS);
    const shape = pathGen(feature);
    const [[bx0, by0], [bx1, by1]] = pathGen.bounds(feature);
    const rings = projectedRings(feature, proj);

    const cells = {};
    for (const N of RESOLUTIONS) cells[N] = cellBits(rings, N);

    const mini = miniPath(alb);
    const [[mx0, my0], [mx1, my1]] = miniPath.bounds(alb);
    const [mcx, mcy] = miniPath.centroid(alb);

    const borders = [...nbIdx[geoms.indexOf(g)]]
      .map((i) => geoms[i])
      .filter((n) => keepIds.has(n.id))
      .map((n) => nameOf.get(n.id))
      .sort();

    if (name === 'Alaska' || name === 'Hawaii') {
      report[name.toLowerCase()] = { source, w: bx1 - bx0, h: by1 - by0, rings: rings.length };
    }

    states.push({
      fips: g.id,
      name,
      shape,
      w: round(bx1 - bx0),
      h: round(by1 - by0),
      mini,
      miniBBox: [round(mx0), round(my0), round(mx1), round(my1)],
      miniCentroid: [round(mcx), round(mcy)],
      borders,
      cells,
    });
  }

  states.sort((a, b) => a.fips.localeCompare(b.fips));
  if (states.length !== 50) throw new Error(`Output has ${states.length} states, expected 50`);

  const out = {
    credit: 'US Census Bureau cartographic boundaries via us-atlas',
    shapeBox: BOX,
    miniBox: [MINI_W, MINI_H],
    cellResolutions: RESOLUTIONS,
    cellLayout: 'row-major, top row first, sampled at cell centres, 1 = inside',
    alaskaSource: ALASKA_SOURCE,
    states,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const json = JSON.stringify(out);
  fs.writeFileSync(OUT, json);
  const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${kb} KB, ${states.length} states`);
  console.log('Alaska/Hawaii:', JSON.stringify(report));
  for (const [i, k] of ['shape', 'mini', 'cells'].entries()) {
    const total = states.reduce((a, s) => a + JSON.stringify(s[k]).length, 0);
    console.log(`  ${k}: ${(total / 1024).toFixed(1)} KB`);
  }
  if (Number(kb) > 700) console.warn('WARNING: JSON larger than ~700 KB');
})().catch((e) => { console.error(e); process.exit(1); });
