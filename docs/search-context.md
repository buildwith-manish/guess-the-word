# Search History: shared context

## A Reuse inventory

Source: grep of `src/` on branch search-history (from tag video-03-final). Imports are what each file pulls from `./timing`, `./types`, `../settings.json`, `./rounds.json`, `./assets` (`rounds.json` is imported by none of these files). Paths below are relative to `src/`. `src/states/` does not exist on this branch.

### Components and camera

| File | Exports | Props | GTW-coupled imports | Verdict |
|---|---|---|---|---|
| Hud.tsx | `HudPlan` (type), `MAIN_HUD_PLAN`, `HudPlanContext`, `Hud` | `Hud`: label, number, total, erases, eraseAt?, frame, landedAt?, barFrame?. Plan context: total, bonusAfter[], levels[{name, accent, count}] | `./timing` (LEVELS, QUESTIONS, TOTAL), `settings.bonus.after`; also `./Icon` | COPY-AND-ADAPT. The plan can be injected through `HudPlanContext`, but the default plan reads GTW data and the bar/badge/streak parts are built around bonus rounds and erases |
| Watermark.tsx | `Watermark` | frame? (unused) | `settings.brand.quiz`, `settings.brand.matrix`; `./clock` | DISCARD. It is the channel brand lockup, and this video has no brand names |
| Background.tsx | `Background`, `Bars` (stub, returns null) | frame, theme [string, string], pulse?, hideBars?, dim?, iris?{theme, p, variant?, energy?}, energy? (more props may follow, only the first lines were read) | `settings.background` (palette/config) | COPY-AND-ADAPT. Props-driven, but reads GTW settings; light edit to take its config from search-settings.json |
| Fx.tsx | `Confetti`, `Ring`, `Flash`, re-export `COLORS` | Confetti: frame, start, count?, seed?, origin?. Ring: frame, start, size?, style?. Flash: frame, start, ms?, peak?, at? | none (style, util, anim only) | REUSE |
| Iris.tsx | `Iris` | frame, seg (Segment of kind 'iris') | `./types` (Segment), `./timing` (BONUS_THEME); imports Background, Hud, Watermark, TitleLockup | COPY-AND-ADAPT. Tied to the segment model and to the Hud, Watermark and TitleLockup, two of which are discards |
| LevelCard.tsx | `LevelCard` | frame, levelIndex | `./timing` (LEVELS, QUESTIONS), `settings.levelCardFrames`, `settings.threeD`; also Solid3D (Title3D), Background | COPY-AND-ADAPT |
| Reminder.tsx | `Reminder` | frame, seg (Segment of kind 'reminder') | `./types` (Segment), `./timing` (FPS), `settings.text.reminder` | COPY-AND-ADAPT. Small pill pop-up; the text, the segment type and the "Still counting?" use are GTW |
| Scoreboard.tsx | `Scoreboard` | frame, rowAt? | `settings.scoreboard.ranks`, `settings.text.scoreboard*`, `settings.threeD`; also Icon, Solid3D (RankBadge3D), Background, util | COPY-AND-ADAPT |
| EndScreen.tsx | `EndScreen` | frame | `settings.endScreen`, `settings.threeD`; also Icon, Solid3D (SubscribeButton3D), Background, util | COPY-AND-ADAPT |
| Hook.tsx | `Hook` | frame | `./timing` (QUESTIONS, TOTAL), `settings.text.hook`, `settings.timing.hookA/hookB`, `./assets` (clueSrc); renders clue image pairs | DISCARD. Word-quiz only: it shows the clue images of the hardest word pairs |
| TitleLockup.tsx | `TitleLockup` | frame, animate?, hideAt?, showAt?, exitAt? | none, but the words GUESS / THE / WORD are hard-coded in the file | DISCARD. Hard-coded "GUESS THE WORD" title. Only the technique (tile flip, gold ignite) is worth copying by hand |
| Sting.tsx | `BulbSting` | frame, start, exit | none, but it draws the channel's lightbulb monogram (SVG paths, card corner at 1004,70) | DISCARD. Brand logo mark (rule 6), built for the word answer card |
| CameraRig.tsx | `CameraRig` | frame, duration, children | none (camera, style only) | REUSE |
| camera.ts | `handheld(frame)`, `bell(frame, duration)` | pure functions | none (imports `./anim` clamp01) | REUSE |

Verdict counts: REUSE 3 (Fx, CameraRig, camera.ts), COPY-AND-ADAPT 7 (Hud, Background, Iris, LevelCard, Reminder, Scoreboard, EndScreen), DISCARD 4 (Watermark, Hook, TitleLockup, Sting).

Most coupled: Iris (segment type, BONUS_THEME, and four component imports), Hook (timing, settings text and timing, assets), Hud (timing, settings, Icon, bonus plan).

### Helper files (export names only)

| File | Exports |
|---|---|
| style.ts | SCALE (2), K, px, COLORS, FONTS, glass, SAFE_X, SAFE_Y, S |
| anim.ts | prog, fadeIn, revealIn, slamIn, floatY, breathe, cubicBezier, htmlEase, irisEase, cssEase, cssEaseIn, cssEaseOut, cssEaseInOut, bounceEase, mergeEase, confettiEase, ms, keyframes, springStyle, riseStyle, mix |
| gsap-helpers.js | CommonJS: ease, backOut, backIn, expoOut, elasticOut, power3Out, power2InOut, sineInOut, linear, clamp01, mix, progress, stagger |
| util.ts | makeRandom, shuffle, pickN, range, Glyph (type), glyphs, ConfettiPiece (type), makeConfetti |
| fonts.ts | no exports; side-effect file (declares a FACES list that loads the fonts) |

### Not covered by this task
Icon.tsx, Solid3D.tsx, clock.ts, Round.tsx and the rest of `src/` were not on the list and were not inspected. Several components above import Icon, Solid3D and clock.

## B Timing audio pipeline

Read from the GTW files on this branch (grep and short reads; bodies not read in full). Everything below is how GTW does it. The search video must copy the pattern into `src/search/`, not edit these files.

### Timeline
- Root `settings.json` is the source of truth for size and rate: `fps` 60, `width` 2560, `height` 1440. Its top-level keys: fps, width, height, motionBlur, camera, voiceover, transitions, fastest, streak, brand, levelCardFrames, reminder, levels, levelThemes, timer, timing, bonus, scoreboard, endScreen, text, images, sound, threeD, background, levelMood.
- `src/timing.ts` exports `WIDTH`, `HEIGHT`, `RENDER_FPS` (settings), `FPS = 30` (design frames) and `TIME_SCALE = RENDER_FPS / FPS = 2`. Scene motion is written in 30 fps design frames.
- `src/clock.ts` is one line of logic: `useDesignFrame = () => useCurrentFrame() / TIME_SCALE`. It returns fractional design frames (12, 12.5, 13 ...), so every animation is sampled at 60 fps. It imports `TIME_SCALE` from `./timing`.
- A segment is a plain object `{ kind, from, duration, ...extra }`. `buildTimeline()` (not exported) keeps a `cursor`, and `push(seg)` appends the segment and adds its `duration` to the cursor. Kinds in `src/types.ts`: hook, levelCard, question, bonus, iris, reminder, scoreboard, endScreen. Result: `TIMELINE = { segments, totalFrames }` (design frames).
- `RENDER_TOTAL_FRAMES = round(TIMELINE.totalFrames * TIME_SCALE)` is the composition length at 60 fps.
- `locate(segments, frame)` walks the list from the end and returns `{ seg, local, index }` (`local` = frame inside the segment). A scene component gets `local` and draws from it.
- Per-scene plans are built by pure functions, for example `buildQuestionPlan(q, levelIndex, withTitle): QuestionPlan` (all offsets inside the scene in design frames: titleFrames, timerStart, timerFrames, lettersDone, stamp, hold, exit, duration, plus optional `vo` and `vqQuestion` clips). Other exports: `LEVELS`, `QUESTIONS`, `TOTAL`, `themeForQuestion`, `levelMoodFor`, `BONUS_THEME`, `voiceClip`, `voiceClipNamed`, `voiceClipScoreboard`.
- `timing.ts` imports `settings.json` and `rounds.json` at the top, so it is GTW-coupled. The search video needs its own `src/search/search-timing.ts` with the same shape (segments, cursor, `locate`), reading `search-data.ts` and `search-settings.json`.
- `npm run timeline` (`scripts/timeline.js`) bundles `src/timing.ts` with esbuild and prints the real frame plan (`--json`, `--segments`). It is hard-wired to GTW's `timing.ts`, so it will not show the search timeline.

### Cues (sound effects)
- `src/sound.ts`: `type Cue = { frame, sfx, rate?, volume? }`. `frame` is an absolute design frame, `rate` is pitch through playback rate, `volume` defaults to 1. `Sfx` is derived from the keys of `sound-manifest.json` (minus `music-*`), so a new sound name type-checks once it is in the manifest.
- `buildCues()` walks `TIMELINE.segments` and calls a local `add(frame, sfx, extra)`, which rounds the frame and pushes a cue. Real entries: `add(f0 + 26, 'boom');` and `[0, 36, 72].forEach((at, i) => add(f0 + at, 'blip', { rate: (500 + i * 160) / 500 }));`. Timer ticks are one `add(clockStart + k * FPS, left <= 3 ? 'thump' : 'tick')` per second.
- Exports: `Sfx`, `Cue`, `Voice`, `SOUND_ENABLED` (`settings.sound.enabled`), `MUSIC_LOOP_FRAMES = 256`, `clipFrames(sfx, rate)`, `VOICE_DIR`, `CUES`, `VOICE`, `MUSIC_END` (the scoreboard start), `MUSIC_ENVELOPES`, `layerAudible`. `CUES`, `VOICE` and `MUSIC_END` are built from the GTW `TIMELINE`, so search needs its own `buildCues` over its own timeline.
- `src/Soundtrack.tsx` (one component, `Soundtrack`) places everything as `<Sequence><Audio/></Sequence>` pairs, so any frame range can be rendered in any order: music loops, one Sequence per cue (`volume={c.volume ?? 1}`), one per voiceover clip (`volume = settings.voiceover.volume`).
- Music is three stacked layers (`music-base.wav`, `music-l1.wav`, `music-l2.wav`), each 256 design frames, looped with Sequences. Each layer's volume is read from a precomputed per-design-frame envelope (`MUSIC_ENVELOPES`, interpolated to 60 fps in `Soundtrack`). Layer intensity follows the question number (the `[0,1,1,2,2]` ramp).
- Ducking is baked into that envelope. Under every SFX the music drops to `DUCK_FLOOR = 0.44` for 0.28 s, then recovers exponentially. Under every voiceover clip it drops to `settings.voiceover.duckFloor` (0.3). `HUSHES` are windows where the music cuts out completely (the silent beat before an answer lands).
- Other `settings.sound` keys: enabled, dir, sfxGain, musicGain, panic.
- Files in `public/sounds/`: blip, boom, bulb-ping, chime-arp, chime-erase, ding-hi, ding, drumroll, flare, flip, jingle-cta, jingle-rules, legend, letter, music-base, music-l1, music-l2, ping-hi, pop, remind, riser, row, rule-sweep, siren, stamp, thump, tick-low, tick, title, whoosh (all `.wav`).

### Adding a new sound
- `scripts/generate-audio.js` is procedural: no dependencies, no ffmpeg, seeded noise, so reruns give byte-identical files. It writes every `.wav` into `settings.sound.dir` (default `public/sounds`) and rewrites `src/sound-manifest.json` (name to length in seconds).
- A tone sound is one entry in the `TONES` table: `name: [T(at, freq, dur, type, vol, freq2?)]` (seconds, Hz, oscillator type, volume, optional end frequency), for example `pop: [T(0, 300, 0.3, 'sine', 0.22, 90)]`. Noise and sweep sounds (whoosh, drumroll, riser) are built in separate blocks of the script (not read).
- Steps: add the entry, run `npm run sounds`, then use the name in a cue. All gains are baked into the file (`MASTER 0.5 * sfxGain`), so cue volume stays at or below 1.
- Conflict with the task rules: `generate-audio.js`, `sound-manifest.json` and `public/sounds/` are shared GTW files, and the script regenerates all of them. Adding a search sound means editing shared files, which rule 3 forbids unless you allow it. Decide before the sound task (see the notes for 0c).

### Voiceover clip lookup
- Clips live in `public/voiceover/` (`settings.voiceover.dir`). `scripts/voiceover-scan.js` (`npm run voiceover`, also run first by `npm run render`) measures them and writes `src/voiceover-manifest.json`: `{ q, qq, bonus, bonusq, intro, scoreboard, outro }`, each entry `{ file, seconds }`. WAV length is read directly, other formats go through ffprobe.
- Fixed names: `qNN`, `qqNN`, `bonusNN`, `bonusqNN`, `intro`, `scoreboard_<rank>`, `outro`, in `.mp3 .wav .m4a .aac .ogg .flac`. The committed manifest is empty today.
- `voiceClip(kind, n)`, `voiceClipNamed`, `voiceClipScoreboard` in `timing.ts` turn a manifest entry into `{ file, frames }` (`ceil(seconds * 30)`), or `undefined` when there is no clip (nothing changes then). `settings.voiceover` has `enabled`, `dir`, `offsetFrames` 14, `tailFrames` 10, `volume`, `duckFloor`, `template`, `bonusTemplate`. Reveal holds are stretched so a clip always finishes before the card leaves.
- The names and manifest are tied to GTW's question numbers. The search video needs its own naming and its own manifest.

### Rendering and upload
- npm scripts: `dev` (remotion studio), `typecheck` (`tsc --noEmit`), `timeline`, `sounds`, `voiceover`, `render` (scan + `render-batches.js --lane`, one full render), `render:batches`, `render:lanes`, `render:fast`, `render:draft`, `render:full`, `pixel:dev`, `pixel:still`, `pixel:render`, `pixel:draft`, `postinstall` (`scripts/build-questions.js`, runs on `npm install`), `data`, `images*`.
- `scripts/render-batches.js` renders in resumable chunks (flags `--size`, `--only`, `--concat`, `--clean`, `--force`, `--lane`) and runs `remotion render <COMPOSITION> out/...`. Composition comes from the env var `REMOTION_COMPOSITION` (default `GuessTheWord`). It gets the length from `scripts/timeline.js`, so chunked mode is tied to the GTW timeline. For the search video use `npx remotion render <id>` or the workflow.
- Compositions registered in `src/Root.tsx`: `GuessTheWord`, `PixelGuess`, Stills `ThumbZero` etc. `src/Root.tsx` is a shared file; a search composition must be added there (rule 10 says to keep both sides on conflict).
- `.github/workflows/render-pixel.yml` ("Render Video (parallel)", `workflow_dispatch`). Inputs: `composition` (default `PixelGuess`), `entry` (default `src/index.ts`), `chunks` (40/20/10, default 40), `test_frames` (default `0` = full video), `crf` (18), `keep_days` (21), `preset` (slow/medium/fast, default slow), `video_name` (default `pixel-guess`; letters, numbers, - and _), `max_parallel` (40/20/10, default 40), `reuse_run_id` (default empty). It checks the composition id exists via Remotion's own list. Run it from Actions on the branch that holds the project.
- `.github/workflows/render.yml` has inputs `motion_blur` (default 'true'), `quality` (default `1440p`), `resume_from_run`, and no composition input (it reads the first composition of `src/index.ts`; not read in full). Use `render-pixel.yml` for the search video.
- `.github/workflows/upload-youtube.yml` (`workflow_dispatch`). Inputs: `run_id` (required, the render run number), `video_name` (required, same as the render), `title` (required, max 100), `description` (required, `\n` for new lines, max 5000), `keywords` (optional, comma separated), `privacy` (private/unlisted/public, default private), `made_for_kids` (no/yes, default no), `category_id` (default 24). `scripts/youtube_upload.py` reads everything from env vars (`VIDEO_FILE`, `YT_REFRESH_TOKEN`, client id/secret as repository secrets).
- `./tag-video NN ["title"] [voice-id]`: `git add -A`, commit "Finish video NN: ...", tag `video-NN-final`, push the current branch. Use only when you decide a video is final; it stages everything.

## C Data

## D Components

### SearchBar (src/search/components/SearchBar.tsx)
Generic dark search UI, no images. Bar with SVG magnifier, typewriter, blinking caret; below it a "Recent searches" panel with an SVG clock per row. A finished search holds, slides into the top row, and the bar clears. Newest row on top. All motion via `useDesignFrame` (ticks, local to the mounting scene).

Props `SearchBarProps`:
- `searches: string[]` the searches in typing order (4)
- `starts: number[]` start tick of each search (same length)
- `typeTicks: number` ticks per character (from settings)
- `accent: string` caret, magnifier, bar glow
- `size: number` bar width in 1280x720 reference units (px() applied inside)
- `at: { x: number; y: number }` bar centre-x and top-y, reference units
- `heading?: string` list label, default "Recent searches"

Exports:
- `typedCount(frame, start, length, typeTicks = 1)` visible characters. Character k (1-based) appears at `start + (k - 1) * typeTicks`. For a key-click on every second character, cue the even k at that tick. Pass `typeTicks` (the default 1 only matches one char per tick).
- `slideStart(start, length, typeTicks)` and `slideEnd(...)` ticks when a search starts and finishes sliding into the list.
- `HOLD_CHARS` (6) and `SLIDE_CHARS` (8): hold and slide lengths, as multiples of `typeTicks`.

Timing note: leave at least `slideStart` between one search's start and the next search's start (typed length + hold), or the bar clears mid-typing.

## E Scenes
