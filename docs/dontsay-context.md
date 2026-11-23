# Don't Say The Same As Me: reuse map (Task 1a)

Surveyed from `gta6-quiz` (this branch's base). `src/ios` pieces missing here were read from `search-history` / `us-states`; NFL pieces from `nfl-quiz`. Names, exports and props only. Nothing was copied into `src/dontsay/` yet.

## 0. Read this first

1. **`dontsay-quiz` did not exist on the remote.** Branch created from `gta6-quiz` (7cec7fe). It contains no `src/nfl/`, `src/dontsay/`, or `docs/dontsay-prompts-split.md`.
2. **GTA6 is authored at 1920x1080 via `u()`** (`src/gta6/system.ts`: `FRAME 1920x1080`, `u(v)=v*WIDTH/1920`). Rule 4 forbids that. Do not copy `system.ts`/`u()`. The 1280x720 `px()` pattern is `src/nfl/system.ts` (nfl-quiz) and `src/style.ts` (`px(v)=v*2`, `SCALE=2`).
3. **`src/ios` on this branch is thin**: only `tokens.ts`, `motion.ts`, `badge-motion.ts`, `QuizMatrixBadge.tsx`. The rest of the iOS layer (`fonts.ts`, `index.ts`, `layout.ts`, `IosBackground.tsx`, `public/fonts/ios/Inter-*.woff2`) exists only on other branches.
4. **Import hazards under rule 3** (Imports allowed: `src/dontsay/`, `src/ios/`, node_modules):
   - `src/ios/tokens.ts` imports `px` from `../style` (shared base file, not gta6/nfl; flagged only).
   - `src/ios/fonts.ts` (other branches) imports `../fonts` (Anton/Poppins loader of an earlier video).
   - `src/ios/IosBackground.tsx` (other branches) imports `../clock` and `../timing` (root, earlier video).
   - So DontSay needs its own `clock.ts`, `px`, font loader, and background inside `src/dontsay/`.
5. **Fonts**: Inter exists as `public/fonts/ios/Inter-{400,500,600,700}.woff2` (+ LICENSE) on other branches only. **Nunito is nowhere in the repo.** Both must be added under e.g. `public/fonts/dontsay/` (SIL OFL).
6. Root settings: `settings.json` = 2560x1440, 60 fps. Every video authors in 30 fps "ticks" (`FPS=30`, `TIME_SCALE=2`). DontSay needs its own `WIDTH/HEIGHT/RENDER_FPS/TIME_SCALE` in `src/dontsay/timing.ts` (nfl's `shared/clock.ts` hard-codes 2560/1440/60: that is the cleanest pattern).

## 1. Reuse table

Legend: **copy** = take as is into `src/dontsay/`; **adapt** = copy then change; **pattern** = follow the structure only.

### iOS layer and foundations

| reuse | path | exports | notes |
|---|---|---|---|
| iOS tokens | `src/ios/tokens.ts` | `IOS` (font, weight, color, radius, space, blurPx), `iosSurface(radius, shadow)` | **copy** into `src/dontsay/system.ts`. Reference units; wrap in px(). Colours: bg, label, secondary, tertiary, fill, fillStrong, hairline, blue, green, orange, red |
| iOS spring curve | `src/ios/motion.ts` | `spring(t)`, `easeOut(t)` | **copy** (importing from src/ios is allowed). t is 0..1; ~1.5% overshoot |
| Spring presets | `src/nfl/system.ts` (nfl-quiz) | `SPRINGS`, `SpringName`, `springAt(frame, at, preset)`, `springOver(frame, at, ticks)` | **adapt**. Built on ios `spring`. gta6's `system.ts` presets use Remotion `spring()` instead; prefer the nfl form |
| px / safe box / type scale | `src/nfl/system.ts` (nfl-quiz) | `FRAME {1280,720}`, `SCALE`, `px`, `SAFE` (10% = centre 80%), `safeBox`, `colors`, `fontStack`, `tabular`, `weights`, `type`, `TypeRole`, `textStyle`, `radius` | **adapt**. SAFE 10% already matches the mobile-first centre-80% rule. Switch stack to Inter + Nunito, drop "SF Pro" from fallbacks (rule 9) |
| Layout constants | `src/ios/layout.ts` (search-history) | `FRAME`, `SAFE_X`, `SAFE_TOP`, `SAFE_BOTTOM`, `HUD_H`, `CONTENT` | **pattern**. 1280x720 units |
| Clock | `src/nfl/shared/clock.ts` (nfl-quiz); `src/clock.ts` + `src/gta6/timing.ts` (here) | `WIDTH, HEIGHT, RENDER_FPS, FPS, TIME_SCALE, useDesignFrame()`; gta6: `useGta6Frame()`, `secToTicks`, `ticksToSec`, `ticksToFrames`, `secToFrames`, `timecode` | **adapt** into `src/dontsay/timing.ts`. Do not import root `src/clock.ts` (it pulls root `src/timing.ts`) |
| iOS wallpaper | `src/ios/IosBackground.tsx` (search-history) | `IosBackground({accent})` | **adapt**. Rebuild without `../clock`/`../timing`; wallpaper must shift with LEVEL (rule 7) |
| Font loading | `src/ios/fonts.ts` (search-history); `src/fonts.ts` (here) | side-effect loaders via `@remotion/fonts` `loadFont` + `staticFile`; `loadFont` wraps delayRender | **adapt**. Loader pattern only. Needs Inter + Nunito woff2 (see 0.5). Noto Color Emoji is `public/fonts/NotoColorEmoji.woff2` |
| Badge | `src/ios/QuizMatrixBadge.tsx`, `badge-motion.ts` | `QuizMatrixBadge({frame, since, height, logo, quiz, matrix})`, `QuizMatrixLogo`, `badgeMotion`, `BADGE_TIMING`, `BADGE_SLIDE` | **copy** only if the channel watermark is wanted (task says to check) |
| Composition pattern | `src/Root.tsx` | one `<Composition>` per part (`GTA6-P1..P4`), `GTA6-Full`, `GTA6-Q` (preview by `order`), `GTA6-Q-All`; width/height/fps from timing | **pattern**. Root.tsx is shared: add DontSay compositions only, keep others' lines |

### From src/gta6 (all **adapt** unless noted; all are 1920x1080 `u()` code: re-express in px())

| reuse | path | exports | notes |
|---|---|---|---|
| QuestionShell phases | `components/QuestionShell.tsx` | `ShellPhase` (`banner|read|timer|hold|reveal|dyk`), `ShellContext`, `ShellLabels`, `SLOTS`, `HUD_CORNER`, `QuestionShellProps {item, start, children(ctx), labels?, showTimer?, hud?, shakeLook?}`, `localPhases(item)`, `phaseAt(f, phases)` | phase model is the reusable part. DontSay phases differ (prompt, listening/countdown, reveal) |
| ScoreHud rings | `components/ScoreHud.tsx`, `hudCounts.ts` | `ScoreHud {score, total, from?, frame?, at?, levelTotals?, side?, inset?, scale?}`, `hudCounts`, `hudTotals`, `HUD_TEXT` | tweened counter + level rings. Hearts are NOT a score: HeartsPill is new |
| StreakChip | `components/badges.tsx` | `StreakChip {count, unit, label, frame, at, outAt}`, `SpoilerBadge`, `FastestBadge` | pill base; adapt for round badges |
| LockNotification | `components/LockNotification.tsx` | `LockNotification {frame, at, appName, title, body, timeLabel, options, level}`, `LOCK_NOTIFICATION_TICKS`, `LOCK_BEATS`, `lockNotificationEnd` | hook scene |
| NotificationBanner | `components/NotificationBanner.tsx` | `NotificationBanner {title, frame, at, dur?, level?, width?, height?, blur?}` | next-round banner |
| TimerRing / island | `components/TimerRing.tsx`, `timerMath.ts` | `TimerRing {frame, at, dur, variant:'ring'|'island', level?, size?, digits?}`, `timerMath`, `URGENT_SECONDS` (3) | island variant is the base for CountdownNumber |
| EdgeGlow | `components/EdgeGlow.tsx` | `EdgeGlow {frame, at, dur?}` | last-3s build |
| Shake | `components/Shake.tsx` | `Shake {frame, at, dur, amp?, seed?, children?, style?}`, `seeded` | never use on a heart (rule 7) |
| LowPowerTint | `components/LowPowerTint.tsx` | `LowPowerTint {frame, at, dur}`, `LowPowerRing {frame, at, dur, size?, digits?, turnsPerSecond?}` | yellow tint; use only if a mechanic needs it |
| Level-card app-launch | `scenes/LevelCard.tsx`; nfl `shared/levelTransition.ts` | `LevelCard {level, frame}`, `LEVEL_CARD` beats, `levelSeconds`, `levelCardText`, `levelCardCues`, `levelCardLaunchTick`, `levelCardExitTick`; nfl: `WipeVariant`, `WIPE_VARIANT`, `GRID`, `ICON_CELL`, `cellPos`, `launchRect`, `wipeClip`, `exitClip` | nfl version is cleaner (1280x720, pure helpers). Uses iris wipes `circle|curtain|sweep` |
| ScoreCard | `scenes/ScoreCard.tsx` | `ScoreCard {level, after, frame}`, `SCORE_BEATS`, `scoreCardVariant`, `scoreCardLine`, `scoreCardCues`, `scoreCardTicks` | level-end card |
| Scoreboard | `scenes/Scoreboard.tsx` | `Scoreboard {frame}`, `BEATS`, `cardStart(name)`, `lightStart(name)`, `scoreboardCues` | 5 stacked rank cards, highlighted in turn. RankCard (single card, 5 ranks) is new |
| Outro / end screen | `scenes/Outro.tsx` | `Outro {frame}`, `OUTRO_TEXT`, `OUTRO`, `outroTicks`, `outroBeats`, `outroCues` | |
| Hook | `scenes/Hook.tsx` | `Hook {at?}`, `HOOK_TEXT`, `hookTicks`, `hookBeats`, `hookCues(at)` | |
| Part pattern | `parts/Part1.tsx` (also Part2-4) | `Placed {seg, at, ticks}`, `part1Plan`, `part1Ticks`, `part1Frames`, `bannerStart`, `roundLabel`, `nextRound`, `Part1` | plan built from `segments` in timing.ts; nfl Part1 adds `part1BannerAt`. Total split across 4 parts for render lanes |
| sfxCues pattern | `sfxCues.ts`, `sfx.ts`, `sfx-ids.ts` | `part1Cues..part4Cues`; `SfxEntry`, `SfxCue`, `sfxManifest`, `sfxEntry`, `sfxLength`, `sfxFrames`, `sfxSrc`, `cue(id, frame, {rate, volume})`; `SFX_IDS` (generated) | cues per scene are exported by the scene (`hookCues`, `levelCardCues`, ...) and collected in sfxCues.ts |
| Voice timeline + duck | `voiceTimeline.ts`, `audioMap.ts`, `Audio.tsx`, `duckEnvelope.generated.ts` | `MIX`, `sfxGain`, `VoiceEvent`, `voiceEvents`, `voiceOverlaps`, `sfxEvents`, `totalFrames`, `clipFrames`, `voiceSignature`; `ItemAudio`, `itemAudio`, `hookId`, `levelIds`, `scoreCardIds`, `rankIds`, `outroIds`, `audioOf`; `Gta6Audio {musicSrc?, voice?, sfx?, music?}`, `DEFAULT_MUSIC`; `DUCK_KEYS`, `DUCK_SIGNATURE` | audioMap.ts and the duck file are generated. DontSay prompts are spoken, so clip length drives round length |
| Choice chips | `components/ChoiceChip.tsx`, `RevealEngine.tsx` | `ChipState`, `ChoiceChip {index,text,state,frame,at,stateAt?,level?,highlight?...}`, `RevealEngine`, `optionStateAt`, `REVEAL` | multiple-choice reveal. DontSay has no 4 options; mine for the grey-out/expand timing only |
| Cards / glass | `components/FrostCard.tsx`, `DidYouKnowCard.tsx` | `FrostCard {children, frame?, at?, level?, width?, height?, padding?, radius?, style?}`; `DidYouKnowCard {text, frame, at, dur?, outTicks?, level?, left, top, width?, label?, swap?}`, `DYK_MAX_TICKS` | |
| Waveform | `extras/Waveform.tsx` | `Waveform {frame, at, width?, height?, bars?, seed?, color?, period?, freezeAt?}` | base for ListeningGlow + waveform |
| Counter | `extras/CounterTick.tsx` | `CounterTick {from,to,frame,at,dur,level?,size?,popTicks?}`, `counterValue` | base for CountdownNumber |
| Helpers | `components/fade.ts`, `presence.ts` | `clamp01`, `fadeWindow`, `presence(frame, at, dur, outLen)` | **copy** |
| Data pattern | `data.ts` | `Item`, `Level`, `items`, `byLevel`, `levels`, `levelColors`, `rankTiers` (5 ranks), `rankLines`, `extraIds`; JSON in `docs/gta6/questions.json` | data in JSON, typed module on top. Same shape wanted for `src/dontsay/data.ts` |

### From src/nfl (nfl-quiz branch, not present here)

| reuse | path | exports | notes |
|---|---|---|---|
| WalletCard pass style | `components/WalletCard.tsx` | `WalletCardState` (`blank|locked|open|stacked`), `StackCorner`, `WalletCardProps {card, state, frame, since, jersey?, stackIndex?, corner?, showName?, guess?, children?}`, `WALLET_LAYOUT` | **adapt**. Source for the lock/open card look; relevant to the sealed bubble |
| PointsPill island | `components/PointsPill.tsx` | `PointsPill {frame, starts, end, values?, level?, width?, height?}`, `PILL_MORPH`, `pointsPillMath`, `PointsPillGlow` | **adapt** into CountdownNumber island pill |
| RevealEngine lock-open flip | `components/RevealEngine.tsx` | `RevealBeats`, `revealBeats(card)`, `revealCues`, `SourceLine`, `RevealEngine {card, frame, frozen, jersey?, stackIndex?, corner?, sourceLabel?}` | **adapt**. Flip/open beat for the ink-bubble reveal |
| DidYouKnowCard | `shared/DidYouKnowCard.tsx` | `DidYouKnowCardProps`, `DidYouKnowCard` | **adapt** |
| TwoMinuteWarning wrapper | `components/TwoMinuteWarning.tsx` | `TwoMinuteWarning {card, frame, starts, end, label, top?, children?}`, `tmwMath`, `tmwFlipTicks`, `tmwCues` | **pattern** for BonusWrapper (wraps children, badge + treatment) |
| Rank card layout | `scenes/Scoreboard.tsx`, `scenes/FinalCard.tsx` | `Scoreboard {frame}`, `scoreboardCues`, `scoreboardVoice`; `FinalCard {at?, jersey?}`, `finalCardCues` | **pattern** for RankCard |
| Level transition helpers | `shared/levelTransition.ts` | see level-card row | pure functions, easy to copy |
| BloomLayer | `shared/BloomLayer.tsx` | `BloomLayer {radius?}` | optional glow |
| Captions | `components/Captions.tsx` | `CAPTION_BOX`, `Captions` | rule 5: every prompt shown as text as well as spoken; check `captions.json` pipeline (`scripts/make_nfl_captions.py`) before inventing one |
| Scene voice/cue hooks | `scenes/*` | `hookVoice`, `outroVoice`, `scoreboardVoice`, `predictionsVoice` | scenes export both `*Cues` and `*Voice`; nfl voiceTimeline consumes both |

### Audio and tooling (all here, `scripts/`)

| reuse | path | what it does | notes |
|---|---|---|---|
| Clip timings | `build_gta6_timings.py` | ffprobes `public/gta6/voiceover/clips`, writes `src/gta6/timings.csv` (`id,type,durSec`) and `timings.generated.ts` (`ClipTiming {id,type,durSec,file}`, `clipTimings`). Env `CSV=docs/gta6/lines.csv CLIPS=...`. Exit 1 if an id has no clip | **adapt** paths to dontsay. See section 3 |
| Audio map | `build_gta6_audio_map.ts` | maps `docs/gta6/lines.csv` rows to items in order, writes `src/gta6/audioMap.ts`; exit 1 on any mismatch | `npx tsx`. Adapt walk rules to DontSay row types |
| Duck envelope | `build_gta6_duck.ts` | bakes music-duck keyframes from `voiceTimeline.ts` into `duckEnvelope.generated.ts`; prints voice/voice overlaps and SFX nudged off a voice start | re-run after any timing change |
| Clip cleaner | `clean_gta6_clips.sh` | trims silence to 0.1 s, loudnorm two-pass to -16 LUFS, originals kept in `raw/`. Env `CSV, DIR, SILENCE_DB, TARGET_LUFS, TP, LRA, DRY_RUN` | **adapt** paths |
| SFX synth | `make_gta6_sfx.py` | numpy-synthesised original SFX, 48 kHz mono wavs to `public/gta6/sfx/`, `manifest.json`, `src/gta6/sfx-ids.ts`. Premium sounds (level/alert/reveal) go through a `pedalboard` chain: `HighpassFilter`, optional `Compressor(-16 dB, 2:1, 2 ms/80 ms)`, `Distortion`, `Reverb(room_size, damping 0.6, wet_level, dry 0.9, width)`, `Gain(-1)`, `Limiter(-1)`. Needs `pip install pedalboard` | **adapt**. Original, royalty-free: fits rule 9 |
| Sanity checks | `check_gta6_data.ts`, `gta6_runtime.ts`, `gta6_chapters.ts` | data validation; per-part runtime vs target; YouTube chapter list to `docs/gta6/chapters.txt` | `npx tsx` |
| Render | `render-batches.js` | resume-safe chunked renderer; composition via env `REMOTION_COMPOSITION` (default `GuessTheWord`); flags `--size --only --concat --clean --force --lane` | **copy**; set the env var, no edit needed |
| Upload | `youtube_upload.py` | uploads one video with a stored OAuth refresh token read from env vars | only the docstring was read; reuse unchanged |
| Sound pack | `generate-audio.js` | renders WebAudio sounds + 3 music layers (112.5 BPM) to `public/sounds/` | `music-base.wav` is `DEFAULT_MUSIC`; check it is not copyrighted before reuse |

## 2. Gaps: must be built new for DontSay

- InkBubble (invisible-ink dissolve; sealed corner state from frame 1, enlarges to centre for the reveal)
- HeartsPill (static; spring-in at level start only; no loss animation of any kind)
- ListeningGlow + waveform (waveform base: `extras/Waveform.tsx`)
- CountdownNumber island pill (base: `PointsPill` / `TimerRing island` / `CounterTick`)
- ExclusionChips + SettingsSheet
- BonusWrapper (pattern: `TwoMinuteWarning`)
- The five bonus mechanic scenes
- Round45Callback
- RankCard with 5 ranks on one card
- Also needed, not in the brief's list: `src/dontsay/` foundations (`timing.ts` with own clock, `system.ts` with px, font loader for Inter + Nunito, level-driven wallpaper), `data.ts` + JSON source, own drawn icons (heart, mic, toggle, lock), SFX set and voice pipeline.

## 3. How clip lengths feed timing

1. Clips live in `public/<video>/voiceover/clips/` (originals in `raw/`, cleaned by the clean script).
2. `docs/<video>/lines.csv` (`id,type,text`) is the script; ids like `g6_001`.
3. `build_*_timings.py` ffprobes each clip -> `src/<video>/timings.csv` and `timings.generated.ts` (`clipTimings`). The bundle cannot read CSV at runtime, hence the generated `.ts`.
4. `timing.ts` imports `clipTimings` and uses the clip length when a clip exists, otherwise falls back to its constants (`readSec`, `revealFullSec`, ...). Round length = max(clip-driven length, minimum) plus pads.
5. `build_*_audio_map.ts` writes `audioMap.ts` (item -> clip ids). `voiceTimeline.ts` places all voice events; `build_*_duck.ts` bakes music ducking from it.
6. `timing.ts` exposes `segments` -> parts -> `partRanges`, `RENDER_TOTAL_FRAMES`, `chapters`.

Rule 6 applies: scenes read prompts, answers, rules, round numbers, points, dates and durations from `src/dontsay/data.ts` and `src/dontsay/timing.ts` only.

## 4. Expected but not found

- **Branch `dontsay-quiz`**: absent on the remote (created from `gta6-quiz`).
- **`docs/dontsay-prompts-split.md`**: not in the repo, and the block "pasted below" did not arrive in the message. Task ID was the literal `<ID>`; I inferred Task 1a from the heading.
- **`scripts/gta6_qa.ts`**: no such file. Closest: `check_gta6_data.ts` and `gta6_runtime.ts`.
- **`src/ios/fonts.ts`, `index.ts`, `layout.ts`, `IosBackground.tsx`**: not on this branch (only on search-history, us-states, nfl-quiz).
- **Inter font files**: not on this branch (only under `public/fonts/ios/` on other branches). **Nunito: not in any branch.**
- **px() in `src/ios`**: none. `px` lives in `src/style.ts` (earlier video's base) and `src/nfl/system.ts`.
- **Spring presets in `src/ios`**: only the single `spring(t)` curve, no named presets. gta6 `system.ts` says `src/ios/motion.ts` is "not on this branch"; that comment is stale (the file is here).
- **Voice clips**: `public/voiceover` is empty on this branch.
- **`rankLines`** in `src/gta6/data.ts` are empty strings (TODO(script) in the file).
- Not read, by rule 2: `docs/gta6-context.md`, `docs/gta6-progress.md`, `docs/nfl-context.md`, `docs/nfl-progress.md`.
- Not verified: nothing was compiled or rendered. This task adds docs only.
