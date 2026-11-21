# Video 4 — States context

## A Reuse inventory

Source: grep of `src/` at tag video-03-final (exports, props, imports of ./timing, ./types, ../settings.json, ./rounds.json, ./assets). Verdict rule: REUSE = props only, no GTW-coupled import; COPY-AND-ADAPT = reads GTW data/settings; DISCARD = word-quiz only. Not verified by running anything.

| File | Exports | Props | GTW-coupled imports | Verdict |
|---|---|---|---|---|
| Hud.tsx | `HudPlan` (type), `MAIN_HUD_PLAN`, `HudPlanContext`, `Hud` | `label, number, total, erases, eraseAt?, frame, landedAt?, barFrame?` | `./timing` (LEVELS, QUESTIONS, TOTAL), `../settings.json` (bonus.after) | COPY-AND-ADAPT: HudPlan is built from GTW LEVELS/QUESTIONS and bonus rounds; the 'BONUS' label and erase badge are word-quiz |
| Watermark.tsx | `Watermark` | `frame?` (unused) | `../settings.json` (brand.quiz, brand.matrix) | COPY-AND-ADAPT: light; only reads brand text, likely fine if settings.json keeps `brand` |
| Background.tsx | `Background`, `Bars` (stub, returns null) | `frame, theme, pulse?, hideBars?, dim?, iris?, energy?, mood?, depth?` | `../settings.json` (background) | COPY-AND-ADAPT: light; props-driven, reads only `settings.background` |
| Fx.tsx | `Confetti`, `Ring`, `Flash`, `COLORS` (re-export) | Confetti `frame, start, count?, seed?, origin?`; Ring `frame, start, size?, style?`; Flash `frame, start, ms?, peak?, at?` | none | REUSE. Note: Confetti default origin is 640/470 in 1280x720 units, pass origin explicitly |
| Iris.tsx | `Iris` | `frame, seg` (Segment kind 'iris') | `./timing` (BONUS_THEME), `./types` (Segment) | COPY-AND-ADAPT: needs a states segment type and theme source |
| LevelCard.tsx | `LevelCard` | `frame, levelIndex` | `./timing` (LEVELS, QUESTIONS), `../settings.json` | COPY-AND-ADAPT: level cards driven by GTW LEVELS and question counts |
| Reminder.tsx | `Reminder` | `frame, seg` (Segment kind 'reminder') | `./types` (Segment), `../settings.json`, `./timing` (FPS) | COPY-AND-ADAPT: needs a states segment type; FPS import must follow the 60 fps design clock |
| Scoreboard.tsx | `Scoreboard` | `frame, rowAt?` | `../settings.json` (scoreboard.ranks, text.scoreboard*, threeD) | COPY-AND-ADAPT: rank names and copy come from GTW settings |
| EndScreen.tsx | `EndScreen` | `frame` | `../settings.json` (endScreen, threeD) | COPY-AND-ADAPT: end-screen copy from GTW settings |
| Hook.tsx | `Hook` | `frame` | `./timing` (QUESTIONS, TOTAL), `../settings.json`, `./assets` (clueSrc) | COPY-AND-ADAPT: heaviest coupling; built on GTW clue images and question list |
| TitleLockup.tsx | `TitleLockup` | `frame, animate?, hideAt?, showAt?, exitAt?` | none (imports style, anim, gsap-helpers) | DISCARD: hard-codes the words GUESS / THE / WORD as keycap tiles; the tile-ignite mechanic could be borrowed for a new title |
| Card3D.tsx | `CARD3D_CANVAS_W`, `CARD3D_CANVAS_H`, `Card3D` | `frame, start, exit, index, word` | `./assets` (imageSrc) | COPY-AND-ADAPT: word-card with clue image; canvas size from style `S` |
| Solid3D.tsx | `Title3D`, `RankBadge3D`, `SubscribeButton3D` | Title3D `frame, start?, text, color, width, height, opacity?`; RankBadge3D `frame, start, flashAt, size`; SubscribeButton3D `frame, start, label, width, height` | none (three, @remotion/three, anim) | REUSE |
| RevealStyle.tsx | `RevealStyleName` (type), `revealStyleFor`, `RevealStyle` | `frame, start, exit, questionId, children` | none | REUSE: `revealStyleFor(questionId)` maps id to one of card-flip, shatter, curtain, spotlight, vault, slot-machine; check the mapping suits state ids |
| Sting.tsx | `BulbSting` | `frame, start, exit` | none | REUSE: channel (QUIZ MATRIX) bulb sting |
| CameraRig.tsx | `CameraRig` | `frame, duration, children` | none (camera, style) | REUSE |
| camera.ts | `handheld`, `bell` | n/a (functions: `handheld(frame)`, `bell(frame, duration)`) | none (imports ./anim) | REUSE |

Counts: REUSE 6, COPY-AND-ADAPT 10, DISCARD 1 (17 files).

Most coupled: Hook.tsx (timing + settings + assets), Hud.tsx (timing data + settings + bonus plan), LevelCard.tsx (LEVELS/QUESTIONS + settings). Reminder.tsx imports three GTW modules but only for the Segment type, settings and FPS.

### Helper export names only

- `style.ts`: SCALE, K, px, COLORS, FONTS, glass, SAFE_X, SAFE_Y, S
- `anim.ts`: prog, fadeIn, revealIn, slamIn, floatY, breathe, cubicBezier, htmlEase, irisEase, cssEase, cssEaseIn, cssEaseOut, cssEaseInOut, bounceEase, mergeEase, confettiEase, ms, keyframes, springStyle, riseStyle, mix, clamp01
- `gsap-helpers.js` (CommonJS `module.exports`): ease, backOut, backIn, expoOut, elasticOut, power3Out, power2InOut, sineInOut, linear, clamp01, mix, progress, stagger
- `util.ts`: makeRandom, shuffle, pickN, range, Glyph (type), glyphs, ConfettiPiece (type), makeConfetti
- `fonts.ts`: no exports; side-effect module that loads Anton, Poppins 600/800, JetBrains Mono, Noto Color Emoji via loadFont

## B Timing audio pipeline

Source: grep/read of src/timing.ts, clock.ts, sound.ts, Soundtrack.tsx, scripts/*, workflows, package.json at tag video-03-final. Nothing was run.

### Timeline

- Units: `FPS = 30` is the design tick rate; `RENDER_FPS = settings.fps`; `TIME_SCALE = RENDER_FPS / FPS` (2 at 60 fps). `WIDTH`/`HEIGHT` come from settings.json.
- All scene timing is in 30 fps ticks. `useDesignFrame()` (src/clock.ts) returns `useCurrentFrame() / TIME_SCALE` (fractional), so scenes sample at the full output rate.
- `buildTimeline()` in timing.ts pushes `Segment` objects with a local `push()` helper: each is `{ kind, from, duration, ... }` and `cursor += duration`. Kinds seen: `iris`, `hook`, `levelCard`, `question` (`index, erases, lead`), `reminder`, `bonus` (`index, puzzle`), `scoreboard`, `endScreen`. The `Segment` union type is in src/types.ts.
- `TIMELINE = buildTimeline()` (has `.segments`, `.totalFrames`). `RENDER_TOTAL_FRAMES = Math.round(TIMELINE.totalFrames * TIME_SCALE)`.
- `locate(segments, frame)` returns `{ seg, local, index }` (last segment whose `from <= frame`).
- Other timing exports: `WIDTH, HEIGHT, RENDER_FPS, FPS, TIME_SCALE, VoClip, voiceClip, voiceClipNamed, voiceClipScoreboard, LEVELS, QUESTIONS, TOTAL, QuestionPlan, LevelMood, levelMoodFor, themeForQuestion, BONUS_THEME, buildQuestionPlan, BONUS_CLOCK_START, bonusRevealHold, bonusQuestionVoice, bonusVoice, TIMELINE, RENDER_TOTAL_FRAMES, locate`.
- `buildQuestionPlan(q, levelIndex, isFirst)` returns a `QuestionPlan` of per-question frame offsets (fields used by sound.ts: `emojiStart, blanksStart, timerStart, timerSeconds, free[].at, flips, lettersDone, stamp, fast, vo, vqQuestion`).
- timing.ts imports `settings.json`, `./rounds.json`, `./bonus-engine`, `./voiceover-manifest.json`: it is the GTW-coupled core and must be replaced or forked for states (data from `src/states/states-data.ts`, timings from `src/states/state-timing.ts`).
- `npm run timeline` (scripts/timeline.js) bundles timing.ts with esbuild and prints the real frame plan (`--json`, `--segments`).

### Cues (sound effects)

- `sound.ts` builds `CUES: Cue[]` once by walking `TIMELINE.segments` in `buildCues()`; `Cue = { frame, sfx, rate?, volume? }`, `frame` is an absolute design frame (30 fps).
- Real entries are made with a local `add(frame, sfx, extra)`: e.g. `add(f0 + 3, 'thump')`, `add(f0 + 26, 'boom')`, `add(base + plan.flips + k * 1.4, 'letter', { rate: (520 + k * 60) / 520 })`, `add(base + plan.stamp, 'boom', { volume: PANIC.stampBoomVolume })`. Pitch is via `rate` (playback rate).
- `Sfx` type = keys of `src/sound-manifest.json` except `music-*` (value = clip seconds). `clipFrames(sfx, rate) = ceil(seconds * FPS / rate) + 1`.
- Other exports: `SOUND_ENABLED` (settings.sound.enabled), `MUSIC_LOOP_FRAMES = 256`, `Voice`, `VOICE_DIR` (settings.voiceover.dir), `VOICE`, `MUSIC_END` (start of the scoreboard segment), `MUSIC_ENVELOPES`, `layerAudible`.
- `Soundtrack.tsx` (`Soundtrack`, returns null when sound is off) renders every cue as `<Sequence from={frame * TIME_SCALE}><Audio src=staticFile('sounds/<sfx>.wav') playbackRate volume/></Sequence>`. Sequences, not a running clock, so any frame range renders in any order.
- Music: three phase-locked layers (`music-base.wav`, `music-l1.wav`, `music-l2.wav`) looped in 256-frame repeats, a repeat only mounts if its layer is audible. Intensity per question follows a `[0,1,1,2,2]` ramp; bonus rounds are level 2; music stops at `MUSIC_END`.
- Ducking: a per-frame envelope per layer is precomputed. Every cue drops music to `DUCK_FLOOR = 0.44` for ~0.28 s then recovers; `HUSHES` windows (silent beat before an answer lands) use `settings.sound.panic.hushFloor/hushRamp`; voiceover ducks to `settings.voiceover.duckFloor` (4 frames attack before the clip, 12 frames release after). Voice volume is `settings.voiceover.volume`.
- Sound files are generated by `npm run sounds` (scripts/generate-audio.js); sound.ts holds GTW-specific cue logic (question/bonus/scoreboard) and needs a states-specific cue builder.

### Voiceover clips

- `scripts/voiceover-scan.js` (`npm run voiceover`, also run first by `npm run render`, `render:*` and `pixel:render`) looks in `public/voiceover/` (settings.voiceover.dir) for: `qNN` (answer reveal), `qqNN` (question/timer phase), `bonusNN`, `bonusqNN`, `intro`, `outro`, `scoreboard_intro`, `scoreboard_legend|expert|good|beginner|keepgoing`. Extensions mp3 wav m4a aac ogg flac. Durations: WAV read directly, else ffprobe.
- It writes `src/voiceover-manifest.json`: `{ q: {"1": {file, seconds}}, qq, bonus, bonusq, intro: {file, seconds}, scoreboard: {rank: {...}}, outro: {...} }`.
- timing.ts reads it via `voiceClip(kind, n)`, `voiceClipNamed('intro'|'outro')`, `voiceClipScoreboard(rank)`; each returns `{ file, frames: ceil(seconds * 30) }` or undefined (also undefined if `settings.voiceover.enabled` is false). A clip starts right after the reveal lands, and the reveal hold is stretched so the clip finishes. No clip = no change.
- States will need its own clip naming and manifest (the GTW names are q/qq/bonus based); decide in a later task.

### Rendering and upload

- Local: `npm run dev` (Studio), `npm run typecheck` (`tsc --noEmit`), `npm run render` (voiceover-scan then `render-batches.js --lane`, one full render), `render:batches`, `render:lanes`, `render:fast`, `render:draft` (`--scale=0.5 --concurrency=4`), `render:full`; pixel quiz: `pixel:render`, `pixel:draft`, `pixel:still`. `postinstall` runs `scripts/build-questions.js`, so `npm install` regenerates question data.
- `render-batches.js` flags: `--size N` (default 1800 frames), `--only N`, `--concat`, `--clean`, `--force`, `--lane`; extra flags are forwarded to `remotion render`. Output `out/video.mp4`.
- `.github/workflows/render-pixel.yml` (workflow_dispatch) inputs: `composition` (default `PixelGuess`), `entry` (default `src/index.ts`), `chunks` (40|20|10, default 40), `test_frames` (default 0), `crf` (default 18), `keep_days` (default 21), `preset` (slow|medium|fast, default slow), `video_name` (default `pixel-guess`; letters, numbers, - and _ only), `max_parallel` (40|20|10), `reuse_run_id` (optional). Composition and entry are env `COMPOSITION` / `ENTRY`, validated, then `npx remotion compositions "$ENTRY" --json` checks the id exists. For video 4 pass `composition` (and `entry` if not src/index.ts) explicitly, the default is the pixel quiz.
- `.github/workflows/upload-youtube.yml` inputs: `run_id` (required, digits, the render run), `video_name` (required, same as render), `title` (required, max 100), `description` (required, `\n` = newline, max 5000), `keywords` (comma list), `privacy` (private|unlisted|public, default private), `made_for_kids` (no|yes), `category_id` (default 24). It runs `scripts/youtube_upload.py`, which reads env vars (`VIDEO_FILE`, and secrets `YT_CLIENT_*`, `YT_REFRESH_TOKEN`).
- `./tag-video <number> [title] [voice_id]` (e.g. `./tag-video 01 "Title" <voice_id>`): zero-pads the number, tags the video, 5 steps starting with `git add -A` and a commit. Not read beyond its usage and first steps.

### settings.json (root) top-level keys

fps, width, height, motionBlur, camera, voiceover, transitions, fastest, streak, brand, levelCardFrames, reminder, levels, levelThemes, timer, timing, bonus, scoreboard, endScreen, text, images, sound, threeD, background, levelMood.

## C Data

- Geometry (src/states/states-geo.json, built by `npm run states:geo`): US Census Bureau cartographic boundaries via us-atlas

### states-settings.json and types.ts (src/states/)

`states-settings.json` is the one place for level accents and the video's timings/thresholds (frames are 30 fps ticks, seconds are real seconds). Keys: `levels` (EASY, MEDIUM, HARD, EXPERT: `name, time, accent, bg, theme`), `fastest` (`questions, seconds, label`), `streak` (`milestones, label, cta`), `reminder` (`after, frames`), `bonus` (`after` = question ids 14/28/40/50, `kinds` = missing, borders, capital, nickname per slot), `hints` (`fractions` of the clock, 1/3 and 2/3), `reveal` (`minHoldSeconds`), `levelCardFrames`, `ranks` (`id, name, emoji, min, color`; `min` = lowest score for that rank, out of 50), `nextVideo` (`title, linkText`, empty). Level accents live only here. The `_provisional` key lists values that still need confirmation.

`types.ts` exports `StatesSettings` (typed from the JSON), `LevelCfg`, `StateQuestion`, `Hud`, `IrisVariant`, `BonusKind`, the `Segment` union (hook, levelCard, question, bonus, reminder, iris, scoreboard, endScreen) and `Timeline`.

## D Components

### StateShape (src/states/components/StateShape.tsx)

Prop-driven SVG of one state. No time inside: the parent samples `useDesignFrame()` and passes 0..1 values. Geometry comes from `getShape(key)` in `src/states/geo.ts` (also exports `SHAPE_BOX`, `MINI_BOX`, type `GeoState`).

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `stateKey` | string | required | two-letter key, e.g. "TX" |
| `size` | number | required | side of the square shape box in px (use `px()`) |
| `progress` | 0..1 | 1 | outline draw (evolvePath, each island/ring draws at once) |
| `fill` | 0..1 | 0 | gradient fill strength (vertical, accent, fades toward the bottom) |
| `glow` | 0..1 | 0 | strength of the stacked-stroke halo (no SVG filter) |
| `rotation` | degrees | 0 | clockwise, about the box centre |
| `mode` | "outline" \| "filled" \| "ghost" | "outline" | outline = neon stroke (+ fill); filled = silhouette with thin edge (+ glow); ghost = faint silhouette and edge |
| `accent` | CSS colour | COLORS.cyan | level accent |

Also exported: `getShapeBox(stateKey, size)` returns `{ w, h, box }` in px (fitted shape size and box side) for placing labels and pins. The shape is centred in the box; rotation does not change `w`/`h`.

### TimerRing (src/states/components/TimerRing.tsx)

Shrinking clock ring. Reads time from `useDesignFrame()` (ticks local to the enclosing Sequence) unless `frame` is passed. Colour = level accent, `COLORS.red` in the last second (`FPS` ticks from state-timing), seconds shown with Anton, a pulse (digits scale, halo brightens) once per whole second elapsed. Glow is stacked strokes, no filter.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `from` | ticks | required | tick the clock starts |
| `duration` | ticks | required | clock length, e.g. `buildQuestionPlan(i).timerFrames` |
| `accent` | CSS colour | required | level accent from states-settings.json |
| `size` | px | required | outer diameter (use `px()`) |
| `digits` | "center" \| "below" \| "none" | "center" | where the remaining seconds go |
| `frame` | ticks | useDesignFrame() | optional override from a parent |

### EmojiFill (src/states/components/EmojiFill.tsx)

The state's three `hintEmoji` tiled in a grid (NotoColorEmoji, loaded by importing `src/fonts.ts`), clipped to the state shape, faded in from `at`. **Approach: HTML grid + CSS `clip-path: url(#id)`** to an inline SVG `<clipPath clipPathUnits="objectBoundingBox">` holding the same shape path scaled by 1/SHAPE_BOX (SVG text was not used). The shape box is square, so the clip scales with `size`. Not rendered or viewed yet.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `stateKey` | string | required | two-letter key |
| `size` | px | required | shape box side, same as StateShape `size` |
| `at` | ticks | required | tick the fade-in starts |
| `fadeTicks` | ticks | 10 | fade length |
| `rotation` | degrees | 0 | same as StateShape; the clip rotates, the emoji stay upright |
| `opacity` | 0..1 | 1 | peak opacity |
| `frame` | ticks | useDesignFrame() | optional override from a parent |

## E Scenes
