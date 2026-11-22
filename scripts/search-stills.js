#!/usr/bin/env node
/**
 * scripts/search-stills.js
 * Picks review frames from the real TIMELINE and plans (nothing hard-coded) and renders them
 * with `remotion still SearchHistory` into out/stills/.
 *
 * Frames: the hook; per level (first round of that level): level card, typing, mid-clock, hint,
 * reveal; one bonus (mid-clock); the scoreboard.
 *
 * Usage:
 *   npm run search:stills            # list, then render every still
 *   npm run search:stills -- --list  # list only
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out', 'stills');
const LIST_ONLY = process.argv.includes('--list');

const load = async (entry) => {
  const esbuild = require('esbuild');
  const outfile = path.join(os.tmpdir(), `search-stills-${path.basename(entry, '.ts')}-${process.pid}.mjs`);
  await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  });
  const mod = await import(`file://${outfile}`);
  fs.unlinkSync(outfile);
  return mod;
};

const main = async () => {
  const t = await load('src/search/search-timing.ts');
  const d = await load('src/search/search-data.ts');
  const { TIMELINE, LEVELS, TIME_SCALE, FPS, RENDER_TOTAL_FRAMES, buildRoundPlan, buildBonusPlan } = t;
  const { ROUNDS, BONUS } = d;
  const segs = TIMELINE.segments;

  /** design frame -> 60 fps output frame */
  const out = (f) => Math.min(RENDER_TOTAL_FRAMES - 1, Math.max(0, Math.round(f * TIME_SCALE)));
  const stills = []; // { label, design }

  const hook = segs.find((s) => s.kind === 'hook');
  if (hook) stills.push({ label: 'hook', design: hook.from + hook.duration * 0.5 });

  LEVELS.forEach((level, li) => {
    const card = segs.find((s) => s.kind === 'levelCard' && s.levelIndex === li);
    const roundSeg = segs.find((s) => s.kind === 'round' && s.levelIndex === li);
    const name = level.name.toLowerCase();
    if (card) stills.push({ label: `${name}-levelcard`, design: card.from + card.duration * 0.5 });
    if (!roundSeg) return;
    const plan = buildRoundPlan(roundSeg.index);
    // plan ticks are from the start of the round; the scene's local 0 is plan tick `lead`
    const abs = (planTick) => roundSeg.from + (planTick - (roundSeg.lead || 0));
    const len = ROUNDS[roundSeg.index].searches[1].length;
    const typing = plan.searchAt[1] + (plan.typeTicks[1] * len) / 2; // half way through clue 2
    const thinkStart = plan.thinkStart;
    const think2 = plan.thinkStart + 2 * FPS; // two seconds into the countdown
    const reveal = plan.revealAt + plan.holdFrames / 2; // middle of the answer hold
    stills.push({ label: `${name}-midclue`, design: abs(typing) });
    stills.push({ label: `${name}-thinkstart`, design: abs(thinkStart + 3) });
    stills.push({ label: `${name}-think2s`, design: abs(think2) });
    stills.push({ label: `${name}-reveal`, design: abs(reveal) });
  });

  const bonusSeg = segs.filter((s) => s.kind === 'bonus')[Math.floor(BONUS.length / 2)];
  if (bonusSeg) {
    const b = buildBonusPlan(bonusSeg.index);
    stills.push({ label: `bonus${bonusSeg.index + 1}-midclock`, design: bonusSeg.from + b.clockStart + b.clockFrames / 2 });
  }
  const sb = segs.find((s) => s.kind === 'scoreboard');
  if (sb) stills.push({ label: 'scoreboard', design: sb.from + sb.duration * 0.7 });

  stills.sort((a, b) => a.design - b.design);
  const rows = stills.map((s, i) => ({
    file: `${String(i + 1).padStart(2, '0')}-${s.label}.png`,
    label: s.label,
    design: Math.round(s.design),
    frame: out(s.design),
  }));

  console.log(`\n  search stills: ${rows.length} frames (composition SearchHistory, ${RENDER_TOTAL_FRAMES} frames @ 60 fps)\n`);
  console.log('  file                          frame   time');
  rows.forEach((r) => {
    const sec = r.design / FPS;
    const tc = `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')}`;
    console.log(`  ${r.file.padEnd(28)} ${String(r.frame).padStart(6)}   ${tc}`);
  });

  if (LIST_ONLY) {
    console.log('\n  --list: nothing rendered.\n');
    return;
  }
  const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'remotion.cmd' : 'remotion');
  if (!fs.existsSync(bin)) {
    console.log('\n  remotion CLI not found (run npm install). Listed only.\n');
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  let failed = 0;
  rows.forEach((r) => {
    const target = path.join('out', 'stills', r.file);
    process.stdout.write(`  rendering ${r.file} ... `);
    const res = spawnSync(bin, ['still', 'SearchHistory', target, `--frame=${r.frame}`], { cwd: ROOT, stdio: 'pipe' });
    if (res.status === 0) console.log('ok');
    else {
      failed++;
      console.log('FAILED');
      const msg = String(res.stderr || res.stdout || '').trim().split('\n').slice(-3).join('\n    ');
      if (msg) console.log(`    ${msg}`);
    }
  });
  console.log(`\n  ${rows.length - failed}/${rows.length} stills in out/stills/\n`);
  if (failed) process.exit(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
