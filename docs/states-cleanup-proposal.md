# Video 4 — cleanup proposal (nothing has been deleted)

Basis: `git ls-files` (474 tracked files), `du -sk` per path (disk blocks, so slightly above byte size), and grep of `src/`, `scripts/`, `.github/`, `package.json`, `README.md`, `.gitignore`, `*.md` on branch us-states at tag video-03-final. Nothing was run, built or rendered. Leave the Decision column blank; I will act only on rows you fill in.

## Read this first: the coupling chain

- `package.json` `postinstall` runs `scripts/build-questions.js`. It requires `questions.js`, reads `facts.csv`, checks every PNG in `public/emoji-icons/`, and writes the gitignored `src/rounds.json`.
- `src/timing.ts` imports `src/rounds.json` and `src/bonus-engine.ts`, and `src/types.ts` imports `bonus-engine`. Hud, LevelCard, Hook, Iris, Reminder (the COPY-AND-ADAPT files in context section A) import `./timing` or `./types`.
- So deleting `questions.js`, `build-questions.js` or `emoji-icons` before the postinstall line is removed makes `npm install` fail. Deleting `bonus-engine.ts` or `timing.ts` before states has its own timing and types breaks `tsc` for every reused file.
- `Root.tsx` imports `Main`, `pixel/PixelMain`, `pixel/pixel-timing` and `thumbnails/Thumbnails`; `Main.tsx` imports `Round` and `BonusRound`. Those files can only go after `Root.tsx` is rewired to the states composition.
- Suggested order if you approve: Phase 1 = rows marked "Phase 1" (nothing imports them). Phase 2 = the rest, in one commit after the states composition compiles on its own and the postinstall line is removed.
- Deleting files does not shrink `.git` (285 MB). Old files stay in history and in tag video-03-final, so everything is recoverable. I do not propose rewriting history.

## Table

| Path | Size | Who imports or references it (grep) | Proposal | Risk | Decision |
|---|---|---|---|---|---|
| public/emoji-icons | 51.5 MB (100 PNG) | `src/assets.ts` (`clueSrc`), `src/types.ts` (comment), `scripts/build-questions.js` (validates each file at postinstall), README | DELETE (Phase 2) | HIGH: `npm install` fails until postinstall is removed; Hook/Card3D use `clueSrc` via assets.ts | |
| public/images | 33.4 MB (50 JPG + .gitkeep) | `src/assets.ts` (`imageSrc`), `scripts/fetch-images.js`, `resize-images.js`, `src/image-manifest.json`, `.gitignore` (`!public/images/.gitkeep`) | DELETE (Phase 2) | MEDIUM: `imageSrc` used by Card3D; drop it with assets.ts adaptation | |
| public/bonus-icons | 13.1 MB (21 PNG) | `src/bonus-icons.tsx` (via BonusRound), `bonus-engine.ts` comments | DELETE (Phase 2) | LOW once BonusRound/bonus-engine go | |
| public/pixel-brands | 28.3 MB (46 JPG + .gitkeep) | `src/pixel/*` (brands.ts, brand-bonus.ts, pixel-timing.ts), `src/thumbnails/Thumbnails.tsx` (`pixel-brands/31.jpg`), `scripts/fetch-pixel-images.js` | DELETE (Phase 2, with src/pixel and Thumbnails.tsx rewrite) | MEDIUM: Thumbnails.tsx still points at it | |
| public/thumb | 6.1 MB (4 PNG: cut-28/31/36/40) | `src/thumbnails/Thumbnails.tsx` only | DELETE (Phase 2, when Thumbnails.tsx is replaced) | LOW: only the three video-3 thumbnail stills break | |
| public/voiceover | 21.6 MB (108 WAV, all `px*` clips of video 3, + .gitkeep) | `settings.voiceover.dir`, `src/sound.ts` (`VOICE_DIR`), `scripts/voiceover-scan.js`; manifests `src/voiceover-manifest.json` and `src/pixel/pixel-voiceover-manifest.json` list them | DELETE (Phase 2) | MEDIUM: stale manifests would still point at deleted files (see manifest row); clips are paid TTS audio, recoverable from tag video-03-final and probably clips.7z | |
| src/voiceover-manifest.json (not in your list) | small | `src/timing.ts` import, written by `voiceover-scan.js` | ADAPT: regenerate or reset to match states clips | MEDIUM: stale entries stretch holds for clips that no longer exist | |
| clips.7z | 13.9 MB | no references found in src, scripts, workflows, docs; last commit message "Update clips.7z (108 clips)" (same count as the WAVs). Could not open it: no 7z tool here | KEEP until you confirm what it holds, then DELETE if it only duplicates public/voiceover | LOW (unreferenced); but may be your only non-git backup of the voice clips | |
| src/image-manifest.json | small | `src/assets.ts`, `scripts/fetch-images.js`, `resize-images.js` | DELETE (Phase 2, with assets.ts adaptation) | LOW: README says an empty manifest is valid, so resetting to `{}` is the fallback | |
| scripts/fetch-images.js | ~12 KB | `package.json` (`images`, `images:hd`, `images:all`) | DELETE (Phase 1) | LOW: also remove the `images*` npm scripts | |
| scripts/resize-images.js | small | `package.json` (`images:resize`, `images:hd`, `images:all`) | DELETE (Phase 1) | LOW: same package.json edit | |
| scripts/refetch-broken.js | small | `package.json` (`images:refetch`, `images:hd`, `images:all`) | DELETE (Phase 1) | LOW | |
| scripts/fetch-pixel-images.js | small | `package.json` (`pixel:images`), `PIXEL-QUIZ.md`, `src/pixel/brands.ts` | DELETE (Phase 1 for the script; remove `pixel:images`) | LOW | |
| ANSWERS.md | 8 KB | `VIDEO3-american-food.md` only | DELETE (Phase 1) | LOW | |
| VIDEO3-american-food.md | 8 KB | none | DELETE (Phase 1) | LOW | |
| VIDEO3-pixelated-voiceover.md | 8 KB | none | DELETE (Phase 1) | LOW | |
| PIXEL-QUIZ.md | 8 KB | none | DELETE (Phase 1) | LOW | |
| gtw_script_with_emotions.md | 12 KB | `pixel-voiceover-script.md` mentions it | DELETE (Phase 1) | LOW | |
| voiceover-lines-gtw.csv | 12 KB | `gtw_script_with_emotions.md` mentions it | DELETE (Phase 1) | LOW | |
| voiceover-script.txt | 12 KB | `README.md`, `scripts/voiceover-script.js` (generates it from the question bank) | DELETE (Phase 1; README line goes stale) | LOW | |
| pixel-voiceover-script.md | 8 KB | none | DELETE (Phase 1). It may serve as a format template for states lines; it stays in tag video-03-final | LOW | |
| pixel-voiceover-lines.csv | 8 KB | none | DELETE (Phase 1), same note | LOW | |
| scripts/lines_gtw-3.csv (not in your list) | small | none | DELETE (Phase 1) | LOW | |
| scripts/voiceover-script.js (not in your list) | small | `package.json` (`voiceover:script`), writes `voiceover-script.txt` | ADAPT later (states voiceover script generator) or DELETE; needs your call | LOW | |
| facts.csv | 4 KB | `scripts/build-questions.js` (optional fallback) | DELETE (Phase 1 is safe: the file is optional) | LOW | |
| questions.js | 8 KB | `scripts/build-questions.js` (`require`), README | DELETE (Phase 2) | HIGH: postinstall `require`s it; `npm install` errors if it is gone first | |
| scripts/build-questions.js | small | `package.json` (`postinstall`, `data`), README; produces `src/rounds.json` | DELETE (Phase 2, same commit as removing `postinstall` and `data`) | HIGH: every reused file that imports `./timing` depends on its output until states timing exists | |
| src/pixel/ | 96 KB (8 files + pixel-voiceover-manifest.json) | `src/Root.tsx` (`PixelMain`, `PIXEL_TOTAL_FRAMES`), `scripts/fetch-pixel-images.js`, `scripts/voiceover-scan.js` (writes its manifest); grep also hits BonusRound.tsx and bonus-engine.ts (comments or imports not checked) | DELETE (Phase 2) | MEDIUM: Root.tsx must drop the PixelGuess composition; `pixel:*` npm scripts and render-pixel.yml default composition (`PixelGuess`) then point at nothing | |
| src/Icon.tsx | small | Hud, Scoreboard, Hook, EndScreen, Round, BonusRound, `pixel/PixelScenes`, `pixel/PixelRound` | KEEP (reused files import it) | n/a | |
| src/bonus-engine.ts | small | `src/timing.ts`, `src/types.ts`, BonusRound, `pixel/BrandBoards`, `pixel/pixel-timing`, `pixel/brand-bonus`, bonus-icons | DELETE (Phase 2, after states types/timing are standalone) | HIGH: `types.ts` and `timing.ts` import it, so `tsc` breaks for Hud, Iris, LevelCard, Reminder, Hook | |
| src/bonus-icons.tsx | small | BonusRound, `bonus-engine.ts` | DELETE (Phase 2) | LOW after those two go | |
| src/BonusRound.tsx | small | `src/Main.tsx`, `pixel/PixelMain` | DELETE (Phase 2) | MEDIUM: Main.tsx must be replaced first | |
| src/Round.tsx | small | `src/Main.tsx` only | DELETE (Phase 2) | MEDIUM: same | |
| thumbnails/premium | 0.7 MB (3 JPG: 46-of-46, too-easy, zero-wrong) | no references in src, scripts or README | DELETE (Phase 1) | LOW: finished video-3 exports, in the tag | |
| src/thumbnails/kit.tsx | 32 KB dir | imported by `Thumbnails.tsx` | KEEP (the kit) | n/a | |
| src/thumbnails/Thumbnails.tsx | in the 32 KB dir | `Root.tsx` (ThumbEasy, ThumbLadder, ThumbZero stills), uses `thumb/*` and `pixel-brands/31.jpg` | ADAPT: replace with states thumbnails built on the kit | MEDIUM: Root.tsx and the `thumbs` npm script reference those three ids | |
| .github/workflows/render.yml | 298 lines | none (manual `workflow_dispatch`); renders `compositions[0]` of `src/index.ts`, runs `generate-audio.js` and `scan-voiceover.py` | DELETE (Phase 1). `render-pixel.yml` takes a `composition` input and covers rendering | LOW: it is the old single-job "Render & Upload" path; would render whichever composition is listed first | |
| scripts/scan-voiceover.py | 124 lines | `.github/workflows/render.yml` only | DELETE with render.yml (Phase 1) | LOW: confirmed older and different from `voiceover-scan.js`: it expects names `r01`, `hook`, `reminder_10` that the current manifest does not use | |
| scripts/__pycache__ (not in your list) | tiny | 2 tracked `.pyc` files | DELETE (Phase 1) | LOW | |

## Must stay (used by states or the pipeline)

- Timing and motion: `src/clock.ts`, `style.ts`, `anim.ts`, `gsap-helpers.js`, `util.ts`, `fonts.ts`, `camera.ts`, `index.ts`.
- Reused components (REUSE): `Fx.tsx`, `Solid3D.tsx`, `RevealStyle.tsx`, `Sting.tsx`, `CameraRig.tsx`, `Icon.tsx`.
- Until adapted copies exist: `timing.ts`, `types.ts`, `assets.ts`, and the COPY-AND-ADAPT files `Hud, Watermark, Background, Iris, LevelCard, Reminder, Scoreboard, EndScreen, Hook, Card3D`.
- Audio: `src/sound.ts`, `sound-manifest.json`, `Soundtrack.tsx`, `public/sounds`, `public/fonts`, `scripts/generate-audio.js`, `scripts/voiceover-scan.js`, `remotion.audio.config.ts`.
- Config: `settings.json`, `remotion.config.ts` (do not change), `tsconfig.json`, `package.json`, `package-lock.json`.
- Pipeline and records: `tag-video`, `VIDEO_LOG.md`, `README.md`, `scripts/render-batches.js`, `timeline.js`, `youtube_upload.py`, `.github/workflows/render-pixel.yml`, `.github/workflows/upload-youtube.yml`.

## Space freed if every DELETE row is approved

- Working tree: about 155 MB (emoji-icons 51.5, images 33.4, pixel-brands 28.3, voiceover 21.6, bonus-icons 13.1, thumb 6.1, thumbnails/premium 0.7, src/pixel and scripts/docs about 0.3). `du` block sizes, so the real byte count is a little lower.
- Not counted: `clips.7z` (13.9 MB) stays unless you decide otherwise.
- `.git` stays about 285 MB, history is kept.
