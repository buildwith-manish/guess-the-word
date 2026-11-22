#!/usr/bin/env node
/**
 * scripts/search-qa.js
 * Consistency checks for the search-history timeline and its audio plan. No rendering.
 * Bundles src/search/*.ts with esbuild (like scripts/search-timeline.js), prints a table,
 * and exits 1 if any check fails.
 *
 * Usage: npm run search:qa
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const rootSettings = JSON.parse(fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/search/search-settings.json'), 'utf8'));
const voManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/search/search-voiceover-manifest.json'), 'utf8'));

/** The scenes import ../../fonts for its side effect (it fetches font files, which node cannot do). Stub it. */
const stubFonts = {
  name: 'stub-fonts',
  setup(build) {
    build.onResolve({ filter: /(^|[\\/])fonts$/ }, (a) => ({ path: a.path, namespace: 'stub-fonts' }));
    build.onLoad({ filter: /.*/, namespace: 'stub-fonts' }, () => ({ contents: '', loader: 'js' }));
  },
};

/** Test fixture, injected only into the QA bundle (never written to the repo): every clue has a 3.3 s clip and every
 *  reveal a 2.5 s clip, so the voiced layout can be checked while the real manifest is empty. */
const FIXTURE_CLUE_SECONDS = 3.3;
const FIXTURE_REVEAL_SECONDS = 2.5;
const fixtureManifest = () => {
  const clue = {};
  const reveal = {};
  for (let id = 1; id <= 200; id++) {
    clue[id] = [0, 1, 2].map((k) => ({ file: `fixture-${id}-${k}.mp3`, seconds: FIXTURE_CLUE_SECONDS }));
    reveal[id] = { file: `fixture-reveal-${id}.mp3`, seconds: FIXTURE_REVEAL_SECONDS };
  }
  return { intro: null, level: {}, clue, reveal, bonus: {}, scoreboard: {}, outro: null };
};
const fixturePlugin = {
  name: 'voiceover-fixture',
  setup(build) {
    build.onLoad({ filter: /search-voiceover-manifest\.json$/ }, () => ({ contents: JSON.stringify(fixtureManifest()), loader: 'json' }));
  },
};

const load = async (entry, { fixture = false } = {}) => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `search-qa-${fixture ? 'fx-' : ''}${path.basename(entry, '.ts')}-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    plugins: fixture ? [stubFonts, fixturePlugin] : [stubFonts],
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  });
  const mod = await import(`file://${outfile}`);
  fs.unlinkSync(outfile);
  return mod;
};

const rows = [];
const check = (name, fn) => {
  try {
    const out = fn(); // returns { ok, detail } or an array of problems
    const problems = Array.isArray(out) ? out : out.ok ? [] : [out.detail];
    const detail = Array.isArray(out) ? (problems.length ? '' : out.note || '') : out.ok ? out.detail : '';
    rows.push({ name, ok: problems.length === 0, detail: problems.length ? problems.slice(0, 4).join('; ') + (problems.length > 4 ? ` (+${problems.length - 4} more)` : '') : detail });
  } catch (e) {
    rows.push({ name, ok: false, detail: `threw: ${e.message}` });
  }
};

const main = async () => {
  const t = await load('src/search/search-timing.ts');
  const d = await load('src/search/search-data.ts');
  const s = await load('src/search/search-sound.ts');
  const bar = await load('src/search/components/SearchBar.tsx');
  const fx = await load('src/search/search-timing.ts', { fixture: true });
  const { TIMELINE, LEVELS, TIME_SCALE, RENDER_TOTAL_FRAMES, locate, buildRoundPlan } = t;
  const { ROUNDS, BONUS } = d;
  const segs = TIMELINE.segments;
  const total = TIMELINE.totalFrames;

  // 1. every frame resolves to a segment: all boundary frames and every 600th frame
  check('frames resolve to a segment', () => {
    const frames = new Set([0, total - 1]);
    segs.forEach((g) => [g.from - 1, g.from, g.from + g.duration - 1, g.from + g.duration].forEach((f) => f >= 0 && f < total && frames.add(f)));
    for (let f = 0; f < total; f += 600) frames.add(f);
    // render-rate frames too (60 fps -> design frames)
    frames.add((RENDER_TOTAL_FRAMES - 1) / TIME_SCALE);
    const bad = [];
    for (const f of frames) {
      const { seg, local } = locate(segs, f);
      if (!seg || f < seg.from || f >= seg.from + seg.duration || local < 0 || local >= seg.duration) bad.push(`frame ${f}`);
    }
    return Object.assign(bad, { note: `${frames.size} frames sampled` });
  });

  // 2. no gaps, no overlaps
  check('no gaps or overlaps', () => {
    const bad = [];
    let cursor = 0;
    segs.forEach((g, i) => {
      if (g.from !== cursor) bad.push(`#${i} ${g.kind} starts ${g.from}, expected ${cursor}`);
      if (!(g.duration > 0)) bad.push(`#${i} ${g.kind} duration ${g.duration}`);
      cursor = g.from + g.duration;
    });
    return Object.assign(bad, { note: `${segs.length} segments` });
  });

  // 3. iris lead frames
  check('iris lead <= next round length', () => {
    const bad = [];
    let leads = 0;
    segs.forEach((g, i) => {
      if (g.kind !== 'round' || !(g.lead > 0)) return;
      leads++;
      const prev = segs[i - 1];
      const plan = buildRoundPlan(g.index);
      if (!prev || prev.kind !== 'iris') bad.push(`R${g.index + 1} has lead ${g.lead} but no iris before it`);
      else if (g.lead > prev.duration) bad.push(`R${g.index + 1} lead ${g.lead} > iris ${prev.duration}`);
      if (g.lead > plan.duration) bad.push(`R${g.index + 1} lead ${g.lead} > round ${plan.duration}`);
      if (g.duration + g.lead !== plan.duration) bad.push(`R${g.index + 1} duration + lead != plan`);
    });
    return Object.assign(bad, { note: `${leads} rounds with a lead` });
  });

  // 4. durations add up
  check('durations add up to totalFrames', () => {
    const sum = segs.reduce((n, g) => n + g.duration, 0);
    const bad = [];
    if (sum !== total) bad.push(`sum ${sum} != totalFrames ${total}`);
    if (RENDER_TOTAL_FRAMES !== Math.round(total * TIME_SCALE)) bad.push(`render frames ${RENDER_TOTAL_FRAMES} != round(${total} x ${TIME_SCALE})`);
    return Object.assign(bad, { note: `${sum} ticks = ${RENDER_TOTAL_FRAMES} frames @ ${rootSettings.fps} fps` });
  });

  // 5. sound files
  const SOUNDS = path.join(ROOT, rootSettings.sound.dir);
  check('sound files exist (public/sounds)', () => {
    const names = new Set(s.CUES.map((c) => c.sfx));
    const music = ['music-base', 'music-l1', 'music-l2'];
    const bad = [];
    [...names, ...music].forEach((n) => {
      const f = path.join(SOUNDS, `${n}.wav`);
      if (!fs.existsSync(f) || fs.statSync(f).size < 100) bad.push(`${n}.wav missing or empty`);
    });
    s.CUES.forEach((c, i) => {
      if (!(c.frame >= 0 && c.frame < total)) bad.push(`cue ${c.sfx} at ${c.frame} is outside the video`);
      if (c.rate !== undefined && !(c.rate > 0)) bad.push(`cue ${c.sfx} has rate ${c.rate}`);
    });
    return Object.assign(bad, { note: `${names.size} sounds + 3 music files, ${s.CUES.length} cues in range` });
  });

  // 6. voiceover files
  check('voiceover files exist (public/voiceover)', () => {
    const dir = path.join(ROOT, 'public', path.basename(rootSettings.voiceover.dir));
    const files = [];
    const walk = (v) => {
      if (!v || typeof v !== 'object') return;
      if (typeof v.file === 'string') files.push(v.file);
      else Object.values(v).forEach(walk);
    };
    walk(voManifest);
    s.VOICE.forEach((v) => files.push(v.file));
    const uniq = [...new Set(files)];
    const bad = uniq.filter((f) => !fs.existsSync(path.join(dir, f))).map((f) => `${f} missing`);
    return Object.assign(bad, { note: uniq.length ? `${uniq.length} clips` : 'manifest empty, 0 clips' });
  });

  // 7. rounds in order with the right level
  check('rounds in order, right level', () => {
    const rounds = segs.filter((g) => g.kind === 'round');
    const bad = [];
    if (!(ROUNDS.length > 0)) bad.push('ROUNDS is empty');
    if (rounds.length !== ROUNDS.length) bad.push(`${rounds.length} round segments for ${ROUNDS.length} rounds`);
    rounds.forEach((g, i) => {
      const want = LEVELS.findIndex((l) => l.name === ROUNDS[i].level);
      if (g.index !== i) bad.push(`segment ${i} is round index ${g.index}`);
      if (ROUNDS[i].id !== i + 1) bad.push(`ROUNDS[${i}].id is ${ROUNDS[i].id}`);
      if (g.levelIndex !== want) bad.push(`R${i + 1} level ${g.levelIndex}, data says ${ROUNDS[i].level}`);
    });
    // a level card sits before the first round of each level, and levels never go back
    segs.forEach((g, i) => {
      if (g.kind !== 'levelCard') return;
      let j = i + 1;
      while (segs[j] && segs[j].kind !== 'round') j++;
      if (!segs[j] || segs[j].levelIndex !== g.levelIndex) bad.push(`level card ${g.levelIndex + 1} is not followed by a round of that level`);
    });
    const cards = segs.filter((g) => g.kind === 'levelCard').map((g) => g.levelIndex);
    if (cards.join() !== LEVELS.map((_, i) => i).join()) bad.push(`level cards are ${cards.join(',')}`);
    for (let i = 1; i < rounds.length; i++) if (rounds[i].levelIndex < rounds[i - 1].levelIndex) bad.push(`level drops at R${i + 1}`);
    return Object.assign(bad, { note: `${rounds.length} rounds, ${LEVELS.map((l) => l.name).join(' > ')}` });
  });

  // 8. bonus puzzles after rounds 10, 20, 30
  check('bonus puzzles after their rounds', () => {
    const bad = [];
    const bonus = segs.map((g, i) => ({ g, i })).filter((x) => x.g.kind === 'bonus');
    const want = cfg.bonus.after.filter((n) => n <= ROUNDS.length);
    if (bonus.length !== want.length) bad.push(`${bonus.length} bonus segments, settings bonus.after gives ${want.length}`);
    if (BONUS.length !== cfg.bonus.after.length) bad.push(`${BONUS.length} puzzles for ${cfg.bonus.after.length} slots`);
    if (BONUS.map((b) => b.afterRound).join() !== cfg.bonus.after.join()) bad.push(`data afterRound is ${BONUS.map((b) => b.afterRound).join(',')}, settings ${cfg.bonus.after.join(',')}`);
    bonus.forEach(({ g, i }, k) => {
      if (g.index !== k) bad.push(`bonus #${k + 1} has index ${g.index}`);
      let j = i - 1;
      while (j >= 0 && segs[j].kind !== 'round') j--;
      const after = j >= 0 ? segs[j].index + 1 : 0;
      if (after !== want[k]) bad.push(`bonus ${k + 1} follows round ${after}, expected ${want[k]}`);
      const between = segs.slice(j + 1, i).map((x) => x.kind).filter((x) => x !== 'reminder' && x !== 'iris');
      if (between.length) bad.push(`bonus ${k + 1} has ${between.join(',')} before it`);
    });
    return Object.assign(bad, { note: bonus.map(({ g, i }) => `B${g.index + 1} after R${segs.slice(0, i).filter((x) => x.kind === 'round').length}`).join(', ') });
  });

  // 9. pacing: the same franchise never repeats within a few rounds
  check('same franchise not within 4 rounds', () => {
    const GAP = 4;
    const bad = [];
    ROUNDS.forEach((r, i) => {
      for (let j = i + 1; j < Math.min(ROUNDS.length, i + GAP); j++) {
        if (ROUNDS[j].from === r.from) bad.push(`R${i + 1} ${r.name} and R${j + 1} ${ROUNDS[j].name} (${r.from})`);
      }
    });
    return Object.assign(bad, { note: `window ${GAP}, ${ROUNDS.length} rounds` });
  });

  // 10. every search finishes typing, holds and slides inside its own slot (task 7a). Slot = gap to the next search's
  //     start; the last search's slot ends a small margin before the reveal. A clue that does not fit even at
  //     typing.fastestTicksPerChar FAILS here; the clue text and searchAt are not touched, only reported.
  check('searches finish typing inside their slot', () => {
    const fastest = cfg.typing.fastestTicksPerChar;
    const { searchSlots, searchUnits } = t;
    const tooLong = [];
    const eps = 1e-9;
    let worst = 0;
    ROUNDS.forEach((r, i) => {
      const plan = buildRoundPlan(i);
      const slots = searchSlots(i);
      r.searches.forEach((text, k) => {
        const need = searchUnits(text.length) * plan.typeTicks[k]; // ticks used at the speed the plan chose
        worst = Math.max(worst, need / slots[k]);
        if (need > slots[k] + eps) {
          tooLong.push({ id: r.id, clue: k + 1, len: text.length, slot: slots[k], over: need - slots[k], maxLen: Math.floor(slots[k] / fastest) - (searchUnits(0)) });
        }
        // typing, hold and slide, from the plan's own start tick, must end before the next start (or the reveal)
        const end = plan.searchAt[k] + need;
        const limit = k + 1 < plan.searchAt.length ? plan.searchAt[k + 1] : plan.revealAt;
        if (end > limit + eps && !tooLong.some((b) => b.id === r.id && b.clue === k + 1)) tooLong.push({ id: r.id, clue: k + 1, len: text.length, slot: slots[k], over: end - limit, maxLen: -1 });
      });
    });
    const problems = [];
    if (tooLong.length) {
      problems.push(`${tooLong.length} clues too long at ${fastest} ticks/char: ` + tooLong.map((b) => `R${b.id} clue ${b.clue} (${b.len} chars, slot ${b.slot} ticks, max ${b.maxLen} chars)`).join(', '));
    }
    return Object.assign(problems, { note: `${ROUNDS.reduce((n, r) => n + r.searches.length, 0)} clues, slowest fit ${(worst * 100).toFixed(0)}% of its slot, fastest ${fastest} ticks/char` });
  });

  // 11. search-timing.ts mirrors the SearchBar constants it cannot import (the component loads fonts)
  check('timing HOLD/SLIDE match SearchBar', () => {
    const p = [];
    if (t.HOLD_CHARS !== bar.HOLD_CHARS) p.push(`HOLD_CHARS timing ${t.HOLD_CHARS} vs SearchBar ${bar.HOLD_CHARS}`);
    if (t.SLIDE_CHARS !== bar.SLIDE_CHARS) p.push(`SLIDE_CHARS timing ${t.SLIDE_CHARS} vs SearchBar ${bar.SLIDE_CHARS}`);
    return Object.assign(p, { note: `hold ${bar.HOLD_CHARS}, slide ${bar.SLIDE_CHARS}` });
  });

  // 12. think phase, real layout (no clips today): a fixed 5 s countdown after the clues (task: think phase)
  const thinkTicksWanted = Math.round(cfg.think.seconds * t.FPS);
  const fmt = (ticks) => `${Math.floor(ticks / t.FPS / 60)}:${String(Math.round((ticks / t.FPS) % 60)).padStart(2, '0')}`;
  const thinkChecks = (T, label, clipTicks) => {
    const bad = [];
    const fastest = cfg.typing.fastestTicksPerChar;
    ROUNDS.forEach((r, i) => {
      const p = T.buildRoundPlan(i);
      const tag = `R${r.id}`;
      if (Math.abs(p.thinkFrames - thinkTicksWanted) > 1) bad.push(`${tag} think ${p.thinkFrames} ticks, wanted ${thinkTicksWanted}`);
      if (p.revealAt !== p.thinkStart + p.thinkFrames) bad.push(`${tag} reveal != thinkStart + thinkFrames`);
      if (clipTicks !== undefined && p.thinkStart < p.searchAt[p.searchAt.length - 1] + clipTicks) bad.push(`${tag} think starts before the last clip ends`);
      // all clues are typed before the countdown starts
      const L = r.searches.length - 1;
      const lastEnd = p.searchAt[L] + p.typeTicks[L] * r.searches[L].length;
      if (lastEnd > p.thinkStart + 1e-9) bad.push(`${tag} last clue types until ${Math.round(lastEnd)}, think starts ${p.thinkStart}`);
      r.searches.forEach((text, k) => {
        const slot = T.searchSlots(i)[k];
        if (p.typeTicks[k] < fastest - 1e-9) bad.push(`${tag} clue ${k + 1} types faster than ${fastest}`);
        if (p.typeTicks[k] * text.length > slot + 1e-9) bad.push(`${tag} clue ${k + 1} types past its slot`);
        if (T.searchUnits(text.length) * p.typeTicks[k] > slot + 1e-9) bad.push(`${tag} clue ${k + 1} does not hold and slide inside its slot`);
      });
      if (!(p.hintAt >= p.thinkStart && p.hintAt < p.revealAt)) bad.push(`${tag} hint is outside the think window`);
      if (p.duration !== p.revealAt + p.holdFrames + p.exitFrames) bad.push(`${tag} duration != reveal + hold + exit`);
    });
    const segs2 = T.TIMELINE.segments;
    let cur = 0;
    segs2.forEach((g, i) => {
      if (g.from !== cur) bad.push(`${label} segment #${i} ${g.kind} starts ${g.from}, expected ${cur}`);
      cur = g.from + g.duration;
    });
    if (cur !== T.TIMELINE.totalFrames) bad.push(`${label} durations add up to ${cur}, totalFrames ${T.TIMELINE.totalFrames}`);
    return Object.assign(bad, { note: `${ROUNDS.length} rounds, video ${fmt(T.TIMELINE.totalFrames)} (${T.TIMELINE.totalFrames} ticks)` });
  };
  check('think phase: fixed layout (no clips)', () => thinkChecks(t, 'fixed', undefined));
  check(`think phase: voiced layout (fixture, ${FIXTURE_CLUE_SECONDS} s clues)`, () => thinkChecks(fx, 'voiced', Math.ceil(FIXTURE_CLUE_SECONDS * fx.FPS)));

  // 13-15. real voiceover (manifest from `npm run search:voice`); these pass trivially while the manifest is empty
  const VO_AT = rootSettings.voiceover.offsetFrames;
  const secsOf = (e) => (e && Number(e.seconds) > 0 ? Math.ceil(Number(e.seconds) * t.FPS) : null);
  check('voiceover: each hint clip ends before the riser, inside the think window', () => {
    const bad = [];
    const riser = rootSettings.sound.panic.riserFrames;
    ROUNDS.forEach((r, i) => {
      const f = secsOf(voManifest.hint && voManifest.hint[r.id]);
      if (f == null) return;
      const p = buildRoundPlan(i);
      if (VO_AT + f > p.thinkFrames - riser) bad.push(`R${r.id} hint ${f} ticks (+${VO_AT}) > ${p.thinkFrames - riser}`);
    });
    return Object.assign(bad, { note: `${Object.keys(voManifest.hint || {}).length} hint clips` });
  });
  check('voiceover: each bonus intro ends before its bonus clock starts', () => {
    const bad = [];
    BONUS.forEach((b, i) => {
      const f = secsOf(voManifest.bonusIntro && voManifest.bonusIntro[i + 1]);
      if (f == null) return;
      const p = t.buildBonusPlan(i);
      if (VO_AT + f > p.clockStart) bad.push(`bonus ${i + 1} intro ends at ${VO_AT + f}, clock starts ${p.clockStart}`);
    });
    return Object.assign(bad, { note: `${Object.keys(voManifest.bonusIntro || {}).length} bonus intros` });
  });
  check('voiceover: every clip starts and ends inside its own scene', () => {
    const bad = [];
    s.VOICE.forEach((v) => {
      const seg = segs.find((g) => v.frame >= g.from - (g.lead || 0) && v.frame < g.from + g.duration);
      if (!seg) { bad.push(`${v.file} starts outside the video`); return; }
      const end = v.frame + v.frames;
      if (end > seg.from + seg.duration) bad.push(`${v.file} (${seg.kind}${seg.index !== undefined ? ' ' + (seg.index + 1) : ''}) ends ${end - (seg.from + seg.duration)} ticks after its scene`);
    });
    return Object.assign(bad, { note: `${s.VOICE.length} clips` });
  });

  const w = Math.max(...rows.map((r) => r.name.length));
  console.log('\n  search:qa\n');
  rows.forEach((r) => console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${r.detail}`));
  const failed = rows.filter((r) => !r.ok).length;
  console.log(`\n  ${rows.length - failed}/${rows.length} checks passed\n`);
  process.exit(failed ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
