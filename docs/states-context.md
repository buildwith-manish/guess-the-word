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

## D Components (final pack)

All components live in `src/states/components/`. They are 2D SVG/HTML, prop-driven, and take time from `useDesignFrame()` (design ticks, 30 per second, local to the enclosing Sequence) unless a `frame` prop is passed. Sizes are px (use `px()` from style.ts). Colours: level accents only come from `states-settings.json` (via `LEVELS` in state-timing or `levelAccent(key)`). Nothing here has been rendered or viewed: look at the Studio still `ST-Components` first.

### File layout

```
scripts/build-states-geo.js        npm run states:geo       -> src/states/states-geo.json
scripts/check-states.js            npm run states:check     (11 checks on data + geo)
scripts/states-timeline.js         npm run states:timeline  (runtime, segments, chapters)
src/states/
  states-data.ts                   STATES (50, video order), getState(key)   facts, tiers, hints
  states-geo.json                  shape / mini / cells / borders per state  (generated)
  geo.ts                           getShape(key), SHAPE_BOX, MINI_BOX
  states-settings.json             levels (accent, bg, theme, time), fastest, streak, reminder, bonus, hints, ranks...
  states-voiceover-manifest.json   { intro, level, reveal, bonus, bonusq, scoreboard, outro } (empty)
  state-timing.ts                  TIMELINE, locate, buildQuestionPlan, LEVELS, PHASE, WIDTH/HEIGHT/RENDER_FPS, FPS
  types.ts                         StateQuestion, LevelCfg, Hud, IrisVariant, BonusKind, Segment, Timeline
  ComponentsSheet.tsx              the "ST-Components" Still (registered in src/Root.tsx)
  components/
    StateShape  TimerRing  EmojiFill  MiniMap  FlyIn  PixelReveal  CropMask  AnswerCard  StateStage
```

Tiers (from `states-data.ts`): EASY plain outline; MEDIUM `cropSide` (CropMask); HARD `rotation` (StateShape + EmojiFill `rotation`); EXPERT PixelReveal.

### StateStage (src/states/components/StateStage.tsx)

Layout frame of one question. Background reused from `src/Background.tsx` (theme = the level's `theme` pair). HUD is a small own pill (level + `n / total`): `src/Hud.tsx` is word-quiz specific (HudPlan, GTW bonus plan) so it is not reused. Slots take children and an `at` tick: before `at` the slot is not drawn, after it it fades in over a few ticks (`fade: false` to skip; the card slot defaults to no fade). `children` may be a function of the slot's rect. `STAGE_LAYOUT` (exported) holds the rects: `frame`, `safe`, `title`, `ring`, `shape`, `miniMap`. Use `STAGE_LAYOUT.shape` as FlyIn `from` and `STAGE_LAYOUT.miniMap` as FlyIn `to`.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `level` | "EASY" \| "MEDIUM" \| "HARD" \| "EXPERT" | required | picks theme and accent |
| `number` | 1..50 | required | shown in the HUD pill |
| `total` | number | TOTAL (50) | shown in the pill |
| `slots.title` | StageSlot | none | top centre, `STAGE_LAYOUT.title` |
| `slots.shape` | StageSlot | none | square box `STAGE_LAYOUT.shape`: StateShape / PixelReveal / CropMask / EmojiFill with `size = rect.w` |
| `slots.ring` | StageSlot | none | square box `STAGE_LAYOUT.ring`: TimerRing with `size = rect.w` |
| `slots.miniMap` | StageSlot | none | bottom right, `STAGE_LAYOUT.miniMap`: MiniMap with `size = rect.w` |
| `slots.overlay` | StageSlot | none | full frame, above the rest, below the card: FlyIn |
| `slots.card` | StageSlot | none | full frame: AnswerCard |
| `energy` | 0..1 | full look | Background phase (0 calm .. 1 reveal) |
| `frame` | ticks | useDesignFrame() | optional override |

`StageSlot = { at?: number; fade?: boolean; children: ReactNode | ((rect: Rect) => ReactNode) }`.

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

### MiniMap (src/states/components/MiniMap.tsx)

All 50 `mini` paths in the 975x610 map system. Unanswered = dim outline, answered = filled in the state's level colour (from states-settings.json), current = pulsing gold outline, `highlightRegion` = soft stacked-stroke glow (no filter). Time from `useDesignFrame()` unless `frame` is passed. Also exports `Rect` (`{x, y, w, h}`), `miniMapHeight(size)`, `levelAccent(key)` and `getMiniRect(key, mapRect)`.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `answered` | string[] | [] | keys drawn filled |
| `current` | string | none | key with the pulsing outline |
| `highlightRegion` | "West" \| "Midwest" \| "South" \| "Northeast" | none | region with a soft glow |
| `size` | px | required | map width; height = `miniMapHeight(size)` (size x 610 / 975) |
| `frame` | ticks | useDesignFrame() | optional override |

### FlyIn (src/states/components/FlyIn.tsx)

Moves the stage shape to its slot on the mini map on an eased arc (cssEaseInOut; the arc is 25% of the travel distance), scaling down, un-rotating and fading the glow on the way. Absolutely positioned: mount it in a layer with the same origin as the rects. Before `at` it sits on `from`; after `at + dur` it stays on its slot.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `stateKey` | string | required | two-letter key |
| `from` | Rect | required | the StateShape's square box on the stage |
| `to` | Rect | required | the MiniMap's box |
| `at` | ticks | required | flight start |
| `dur` | ticks | required | flight length |
| `accent` | CSS colour | COLORS.cyan | level accent, same as the stage shape |
| `rotation` | degrees | 0 | stage rotation; eases to 0 |
| `mode` | StateShapeMode | "filled" | StateShape mode while flying |
| `fill`, `glow` | 0..1 | 1, 1 | at take-off; glow fades out during the flight |
| `frame` | ticks | useDesignFrame() | optional override |

**How to compute the two rects** (both in the coordinate space of the layer FlyIn is mounted in):
- `from` = the StateShape's *square box*, not the fitted shape: `{ x, y, w: size, h: size }`, with x, y the top-left where the StateShape sits and `size` the same px value passed to it. (The fitted shape is centred in that box; `getShapeBox` gives its w and h.)
- `to` = the MiniMap's box: `{ x, y, w: mapSize, h: miniMapHeight(mapSize) }`, with x, y the top-left of the MiniMap and `mapSize` its `size` prop.
- FlyIn does the rest: it takes the state's `miniBBox` (`getMiniRect(key, to)`), centres the shape on it and scales it with `min(slot.w / fittedW, slot.h / fittedH)`, so the shape lands inside its bbox (the stage conic projection and the Albers map differ a little, so the fit is approximate).

### PixelReveal (src/states/components/PixelReveal.tsx)

EXPERT tier. Draws the state from the `cells` bit masks of states-geo.json as square blocks (one SVG path per grid, horizontal runs merged; no canvas, not PixelCanvas). `progress` picks the grid, coarsest first (the grids are the keys of `cells`: 12, 24, 48), then it cross-fades to a smooth `StateShape` outline over `[at, at + dur]`. Time from `useDesignFrame()` unless `frame` is passed.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `stateKey` | string | required | two-letter key |
| `size` | px | required | shape box side, same as StateShape `size` |
| `progress` | 0..1 | required | clock progress: 0..1/3 = 12, 1/3..2/3 = 24, 2/3..1 = 48 |
| `accent` | CSS colour | COLORS.cyan | level accent |
| `at` | ticks | required | cross-fade start (the reveal) |
| `dur` | ticks | required | cross-fade length |
| `frame` | ticks | useDesignFrame() | optional override |

### CropMask (src/states/components/CropMask.tsx)

MEDIUM tier wrapper. Hides one half of its children (StateShape, EmojiFill or both) with a soft edge (6% of the box); `reveal` slides the edge across the hidden half until all shows. Implemented as a CSS `mask-image` linear-gradient (also `-webkit-`), on a square wrapper. The mask is limited to the square box, so anything drawn outside it (StateShape glow, rotation overflow) is clipped.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `side` | "left" \| "right" \| "top" \| "bottom" | required | hidden half (the state's `cropSide`) |
| `reveal` | 0..1 | required | 0 = half hidden, 1 = all shown; ease it in the parent |
| `size` | px | required | shape box side, same as StateShape `size` |
| `children` | node | required | what to crop |

### AnswerCard (src/states/components/AnswerCard.tsx)

The reveal card: state name very large (Anton, uppercase, shrunk to fit long names), two-letter chip, capital, nickname in quotes and the fact line (hidden when `withFact` is false or the fact is empty). Stamp-in = `slamIn` from anim.ts (scale-down slam with blur), then a short decaying shake. **2D card, built from scratch**: Card3D is word + clue-image specific (`word`, `index` props), and RevealStyle does take `children` but applies its own six reveal styles chosen from `questionId` and needs `exit`, so it would fight the stamp. A parent can still wrap AnswerCard in RevealStyle if it wants one of those looks. The card is a flex-centred layer inside the safe margin (`SAFE_X` / `SAFE_Y` from style.ts, frame size from state-timing `WIDTH` / `HEIGHT`), width `S.resultW` capped to the safe width; mount it as a full-frame layer. Time from `useDesignFrame()` unless `frame` is passed.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `stateKey` | string | required | two-letter key |
| `at` | ticks | required | tick the stamp starts (e.g. the plan's `stamp`) |
| `accent` | CSS colour | required | level accent (border, chip, glow, nickname) |
| `withFact` | boolean | true | show the fact line (empty fact stays hidden) |
| `exit` | ticks | none | tick the card starts fading out (e.g. the plan's `exit`) |
| `frame` | ticks | useDesignFrame() | optional override |

### Example scene (compiled by tsc when it was written)

A question: the outline draws, then the clock ring appears and runs. Mount it inside a `<Sequence>` for the question segment (so `useDesignFrame()` is local to it).

```tsx
import React from 'react';
import { useDesignFrame } from '../clock';
import { prog, cssEaseInOut } from '../anim';
import { LEVELS, buildQuestionPlan } from './state-timing';
import { STATES } from './states-data';
import { STAGE_LAYOUT, StateStage } from './components/StateStage';
import { StateShape } from './components/StateShape';
import { TimerRing } from './components/TimerRing';

/** Question `index` (0-based): outline draws, then the clock runs. Mount inside a <Sequence> for the question segment. */
export const ExampleQuestion: React.FC<{ index: number }> = ({ index }) => {
  const f = useDesignFrame(); // local design ticks (30 per second)
  const plan = buildQuestionPlan(index);
  const level = LEVELS[plan.levelIndex];
  const L = STAGE_LAYOUT;
  const draw = prog(f, plan.drawStart, plan.drawFrames, cssEaseInOut);

  return (
    <StateStage
      level={level.name}
      number={plan.id}
      slots={{
        shape: {
          children: <StateShape stateKey={STATES[index].key} size={L.shape.w} progress={draw} glow={draw} accent={level.accent} />,
        },
        ring: {
          at: plan.timerStart,
          children: <TimerRing from={plan.timerStart} duration={plan.timerFrames} accent={level.accent} size={L.ring.w} />,
        },
      }}
    />
  );
};
```

For the reveal, add `slots.card: { children: <AnswerCard stateKey={key} at={plan.stamp} accent={level.accent} exit={plan.exit} /> }`; for the fly-in to the mini map add `slots.overlay: { children: <FlyIn stateKey={key} from={STAGE_LAYOUT.shape} to={STAGE_LAYOUT.miniMap} at={plan.stamp + plan.hold} dur={...} accent={level.accent} /> }` and hide the stage shape from `at` on.

### Cue-list pattern (from section B)

Sound is a flat list of cues built once by walking `TIMELINE.segments`, never by a running clock. In the word quiz (`src/sound.ts`): `Cue = { frame, sfx, rate?, volume? }`, `frame` an absolute design tick, entries added with a local `add(frame, sfx, extra)`; `Soundtrack.tsx` renders each as `<Sequence from={frame * TIME_SCALE}><Audio .../></Sequence>`, so any frame range renders in any order. A states version follows the same shape, using the question plan for offsets (sketch, not compiled; sfx names are the word quiz's from `sound-manifest.json`):

```ts
const cues: Cue[] = [];
const add = (frame: number, sfx: string, extra: Partial<Cue> = {}) => cues.push({ frame, sfx, ...extra });
for (const seg of TIMELINE.segments) {
  if (seg.kind !== 'question') continue;
  const plan = buildQuestionPlan(seg.index);
  const base = seg.from - (seg.lead ?? 0); // plan tick 0; check against how sound.ts treats `lead`
  add(base + plan.drawStart, 'thump');
  plan.hintAt.forEach((t) => add(base + t, 'thump'));
  add(base + plan.stamp, 'boom');
}
```

Voiceover clips follow the same rule as the word quiz: a clip starts `offsetFrames` into its segment and the segment stretches to hold it (`states-voiceover-manifest.json` keys: `level` by level name, `reveal` by question id, `bonus` / `bonusq` by slot 1-4, `scoreboard` by lowercase rank id).


## E Scenes
