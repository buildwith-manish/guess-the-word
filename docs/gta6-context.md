# GTA 6 quiz: shared context (task 1a)

Written from branches `us-states`, `search-history`, `pixelated-quiz` and `main` (paths + exported names only; bodies not copied).
Branch `gta6-quiz` did not exist on the remote; it was created from `main`.

## 0. Conventions that matter

- Remotion 4.0.539 (`remotion`, `@remotion/cli`, `@remotion/fonts`, `@remotion/three` pinned; `@remotion/motion-blur` ^4.0.539), React ^19, TypeScript ^5.6.
- **Output size and rate (root `settings.json`, same on every branch): `fps` 60, `width` 2560, `height` 1440.** Compositions are 2560x1440 at 60 fps, NOT 1920x1080. See "Gaps" for the conflict with the task brief.
- Layout units are a 1280x720 reference frame; `px(v)` (`src/style.ts`) multiplies by `SCALE = 2`. `src/ios/layout.ts` (search-history only) exports `FRAME {w:1280,h:720}`, `SAFE_X` 64, `SAFE_TOP` 56, `SAFE_BOTTOM` 40, `HUD_H` 48, `CONTENT`.
- Clock: scenes are authored in 30 fps "design frames" (ticks). `FPS = 30`, `TIME_SCALE = RENDER_FPS / FPS = 2`. `useDesignFrame()` in `src/clock.ts` = `useCurrentFrame() / TIME_SCALE` (fractional ticks). Each video has its own timing file that re-exports `WIDTH, HEIGHT, RENDER_FPS, FPS, TIME_SCALE`.
- Composition length = `Math.round(TIMELINE.totalFrames * TIME_SCALE)`.
- Timeline: plain segments `{ kind, from, duration, ... }` built by a private `buildTimeline()` with a cursor; `locate(segments, frame)` returns `{ seg, local, index }`. Scenes draw from `local`.
- Registration (`src/Root.tsx`, shared file): `<Composition id=... component=... durationInFrames={..._TOTAL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />`; per-round previews use `calculateMetadata` (ids `ST-Round`, `SH-Round`); component sheets are `<Still>` (`ST-Components`, `SH-Components`). `src/index.ts` is `registerRoot(RemotionRoot)`.
- `remotion.config.ts` (do not change): jpeg 95, h264, yuv420p, CRF 18, concurrency <= 2, `swangle`, delayRender timeout 120000.
- Motion blur: `settings.json` `motionBlur {mode:'windows', shutterAngle:180, samples:2}`; applied with `CameraMotionBlur` from `@remotion/motion-blur` in `StateMain.tsx`.

## 1. Reuse table

| reuse | path | exports | notes |
|---|---|---|---|
| iOS tokens + frosted card | `src/ios/tokens.ts` (us-states, search-history) | `IOS` (`font`, `weight`, `color` {bg, bgRaised, label, secondary, tertiary, fill, fillStrong, hairline, blue, green, orange, red}, `radius` {sm 8, md 14, lg 22, xl 30}, `space` 8-pt scale, `blurPx` 22), `iosSurface(radius, shadow=1)` | Frosted card = `rgba(255,255,255,.10)` fill + `backdropFilter blur(22px) saturate(1.4)` + hairline + soft shadow. Sizes are reference units, wrap in `px()`. Font is Inter. |
| iOS barrel | `src/ios/index.ts` | `IOS`, `iosSurface`, `spring`, `easeOut`, `IosBackground` (+ `FRAME, SAFE_X, SAFE_TOP, SAFE_BOTTOM, HUD_H, CONTENT` on search-history only) | Importing it loads Inter. us-states copy lacks the layout re-export. |
| iOS spring | `src/ios/motion.ts` | `spring(t)`, `easeOut(t)` | `spring(t)` for t 0..1 over 0.3 to 0.45 s. |
| iOS background | `src/ios/IosBackground.tsx` | `IosBackground` props `{ accent }` | Near-black with two faint slow accent lights. |
| iOS fonts | `src/ios/fonts.ts` | side-effect only | Loads Inter. |
| Brand badge (probably discard) | `src/ios/QuizMatrixBadge.tsx`, `badge-motion.ts` | `QuizMatrixBadge` (`frame, since?, height, logo, quiz, matrix`), `QuizMatrixLogo`, `BADGE_TIMING`, `BADGE_SLIDE`, `badgeMotion` | Channel brand lockup; GTA video should not use it. |
| States glass + tokens | `src/states/look.ts` (us-states) | `GLASS`, `RIM`, `CORNERS`, `RADIUS`, `glassPanel(radius, accent?, depth)`, `SOFT_GLOW`, `COLOR`, `BACKDROP`, `whiteA`, `blackA`, `FONT` | Richer iOS glass than `iosSurface`; squircle corners. |
| States spring system | `src/states/motion.ts` | `SPRINGS`, `SpringName`, `STAGGER`, `DUR`, `IOS_OUT`, `FLIGHT`, `SETTLE`, `iosOut`, `spr(frame, start, preset)`, `settleTicks`, `stagger`, `exitTicks`, `settle` | Named spring presets driven by Remotion springs at design frame. |
| Rise-in helper | `src/states/ios-rise.ts` | `rise(frame, at, len, dist=24, preset?)`, `Rise` | Fade + translate entrance. |
| Status bar | not found | none | No status bar / notch / home indicator component exists on any branch (see Gaps). |
| Timer (ring) | `src/states/components/TimerRing.tsx` (us-states) | `TimerRing` `{ from, duration, accent, size, digits='center', frame, ready, after=6 }`, `TimerRingProps` | Draining ring with seconds. |
| Timer lead-in | `src/states/components/TimerLead.tsx` | `TimerLead` `{ frame, voice, readyStart, timerStart, timerFrames, revealStart, accent, size }`, `timerLeadStart` | Get-ready beat before the clock. |
| TimerBar | `src/search/components/TimerBar.tsx` (search-history) | `TimerBar` `{ from, duration, accent, size, at }`, `TimerBarProps` | Draining bar, whole seconds at right, pulse each second, red in last second. Props are plain (no data import). |
| SearchBar typing effect | `src/search/components/SearchBar.tsx` | `SearchBar` `{ searches, starts, typeTicks, size, at, heading?='Recent searches', recentCount? }`, `typedCount`, `slideStart`, `slideEnd`, `typeTicksOf`, `HOLD_CHARS` 6, `SLIDE_CHARS` 8, `SearchBarProps` | Typewriter + caret + recent list. |
| Typing math | `src/search/typing.ts` | `charTick(start, text, k, typeTicks)`, `typingTickFrames(start, text, typeTicks)`, `typedChars(frame, start, text, typeTicks)` | Use to drive key-click cues. |
| Round stage layout | `src/search/components/SearchStage.tsx` | `SearchStage`, `SLOTS`, `Rect`, `SlotProps`, `SearchStageProps` | Slot-based round layout (search, timer, hint, answer, dots) with HUD pill. |
| Small round parts | `src/search/components/` | `ProgressDots`, `HintEmoji`, `HintClue`, `AnswerCard`, `AnswerPicture`, `SearchTitleLockup`, `SearchWatermark` | Plain-prop components. |
| Iris wipe (search) | `src/search/scenes/SearchIris.tsx` | `SearchIris` `{ frame, seg, next? }`, `searchIrisCues` | Variants `circle` / `sweep` / `curtain` via clip-path (`wipeClip`), content overlap on the new theme. |
| Iris wipe (states) | `src/states/scenes/StateIris.tsx` | `StateIris` `{ frame, seg }`, `irisLook`, `irisProgress`, `stateIrisOverlap`, `stateIrisCues`, `StateHudPill`, `StateTitleSlot`, `IrisSegment`, `StateIrisLook` = `IrisVariant | 'pixel'` | Adds a `'pixel'` dissolve (`PIXEL_WIPE {cell 40, noise .6, seed 4}`). `IrisVariant` = circle/sweep/curtain in both types.ts files. |
| Scoreboard scene (search) | `src/search/scenes/SearchScoreboard.tsx` | `SearchScoreboard` `{ frame }`, `CLOSING_LINE`, `searchScoreboardCues` (`scenes/searchScoreboardCues.ts`) | Ranks/colours come from `src/search/search-settings.json` `ranks` (`[{name, min, accent}]`), max score from `search-data.ts` (`MAX_SCORE`). Closing line is hard-coded in the file (TODO in source). |
| Scoreboard scene (states) | `src/states/scenes/StateScoreboard.tsx` | `StateScoreboard` `{ frame }`, `SB`, `legendLandsAt`, `scoreboardVoicePlan`, `stateScoreboardCues`, `ScoreboardVoice` | Ranks from `states-settings.json` `ranks`. |
| Rank-card scene | no separate scene on any branch | none | Ranks are rows inside the scoreboard scenes. `RankBadge3D` lives in `src/Solid3D.tsx` (main, GTW-coupled, 3D). |
| Pixelated-quiz blur-to-sharp | `src/pixel/PixelCanvas.tsx` (branch `pixelated-quiz`, also on the others) | `PixelCanvas` (`cells` null = full res) | Branch exists. It is block **pixelation**, not blur: crop to square, box-downscale to `cells x cells`, redraw with smoothing off. Steps in `src/pixel/pixel-timing.ts`: `PIXEL_STEPS = [8, 12, 20, 32, 48]`. Also `PixelRound`, `PixelLevelCard`, `PixelIntro`, `PixelMain`. |
| Pixel reveal (states) | `src/states/components/PixelReveal.tsx` | `PixelReveal` `{ stateKey, size, progress, accent, at, dur, frame }` | Progress-driven pixel-to-sharp on a state shape. No real Gaussian blur-to-sharp component exists. |
| Camera | `src/CameraRig.tsx`, `src/camera.ts` | `CameraRig` `{ frame, duration, children }`, `handheld(frame)`, `bell(frame, duration)` | No GTW coupling. |
| FX | `src/Fx.tsx` | `Confetti`, `Ring`, `Flash`, `COLORS` | The iOS theme rules say no glow/shake/confetti; use sparingly. |
| Style helpers | `src/style.ts`, `src/anim.ts`, `src/util.ts`, `src/clock.ts` | style: `SCALE`, `K`, `px`, `COLORS`, `FONTS`, `glass`, `SAFE_X`, `SAFE_Y`, `S`. anim: `prog`, `fadeIn`, `revealIn`, `slamIn`, `floatY`, `breathe`, `cubicBezier`, `irisEase`, `bounceEase`, `springStyle`, `riseStyle`, `mix`, ... util: `makeRandom`, `shuffle`, `pickN`, `range`, `makeConfetti`. clock: `useDesignFrame` | `src/theme.ts` does not exist; tokens are in `src/ios/tokens.ts`, `src/style.ts`, `src/states/look.ts`. |
| Per-video timing | `src/search/search-timing.ts`, `src/states/state-timing.ts` | `WIDTH, HEIGHT, RENDER_FPS, FPS, TIME_SCALE, TOTAL, LEVELS, BONUS_THEME, TIMELINE, RENDER_TOTAL_FRAMES, locate`, plan builders (`buildRoundPlan(index)` / `buildQuestionPlan(index, withTitle)`), `VoClip`, voice lookups (`voiceIntro`, `voiceOutro`, `voiceLevel`, `voiceReveal`, ...) | Copy the pattern into `src/gta6/timing.ts`. Voice clips come from a manifest, `frames = ceil(seconds * 30)`, `undefined` when no clip. |
| Intro / hook | `src/search/scenes/SearchHook.tsx`, `src/states/scenes/StateHook.tsx` | `SearchHook` `{ frame, duration? }`, `hookPlan`, `searchHookCues`; `StateHook`, `HOOK_BEATS`, `HOOK_PLAN`, `stateHookPlan`, `hookRulesLine`, `hookQuestionLine`, `stateHookCues` | Hook text is built in the scene file from data (`TOTAL`), partly hard-coded; adapt. |
| Level card | `src/search/scenes/SearchLevelCard.tsx`, `src/states/scenes/StateLevelCard.tsx` | `SearchLevelCard`; `StateLevelCard` `{ frame, levelIndex, duration? }`, `LEVEL_BEATS`, `tierOf`, `stateLevelCardCues`, `stateLevelCardVoice` | |
| Reminder pill | `src/search/scenes/SearchReminder.tsx`, `src/states/scenes/StateReminder.tsx` | `StateReminder` `{ frame, seg }`, `REMINDER_BEATS`, `reminderTimes`, `stateReminderCues` | |
| Outro / end card | `src/search/scenes/SearchEndScreen.tsx`, `src/states/scenes/StateEndScreen.tsx` | `SearchEndScreen` `{ frame }`, `SCORE_LINE`, `CHARACTER_LINE`; `StateEndScreen`, `END_SLOTS`, `EB`, `endScreenVoice`, `stateEndScreenCues` | End-screen slots `videoLeft`, `videoRight`, `subscribe`. `main` also has `src/EndScreen.tsx` and `src/Hook.tsx` (GTW-specific, discard). |
| Round scene | `src/search/scenes/SearchRound.tsx`, `src/states/scenes/StateRound.tsx` | `SearchRound` `{ frame, index, lead }`, `SearchRoundPreview`, `roundPreviewFrames`; `StateRound` `{ frame, index, lead=0, withTitle=false }`, `StateRoundPreview`, `StateRoundProps` | Round cues: `scenes/searchRoundCues.ts`, `scenes/stateRoundCues.ts` (`stateRoundCues(index, withTitle)`, `StateCue`, `StateSfx`, `isStreakMilestone`, `streakAt`). |
| Main wiring | `src/search/SearchMain.tsx`, `src/states/StateMain.tsx` | `SearchMain`, `StateMain` | `locate(TIMELINE.segments, frame)` picks the scene; `CameraRig` around card scenes, `CameraMotionBlur` outside; soundtrack mounted beside scenes. |
| Audio / SFX plan | `src/sound.ts` (main), `src/search/search-sound.ts`, `src/states/state-sound.ts` | `Cue = { frame, sfx, rate?, volume? }`, `Sfx`, `Voice`, `SOUND_ENABLED`, `MUSIC_LOOP_FRAMES` 256, `clipFrames`, `VOICE_DIR`, `CUES`, `VOICE`, `MUSIC_END`, `MUSIC_ENVELOPES`, `layerAudible`; states adds `SFX_TRIM_DB`, `cueGain`, `edgeGain`, `EDGE_FADE`, `STATE_CUES`, `STATE_VOICE`, `RAMP` | Each video builds its own `buildCues()` over its own `TIMELINE`. Cue frames are absolute design frames. |
| Soundtrack component | `src/Soundtrack.tsx`, `src/search/SearchSoundtrack.tsx`, `src/states/StateSoundtrack.tsx` | `Soundtrack`, `SearchSoundtrack`, `StateSoundtrack` | One `<Sequence><Audio/></Sequence>` per cue and per voice clip; three music layers (`music-base/l1/l2.wav`) with baked ducking envelopes (SFX floor 0.44, voice floor `voiceover.duckFloor` 0.3). |
| SFX files + generator | `public/sounds/*.wav`, `scripts/generate-audio.js`, `src/sound-manifest.json` | n/a | Existing names: blip, boom, bulb-ping, chime-arp, chime-erase, ding-hi, ding, drumroll, flare, flip, jingle-cta, jingle-rules, legend, letter, music-base, music-l1, music-l2, ping-hi, pop, remind, riser, row, rule-sweep, siren, stamp, thump, tick-low, tick, title, whoosh. Adding a sound edits shared files (decide before the sound task). |
| Voiceover scan | `scripts/voiceover-scan.js` (`npm run voiceover`), `scripts/search-voiceover-scan.js`, `scripts/states-voiceover-scan.js` | manifest JSON | Search: `src/search/search-voiceover-manifest.json`. |
| Settings JSON | `settings.json` (root), `src/search/search-settings.json`, `src/states/states-settings.json` | search keys: `levels`, `searchAt`, `recent`, `voiceClue`, `think`, `reveal`, `bonus`, `reminder`, `levelCardFrames`, `ranks`, `typing`, `nextVideo`, `camera`. states keys: `_provisional`, `levels`, `fastest`, `streak`, `reminder`, `bonus`, `hints`, `tiers`, `reveal`, `levelCardFrames`, `ranks`, `nextVideo` | Level shape `{ name, time (s), accent, bg, theme [a, b] }`. Ticks = 1/30 s. No file named `search-settings.json` feeds anything but `src/search/*`; scoreboard reads `ranks` directly. |
| Render | `.github/workflows/render-pixel.yml` ("Render Video (parallel)"), `render-video.yml`, `scripts/render-batches.js` | workflow inputs `composition`, `entry`, `chunks`, `test_frames`, `crf`, `preset`, `video_name`, `max_parallel`, `reuse_run_id` | `render-batches.js` and `scripts/timeline.js` are hard-wired to GTW's `timing.ts`. |

## 2. How round data was structured and timed (us-states)

Content lives in `src/states/states-data.ts`: `ROWS` become `STATES: readonly StateInfo[]` (`Region`, `Level` EASY/MEDIUM/HARD/EXPERT, `CropSide`, `HintEmoji`, `getState(key)`). `state-timing.ts` maps each state to a `StateQuestion` `{ id (1-50 in video order), key, level, rotation?, cropSide?, fact? }`, with `LEVELS` from `states-settings.json` (clock seconds, accent, bg, theme pair). Phases authored in code: `PHASE { draw 36, beatBeforeClock 14, revealBuild 36 }` ticks; bonus phases come from root `settings.bonus`. `buildQuestionPlan(index, withTitle)` returns a `StateQuestionPlan` with every offset in scene-local ticks (title, draw, ready beat, clock start/length = level seconds x 30, reveal start, stamp, hold, exit, duration). A private `buildTimeline()` walks hook, level cards, rounds (with iris wipes between levels), bonus rounds, reminders, scoreboard, end screen, accumulating `from` with a cursor. Voice clips (manifest-driven) can lengthen holds so a clip always finishes before the card leaves. Search-history does the same with `ROUNDS` / `BONUS` in `search-data.ts`, `buildRoundPlan(index)`, and level/`searchAt`/`hintAt` fractions of the clock.

## 3. Gaps (must be built new for GTA 6)

1. **Size/clock mismatch.** Task brief says 1920x1080 compositions with 4K via scale; the repo is 2560x1440 at 60 fps with 1280x720 reference units and `px()` x2. Nothing in the repo uses 1920x1080. Decision needed: follow the repo (recommended, all reused components assume it) or add a 1920x1080 variant.
2. `src/gta6/data.ts` and `src/gta6/timing.ts` (45 items, `TIMELINE`, `locate`, `RENDER_TOTAL_FRAMES`) do not exist.
3. iOS **status bar** (time, signal, battery, notch/dynamic island) and home indicator: no component exists.
4. A real **blur-to-sharp** reveal (Gaussian blur radius easing to 0): only pixelation (`PixelCanvas`, `PixelReveal`) exists.
5. A dedicated **rank-card** scene: ranks only exist as scoreboard rows.
6. Square or phone-style iOS cards (notification banner, sheet, widget) beyond `iosSurface` / `glassPanel`.
7. GTA-specific sound names (if any) need the shared audio generator edited, or reuse existing names.
8. A 45-item layout of `ProgressDots` / HUD pill (search-history layout sized for 30 + 3).
9. Per-video voiceover manifest and scan script for the GTA naming.
10. Known issue carried over from search-history: `searchAt` spacing vs `typing.ticksPerChar` can clear the bar mid-sentence (long searches); fix before reusing `SearchBar` for typed questions.

## 4. GTA 6 modules (added by task 1d)

### `src/gta6/data.ts` exports
- Types: `Level` = `'easy' | 'medium' | 'hard'`; `Kind` = `'q' | 'bonus'`; `Item` = `{ n: string; order: number; level: Level; kind: Kind; q: string; options: string[]; answer: number; reveal: string; didYouKnow?: string; look: string; extra: string; timerSec: number; fastest: boolean; verify?: string }`.
- `items: Item[]` (45, sorted by `order`), `levels: Level[]`, `byLevel: Record<Level, Item[]>`, `levelColors: Record<Level, string>`.
- `rankTiers` (`{ name, min, max }`, LEGEND 41-45 down to KEEP GOING 0-13).
- `extraIds(item): string[]` splits `item.extra` on commas.

### `src/gta6/timing.ts` exports (task 1c; listed from its `export` lines)
- Clock: `WIDTH`, `HEIGHT`, `RENDER_FPS` (from root `settings.json`), `FPS = 30`, `TIME_SCALE = RENDER_FPS / FPS`.
- Phase seconds: `hookSec`, `readSec`, `holdSec`, `revealFullSec`, `revealFastSec`, `dykSec`, `bannerSec`, `levelCardSec`, `scoreCardSec`, `scoreboardSec`, `outroSec`; `targetSec = { min, max }`.
- Conversions: `secToTicks(sec)`, `ticksToSec(ticks)`, `ticksToFrames(ticks)`, `secToFrames(sec)`, `timecode(sec): string`, hook `useGta6Frame(): number` (design ticks).
- Types: `Range { from, to }`, `ItemPhases { banner?, read, timer, hold, reveal, dyk? }`, `Segment`, `PartRange`.
- Helpers: `isFullReveal(item: Item): boolean`, `scoreCardLevel(item: Item): Level | undefined`.
- Timeline: `segments: Segment[]`, `TOTAL_TICKS`, `TOTAL_SEC`, `RENDER_TOTAL_FRAMES`, `locate(tick): { seg, local, index }`, `partRanges: PartRange[]`, `chapters: string[]`.

### SFX ids (`src/gta6/sfx.ts`, files in `public/gta6/sfx/`)
- Ids: `chime-easy`, `ping-medium`, `pulse-hard`, `tick`, `whoosh`, `correct`, `wrong-fade`, `buzz-small`, `notification`, `shake-thud`, `streak`, `scorecard`.
- `SfxId`, `SfxEntry { id, file, length (s), frames (30 fps design frames) }`, `SfxCue { frame, sfx, rate?, volume? }`.
- `cue(id, frame, opts?) => SfxCue`, `sfxIds`, `sfxManifest`, `sfxEntry(id)`, `sfxLength(id)`, `sfxFrames(id)`, `sfxSrc(id)` (uses `staticFile`).
- Regenerate with `python3 scripts/make_gta6_sfx.py` (also rewrites `src/gta6/sfx-ids.ts`).

## 5. Components (tasks 2a to 2e)

Units: authored in a 1920x1080 reference frame; `u(v)` scales by `WIDTH / 1920` (2560x1440 composition today, so x1.333). Every `frame`, `at`, `dur`, `outAt` is a local design tick (30 per second, as `useGta6Frame()`; render frame = tick x 2). All states are pure functions of those numbers: no internal timers. Text and numbers come from props (or from `item`), never from the component, except the two default labels noted in the table.
The `src/ios/` layer is not on this branch, so nothing is imported from it: font stack and springs are local equivalents.

### `src/gta6/system.ts`
- Layout: `FRAME {w:1920,h:1080}`, `UNIT`, `u(v)`, `SAFE {x:96, top:72, bottom:72}`, `safeBox {left,right,top,bottom,w,h}`.
- `colors`: `easy`, `medium`, `hard` (from `levelColors` in data.ts), `level` (record), `ink`, `muted`, `mutedStrong`, `glass`, `glassStrong`, `hairline`, `shadow`, `onAccent`.
- Type: `fontStack` (Inter, then SF/system), `tabular` (tabular numerals), `type` roles `caption|body|choice|question|title|number` `{size, weight, lineHeight}`, `TypeRole`, `textStyle(role)` (includes tabular numerals), `radius {sm,md,lg,xl}`, `blurPx`.
- Motion: `SPRINGS {gentle, snappy, bouncy}`, `SpringName`, `springAt(frame, at, preset='snappy'): number` (0..1).
- Backgrounds: `levelBackground: Record<Level, string>` (dark radial gradients).

### Shared components (`src/gta6/components/`, all exported from `index.ts`)

| component | file | props (defaults) | notes |
|---|---|---|---|
| `QuestionShell` | `QuestionShell.tsx` | `item`, `start` (absolute design tick the item begins), `children: (ctx: ShellContext) => ReactNode` (the look), `labels? { spoiler?, banner? }`, `showTimer?=true` | Common layout of every look. Layers back to front: `levelBackground`, look inside `Shake`, `ScoreHud`, `TimerRing` slot, `SpoilerBadge`, `DidYouKnowCard`, `NotificationBanner`, `EdgeGlow`. Computes phases from the item's own segment in `timing.ts`, shifted to local ticks. `ctx` = `{ item, level, phase, localFrame, phases, revealFrom, revealMode, urgentFrom }`; `phase` is `banner | read | timer | hold | reveal | dyk`. `revealFrom`/`revealMode` go straight to `RevealEngine` (`from`/`mode`). Last 3 s (`URGENT_SECONDS` back from the end of the timer): `Shake` over the look and `EdgeGlow`; the glow fades out over 8 ticks after the timer. Also exports `SLOTS` (slot positions), `localPhases(item)`, `phaseAt(f, phases)`, types `ShellContext`, `ShellPhase`, `ShellLabels`, `LocalPhases`. Score = `item.order`, tweening from `order - 1`, total `items.length`, `levelTotals` from `byLevel`. |
| `FrostCard` | `FrostCard.tsx` | `children?`, `frame?`, `at?=0`, `level?`, `width?`, `height?`, `padding?=32`, `radius?=34`, `style?` | Frosted glass card. No `frame` = static; with `frame` it rises in from `at`. |
| `ChoiceChip` | `ChoiceChip.tsx` | `index` (0-3 = A-D), `text`, `state` (`idle \| tremble \| greyed \| correct`), `frame`, `at`, `stateAt?`, `level?`, `width?=1100`, `height?=132` | Tremble = deterministic sine shake; `correct` fills green and springs to 1.06. |
| `RevealEngine` | `RevealEngine.tsx` | `item`, `frame`, `from` (start of the hold phase), `mode` (`full \| fast`), `level?`, `enterAt?=0`, `width?`, `height?`, `gap?=20`, `children?: (states: OptionState[]) => ReactNode` | Hold, then wrong options grey out (full: one by one, fast: together), then the correct one expands. Default render uses `ChoiceChip`. Helpers: `optionStateAt`, `optionListHeight`, `revealEndSec`, `revealEndTicks`, `expandStartSec`, `REVEAL`. |
| `TimerRing` | `TimerRing.tsx` | `frame`, `at`, `dur`, `variant?` (`ring \| island`), `level?`, `size?=200`, `digits?=true` | Draws nothing before `at`. Ring fills over `dur`; red and pulsing in the last 3 s. `island` = black pill with mini ring (Hard). Math: `timerMath(frame, at, dur)`, `URGENT_SECONDS = 3`. |
| `EdgeGlow` | `EdgeGlow.tsx` | `frame`, `at`, `dur?=90` | Red inset glow, 0 at `at`, full at `at + dur`, then stays full. Fills its parent (absolute). |
| `Shake` | `Shake.tsx` | `frame`, `at`, `dur`, `amp?=6`, `seed?=1`, `children?`, `style?` | One hash-based offset per tick, fast ramp in, linear fade out, no `Math.random`. Also exports `seeded(n)`. |
| `LowPowerTint` | `LowPowerTint.tsx` | `frame`, `at`, `dur` | Yellow screen overlay, 6-tick fade at each end. |
| `LowPowerRing` | `LowPowerTint.tsx` | `frame`, `at`, `dur`, `size?=200`, `digits?=true`, `turnsPerSecond?=2` | Yellow ring filling over `dur` while spinning. `colors.lowPower` = #FFD60A. |
| `ScoreHud` | `ScoreHud.tsx` | `score`, `total`, `from?`, `frame?`, `at?`, `levelTotals?` (`[easy, medium, hard]`, default thirds of `total`) | Top-right at `SAFE`. "n / total" plus three level rings filling in sequence. The number is the POSSIBLE score and climbs by item index; answers are not scored on screen. `from` + `frame` + `at` tween with the snappy spring. |
| `StreakChip` | `badges.tsx` | `count`, `unit`, `label`, `frame`, `at`, `outAt?` | Amber pill "N unit label"; the scene supplies every string. |
| `SpoilerBadge` | `badges.tsx` | `text`, `frame`, `at`, `outAt?` | Green pill. |
| `FastestBadge` | `badges.tsx` | `text`, `frame`, `at`, `outAt?` | Amber pill with bolt glyph. |
| `ControlCenterTiles` | `ControlCenterTiles.tsx` | `tiles: RuleTile[]` (`{ value?, label }`), `frame`, `at`, `outAt?`, `stagger?=4`, `tileSize?=250` | Tiles stagger in, all gone by `outAt`. A tile with no `value` shows a ring-check glyph. |
| `LockNotification` | `LockNotification.tsx` | `frame`, `at`, `appName`, `title`, `body`, `timeLabel`, `options` (4), `level` | Lock-screen banner over a blurred 2x2 answer grid. Renders `null` outside `[at, at + 30]`. Exports `LOCK_NOTIFICATION_TICKS = 30`, `LOCK_BEATS { gridIn 0, bannerIn 4, bannerOut 24, end 30 }`, `lockNotificationEnd(at)`. Put the `notification` SFX at `at + LOCK_BEATS.bannerIn`. |
| `NotificationBanner` | `NotificationBanner.tsx` | `title`, `frame`, `at`, `dur?=bannerSec`, `level?`, `width?=760`, `height?=120`, `blur?=9` | Slides down from above the top edge to the safe margin over `dur`, then stays until unmounted. Title stays blurred. |
| `DidYouKnowCard` | `DidYouKnowCard.tsx` | `text`, `frame`, `at`, `dur?=dykSec` (capped under 3 s), `level?`, `left`, `top`, `width?=640`, `label?='Did you know?'` | Springs in, holds, springs out; draws nothing outside `[at, at + dur)`. `label` default is the only built-in text. Exports `DYK_MAX_TICKS`. |
| `ReminderCard` | `ReminderCard.tsx` | `frame`, `at`, `dur`, `level?`, `x` (centre), `top`, `width?=520`, `text?='Still counting?'` | Pill that springs in, holds, springs out. `timing.ts` has no reminder length, so the scene passes `dur`. `text` default is built in. |

Helpers (not components): `presence(frame, at, dur, outLen)` (`presence.ts`), `clamp01`, `fadeWindow(frame, at, outAt?, inTicks, outTicks)` (`fade.ts`), `timerMath`, `URGENT_SECONDS` (`timerMath.ts`).

Check by eye (ticks; render frame = tick x 2):
- `LockNotification` at +0, +6, +14, +22, +27, +30 (banner overshoot, blur level, clean exit, nothing left at +31).
- `ScoreHud` tween at +0, +6, +15 (ring hand-off between colours). `ControlCenterTiles` at +0, +4, +8, +16 and just before `outAt`. Badges at +6 (bouncy settle).
- `QuestionShell`: `timer.to - 90` (shake and glow start), `timer.to` (glow full), `timer.to + 8` (glow gone), `reveal.to` (card appears), a bonus item at `banner.to - 1` and `banner.to` (the banner leaves the screen at once, there is no exit animation).

Open points:
- `system.ts` (2a) authors in 1920x1080 reference units via `u()`, while an earlier decision was 1280x720 via `px()`. Output is the same 2560x1440 either way; all gta6 components follow `system.ts`.
- `QuestionShell`: `data.ts` has no spoiler text, so `labels.spoiler` is optional and the badge is not drawn without it. The bonus banner title falls back to `item.n` because `data.ts` has no round name.

## 7. Looks (task 3b)

### `src/gta6/scenes/looks/MapsLook.tsx` (+ `mapsArt.ts`)
- Use inside the shell: `<QuestionShell item start>{(ctx) => <MapsLook ctx={ctx} />}</QuestionShell>`. Props `{ ctx: ShellContext }`; every string comes from `ctx.item` (`q`, `options`, the answer label).
- Beats (local ticks; `R` = `phases.read.from`, `Z` = `phases.timer.to` = zero, `H` = `phases.hold.from` = `Z`): question card in at `R + 4`; tiles stagger in from `R + 14` (+4 each); the zoom (2.4 to 1, ease-out so it ends flat) and the route draw (linear) both run `R` to `Z` and are frozen after `Z`; pin drops at `H` (bouncy spring), ripple from `H + 8` for 18 ticks, label slides in from `H + 6`. Reveal grey-out and expand are `RevealEngine` (tiles use its `OptionState`). Exported `MAPS_BEATS` holds the constants.
- Amber (`colors.medium`) for the route, pin and label whatever the item level; the question card keeps the level tint.
- Route variant = `item.order % 3` (`ROUTES` in `mapsArt.ts`). The zoom origin is the route start; the pin sits at the route end.
- **The map is invented art**: a generic Florida-like peninsula from a few SVG paths (`LAND_PATH`, islands, lake, roads, unnamed towns). Not traced from any real map, image or game asset; no real place labels; no Rockstar material.
- Layout (1920x1080 units): question card left 336, top 160, width 960 (clear of the timer ring slot and the island pill); 2x2 tiles of 400x240 (gap 24) bottom-right inside `SAFE`.
- Open: the pin position does not depend on the answer (the data has no coordinates); the label carries the answer text. `at` for the tile stagger assumes 4 options.
