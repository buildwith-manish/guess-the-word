/**
 * NFL contact sheets: one still per card at clue 3 (middle of the slot) and one at the name reveal (name settled), laid out
 * 10 cards per sheet on 3 PNG sheets, each cell labelled with the card number and the video timecode. A 4th sheet holds the
 * hook, each level card, the rank card (the Scoreboard) and the end screen.
 *
 * Run from the repo root:
 *   npx tsx scripts/nfl_contact_sheet.ts            render everything (first run downloads Chromium if it is missing)
 *   npx tsx scripts/nfl_contact_sheet.ts --dry      print the 64 frames only, no Chromium, nothing written
 *   npx tsx scripts/nfl_contact_sheet.ts --force    re-render thumbnails that already exist (otherwise they are reused)
 *   CHROME_PATH=/path/to/chrome npx tsx scripts/nfl_contact_sheet.ts    use your own Chrome / Chromium
 *
 * Output (out/ is git-ignored): out/nfl-contact-sheet-1.png .. -4.png, thumbnails in out/nfl-contact/thumbs/.
 * Frames come from src/nfl/timing.ts (measured clips when present), so re-run after any timing change.
 * Exit 1 if Chromium is unavailable or a render fails.
 */
import fs from 'fs';
import path from 'path';

// @remotion/fonts' loadFont rejects when it runs in plain node (no browser). Harmless here; the sheets are rendered in Chromium.
process.on('unhandledRejection', () => undefined);

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out');
const THUMBS = path.join(OUT, 'nfl-contact', 'thumbs');
/** Stills are rendered at this fraction of 2560x1440 (0.3 = 768x432, the size of a sheet cell). */
const THUMB_SCALE = 0.3;
const SHEET_COLS = 4;
const CARDS_PER_SHEET = 10;
const args = new Set(process.argv.slice(2));

type Target = { id: string; sheet: number; order: number; label: string; sub: string; frame: number };

const tc = (frame: number, fps: number): string => {
  const sec = frame / fps;
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(1).padStart(4, '0')}`;
};

const buildTargets = async (): Promise<{ targets: Target[]; total: number; fps: number }> => {
  const timing = await import('../src/nfl/timing');
  const { revealBeats } = await import('../src/nfl/components/RevealEngine');
  const { SPRINGS } = await import('../src/nfl/system');
  const { FPS, RENDER_FPS, RENDER_TOTAL_FRAMES, segments, ticksToFrames, levelNames } = timing;

  const clampFrame = (f: number): number => Math.max(0, Math.min(RENDER_TOTAL_FRAMES - 1, Math.round(f)));
  const targets: Target[] = [];
  const add = (t: Omit<Target, 'sub'>) => targets.push({ ...t, frame: clampFrame(t.frame), sub: tc(clampFrame(t.frame), RENDER_FPS) });
  // the name spring has settled this many ticks after the name-reveal cue
  const settleTicks = Math.round(SPRINGS.gentle * FPS);

  let order = 0;
  for (const seg of segments) {
    if (seg.kind === 'card') {
      const n = seg.card.n;
      const sheet = Math.ceil(n / CARDS_PER_SHEET);
      const c3 = seg.phases.clues[2];
      add({ id: `card-${String(n).padStart(2, '0')}-clue3`, sheet, order: order++, label: `Card ${n}  ·  clue 3`, frame: ticksToFrames((c3.from + c3.to) / 2) });
      const nameTick = seg.phases.beat.from + revealBeats(seg.card).name + settleTicks;
      const lastTick = seg.phases.reveal.to - 1;
      add({ id: `card-${String(n).padStart(2, '0')}-name`, sheet, order: order++, label: `Card ${n}  ·  name reveal`, frame: ticksToFrames(Math.min(nameTick, lastTick)) });
    } else if (seg.kind === 'hook') {
      add({ id: 'extra-hook', sheet: 4, order: order++, label: 'Hook', frame: ticksToFrames(seg.to) - 1 });
    } else if (seg.kind === 'levelCard') {
      add({ id: `extra-level-${seg.level}`, sheet: 4, order: order++, label: `Level card  ·  ${levelNames[seg.level]}`, frame: ticksToFrames((seg.from + seg.to) / 2) });
    } else if (seg.kind === 'scoreboard') {
      add({ id: 'extra-rank-card', sheet: 4, order: order++, label: 'Rank card (Scoreboard)', frame: ticksToFrames(seg.to) - 1 });
    } else if (seg.kind === 'outro') {
      add({ id: 'extra-end-screen', sheet: 4, order: order++, label: 'End screen', frame: ticksToFrames((seg.endScreenFrom + seg.to) / 2) });
    }
  }
  return { targets, total: RENDER_TOTAL_FRAMES, fps: RENDER_FPS };
};

const LOCAL_COMMAND = 'npx tsx scripts/nfl_contact_sheet.ts';

const main = async (): Promise<number> => {
  const { targets, total, fps } = await buildTargets();
  const sheets = [1, 2, 3, 4].map((n) => targets.filter((t) => t.sheet === n).sort((a, b) => a.order - b.order));

  // structural checks, also in --dry
  const problems: string[] = [];
  for (const n of [1, 2, 3]) if (sheets[n - 1].length !== CARDS_PER_SHEET * 2) problems.push(`sheet ${n} has ${sheets[n - 1].length} cells, expected ${CARDS_PER_SHEET * 2}`);
  if (sheets[3].length < 4) problems.push(`sheet 4 has ${sheets[3].length} cells (hook, level cards, rank card, end screen)`);
  if (new Set(targets.map((t) => t.id)).size !== targets.length) problems.push('duplicate target ids');
  for (const t of targets) if (t.frame < 0 || t.frame >= total) problems.push(`${t.id}: frame ${t.frame} outside 0..${total - 1}`);

  if (args.has('--dry')) {
    console.log(`NFL contact sheet frames (60 fps, total ${total} frames = ${tc(total, fps)}):`);
    for (const t of targets) console.log(`  sheet ${t.sheet}  ${t.id.padEnd(22)} frame ${String(t.frame).padStart(6)}  ${t.sub}  ${t.label}`);
    if (problems.length > 0) console.log('\nPROBLEMS:\n  ' + problems.join('\n  '));
    return problems.length > 0 ? 1 : 0;
  }
  if (problems.length > 0) {
    console.error('Not rendering: ' + problems.join('; '));
    return 1;
  }

  const { bundle } = await import('@remotion/bundler');
  const { ensureBrowser, openBrowser, renderStill, selectComposition } = await import('@remotion/renderer');
  const browserExecutable = process.env.CHROME_PATH ?? null;

  // Chromium first, so a missing browser fails in seconds and not after the bundle.
  let browser: any;
  try {
    if (!browserExecutable) await ensureBrowser();
    browser = await openBrowser('chrome', { browserExecutable, chromiumOptions: { gl: 'swangle' } });
  } catch (err) {
    console.error(`Chromium is unavailable here, nothing was rendered:\n  ${String((err as Error)?.message ?? err).split('\n')[0]}`);
    console.error(`\nRun this on a machine with network access (it downloads Chromium on first run), from the repo root on branch nfl-quiz:\n\n  npm install && ${LOCAL_COMMAND}\n\nOr point it at an installed Chrome:  CHROME_PATH="/path/to/chrome" ${LOCAL_COMMAND}\nCheck the frames without a browser:  ${LOCAL_COMMAND} --dry`);
    return 1;
  }

  try {
    fs.mkdirSync(THUMBS, { recursive: true });
    console.log('Bundling...');
    const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src', 'index.ts') });
    const full = await selectComposition({ serveUrl, id: 'NFL-Full', puppeteerInstance: browser });

    let done = 0;
    for (const t of targets) {
      const file = path.join(THUMBS, `${t.id}.jpg`);
      if (args.has('--force') || !fs.existsSync(file)) {
        await renderStill({
          composition: full,
          serveUrl,
          frame: t.frame,
          output: file,
          imageFormat: 'jpeg',
          jpegQuality: 85,
          scale: THUMB_SCALE,
          overwrite: true,
          puppeteerInstance: browser,
          timeoutInMilliseconds: 120000,
        });
      }
      done++;
      process.stdout.write(`\r  thumbnails ${done}/${targets.length}`);
    }
    process.stdout.write('\n');

    const titles = ['Cards 1-10 (Rookie)', 'Cards 11-20 (Starter)', 'Cards 21-30 (Hall of Fame)', 'Hook, level cards, rank card, end screen'];
    for (let i = 0; i < 4; i++) {
      const cells = sheets[i].map((t) => ({
        label: t.label,
        sub: `frame ${t.frame}  ·  ${t.sub}`,
        src: `data:image/jpeg;base64,${fs.readFileSync(path.join(THUMBS, `${t.id}.jpg`)).toString('base64')}`,
      }));
      const inputProps = { title: `NFL quiz  ·  sheet ${i + 1}  ·  ${titles[i]}`, cols: SHEET_COLS, cells };
      const composition = await selectComposition({ serveUrl, id: 'NFL-ContactSheet', inputProps, puppeteerInstance: browser });
      const output = path.join(OUT, `nfl-contact-sheet-${i + 1}.png`);
      await renderStill({ composition, serveUrl, frame: 0, output, imageFormat: 'png', inputProps, overwrite: true, puppeteerInstance: browser, timeoutInMilliseconds: 120000 });
      console.log(`wrote ${path.relative(ROOT, output)}  (${composition.width}x${composition.height})`);
    }
    return 0;
  } catch (err) {
    console.error('Render failed:', err);
    return 1;
  } finally {
    await browser?.close?.({ silent: true }).catch?.(() => undefined);
  }
};

main().then((code) => process.exit(code));
