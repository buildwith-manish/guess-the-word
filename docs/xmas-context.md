# Christmas emoji quiz: reuse map (task 1a recon)

Branch `christmas-quiz` was created from `origin/gta6-quiz` (the remote had no `christmas-quiz`). Other branches are read with
`git show origin/<branch>:<path>`; never check them out. Only names, exports and props were read, no files dumped.

## Hard facts
- Output is `settings.json`: 60 fps, 2560x1440. Scenes author in 30 fps "ticks"; `TIME_SCALE = 60/30 = 2`.
- **Import rule (task rule 2):** `src/xmas/` may import only `src/xmas/`, `src/ios/`, node_modules. So `src/style.ts` (px), `src/clock.ts`,
  `src/fonts.ts`, `src/timing.ts` and everything in `src/gta6/` or `src/nfl/` are **copy or adapt** targets, never imports.
  `src/ios/tokens.ts` itself imports `../style` (px); that is allowed because it is inside `src/ios/`.
- Reference units: gta6 uses 1920x1080 (`u()`); this video uses **1280x720 via px()** (the nfl-quiz `system.ts` and `src/style.ts` do this).
  `px(v) = round(v * 2 * 100) / 100` with `SCALE = 2`.
- **Inter is NOT loaded on this branch.** `src/fonts.ts` loads Anton, Poppins, JetBrains Mono, Noto Color Emoji only.
  `src/ios/fonts.ts` + `public/fonts/ios/Inter-{400,500,600,700}.woff2` + `Inter-LICENSE.txt` exist on `nfl-quiz`, `search-history`, `us-states`
  (see table). Must be copied in a later task. `IOS.font` and gta6 `fontStack` name "Inter" but nothing here loads it.
- `src/ios/` on this branch has only: `QuizMatrixBadge.tsx`, `badge-motion.ts`, `motion.ts`, `tokens.ts`. No `index.ts`, `layout.ts`, `IosBackground.tsx`, `fonts.ts`.
- Root.tsx on this branch registers `GuessTheWord`, `GTA6-Q`, `GTA6-Q-All`, `GTA6-P1..P4`, `GTA6-Full`. Pattern: one `<Composition id component durationInFrames fps={RENDER_FPS} width={WIDTH} height={HEIGHT}/>` each, `import './fonts'` at top.
- `docs/xmas-prompts-split.md` and `docs/xmas/` (incl. `reference/lg_q3.png`) do **not exist** on any branch.

## Table: reuse | path | exports | notes (copy or adapt)

### iOS layer, clock, px, Root, fonts (this branch)
| reuse | path | exports | notes |
|---|---|---|---|
| iOS tokens + frosted surface | src/ios/tokens.ts | `IOS` (font, weight, color {bg,bgRaised,label,secondary,tertiary,fill,fillStrong,hairline,blue,green,orange,red}, radius {sm8,md14,lg22,xl30}, space, blurPx 22), `iosSurface(radius, shadow=1)` | **import** from src/ios. Sizes in ref units, wrap in px(). Colours have no gold; add in src/xmas |
| iOS spring + ease | src/ios/motion.ts | `spring(t)` (0..1, ~1.5% overshoot), `easeOut(t)` | **import**. Takes progress 0..1, not frames |
| badge motion | src/ios/badge-motion.ts | `BADGE_TIMING`, `BADGE_SLIDE`, `BadgeMotion`, `badgeMotion(frame, since=0, wordCount=2)` | import only if the QuizMatrix badge is wanted |
| QuizMatrix badge | src/ios/QuizMatrixBadge.tsx | `QuizMatrixLogo`, `QuizMatrixBadgeProps {frame, since?, height, logo, quiz, matrix}`, `QuizMatrixBadge` | uses `public/*/quiz-matrix-bulb.png` (gta6 copy is public/gta6/); this is branding, not film art |
| px() | src/style.ts | `SCALE=2`, `K`, `px(v)`, `COLORS`, `FONTS`, `glass(radius, alpha)`, `SAFE_X=px(64)`, `SAFE_Y=px(36)`, `S` | **copy** px into src/xmas/system.ts (not importable) |
| px + frame + safe box pattern | origin/nfl-quiz:src/nfl/system.ts | `FRAME {1280x720}`, `SCALE`, `px`, `SAFE {x:10%,top:10%,bottom:10%}`, `safeBox`, `colors`, `fontStack`, `tabular`, `weights`, `type`, `TypeRole`, `textStyle(role)`, `radius`, (rest not listed) | **adapt**: best base for src/xmas/system.ts (already 1280x720, px, 10% safe) |
| clock helper | src/clock.ts | `useDesignFrame()` = `useCurrentFrame()/TIME_SCALE` | **copy** into src/xmas/timing.ts as `useXmasFrame` (nfl pattern: `useNflFrame`) |
| tick/frame helpers | src/gta6/timing.ts (and nfl timing.ts) | `WIDTH,HEIGHT,RENDER_FPS,FPS=30,TIME_SCALE`, `secToTicks, ticksToSec, ticksToFrames, secToFrames, framesToSec(nfl), timecode, useGta6Frame` | **adapt**. Both read `settings.json` for size and fps |
| anim helpers | src/anim.ts | `prog, fadeIn, revealIn, slamIn, floatY, breathe, cubicBezier, htmlEase, cssEase*, bounceEase, ms, keyframes, springStyle, riseStyle` | old-video file, **copy needed bits** (cannot import) |
| spring presets | src/gta6/system.ts | `SPRINGS {gentle,snappy,smooth,pop,bouncy}`, `SpringName`, `springAt(frame, at, preset)` | **adapt**: Remotion `spring()` configs at 30 fps ticks |
| gta6 system tokens | src/gta6/system.ts | `FRAME 1920x1080`, `u()`, `SAFE`, `safeBox`, `colors`, `fontStack`, `tabular`, `type`, `textStyle`, `radius`, `blurPx`, `levelBackground` | do **not** copy the 1920 units; take only the shape |
| Root composition pattern | src/Root.tsx | see Hard facts | add `Xmas-*` compositions here; keep both sides on conflicts |
| Font loading, base faces | src/fonts.ts | side-effect `loadFont` for 5 faces (`staticFile('fonts/..woff2')`, `@remotion/fonts`) | pattern only; Noto Color Emoji needed for clue emoji |
| Font loading, Inter | origin/nfl-quiz:src/ios/fonts.ts (same on search-history, us-states) | side effect: `loadFont` Inter 400/500/600/700 from `fonts/ios/Inter-<w>.woff2`, imports `../fonts` | **copy** file and the 4 woff2 + LICENSE into src/ios/ and public/fonts/ios/ (needs a later task) |

### From src/gta6 (this branch)
| reuse | path | exports | notes |
|---|---|---|---|
| Glass surface | src/gta6/components/FrostCard.tsx | `FrostCardProps {children, frame?, at?, level?, width?, height?, padding?, radius?, style?}`, `FrostCard` | **adapt** into GlassTile; units are 1920x1080 and `level` tint is easy/medium/hard (needs green/red/gold instead) |
| Glass look details | origin/us-states:src/states/look.ts | `GLASS` (fill .07, highlight, blur 22, borderAlpha .12, shadow), `RIM`, `CORNERS {squircle}`, `RADIUS`, `glassPanel(radius, accent?, depth)`, `SOFT_GLOW`, `COLOR` | **adapt** for "bright edge" tile and gold glass |
| NotificationBanner | src/gta6/components/NotificationBanner.tsx | `NotificationBannerProps {title, frame, at, dur?, level?, width?, height?, blur?}` | adapt only if a bonus banner is used |
| Edge glow | src/gta6/components/EdgeGlow.tsx | `EdgeGlowProps {frame, at, dur=90}`, `EdgeGlow` | idea for green/red light zones |
| Timer (ring/island) | src/gta6/components/TimerRing.tsx, timerMath.ts | `TimerRingProps {frame, at, dur, variant:'ring'|'island', level?, size, digits}`, `timerMath(frame, at, dur)`, `URGENT_SECONDS` | **no clock in this video** (rule 6); only the pill morph idea for TimerToPill |
| Score HUD | src/gta6/components/ScoreHud.tsx | `ScoreHudProps {score,total,from?,frame?,at?,levelTotals?,side?,inset?,scale?}`, `ScoreHud` | adapt only if a counter is shown |
| Scoreboard / ScoreCard | src/gta6/scenes/Scoreboard.tsx, ScoreCard.tsx | `BEATS`, `cardStart`, `lightStart`, `scoreboardCues`, `Scoreboard{frame}`; `SCORE_BEATS`, `scoreCardVariant`, `scoreCardLine`, `scoreCardCues`, `ScoreCard{level,after,frame}` | adapt for the end score screen; text from ui.ts |
| Outro / end screen | src/gta6/scenes/Outro.tsx | `OUTRO_TEXT`, `OUTRO {asksSec, fadeSec, cardSec}`, `outroTicks`, `outroBeats`, `outroCues(start)`, `Outro{frame}` | the like/subscribe ask only at the end (rule 6) |
| Hook | src/gta6/scenes/Hook.tsx | `HOOK_TEXT`, `hookTicks`, `hookBeats`, `hookCues(at)`, `Hook{at?}` | adapt; hook line is the only spoken rule |
| Level card | src/gta6/scenes/LevelCard.tsx | `LEVEL_CARD`, `levelSeconds`, `levelCardText`, `levelCardCues`, `LevelCard{level,frame}` | maybe not needed (no levels) |
| Part pattern | src/gta6/parts/Part1.tsx | `Placed {seg,at,ticks}`, `part1Plan`, `part1Ticks`, `part1Frames`, `bannerStart`, `Part1` | each part maps `plan.placed` to `<Sequence from={ticksToFrames(at)} ...>`; plan built from timing.ts `segments` |
| Full + preview | src/gta6/Full.tsx, Preview.tsx | `Gta6Full`, `Gta6Preview`, `Gta6PreviewAll`, `previewFrames`, `PREVIEW_DEFAULTS`, `ALL_FRAMES` | pattern for single-scene preview comps |
| QuestionShell | src/gta6/components/QuestionShell.tsx | `ShellPhase`, `ShellContext`, `ShellLabels`, `SLOTS`, `HUD_CORNER`, `QuestionShellProps`, `localPhases(item)`, `phaseAt(f,p)`, `QuestionShell` | phase split (read / hold / reveal) is the useful part |
| presence/fade | src/gta6/components/presence.ts, fade.ts | `presence(frame,at,dur,outLen)`, `clamp01`, `fadeWindow` | small, copy |
| sfx cue pattern | src/gta6/sfx.ts, sfx-ids.ts, sfxCues.ts | `SfxCue {sfx, frame, rate?, volume?}`, `cue(id, frame, opts)`, `sfxManifest`, `sfxEntry`, `sfxLength`, `sfxFrames`, `sfxSrc(id)` (staticFile `gta6/sfx/..`), `part1Cues..part4Cues` built by `cuesOf(plan)` from per-scene `xxxCues(at)` | scenes export their own cue lists; Part cues = sorted flatMap. `sfx-ids.ts` is generated by the sfx script |
| Audio + ducking | src/gta6/Audio.tsx, voiceTimeline.ts, duckEnvelope.generated.ts, audioMap.ts | `Gta6Audio {musicSrc?,voice?,sfx?,music?}`, `MIX`, `voiceEvents`, `sfxEvents`, `totalFrames`, `voiceSignature`, `clipFrames`; `audioMap`: `hookId, itemAudio, levelIds, scoreCardIds, rankIds, outroIds, audioOf` | throws if duck envelope is stale (rebuild with build_gta6_duck.ts) |
| data/typing pattern | src/gta6/data.ts | `Level, Kind, Item, items, levels, byLevel, levelColors, rankTiers, RankName, rankLines, extraIds` | data lives in JSON, scenes read via data.ts |
| Silhouette | src/gta6/extras/Silhouette.tsx | (not read) | name only; film art is banned, not reused |

### From nfl-quiz (`git show origin/nfl-quiz:<path>`)
| reuse | path | exports | notes |
|---|---|---|---|
| system + px pattern | src/nfl/system.ts | see above | base for src/xmas/system.ts |
| timing pattern | src/nfl/timing.ts | `WIDTH..timecode, hookSec, clueBaseSec`, `clipSec(type,key)`, `useClipTimings`, `useNflFrame` | `durOf` map built from `clipTimings`; falls back to constants if clips missing |
| timings generation | scripts/build_nfl_timings.py | (script) | ffprobe -> `src/nfl/timings.csv` + `timings.generated.ts`; env `CSV`, `CLIPS`; exit 1 on missing rows/clips |
| audio map | scripts/build_nfl_audio_map.ts | (script) | `npx tsx`; walks `docs/nfl/lines.csv`, writes `audioMap.ts` and `lines.generated.ts` |
| sfx synth | scripts/make_nfl_sfx.py | (script) | numpy + pedalboard; writes wavs, `manifest.json`, `sfx-ids.ts` |
| clip cleaning | scripts/clean_nfl_clips.sh | (bash script) | see "clips" below; `DRY_RUN=1` |
| Audio | src/nfl/Audio.tsx | `NflAudioProps`, `DEFAULT_MUSIC`, `NflAudio`, default | simpler than gta6 (no duck check) |
| audio map data | src/nfl/audioMap.ts | `CardAudio`, `hookId, levelIds, cardAudio, scoreCardIds, predictionIds, rankIds, outroIds, mappedRows, audioOf` | |
| sfxCues | src/nfl/sfxCues.ts | `cardCues, cuesOf, part1Cues..part4Cues, fullCues` | |
| runtime check | scripts/nfl_runtime.ts | (script) | per-part table vs target, exit 1 outside range |
| data check | scripts/check_nfl_data.ts, check_nfl_clues.ts | (scripts) | validators for data JSON |
| clue stack | src/nfl/components/ClueStack.tsx, PointsPill.tsx | `ClueStackProps`, `ClueStack{card,frame,starts,flipTicks}`; `PILL_MORPH`, `pointsPillMath`, `PointsPill{frame,starts,end,values,level,width,height}`, `PointsPillGlow` | PointsPill's morph is the closest thing to TimerToPill |
| captions | src/nfl/components/Captions.tsx, scripts/make_nfl_captions.py | `CAPTION_BOX`, `Captions` | only if captions are wanted |
| RevealEngine | src/nfl/components/RevealEngine.tsx | `RevealBeats, revealBeats(card), revealCues, SourceLine, RevealEngine` | reveal-beat pattern for MovieReveal |
| Hook/Outro/FinalCard/LevelCard scenes | src/nfl/scenes/*.tsx | `Hook, hookMarks, hookCues, hookVoice`; `Outro, outroMarks, outroCues, outroVoice`; `FinalCard`; `LevelCard` | voice ticks exported next to cues |
| **Not found on nfl-quiz** | | | `scripts/master_nfl_voice.py`, `scripts/render_nfl.sh`, `scripts/nfl_chapters.ts`, `scripts/nfl_qa.ts`, `src/nfl/sfx` (as sfx-ids.ts exists, ok) |

### From search-history
| reuse | path | exports | notes |
|---|---|---|---|
| Search bar + typing | src/search/components/SearchBar.tsx | `HOLD_CHARS, SLIDE_CHARS, typedCount(frame,start,length,typeTicks), slideStart, slideEnd, typeTicksOf`, `SearchBarProps {searches[], starts[], typeTicks, accent, size, at{x,y}, heading?, recentCount?}`, `SearchBar` | **adapt** for Bonus 1 Spotlight; units 1280x720 through px(); magnifier SVG, blinking caret, finished searches list |
| typing math | src/search/typing.ts | `charTick(start,text,k,typeTicks)`, `typingTickFrames`, `typedChars(frame,start,text,typeTicks)` | **copy**; pauses after punctuation |
| Timer bar | src/search/components/TimerBar.tsx | `TimerBarProps {from, duration, accent, size, at}` | not needed (no clock) |
| Hint emoji | src/search/components/HintEmoji.tsx, HintClue.tsx | `HintEmojiProps {emoji,from,at,size}`; `hintFilesFor(roundId)`, `HintClue` | emoji clue idea, relevant to ClueImage |
| iOS background + layout | src/ios/IosBackground.tsx, layout.ts, index.ts | `IosBackground{accent}`; `FRAME, SAFE_X=64, SAFE_TOP=56, SAFE_BOTTOM=40, HUD_H=48, CONTENT`; index re-exports `IOS, iosSurface, spring, easeOut, FRAME, ..., IosBackground` | **copy into src/ios/** (same on us-states) |
| Keyboard drawing | (none) | | **no keyboard component exists** on search-history (git grep for "keyboard" in src: none) |

### From us-states
| reuse | path | exports | notes |
|---|---|---|---|
| Timer ring | src/states/components/TimerRing.tsx, TimerLead.tsx | `TimerRingProps {from,duration,accent,size,digits,frame,ready,after}`; `timerLeadStart`, `TimerLead` | no clock here; segmented timer not found (it is a ring) |
| Glass look | src/states/look.ts | `GLASS, RIM, CORNERS, RADIUS, glassPanel, SOFT_GLOW, SHAPE_HALO, BACKDROP_DIM, MINI_PULSE, COLOR` | best glass source: rim light via two inset shadows, no masks |
| Tiles/cards | src/states/components/AnswerCard.tsx, StateStage.tsx | `AnswerCardProps`, `AnswerCard`; `StageSlot`, `StateStageProps`, `STAGE_LAYOUT`, `StateStage` | no dedicated tile; AnswerCard is the nearest |
| Rise motion | src/states/ios-rise.ts | `rise(frame, at, len, dist=24, preset?)`, `Rise` | small, copy |
| Bonus engine pattern | src/states/bonus-engine.ts, scenes/StateBonus.tsx, scenes/bonus/Bonus{Borders,Capital,Missing,Nickname}.tsx | (not read in detail) | registry-like pattern for the ten bonus rounds, adapt |

## How clip lengths feed timing.ts
1. Voice clips live in `public/<video>/voiceover/clips` (originals in `raw/` or `source/`), listed one row per clip in `docs/<video>/lines.csv` (`id,type,...`).
2. `scripts/build_<video>_timings.py` runs ffprobe on every clip and writes `src/<video>/timings.csv` (id,type,durSec) and
   `src/<video>/timings.generated.ts` (`clipTimings: {id,type,durSec,file}[]`; the bundle cannot read CSV at runtime). Exit 1 if an id has no clip. Empty array = timing.ts falls back to constants.
3. `timing.ts` imports `clipTimings`, maps ids to durations (`clipSec`/`durOf`), and a segment's length = clip length + a pad constant
   (`questionPadSec 0.1`, `cardPadSec 0.5`, `dykLeadSec 0.1`) with a floor (`questionMinSec 2.2`). All durations in seconds, converted via `secToTicks`.
4. `build_<video>_audio_map.ts` links `lines.csv` rows to data items (writes `audioMap.ts`); `build_<video>_duck.ts` bakes the music duck envelope (gta6 only; its signature must match `voiceSignature()`).

## How the old scripts clean clips
`clean_gta6_clips.sh` and `clean_nfl_clips.sh` (bash, ffmpeg + ffprobe required): check CSV ids vs clip files (fails on missing, orphans, duplicate ids,
same id with two extensions); trim leading/trailing silence to 0.1 s (`SILENCE_DB=-50`, `PAD_MS=100`); loudnorm two-pass to -16 LUFS
(`TARGET_LUFS=-16 TP=-1.5 LRA=11`); originals kept (`raw/` gta6, `source/` nfl), output 48 kHz mono wav in `clips/`; `DRY_RUN=1` prints the table only;
re-running is safe. **These are bash**: on Windows they need Git Bash/WSL (rule 9 says follow the repo's ffmpeg approach); sfx scripts are Python (numpy, pedalboard).
Other scripts: `make_gta6_sfx.py` (numpy synthesis + pedalboard Compressor/Limiter/Reverb chain), `gta6_runtime.ts` and `gta6_chapters.ts` (`npx tsx`).

## Gaps: must be built new for this video
- GlassTile (bright edge frosted tile; green/red light zone support; gold-tinted bonus variant)
- TimerToPill
- LightString
- MovieReveal
- BonusScene and the bonus registry
- the ten bonus rounds (Bonus 1 Spotlight needs the search bar; no keyboard component exists to reuse)
- ClueImage and the clue image index
- Also missing, not named in the task: Inter font loader + woff2 files on this branch; src/xmas/{system,timing,ui,data}.ts; src/xmas/px (px is not importable); `docs/xmas/reference/lg_q3.png` and `docs/xmas-prompts-split.md`.

## Could not find (expected, absent)
- `docs/xmas-prompts-split.md` (task source) and `docs/xmas/reference/lg_q3.png` (look target): not on any branch.
- A `christmas-quiz` branch on origin; created here from `gta6-quiz`.
- `master_nfl_voice.py`, `render_nfl.sh`, `nfl_chapters.ts`, `nfl_qa.ts` on `nfl-quiz`.
- A keyboard drawing on `search-history`; a dedicated tile and a segmented timer on `us-states`.
- `src/ios/index.ts`, `fonts.ts`, `layout.ts`, `IosBackground.tsx` on this branch.

## Sound effects (task 1d)
Made by `python3 scripts/make_xmas_sfx.py` (numpy synthesis + pedalboard high-pass, gentle compressor, limiter; needs `pip install numpy pedalboard`).
48 kHz 16-bit mono wavs in `public/xmas/sfx/` with `manifest.json`; ids are generated into `src/xmas/sfx-ids.ts` and typed in `src/xmas/sfx.ts`
(`SfxId, SfxCue, sfxEntry, sfxLength, sfxFrames, sfxSrc, tickId(n 1..10), cue`). Every file peaks at -3.0 dBFS; set relative loudness with Remotion `volume`.
No samples, no tunes, no film or song audio.

| id | length s | frames (30 fps) | rms dB | use |
|---|---|---|---|---|
| tiles-in | 0.520 | 16 | -17.2 | two clue tiles glide in |
| tick-01 | 0.110 | 4 | -18.5 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-02 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-03 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-04 | 0.110 | 4 | -18.5 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-05 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-06 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-07 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-08 | 0.110 | 4 | -18.5 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-09 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| tick-10 | 0.110 | 4 | -18.4 | one timer segment tick, pitch rises with the number (760 Hz to 980 Hz) |
| timer-full | 0.240 | 8 | -21.0 | timer fills (short flash) |
| reveal-chime | 1.120 | 34 | -16.9 | movie answer reveal |
| bulb-on | 0.150 | 5 | -14.1 | a bulb lights |
| bonus-banner | 0.820 | 25 | -15.4 | bonus round banner |
| gold-bulb | 0.520 | 16 | -17.0 | gold (bonus) bulb |
| rank-reveal | 1.320 | 40 | -16.1 | rank card reveal |
| type-key | 0.075 | 3 | -19.4 | Spotlight typing |
| focus-lock | 0.280 | 9 | -11.5 | Focus bonus locks |
| clean-sparkle | 0.720 | 22 | -17.5 | Clean Up bonus |
| flash-blip | 0.095 | 3 | -14.4 | Count the Lights flash |
| swipe | 0.320 | 10 | -19.8 | Double Feature app-switcher card |
| widget-pop | 0.180 | 6 | -13.7 | Finale widget |
| ring-glow | 0.870 | 27 | -13.6 | Odd One Out ring |

## Task 2a: shared parts, system.ts, ui.ts (done)

Nothing in src/xmas imports src/gta6, src/nfl or src/style.ts. Imports used: remotion, @remotion/fonts, react, and src/xmas only.

### Copied files (source -> destination)
| destination | source | how |
|---|---|---|
| src/xmas/shared/px.ts | src/style.ts (`SCALE`, `px`) | copy; adds `REF {1280,720}` |
| src/xmas/shared/clock.ts | src/clock.ts (`useDesignFrame`) + constants from src/timing.ts | copy; renamed `useXmasFrame`; holds WIDTH 2560, HEIGHT 1440, RENDER_FPS 60, FPS 30, TIME_SCALE 2 (the one place; the later src/xmas/timing.ts re-exports them) |
| src/xmas/shared/springs.ts | origin/gta6-quiz:src/gta6/system.ts (`SPRINGS`, `springAt`) | adapted; configs only, FPS from clock.ts |
| src/xmas/shared/glass.ts | origin/us-states:src/states/look.ts (`glassPanel`, `GLASS`, `RIM`) | adapted; brighter rim (`edge`), optional `tint` (gold), `base` fill, squircle dropped; adds `glossStyle` |
| src/xmas/shared/fonts.ts | origin/nfl-quiz:src/ios/fonts.ts + src/fonts.ts (emoji face) | adapted; loads nothing on import, `useXmasFonts()` holds the frame (delayRender) until Inter 400/500/600/700 and Noto Color Emoji are ready |
| public/fonts/ios/Inter-{400,500,600,700}.woff2, Inter-LICENSE.txt | origin/nfl-quiz:public/fonts/ios/ | byte copy |

None of the copied files depends on another video's content (checked: no level colours, no gta6/nfl names, no 1920 units).

### Layout block (system.ts `LAYOUT`, reference units 1280x720; `checkLayout()` returns [] = fits)
- SAFE (centre 80%): x 128..1152, y 72..648. All text inside it except the counter.
- Light string: y 40..77, 50 bulbs at x 40..1240 (spacing 24.5; changed from 40 in task 2d, one bulb per slot), bulb 14 x 19, wire swag peak y 40 / trough y 54, lowest bulb bottom y 76.
- Caption: centred y 98, box x 360..920, y 79..117 (a box, not a visible pill; the reference shows plain wide-tracked text).
- Tiles: left x 218..618, right x 662..1062, y 138..538, 400 x 400, corner 108 (0.27), gap 44, no plus sign.
- Timer capsule: x 320..960, y 578..642, corner 32. 8 segments, pad 14 / 17, gap 8, each 69.5 x 30 (first at capsule x 14, last at 556.5).
- Counter: centred y 688, box x 520..760, y 674..702 (below the safe band, inside the frame, 18 clear at the bottom).
- Vertical gaps: lights to caption 2, caption to tiles 21, tiles to timer 40, timer to counter 32.

### system.ts exports to use
colours `colors`, `timerColor(t)`, `segmentColor(i)`; type `TYPE`, `textStyle(role)`, `fontStack`; `SAFE`, `LAYOUT`, `timerSegment(i)`;
`bulbs()`, `bulbStyle(b, lit)`, `lightWirePath()`; `tileGlass()`, `bonusTileGlass()`, `timerGlass()`, `glossStyle(size)`;
`frameBorderStyle()`, `backgroundStyle()`, `BOKEH`, `bokehStyle(dot, seconds)`, `lightZoneStyle('left'|'right', strength, 'gold'?)`;
`SPRINGS`, `springAt`, `useXmasFonts`, `useXmasFrame`. ui.ts: `UI`, `TOTAL_SLOTS`, `counterText`, `counterParts`, `FILL_IN`.
Scenes call `useXmasFonts()` at the top. Layer order (back to front): background, bokeh, light zones, tiles (+gloss), timer, lights, frame border, text.

### Notes
- `src/rounds.json` is generated by `npm install` postinstall (scripts/build-questions.js); without it `npx tsc` fails in src/timing.ts (old video). Gitignored.
- The look image shows "1 OF 40"; the prompt says 50 slots, so ui.ts uses TOTAL_SLOTS = 50.
- Caption and counter are 24 units (the image is about 20) for phone legibility.

## Task 2d: LightString (done)
- `src/xmas/components/LightString.tsx`: props `litUpTo`, `pulseSlot`, `pulseFrame` (design ticks since the bulb lit, negative = not yet), `mode` ('progress' | 'all'), `counter` (slot number, omit to hide). Bulb n = slot n, colour from `data.ts bulbColor`. Includes the "N OF 50" counter (ui.ts `counterParts`). Calls `useXmasFonts()`. Absolutely positioned over the whole frame.
- `bulbCues(slot, frame)` returns `bulb-on` (movie slot) or `gold-bulb` (bonus slot) at the absolute design frame the bulb lights.
- Dev preview: composition `Xmas-LightString` (src/xmas/components/LightStringPreview.tsx, registered in Root.tsx). Frames (60 fps): 0 all unlit, 60 twelve lit, 126 pulse on slot 13, 186 gold bonus pulse (slot of the third bonus round), 250 all 50.
- Rendering here needs `--browser-executable=/usr/bin/google-chrome --chrome-mode=chrome-for-testing` (the sandbox cannot download Chrome Headless Shell).

## Task 5a: ScoreScene (done)
- `src/xmas/scenes/ScoreScene.tsx` (+ `scoreCues(start)`, `scoreVoice(start)`), composition `Xmas-Score` (1200 render frames = 20 s). Local tick 0 = the segment's first tick.
- Beats live in `timing.ts` `scoreBeats()` (local ticks): all 50 bulbs glow from tick 0 (LightString mode "all"); the "all fifty" voice starts at 0.6 s and the rank card slides in then (tiers dim); 5 bands of 2.4 s from 3.4 s (lowest first, each voice 0.3 s after its band lights, earlier tiers stay lit); hold from 15.4 s to 20 s (4.6 s; `scoreBeats()` throws if under `rankCardMinSec`). Band lengths are estimates until the voice clips are measured (6b).
- The score segment's `rankCard` range in timing.ts is now the hold (it was the first 4 s of the segment, which nothing read).
- Voice: no audio map existed. `src/xmas/audioMap.ts` holds only the ids of the score scene (`xmas_102` end line, `xmas_103..107` rank lines, checked equal to lines.csv / data.ts ranks[].voice). No voice text is stored in the scene. Task 6c extends this map.
- Text: tier names and ranges from data.ts ranks; `UI.rankCard` ("YOUR RANK", shared with the outro's card miniature) and `rankRange()` in ui.ts. `rankColor(i, count)` in system.ts: grey, green, red, green, gold.
- Card: x 240..1040, y 108..640 (inside the safe band), rows 78 high, 40-unit type.
- Frames to check (render frames at 60 fps): 120 all bulbs lit, card in, no band lit; band lighting 224 / 368 / 512 / 656 / 800 (lowest to highest); 924 first frame of the hold.
- Sounds: `bulb-on` at tick 0 and at each band, `rank-reveal` at the hold.

## Task 6c: voice chain and mix (done)
- `python3 scripts/master_xmas_voice.py` (needs `pip install numpy pedalboard pyloudnorm`): one chain for every clip (high-pass 80 Hz, compressor 3:1 / -18 dB / 10 ms / 100 ms, +1.5 dB at 3 kHz, limiter -1 dB), then a gain to -16 LUFS; the same -1 dB limiter runs again only on a clip the gain pushed over the ceiling (37 of 110 on the first run). Reads `public/xmas/voiceover/clips/`, writes `clips_master/` (same names, rate and length; the timing build still reads `clips/`). Re-run after any re-recording.
- `src/xmas/mix.ts`: `MIX` (voice 1, every sfx scaled to 7 dB under the voice by its plain RMS, music bed target -26 LUFS, duck -8 dB, attack 0.25 s, release 0.6 s, fades) and `MUSIC_FILE` (null = no music).
- `src/xmas/voiceTimeline.ts`: `voiceEvents` (110 clips, absolute ticks, from timing.ts segments and the Hook / ScoreScene / Outro voice marks) and `voiceSignature()`. The reveal line of the slot with the extra pause starts when the pause ends.
- `src/xmas/Audio.tsx`: `XmasAudio {musicSrc?, voice?, sfx?, music?}`, wired into `src/xmas/Full.tsx` (XMAS-P1..P3 stay silent). Sfx come from `sfxCues.ts` part lists moved to the full timeline.
- `npx tsx scripts/build_xmas_duck.ts` bakes `duckEnvelope.generated.ts`, copies the licence text of `docs/xmas/music-license.md` into `musicLicense.generated.ts`, and writes `docs/xmas/mix-report.txt` (collisions, thinking-time check, sfx levels). Re-run after any change to clips, timings, parts or the licence text. With `MUSIC_FILE` set, Audio.tsx throws if the licence text is empty or the envelope is stale.
- Slot clip lengths feed the signature; hook, end, rank and outro clip lengths are read from `src/xmas/timings.csv` by the duck script only, so re-run it after re-recording those.
