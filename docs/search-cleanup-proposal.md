# Cleanup proposal for the search-history branch

Nothing in this file has been executed. The Decision column is blank: write DELETE, KEEP or ADAPT in it (task 0e acts only on rows with a Decision).

How it was made: sizes are the tracked files on branch search-history (from tag video-03-final), `git grep` over `src`, `scripts`, `package.json`, `.github`, `settings.json`, the remotion configs and `tag-video` (docs excluded), and sections A and B of `docs/search-context.md`. Nothing was compiled or run.

Meaning: DELETE = remove in 0e. KEEP = stays. ADAPT = stays, with the edit named in the Risk column. Everything deleted stays recoverable with `git show video-03-final:<path>`.

**Total if every DELETE row is approved: 168.3 MB freed** (39 DELETE rows). Repo is 178.4 MB tracked today (public 162.9, root files 14.2, thumbnails 0.7, src 0.5, scripts 0.1).

`src/states/` does not exist on this branch, so there is no KEEP row for it.

## Read this first: the dependency chain

`src/timing.ts` imports `src/rounds.json` (generated from `questions.js` by the `postinstall` script) and `src/bonus-engine.ts`. `src/clock.ts`, `Hud`, `Iris`, `LevelCard`, `Reminder`, `sound.ts` and `Soundtrack.tsx` import `timing.ts`. So deleting `questions.js` and `build-questions.js` alone would break `tsc`. The proposal keeps the engine files for now (section 5) and commits a `[]` stub for `src/rounds.json`. The alternative is to approve a Phase 2 clean slate now (delete `timing.ts`, `types.ts`, `bonus-engine.ts`, `bonus-icons.tsx`, `sound.ts`, `Soundtrack.tsx` and the seven COPY-AND-ADAPT scenes in the same pass, and point `clock.ts` at `settings.json`). That frees only about 0.1 MB more (summed from file sizes) and makes later copy tasks use `git show`, so it is not proposed.

Also: `scripts/voiceover-scan.js` writes into `src/pixel/`, which is why it has an ADAPT row.

### 1. Media and archives

| Path | Size | Who imports or references it | Proposal | Risk | Decision |
|---|---|---|---|---|---|
| `public/emoji-icons` | 51.29 MB | src/assets.ts (clueSrc), src/types.ts, scripts/build-questions.js (validates the clue PNGs) | DELETE | Low. Word-clue pictures; only asset paths are referenced, no code compiles against them | |
| `public/images` | 33.34 MB | src/assets.ts, scripts/fetch-images.js, resize-images.js, refetch-broken.js, package.json, settings.json (`images` key), .gitignore | DELETE | Low. Question photos. The `images` key in settings.json stays (shared file, harmless) | |
| `public/pixel-brands` | 28.26 MB | src/pixel/* (brands, brand-bonus, pixel-timing), src/thumbnails/Thumbnails.tsx, scripts/fetch-pixel-images.js | DELETE | Low. Needs src/pixel and Thumbnails.tsx to go in the same pass (both are DELETE rows) | |
| `public/bonus-icons` | 13.06 MB | src/bonus-engine.ts, src/bonus-icons.tsx, src/BonusRound.tsx | DELETE | Low for tsc (string paths only). bonus-engine.ts stays for now, so bonus boards would show no icons if ever run | |
| `public/thumb` | 6.08 MB | src/thumbnails/Thumbnails.tsx only | DELETE | Low | |
| `public/voiceover` | 21.38 MB | settings.json (`voiceover.dir`), scripts/voiceover-scan.js, scripts/scan-voiceover.py, src/timing.ts, src/pixel/pixel-timing.ts, render.yml | DELETE | Medium. 109 old GTW and pixel narration clips. Recoverable only from git history (tag video-03-final). Keep an empty `public/voiceover/.gitkeep` so the scan script still finds the folder | |
| `clips.7z` | 13.92 MB | no reference found anywhere in src, scripts, workflows, package.json | DELETE | Medium. 7-zip archive, contents NOT opened, so I cannot say what is inside. Recoverable from git history only | |
| `thumbnails/premium` | 0.69 MB | no reference found | DELETE | Low. Three old finished thumbnail JPGs (the root `thumbnails/` folder; `src/thumbnails/kit.tsx` is a different path and is kept) | |
| `scripts/__pycache__` | 14.7 KB | none (compiled Python files that were committed by mistake) | DELETE | Low | |

### 2. Word-quiz code

| Path | Size | Who imports or references it | Proposal | Risk | Decision |
|---|---|---|---|---|---|
| `src/Round.tsx` | 39.0 KB | src/Main.tsx | DELETE | Low. The word-question scene, 40 KB. Section A: not reusable | |
| `src/Main.tsx` | 3.9 KB | src/Root.tsx (composition GuessTheWord) | DELETE | Low. Root.tsx must drop GuessTheWord (task 0e step 3) | |
| `src/BonusRound.tsx` | 19.5 KB | src/Main.tsx, src/pixel/BrandBoards.tsx, src/pixel/PixelMain.tsx | DELETE | Low | |
| `src/Card3D.tsx` | 10.5 KB | src/Round.tsx; also imports ./assets and a three.js font | DELETE | Low | |
| `src/RevealStyle.tsx` | 9.0 KB | src/Round.tsx | DELETE | Low | |
| `src/Hook.tsx` | 6.9 KB | src/Main.tsx; uses ./assets (clue images) | DELETE | Low. Section A verdict DISCARD | |
| `src/Sting.tsx` | 6.3 KB | src/Round.tsx | DELETE | Low. Section A verdict DISCARD (channel logo mark) | |
| `src/assets.ts + src/image-manifest.json` | 1.9 KB | src/Card3D.tsx, src/Hook.tsx, src/Round.tsx (all DELETE) | DELETE | Low. Only valid together with those three | |
| `src/pixel` | 76.5 KB | src/Root.tsx (PixelGuess), scripts/voiceover-scan.js writes src/pixel/pixel-voiceover-manifest.json, package.json pixel:* scripts, thumbnails | DELETE | Medium. `scripts/voiceover-scan.js` writes into this folder, so `npm run voiceover` and `npm run render` would fail with ENOENT unless the scan script is adapted (see its row) | |
| `src/thumbnails/Thumbnails.tsx` | 6.3 KB | src/Root.tsx (Stills ThumbZero, ThumbLadder, ThumbEasy); uses public/thumb and public/pixel-brands | DELETE | Low. Root.tsx must drop the three Stills | |
| `src/thumbnails/kit.tsx` | 17.5 KB | src/thumbnails/Thumbnails.tsx only; itself imports only remotion and ../util | KEEP | Low. Thumbnail building blocks, reusable | |

### 3. Questions data and old docs

| Path | Size | Who imports or references it | Proposal | Risk | Decision |
|---|---|---|---|---|---|
| `questions.js` | 4.2 KB | scripts/build-questions.js, package.json (postinstall, data), .github/workflows/render.yml, src/Root.tsx (comment) | DELETE | HIGH. `src/timing.ts` imports `src/rounds.json`, which is generated from this file. Needs the stub row below | |
| `scripts/build-questions.js` | 3.8 KB | package.json (postinstall, data), render.yml; reads questions.js and facts.csv | DELETE | HIGH. Removing the `postinstall` is part of task 0e | |
| `src/rounds.json (new)` | 0 (new file) | src/timing.ts (`import rounds from ./rounds.json`); currently generated and git-ignored | ADAPT | HIGH. Stub fix: commit it as `[]` and remove the `src/rounds.json` line from .gitignore, so timing.ts still compiles. tsc only; nothing was run, and an empty list at runtime is unchecked (nothing imports timing at runtime once Root only registers Blank) | |
| `facts.csv` | 3.3 KB | scripts/build-questions.js | DELETE | Low | |
| `ANSWERS.md` | 5.0 KB | scripts/build-questions.js mentions it (not opened) | DELETE | Low | |
| `voiceover-script.txt` | 8.5 KB | scripts/voiceover-script.js (generator) | DELETE | Low | |
| `voiceover-lines-gtw.csv` | 9.2 KB | scripts/voiceover-script.js | DELETE | Low | |
| `scripts/lines_gtw-3.csv` | 5.5 KB | scripts/voiceover-script.js | DELETE | Low | |
| `pixel-voiceover-script.md` | 7.3 KB | none | DELETE | Low | |
| `pixel-voiceover-lines.csv` | 5.5 KB | none | DELETE | Low | |
| `gtw_script_with_emotions.md` | 8.4 KB | none | DELETE | Low | |
| `VIDEO3-pixelated-voiceover.md` | 6.0 KB | none | DELETE | Low | |
| `VIDEO3-american-food.md` | 4.6 KB | none | DELETE | Low | |
| `PIXEL-QUIZ.md` | 4.9 KB | none | DELETE | Low | |
| `VIDEO_LOG.md` | 0.7 KB | none (not opened) | KEEP | Low. Looks like your per-video log | |
| `README.md` | 17.6 KB | none (GTW readme, 374 lines, not opened) | KEEP | Low. Rewrite in a later task | |
| `FONTSHARE-SETUP.md + src/fontshare` | 5.8 KB | nothing imports src/fontshare/load-fonts.ts (grep found no importer) | KEEP | Low. Fonts. Unreferenced, so it could be deleted later | |

### 4. Scripts, workflows, config

| Path | Size | Who imports or references it | Proposal | Risk | Decision |
|---|---|---|---|---|---|
| `scripts/fetch-images.js` | 13.6 KB | package.json (images, images:all, images:hd); assets.ts comments | DELETE | Low | |
| `scripts/resize-images.js` | 5.8 KB | package.json (images:resize, images:all, images:hd) | DELETE | Low | |
| `scripts/refetch-broken.js` | 4.6 KB | package.json (images:refetch, images:all, images:hd) | DELETE | Low | |
| `scripts/fetch-pixel-images.js` | 4.6 KB | package.json (pixel:images) | DELETE | Low | |
| `scripts/voiceover-script.js` | 2.7 KB | package.json (voiceover:script) | DELETE | Low. Writes GTW narration lines from the word questions | |
| `scripts/scan-voiceover.py` | 4.0 KB | only .github/workflows/render.yml (duplicate of voiceover-scan.js) | DELETE | Low. Duplicate script; goes with render.yml | |
| `.github/workflows/render.yml` | 11.5 KB | none (manual workflow). Runs build-questions.js and scan-voiceover.py, renders the first composition | DELETE | Medium. It is your old GTW render path. render-pixel.yml does the same job with a `composition` input | |
| `scripts/voiceover-scan.js` | 9.2 KB | package.json (voiceover, render*); writes src/pixel/pixel-voiceover-manifest.json (line 43, 165) | ADAPT | Medium. Remove the pixel manifest part (the write at line 165) once src/pixel is gone. It is a shared script you need for later; section B relies on it | |
| `package.json` | 2.7 KB | n/a | ADAPT | Medium. Remove: postinstall, data, images, images:resize, images:refetch, images:hd, images:all, pixel:dev, pixel:images, pixel:still, pixel:render, pixel:draft, thumbs, still, voiceover:script. Keep: dev, typecheck, timeline, sounds, voiceover, render, render:batches, render:lanes, render:fast, render:draft, render:full (all call the kept scripts). Unused packages (three, @react-three/*, @remotion/three, gsap) are NOT touched | |
| `src/Root.tsx` | 1.5 KB | n/a | ADAPT | Medium. Drop GuessTheWord, PixelGuess and the 3 Stills; register one-frame `Blank` | |
| `.gitignore` | 0.7 KB | n/a | ADAPT | Low. Remove the `src/rounds.json` line (stub is committed) and the image-tooling lines | |

### 5. Keep for now, delete in a later pass (Phase 2)

| Path | Size | Who imports or references it | Proposal | Risk | Decision |
|---|---|---|---|---|---|
| `src/timing.ts + src/types.ts` | 18.9 KB | timing: Root, clock.ts, Hud, Iris, LevelCard, Reminder, sound.ts, Soundtrack.tsx; imports ./rounds.json and ./bonus-engine | KEEP | HIGH if removed early: clock.ts, Hud, Iris, LevelCard, Reminder, sound.ts and Soundtrack.tsx stop compiling. `clock.ts` gets TIME_SCALE from here | |
| `src/bonus-engine.ts + src/bonus-icons.tsx` | 17.3 KB | src/timing.ts, src/types.ts, src/BonusRound.tsx | KEEP | Medium. You listed the GTW bonus files for deletion. BonusRound.tsx goes now; the engine is imported by timing.ts, so it goes with timing.ts | |
| `src/Icon.tsx` | 13.8 KB | Hud, EndScreen, Scoreboard (kept), plus Hook, Round, BonusRound, pixel (deleted) | KEEP | Medium. Not opened; Hud, EndScreen and Scoreboard are COPY-AND-ADAPT sources, so it must exist while they do | |
| `src/Solid3D.tsx` | 11.1 KB | LevelCard, EndScreen, Scoreboard | KEEP | Low. Same reason as Icon.tsx | |
| `src/Hud.tsx + Background.tsx + LevelCard.tsx + Scoreboard.tsx + EndScreen.tsx + Iris.tsx + Reminder.tsx` | 10.3 KB | Section A: COPY-AND-ADAPT sources; Iris and Reminder import Watermark and TitleLockup | ADAPT | Medium. Kept as copy sources until the search scenes exist, then delete | |
| `src/Watermark.tsx + src/TitleLockup.tsx` | 11.0 KB | Iris.tsx, Reminder.tsx (kept); Round.tsx (deleted) | KEEP | Low. Section A says DISCARD; they only stay because Iris and Reminder import them | |
| `src/sound.ts + src/Soundtrack.tsx + src/voiceover-manifest.json` | 15.7 KB | sound.ts: Soundtrack.tsx; Soundtrack: Main.tsx (deleted). timing.ts reads the manifest | KEEP | Low. Pattern source for the search soundtrack (section B). They import timing.ts, so they leave together with it | |
| `scripts/render-batches.js + scripts/timeline.js` | 12.5 KB | package.json (render*, timeline); both load src/timing.ts | KEEP | Low. They show the GTW timeline only; the search render uses render-pixel.yml | |

## Must stay (not rows above)

- Time and style: `src/clock.ts`, `src/style.ts`, `src/anim.ts`, `src/util.ts`, `src/gsap-helpers.js`, `src/camera.ts`, `src/CameraRig.tsx`, `src/Fx.tsx`, `src/Background.tsx`
- Fonts: `src/fonts.ts`, `public/fonts/` (5.8 MB), `src/fontshare/`
- Sounds: `public/sounds/` (3.1 MB), `src/sound-manifest.json`, `scripts/generate-audio.js`, `src/sound.ts`, `src/Soundtrack.tsx`
- Voiceover plumbing: `scripts/voiceover-scan.js`, `src/voiceover-manifest.json`
- Release and render: `tag-video`, `.github/workflows/render-pixel.yml`, `.github/workflows/upload-youtube.yml`, `scripts/youtube_upload.py`, `remotion.audio.config.ts` (used by render-pixel.yml line 293), `remotion.config.ts`, `settings.json`, `tsconfig.json`, `package.json`, `package-lock.json`
- Docs written for this branch: `docs/search-context.md`, `docs/search-progress.md`, `docs/search-notes/`
