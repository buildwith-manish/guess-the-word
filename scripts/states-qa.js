#!/usr/bin/env node
/**
 * scripts/states-qa.js  (npm run states:qa)
 * Structural checks on the Video 4 timeline and audio plan. Bundles src/states/state-timing.ts,
 * state-sound.ts and states-data.ts with esbuild (same approach as states-timeline.js), so it checks the SAME
 * modules the composition renders from. Prints a table and exits 1 if any check fails.
 * Nothing is rendered or listened to: it proves the plan is consistent, not that it looks or sounds right.
 *
 * Checks
 *   1 frames resolve        every boundary frame (each segment's first, second, last-1 and last frame, plus 0 and
 *                           total-1) and every 600th design frame resolves, via locate(), to the segment that
 *                           contains it; the last output frame maps inside the timeline
 *   2 no gaps / overlaps    first segment starts at 0, every segment starts where the previous one ends
 *   3 iris lead             for each iris followed by a question: lead <= iris duration, lead <= the question's
 *                           remaining length, and question length + lead = buildQuestionPlan duration
 *   4 durations add up      sum of durations = TIMELINE.totalFrames = last.from + last.duration;
 *                           RENDER_TOTAL_FRAMES = round(totalFrames x TIME_SCALE)
 *   5 sound files           every sfx in STATE_CUES has public/sounds/<sfx>.wav and an entry in sound-manifest.json;
 *                           the three music loops (named in StateSoundtrack.tsx) exist
 *   6 voiceover files       every file named in states-voiceover-manifest.json and in STATE_VOICE exists in
 *                           public/<voiceover dir> (an empty manifest passes with 0 clips)
 *   8 capital row fits      for all 50 states, at every card width the reveal uses (WIDTH x REVEAL.cardW and S.resultW,
 *                           both capped to the safe area), the capital row after capital-fit.ts has scaled / stacked it
 *                           is re-measured with the real Poppins files (fontkit) and must be <= innerW (card width minus
 *                           2 x padX); the state name (Anton) and the key chip + voice bars are checked the same way;
 *                           prints the tightest state and its scale factor
 *   7 question order        the 50 question segments are indices 0..49 in order, ids 1..50, level = states-data level,
 *                           levels never go back, and a level card comes right before each level's first question
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MUSIC_FILES = ['music-base', 'music-l1', 'music-l2']; // as named in src/states/StateSoundtrack.tsx

const load = async () => {
  const esbuild = require('esbuild');
  // inside the repo, so the bundle can resolve node_modules for any package it leaves external
  const dir = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.states-qa-'));
  const outfile = path.join(dir, 'bundle.cjs');
  try {
    await esbuild.build({
      stdin: {
        contents:
          "export * as T from './src/states/state-timing.ts'; export * as S from './src/states/state-sound.ts'; export * as D from './src/states/states-data.ts'; export * as C from './src/states/capital-fit.ts'; export * as ST from './src/style.ts';",
        resolveDir: ROOT,
        loader: 'ts',
      },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile,
      packages: 'external',
      jsx: 'automatic',
      logLevel: 'silent',
      resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    });
    return require(outfile);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const rows = [];
const check = (name, fn) => {
  try {
    const r = fn();
    rows.push({ name, ok: r.problems.length === 0, detail: r.problems.length === 0 ? r.info : `${r.problems.length} problem(s): ${r.problems.slice(0, 3).join('; ')}${r.problems.length > 3 ? ' ...' : ''}`, problems: r.problems });
  } catch (e) {
    rows.push({ name, ok: false, detail: `threw: ${e && e.message ? e.message : e}`, problems: [String(e)] });
  }
};

(async () => {
  const { T, S, D, C, ST } = await load();
  const segs = T.TIMELINE.segments;
  const total = T.TIMELINE.totalFrames;
  const soundDir = path.join(ROOT, 'public', 'sounds');
  const voiceDir = path.join(ROOT, 'public', S.VOICE_DIR.replace(/^public\//, ''));

  check('1 frames resolve', () => {
    const problems = [];
    const frames = new Set([0, total - 1]);
    segs.forEach((s) => {
      [s.from, s.from + 1, s.from + s.duration - 2, s.from + s.duration - 1].forEach((f) => {
        if (f >= 0 && f < total) frames.add(f);
      });
    });
    for (let f = 0; f < total; f += 600) frames.add(f);
    for (const f of frames) {
      const { seg, local } = T.locate(segs, f);
      if (!seg) problems.push(`frame ${f}: no segment`);
      else if (!(f >= seg.from && f < seg.from + seg.duration)) problems.push(`frame ${f}: resolved to ${seg.kind}@${seg.from}+${seg.duration}`);
      else if (local !== f - seg.from) problems.push(`frame ${f}: local ${local} != ${f - seg.from}`);
    }
    const lastOut = T.RENDER_TOTAL_FRAMES - 1;
    if (Math.floor(lastOut / T.TIME_SCALE) >= total) problems.push(`last output frame ${lastOut} maps past the timeline`);
    return { problems, info: `${frames.size} frames sampled, all resolve to the containing segment` };
  });

  check('2 no gaps or overlaps', () => {
    const problems = [];
    if (segs.length === 0) problems.push('no segments');
    else if (segs[0].from !== 0) problems.push(`first segment starts at ${segs[0].from}`);
    segs.forEach((s, i) => {
      if (!(s.duration > 0)) problems.push(`#${i} ${s.kind} duration ${s.duration}`);
      if (i > 0) {
        const end = segs[i - 1].from + segs[i - 1].duration;
        if (s.from !== end) problems.push(`#${i} ${s.kind} starts at ${s.from}, previous ends at ${end}`);
      }
    });
    return { problems, info: `${segs.length} segments back to back from 0` };
  });

  check('3 iris lead within question', () => {
    const problems = [];
    let n = 0;
    let maxLead = 0;
    segs.forEach((s, i) => {
      const next = segs[i + 1];
      if (s.kind !== 'iris' || !next || next.kind !== 'question') return;
      n++;
      const lead = next.lead ?? 0;
      maxLead = Math.max(maxLead, lead);
      if (lead > s.duration) problems.push(`iris@${s.from}: lead ${lead} > wipe ${s.duration}`);
      if (lead > next.duration) problems.push(`Q${next.index + 1}: lead ${lead} > question length ${next.duration}`);
      const plan = T.buildQuestionPlan(next.index, S.questionHasTitle(next.index));
      if (next.duration + lead !== plan.duration) problems.push(`Q${next.index + 1}: segment ${next.duration} + lead ${lead} != plan ${plan.duration}`);
    });
    segs.forEach((s) => {
      if (s.kind === 'question' && (s.lead ?? 0) > 0) {
        const i = segs.indexOf(s);
        if (!(segs[i - 1] && segs[i - 1].kind === 'iris')) problems.push(`Q${s.index + 1}: lead ${s.lead} but no wipe before it`);
      }
    });
    return { problems, info: `${n} wipes into a question, max lead ${maxLead} ticks, all fit` };
  });

  check('4 durations add up', () => {
    const problems = [];
    const sum = segs.reduce((a, s) => a + s.duration, 0);
    if (sum !== total) problems.push(`sum ${sum} != totalFrames ${total}`);
    const last = segs[segs.length - 1];
    if (last.from + last.duration !== total) problems.push(`last segment ends at ${last.from + last.duration} != ${total}`);
    const render = Math.round(total * T.TIME_SCALE);
    if (render !== T.RENDER_TOTAL_FRAMES) problems.push(`RENDER_TOTAL_FRAMES ${T.RENDER_TOTAL_FRAMES} != ${render}`);
    return { problems, info: `sum ${sum} = totalFrames ${total} ticks = ${T.RENDER_TOTAL_FRAMES} output frames (x${T.TIME_SCALE})` };
  });

  check('5 sound files exist', () => {
    const problems = [];
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'sound-manifest.json'), 'utf8'));
    const sfx = [...new Set(S.STATE_CUES.map((c) => c.sfx))].sort();
    sfx.forEach((n) => {
      if (!fs.existsSync(path.join(soundDir, `${n}.wav`))) problems.push(`missing public/sounds/${n}.wav`);
      if (typeof manifest[n] !== 'number') problems.push(`${n} not in sound-manifest.json`);
    });
    MUSIC_FILES.forEach((n) => {
      if (!fs.existsSync(path.join(soundDir, `${n}.wav`))) problems.push(`missing public/sounds/${n}.wav`);
    });
    const bad = S.STATE_CUES.filter((c) => !Number.isFinite(c.frame) || c.frame < 0 || c.frame >= total);
    if (bad.length) problems.push(`${bad.length} cue(s) outside 0..${total - 1}, first: ${bad[0].sfx}@${bad[0].frame}`);
    return { problems, info: `${S.STATE_CUES.length} cues, ${sfx.length} distinct sounds + ${MUSIC_FILES.length} music loops, all present` };
  });

  check('6 voiceover files exist', () => {
    const problems = [];
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'states', 'states-voiceover-manifest.json'), 'utf8'));
    const files = [];
    const take = (e, label) => {
      if (e && e.file) files.push([label, e.file]);
    };
    take(man.intro, 'intro');
    take(man.outro, 'outro');
    ['level', 'question', 'reveal', 'bonus', 'bonusq', 'scoreboard'].forEach((k) => Object.entries(man[k] || {}).forEach(([id, e]) => take(e, `${k}.${id}`)));
    S.STATE_VOICE.forEach((v, i) => files.push([`plan#${i}`, v.file]));
    files.forEach(([label, f]) => {
      if (!fs.existsSync(path.join(voiceDir, f))) problems.push(`${label}: missing ${path.relative(ROOT, path.join(voiceDir, f))}`);
    });
    const n = files.filter(([l]) => !l.startsWith('plan#')).length;
    return { problems, info: n === 0 && S.STATE_VOICE.length === 0 ? 'manifest empty: 0 clips to check (passes)' : `${n} manifest clips, ${S.STATE_VOICE.length} placed in the plan, all present` };
  });

  check('6b voiceover order: question clip -> clock; stamp -> reveal clip (and the segment holds it)', () => {
    const problems = [];
    const VO = require(path.join(ROOT, 'settings.json')).voiceover;
    let withQ = 0;
    let withR = 0;
    T.QUESTIONS.forEach((q, i) => {
      const p = T.buildQuestionPlan(i, false);
      if (p.questionVo) {
        withQ++;
        if (p.questionVo.start < p.drawStart) problems.push(`Q${q.id}: question clip starts before the outline`);
        if (p.timerStart < p.questionVo.start + p.questionVo.frames) problems.push(`Q${q.id}: clock starts at ${p.timerStart}, before the question clip ends (${p.questionVo.start + p.questionVo.frames})`);
      }
      if (p.vo) {
        withR++;
        if (p.vo.start < p.stamp) problems.push(`Q${q.id}: reveal clip starts before the answer lands`);
        if (p.vo.start + p.vo.frames + VO.tailFrames > p.exit) problems.push(`Q${q.id}: reveal clip is cut off, hold ${p.hold} too short`);
      }
    });
    for (let slot = 0; slot < T.BONUS_PUZZLES.length; slot++) {
      const bq = T.voiceBonusQuestion(slot + 1);
      const ba = T.voiceBonus(slot + 1);
      const start = T.bonusClockStart(slot);
      const end = start + T.bonusClockFrames(slot);
      if (bq && start < VO.offsetFrames + bq.frames) problems.push(`bonus ${slot + 1}: clock starts before the question clip ends`);
      if (ba && T.bonusSegmentFrames(slot) < end + VO.offsetFrames + ba.frames) problems.push(`bonus ${slot + 1}: answer clip is cut off by the segment end`);
    }
    return { problems, info: `${withQ} question clips gate the clock, ${withR} reveal clips start after the stamp and fit in the hold, ${T.BONUS_PUZZLES.length} bonuses checked` };
  });

  check('6c visuals follow the voice: outline = question clip, name / capital when spoken', () => {
    const problems = [];
    let n = 0;
    T.QUESTIONS.forEach((q, i) => {
      const p = T.buildQuestionPlan(i, false);
      if (p.questionVo) {
        n++;
        if (p.readyStart < p.questionVo.start + p.questionVo.frames) problems.push(`Q${q.id}: outline ends (${p.readyStart}) before the question clip does`);
        if (p.timerStart <= p.readyStart) problems.push(`Q${q.id}: no get-ready beat before the clock`);
      }
      if (p.vo) {
        if (p.nameAt < p.stamp || p.nameAt > p.vo.start + p.vo.frames) problems.push(`Q${q.id}: name at ${p.nameAt} outside the reveal clip`);
        if (p.capitalAt < p.nameAt || p.capitalAt > p.vo.start + p.vo.frames) problems.push(`Q${q.id}: capital at ${p.capitalAt} outside the reveal clip`);
      }
    });
    return { problems, info: `${n} outlines end with their question clip, name / capital land inside the reveal clips` };
  });

  check('7 questions in video order', () => {
    const problems = [];
    const qs = segs.filter((s) => s.kind === 'question');
    if (qs.length !== D.STATES.length) problems.push(`${qs.length} question segments, ${D.STATES.length} states`);
    let lastLevel = -1;
    qs.forEach((s, i) => {
      if (s.index !== i) problems.push(`question #${i} has index ${s.index}`);
      const st = D.STATES[i];
      const q = T.QUESTIONS[i];
      if (!st || !q) return problems.push(`no state/question ${i}`);
      if (q.id !== i + 1) problems.push(`Q${i + 1}: id ${q.id}`);
      if (q.key !== st.key) problems.push(`Q${i + 1}: key ${q.key} != ${st.key}`);
      if (q.level !== st.level) problems.push(`Q${i + 1} ${st.key}: level ${q.level} != states-data ${st.level}`);
      const li = T.levelIndexOf(q);
      if (li < lastLevel) problems.push(`Q${i + 1}: level goes back (${q.level})`);
      if (li > lastLevel) {
        const at = segs.indexOf(s);
        // a level card sits right before the first question of a level (a wipe may sit between them)
        let j = at - 1;
        while (j >= 0 && (segs[j].kind === 'iris' || segs[j].kind === 'reminder')) j--;
        const card = segs[j];
        if (!(card && card.kind === 'levelCard' && card.levelIndex === li)) problems.push(`Q${i + 1}: no level card for ${q.level} before it`);
      }
      lastLevel = li;
    });
    const per = T.LEVELS.map((l) => `${l.name} ${qs.filter((s) => T.QUESTIONS[s.index].level === l.name).length}`).join(', ');
    return { problems, info: `${qs.length} questions in order 1..${qs.length}, levels ascend (${per})` };
  });


  check('8 capital row fits the card (all 50 states)', () => {
    const problems = [];
    const fontkit = require('fontkit');
    const fontFile = { 'Poppins-600': 'Poppins-SemiBold.woff2', 'Poppins-800': 'Poppins-ExtraBold.woff2', 'Anton-400': 'Anton-Regular.woff2' };
    const fonts = {};
    const font = (family, weight) => {
      const k = `${family}-${weight}`;
      if (!fonts[k]) fonts[k] = fontkit.openSync(path.join(ROOT, 'public', 'fonts', fontFile[k]));
      return fonts[k];
    };
    // same signature as the render's measureText: width of `text` in px (kerning on, letter-spacing added per glyph)
    const measure = (text, o) => {
      const fam = o.fontFamily.includes('Anton') ? 'Anton' : 'Poppins';
      const f = font(fam, fam === 'Anton' ? 400 : o.fontWeight);
      const run = f.layout(text);
      return (run.advanceWidth * o.fontSize) / f.unitsPerEm + o.letterSpacing * [...text].length;
    };
    const body = ST.FONTS.body;
    const display = ST.FONTS.display;
    // layout constants read from the card source so the check follows the card
    const src = fs.readFileSync(path.join(ROOT, 'src', 'states', 'components', 'AnswerCard.tsx'), 'utf8');
    const num = (k) => Number(new RegExp(`${k}:\\s*([0-9.]+)`).exec(src.split('const LOOK')[1])[1]);
    const LOOK = { padX: num('padX'), chipFont: num('chipFont'), chipSpacing: num('chipSpacing'), chipPadX: num('chipPadX'), barsW: num('barsW'), barsGap: num('barsGap') };
    const maxW = T.WIDTH - 2 * ST.SAFE_X;
    const revealSrc = fs.readFileSync(path.join(ROOT, 'src', 'states', 'scenes', 'StateRound.tsx'), 'utf8');
    const cardFrac = Number(/REVEAL\s*=\s*\{\s*cardW:\s*([0-9.]+)/.exec(revealSrc)[1]);
    const widths = [
      { label: `reveal column ${(T.WIDTH * cardFrac).toFixed(0)}px`, box: { x: ST.SAFE_X, w: T.WIDTH * cardFrac } },
      { label: `default S.resultW ${ST.S.resultW}px`, box: undefined },
    ];
    const lines = [];
    let tight = null;
    widths.forEach((cfg) => {
      const cardW = Math.min(cfg.box ? cfg.box.w : ST.S.resultW, maxW);
      const innerW = cardW - 2 * ST.px(LOOK.padX);
      if (cfg.box && cfg.box.x + cardW > T.WIDTH - ST.SAFE_X + 0.01) problems.push(`${cfg.label}: card right edge ${(cfg.box.x + cardW).toFixed(1)} past the safe margin ${T.WIDTH - ST.SAFE_X}`);
      if (cfg.box && cfg.box.x < ST.SAFE_X - 0.01) problems.push(`${cfg.label}: card left edge inside the safe margin`);
      let stacked = 0;
      D.STATES.forEach((st) => {
        const fit = C.fitCapitalRow({ label: 'CAPITAL', capital: st.capital, innerW, fontFamily: body, measure });
        // independent re-measure of what is painted: label + margin + value inline, or the wider of the two stacked lines
        const K = fit.valueSize / ST.px(C.CAPITAL_LOOK.font);
        const labelW = measure('CAPITAL', { fontFamily: body, fontWeight: C.CAPITAL_LOOK.labelWeight, fontSize: fit.labelSize, letterSpacing: fit.labelSpacing });
        const valueW = measure(st.capital, { fontFamily: body, fontWeight: C.CAPITAL_LOOK.valueWeight, fontSize: fit.valueSize, letterSpacing: 0 });
        const painted = fit.mode === 'inline' ? labelW + fit.labelMargin + valueW : Math.max(labelW, valueW);
        if (fit.mode === 'stacked') stacked++;
        if (painted > innerW + 0.01) problems.push(`${st.key} ${st.capital} @ ${cfg.label}: capital row ${painted.toFixed(1)}px > innerW ${innerW.toFixed(1)}px`);
        if (fit.mode === 'inline' && fit.scale < C.CAPITAL_LOOK.minScale - 1e-9) problems.push(`${st.key} ${st.capital}: inline scale ${fit.scale.toFixed(3)} below the minimum`);
        if (fit.mode === 'stacked' && fit.scale < C.CAPITAL_LOOK.minScale - 1e-9) problems.push(`${st.key} ${st.capital} @ ${cfg.label}: stacked value scale ${fit.scale.toFixed(3)} below the minimum`);
        if (fit.height <= 0 || !Number.isFinite(fit.height)) problems.push(`${st.key}: bad reserved height ${fit.height}`);
        const ratio = painted / innerW;
        if (!tight || ratio > tight.ratio) tight = { ratio, st, fit, cfg: cfg.label, painted, innerW };
        // state name (Anton): sized by fitNameSize; re-measured at its flash peak (scale 1 + NAME_LOOK.flash) it must still fit
        const name = st.name.toUpperCase();
        const nameSize = C.fitNameSize(name, innerW, display, measure).size;
        const nameW = measure(name, { fontFamily: display, fontWeight: 400, fontSize: nameSize, letterSpacing: 0 }) * (1 + C.NAME_LOOK.flash);
        if (nameW > innerW + 0.01) problems.push(`${st.key} name ${st.name} @ ${cfg.label}: ${nameW.toFixed(1)}px > innerW ${innerW.toFixed(1)}px`);
      });
      // key chip vs voice bars: chip is centred, bars sit in the right inset; they must not touch for any key
      D.STATES.forEach((st) => {
        const chipW = measure(st.key, { fontFamily: body, fontWeight: 800, fontSize: ST.px(LOOK.chipFont), letterSpacing: ST.px(LOOK.chipSpacing) }) + 2 * ST.px(LOOK.chipPadX);
        const b = C.fitVoiceBars(cardW, chipW, ST.px(LOOK.padX * 0.6), ST.px(LOOK.barsW), ST.px(LOOK.barsGap));
        const barsLeft = cardW - ST.px(LOOK.padX * 0.6) - b.width;
        const chipRight = cardW / 2 + chipW / 2;
        if (b.show && barsLeft < chipRight + 1) problems.push(`${st.key} @ ${cfg.label}: voice bars (left ${barsLeft.toFixed(1)}) touch the chip (right ${chipRight.toFixed(1)})`);
        if (!b.show) problems.push(`${st.key} @ ${cfg.label}: voice bars hidden (no room beside the chip)`);
      });
      lines.push(`${cfg.label}: innerW ${innerW.toFixed(0)}px, ${stacked} stacked`);
    });
    // stress: the stacked fallback is not reached at the two real widths, so prove it on a deliberately narrow card
    const narrowInner = 520;
    let nStack = 0;
    D.STATES.forEach((st) => {
      const fit = C.fitCapitalRow({ label: 'CAPITAL', capital: st.capital, innerW: narrowInner, fontFamily: body, measure });
      const labelW = measure('CAPITAL', { fontFamily: body, fontWeight: C.CAPITAL_LOOK.labelWeight, fontSize: fit.labelSize, letterSpacing: fit.labelSpacing });
      const valueW = measure(st.capital, { fontFamily: body, fontWeight: C.CAPITAL_LOOK.valueWeight, fontSize: fit.valueSize, letterSpacing: 0 });
      const painted = fit.mode === 'inline' ? labelW + fit.labelMargin + valueW : Math.max(labelW, valueW);
      if (fit.mode === 'stacked') nStack++;
      if (painted > narrowInner + 0.01) problems.push(`stress ${st.key} ${st.capital}: ${painted.toFixed(1)}px > ${narrowInner}px (${fit.mode})`);
    });
    if (nStack === 0) problems.push('stress: no capital stacked at innerW 520, the stacked branch is untested');
    lines.push(`stress innerW ${narrowInner}px: ${nStack} stacked, all fit`);
    const t = tight;
    const info = `${D.STATES.length} capitals x ${widths.length} widths fit; ${lines.join('; ')}; tightest: ${t.st.key} ${t.st.capital} @ ${t.cfg}, ${t.fit.mode}, scale ${t.fit.scale.toFixed(3)}, ${t.painted.toFixed(0)}/${t.innerW.toFixed(0)}px (${(t.ratio * 100).toFixed(1)}%)`;
    return { problems, info };
  });

  // table
  const w = Math.max(...rows.map((r) => r.name.length));
  console.log('\n  states:qa');
  console.log(`  ${'check'.padEnd(w)}  result  detail`);
  console.log(`  ${'-'.repeat(w)}  ------  ${'-'.repeat(60)}`);
  rows.forEach((r) => console.log(`  ${r.name.padEnd(w)}  ${(r.ok ? 'PASS' : 'FAIL').padEnd(6)}  ${r.detail}`));
  const failed = rows.filter((r) => !r.ok);
  console.log(`\n  ${rows.length - failed.length}/${rows.length} checks passed${failed.length ? ' - FAILED' : ''}\n`);
  if (failed.length) {
    failed.forEach((r) => r.problems.forEach((p) => console.log(`  [${r.name}] ${p}`)));
    process.exit(1);
  }
})().catch((e) => {
  console.error('states:qa crashed:', e && e.stack ? e.stack : e);
  process.exit(2);
});
