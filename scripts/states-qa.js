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
          "export * as T from './src/states/state-timing.ts'; export * as S from './src/states/state-sound.ts'; export * as D from './src/states/states-data.ts';",
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
  const { T, S, D } = await load();
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
    ['level', 'reveal', 'bonus', 'bonusq', 'scoreboard'].forEach((k) => Object.entries(man[k] || {}).forEach(([id, e]) => take(e, `${k}.${id}`)));
    S.STATE_VOICE.forEach((v, i) => files.push([`plan#${i}`, v.file]));
    files.forEach(([label, f]) => {
      if (!fs.existsSync(path.join(voiceDir, f))) problems.push(`${label}: missing ${path.relative(ROOT, path.join(voiceDir, f))}`);
    });
    const n = files.filter(([l]) => !l.startsWith('plan#')).length;
    return { problems, info: n === 0 && S.STATE_VOICE.length === 0 ? 'manifest empty: 0 clips to check (passes)' : `${n} manifest clips, ${S.STATE_VOICE.length} placed in the plan, all present` };
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
