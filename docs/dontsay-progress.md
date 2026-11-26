# Don't Say The Same As Me: progress

Branch: `dontsay-quiz` (created from `gta6-quiz`; it was not on the remote).
Frame: 2560x1440 at 60 fps; 1280x720 reference units via `px()`. Authored in 30 fps ticks.

## Done

- **Task 1a** (docs only): `docs/dontsay-context.md` (reuse table, gaps, not-found list) and this file. No feature code, no `src/dontsay/` yet. Nothing compiled or rendered.

## Next step (Task 1b / first build task)

Create the DontSay foundations in `src/dontsay/`, importing nothing from `src/gta6/` or `src/nfl/`:

1. `timing.ts`: own `WIDTH/HEIGHT/RENDER_FPS/FPS/TIME_SCALE`, tick helpers, `useDesignFrame` (pattern: `src/nfl/shared/clock.ts`, read from `nfl-quiz`).
2. `system.ts`: `px`, `SAFE` (10%), tokens, type scale, `SPRINGS` (adapt `src/nfl/system.ts` + `src/ios/tokens.ts` + `src/ios/motion.ts`). Inter + Nunito only.
3. Font loader plus `public/fonts/dontsay/` (Inter 400-700, Nunito; SIL OFL). **Nunito is not in the repo and must be sourced.**
4. `data.ts` over a JSON in `docs/dontsay/` (45 rounds, 5 bonus). Needs `docs/dontsay-prompts-split.md`, which is not in the repo: it must be provided or pasted.
5. Level-driven wallpaper (not hearts-driven).

## Open points for the owner

- Confirm `dontsay-quiz` should branch from `gta6-quiz` (done here) and not from `nfl-quiz` (which would bring `src/nfl/` and the full `src/ios` layer).
- `src/ios/fonts.ts`, `index.ts`, `layout.ts`, `IosBackground.tsx` exist only on other branches. Merging `search-history` or `nfl-quiz` would bring them, but they import earlier-video files (`../fonts`, `../clock`, `../timing`), so DontSay still needs local copies.
- `src/ios/tokens.ts` imports `px` from `../style` (shared base). Decide whether that is acceptable under rule 3.
- `scripts/gta6_qa.ts` does not exist; confirm what QA script is wanted.
- Task ID was `<ID>` in the brief; Task 1a was inferred from the heading.

## Task 1b: DONE

- Added `docs/dontsay/rounds.json`, `docs/dontsay/poll.json`, `docs/dontsay-prompts-split.md` (supplied by owner).
- `src/dontsay/data.ts`: `Round`, `Bonus`, `rounds` (45), `bonuses` (5), `heartCheckIn`, `levelColors`, `ranks`, `pollRounds`, `sourceName`. Fixes applied in data.ts (idempotent; most were already in the JSON).
- `scripts/check_dontsay_data.ts` (`npx tsx scripts/check_dontsay_data.ts`): all hard checks pass; 6 warnings (sourceName null; rounds 6, 25, 28, 33, 36 hold Western defaults).
- `tsc --noEmit` passes. Nothing rendered.
- Notes: level hex colours/wallpaper stops are my choice (JSON only names the tint). `Round` also keeps extra JSON fields (introSec, timerSec, callback, callbackFrom, logoFree, skipResultLine, clarificationChip) for timing.ts.

## Next step

Task 2 (timing.ts / system.ts / fonts) per the original plan above.

## Task 1d: DONE

- `scripts/make_dontsay_sfx.py`, `public/dontsay/sfx/*.wav` + `manifest.json` (31 files), `src/dontsay/sfx.ts` (generated). Ids listed in `docs/dontsay-context.md` section 5.
- Ticked: 1a, 1b, 1c, 1d. (1c has no entry in this file; ticked at the owner's request.)
- `tsc --noEmit` passes. Sounds were not listened to.
- Open: `LEVEL_COUNT = 5` in the script is unchecked against data.ts. `mic-pulse` and `check-in-tone` have a high RMS next to the rest (peak-normalised): lower their volume in cues.

## Task 1c: DONE

- `src/dontsay/timing.ts`: own clock (2560x1440, 60 fps, 30 fps ticks, TIME_SCALE 2), all duration constants (one place), `segments`, `partRanges` (6 parts), `chapters`, frame helpers (`secToTicks`, `ticksToFrames`, `secToFrames`, `useDontSayFrame`, `frameRange`, `locate`, `timecode`), clip hooks (`clipSec`, `clipPath`, `roundClipId`, `bonusClipId`).
- `src/dontsay/timings.generated.ts`: EMPTY placeholder (`clipTimings = []`). A voice-pipeline task replaces it. Until then every slot uses its base value.
- `scripts/dontsay_runtime.ts` (`npx tsx scripts/dontsay_runtime.ts`): per-part table, total, chapters, data/timing cross-check, verdict vs ~10:44.
- Round segment exposes `phases` (intro, timer, sealed, beat, reveal, result), `sealedFrom` (= first tick), `lockClickTicks` (first tick + reveal start).
- `tsc --noEmit` passes. Nothing rendered.

### Runtime with no clips: 11:22 (682 s), target ~10:44 = +38 s
Rounds 512 s, bonuses 80, levels 20, hook 8, settings 4, check-in 2, rank 6, scoreboard 20, outro 30.
Clip-driven intro/reveal slots can only make it longer. Constants were taken as specified and not tuned.

### Assumptions to confirm
- Settings card (4 s) sits after the hook, before the Level 1 card, in Part 1. The brief names the constant but not its place.
- Level card (4 s) opens every level including Level 1.
- Round 45's 4.2 s callback intro is part of the round, not a separate segment.
- Order in Part 6: rank card, scoreboard, outro. End screen = last 15 s of the outro (`outro.endScreen`).
- Clip id scheme `r01_intro`, `r01_reveal`, `b1_intro`, `b1_reveal` is my guess.
- Bonus is fixed at 16 s (2/8/3/3); clips do not stretch it.
- Target tolerance +/-30 s is my assumption.

## Next step
Timing (1c) is done, so "Task 2 (timing.ts / system.ts / fonts)" from the older note now means system.ts + fonts only. Then voice pipeline / timings.generated.ts, or the next build task from docs/dontsay-prompts-split.md.

## Task 2e: DONE (files compile on their own; repo-wide tsc is NOT clean, see below)

- `src/dontsay/components/ExclusionChips.tsx`: banned toggle rows / filter swatches / heavy chips / none, clarification chip (R38), "RULE BREAK = MATCH" chip on `round.heavy`. Props: `round`, `at` (tick), `bottom` (ref units, default 72, block grows upward), `frame` (optional).
- `src/dontsay/components/SettingsSheet.tsx`: level rules sheet, props `level`, `durationSec` (default settingsCardSec), `frame`. Dims to 0.94 (`DIM_TO`), tints wallpaper with the level accent.
- Own `px()` = v * WIDTH / 1280 inside both files (system.ts only has `u()` on a 1920 reference; see open points).
- Nothing rendered. No composition exists for these yet.

### Open points
- `tsc --noEmit` fails outside my files: `system.ts` imports `levelColours` (data.ts exports `levelColors`, different shape); `shared/index.ts` re-exports 8 files that are missing (Shake, EdgeGlow, LowPowerTint, FrostCard, TimerRing, LockNotification, NotificationBanner, ScoreHud). Task 2a output is incomplete.
- `system.ts` uses a 1920x1080 reference frame, against rule 4 (1280x720 via px()).
- UI copy owned by the components (not in data): "Banned answers", "RULE BREAK = MATCH", "Break a rule and it counts as a match." (shown on levels with banned rounds), sheet row labels.
- Round 12 is ruleType banned AND heavy:true, so it shows toggle rows plus the RULE BREAK chip. Round 45 is heavy with `banned` only: plain chips, drawn generic icon fallback.
- Filter rounds without swatches (20-22, 24-27, 38, 39) show the rule text as one chip with a crossed-out neutral swatch.
- "Dims the background to ~0.94" read as brightness 0.94 (black scrim at 0.06).

## Task 2c: DONE (files compile; repo-wide tsc still has the 2a errors listed under 2e)

- `src/dontsay/components/HeartsPill.tsx`: props `at?` (omit = settled, no animation), `bonus`, `left`, `top`, `frame`. Pill springs once (gentle, settles ~15 ticks); hearts follow on a 4-tick stagger from `at+3`. Never changes afterwards. `HEART_COUNT = 3` is a UI constant here (not in data.ts).
- `src/dontsay/components/ListeningGlow.tsx`: props `round`, `wakeAt`, `dimAt`, `offAt`, `card` (rect in ref units, default centre), `frame`. Glow dims to 0.4 over 8 ticks from `dimAt`, off by `offAt`. 5-7 bars, deterministic hash of the round number (no Math.random).
- Scene (3a) must pass wakeAt/dimAt/offAt from the round's `phases` in timing.ts. Nothing rendered.

## Task 2d: DONE (files compile; repo-wide tsc still fails on pre-existing errors)

- `src/dontsay/components/CountdownNumber.tsx` (`CountdownNumber`, `EdgeBeat`): island pill, tabular Nunito 800 seconds, progress line, red + edge pulse for the last URGENT_SECONDS (2 s, shared/timerMath). Props: `level`, `at` (tick the timer starts = end of intro), `top`, `frame`, `edge`. Duration = `timerSecFor(level)`.
- `src/dontsay/components/ResultBeat.tsx` (`ResultBeat`, `resultLineOf`, `resultClipId`): chip "Same answer" (red, `collision` sfx at 0.55) / "Different? Safe" (green, `safe-pulse` sfx). Props: `round`, `outcome`, `at` (tick the result phase starts), `anchor`, `frame`. No heart drawn or animated. `round.skipResultLine` skips chip and sfx.
- `data.ts`: added `resultLines` and `resultLineFor(n, safe)` (additive).
- Nothing rendered. No composition uses these yet.

### Open points
- `shared/EdgeGlow` and `shared/TimerRing` do not exist, so the red pulse and island pill are drawn inside CountdownNumber. Swap when 2a lands them.
- `data.ts` has no per-round outcome (`collision` is High/Medium/Low odds, not a result), so RoundScene must pass `outcome`.
- No round has `skipResultLine: true` in rounds.json, so nothing is skipped yet.
- `resultLines` in rounds.json mention losing/deleting hearts. They are spoken only and never shown on screen; check they fit rule 7 before the voice pass. Clip id `rNN_result` is a guess.
- ResultBeat has no InkBubble yet (2b): the chip sits at `anchor` (default frame centre) + 150 ref units down.
- Pre-existing tsc errors: `shared/index.ts` re-exports 8 missing files; `system.ts` imports `levelColours` (data.ts has `levelColors`).

## Task 2g: DONE (RevealEngine compiles; repo-wide tsc has one pre-existing error)

- `src/dontsay/components/RevealEngine.tsx`: `RevealEngine`, `revealCues(card, start)`, `revealTimes(card, start)`, `REVEAL_SFX`. Props: `round`, `start` (local tick the beat starts), `outcome`, `accent`, `sfx`, `centre`, `frame`.
- Mount from round tick 0: it owns the InkBubble (small from frame 0, slides to centre), the shaking lock, the cues and the ResultBeat.
- Timing from timing.ts only: beat = beatSec; dissolve = revealSec - beatSec (1.5 s); result starts at beat + revealSecFor(round) and runs resultSec.
- Answer text is drawn by InkBubble (`round.answer`, Inter 800, masked by the sweep); not duplicated here.
- `tsc --noEmit`: only error left is `system.ts` importing `levelColours` (data.ts exports `levelColors`), from task 2a. Nothing rendered.

### Open points
- The audio map has no `lock-shake` or `name-reveal`. Stand-ins in `REVEAL_SFX`: shake = `lock-click` at 0.35, chime = `callback-chime-1`. Swap the ids when task 1d adds them.
- `ink-dissolve.wav` is 1.85 s, longer than the 1.5 s sweep: it runs about 0.35 s into the result beat. Its pan is whatever is baked into the file; not listened to.
- `BUBBLE_HALF_H` (150) mirrors InkBubble's large height (not exported); the lock sits above it.
- No composition uses RevealEngine yet, so no `remotion still` was possible.

## Task 3b: DONE (Hook compiles; tsc --noEmit clean; NOT rendered)

- `src/dontsay/scenes/Hook.tsx`: `Hook`, `HookLockNotification` (1 s, takes `at`; `HOOK_LOCK_TICKS`, `hookLockEnd`), `hookCues`, `hookVoice`.
- Composition `DontSay-Hook` added to `src/Root.tsx` (additive, 2 imports + 1 line). Frames to check at 60 fps: 0, 60 (1 s), 180 (3 s), 360 (6 s), 480 (8 s, last = 479).
- Beats (hook clock): notification 0-1 s in, leaves 2.6-3.0; wallpaper fades 3.0-3.8; ink bubble (forced small) + lock click 3.0; hearts spring on "Three hearts every level"; listening glow + prompt card wake on "Let's go"; round 1 live 6.0 (countdown starts then).
- Fix outside scope: `system.ts` imported `levelColours` (not exported by data.ts); now builds it from `levelColors[n].accent`. Repo-wide tsc is clean.

### Open points
- Voice start times in `hookVoice` are estimates (no clips measured). Six lines are ~28 words in about 6 s: tight; measure the clips, and if too fast, lengthen `hookSec`.
- Round 1 plays only ~2 s in the hook (timer 5 s is cut by the hook end). Full round 1 is still expected in 3a: confirm that is what "plays inside the hook (once)" means.
- Copy owned by Hook.tsx (not in data): notification app line "DON'T SAY THE SAME", time label "now". Body line reuses narration line 2.
- Layout is guessed from component defaults (card 140-380, glow bars under it, countdown top 520, InkBubble corner top-right, HeartsPill top-left): overlaps not checked by eye.
- The notification uses its own px()-based banner; `shared/LockNotification` (1920 reference frame) is not used.
- `remotion still` failed: Chromium download blocked (ENOTFOUND remotion.media).

## Task 3c: DONE (Round45Callback compiles; tsc --noEmit clean; NOT rendered)

- `src/dontsay/scenes/Round45Callback.tsx`: `Round45Callback` (wraps `RoundScene` + an overlay), `round45Cues`, `round45VoiceText`, `callbackAnswers`, `round45SlideTick`, timing constants. Composition `DontSay-Round45Callback` added to `src/Root.tsx` (additive).
- `RoundScene` got two optional props (defaults unchanged): `slideAt` (local tick of the bubble slide) and `chips` (false hides the standard ExclusionChips).
- Cards come from `round.callbackFrom` -> `rounds[n].answer` (Banana, Orange, Kiwi, Grapes). Voice text is built from `round.n`, `prompt`, `banned`. Apple is not in the list.
- Frames at 60 fps: card launch 24/32/40/48, land 52/60/68/76 (chimes `callback-chime-1..4` on landing); bubble slide at 150 (2.5 s); timer starts at 252 (4.2 s); round is 780 frames; next segment is the Voice Only bonus (hard cut, no fade).

### Open points
- "Slides to centre, then straight into the timer": slide is at 2.5 s, the timer starts at 4.2 s (timing.ts intro). The 1.7 s between is slide + settle; unchecked against InkBubble's slide length. If the slide should start right before the timer, change `SEALED_EXTRA_HOLD_SEC` logic.
- Standard round slides the bubble after the timer; here it is already centred during the timer, so the box sits at y 592-652 (ref) below the bubble's large state (ends ~590): overlap/clearance not checked by eye.
- The standard "RULE BREAK = MATCH" chip and the "Banned answers" header are not drawn in this scene (the box replaces ExclusionChips). Add if wanted.
- Voice clip `r45_intro` plays only if it exists in timings.generated.ts (still empty); `introSecFor` stretches the intro to the clip.
- Chimes at 4-tick stagger overlap (0.8 s files): intended as a rising run, not listened to.
- `remotion still` failed (Chromium download blocked). Nothing rendered.

## Task 4a: DONE (tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable)

- `src/dontsay/scenes/LevelCard.tsx`: icon-launch spring (levelCardLaunch/Exit), level colour fills frame, title + reset line + "Round 1 of N". Exports `levelCardCopy`, `levelCardVoice`, `levelCardCues` (level-card-N swell at tick 0), prop `sheet` (slides SettingsCard over the card at tick 54, default false).
- `src/dontsay/scenes/SettingsCard.tsx`: 4 s sheet, thin wrapper on SettingsSheet; `settingsCardVoice`, `settingsCardCues`.
- `src/dontsay/scenes/HeartCheckIn.tsx`: 2 s card, static HeartsPill (no `at`), caption = first sentence of voice, `heartCheckInCues` (check-in-tone), `heartCheckInMusicGain(tick)` (1 -> 1.12 over 18 ticks, drops at the cut).
- Compositions in Root.tsx: DontSay-LevelCard-L1..L5 (L2 has sheet on), DontSay-SettingsCard-L2, DontSay-HeartCheckIn.
- Edit outside scope: SettingsSheet copy `No extra rules` -> `None` (task asks for "None").
- Frames to check (60 fps): LevelCard 0, 20, 60, 120 (settled), 220 (exiting); L2 with sheet: 150, 200; SettingsCard-L2: 30, 120; HeartCheckIn: 0, 30, 119.

### Open points
- timing.ts schedules ONE settingsCard segment (before L1) and a 4 s levelCard per level. Nothing schedules the sheet for L2-L5, so the L2-only line never shows unless the L2 card is mounted with `sheet`. Needs a decision.
- "Round counter resets" is shown level-local ("Round 1 of N"), not global.
- Voice clip ids `level_<n>` and `check_in` are guesses; music lift 1.12x is a guess; nothing mounts the music bed yet.
- Level fill is the wallpaper gradient + accent glow (white text on raw amber would be low contrast). Not checked by eye.
- Caption on the check-in is my addition ("voice only"): `showCaption={false}` removes it.

## Task 4b: superseded by the DONE entry at the end of this file (was NOT BUILT)
Started, then stopped at the owner's request in favour of 4c. Nothing written. Needs `src/dontsay/scenes/BonusMindReader.tsx` and `DontSay-Bonus-1`. Note for whoever builds it: `InkBubble` is a single full-frame bubble (small corner to centre, `slideAt` prop), so use `slideAt = bonusTicks.play` to keep it small until the reveal.

## Task 4c: DONE (tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable)
- `src/dontsay/scenes/BonusTripleLock.tsx`: `BonusTripleLock`, `tripleLockTicks`, `bonusTripleLockCues`, `bonusTripleLockVoice`, `bonusTripleLockFrames`. Composition `DontSay-Bonus-2` in Root.tsx (additive, 1 import + 1 line). Prompt, answers (Cow/Pig/Chicken), pass chip and voice lines come from data.ts via BonusWrapper; phase lengths from timing.ts.
- Frames at 60 fps to check: locks 0, 8, 16 (click each, shackle drops); dissolves start 630, 670, 710 and take 40 frames each (check ~650, ~690, ~730); reveal phase 600-780; all three answers visible by 750.
### Open points
- "4-frame stagger" read as 4 design ticks (STAGGER.chip), i.e. 8 render frames at 60 fps. If 4 render frames was meant, change `lockAt` in tripleLockTicks.
- Three own ink covers are drawn in the scene: `InkBubble` is one full-frame bubble and cannot sit in three widget rows. Look and the shared small-corner bubble rule for bonuses are your call.
- Dissolve = 20 ticks each after the 0.5 s beat with a 0.5 s tail hold, fitted into the 3 s reveal phase; voice "Cow. Pig. Chicken." is not synced (no clips measured).
- UI copy owned here: none beyond data (prompt line shown above the widgets). Layout fits the wrapper stage (1024 x ~386 ref units): prompt 40 + three rows of 100 + gaps; clearance not checked by eye.
- `ink-dissolve.wav` (1.85 s) is cut to about 0.9 s per dissolve with a fade.

## Task 4d: DONE (BonusChainReaction compiles; tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable)

- `src/dontsay/scenes/BonusChainReaction.tsx`: `BonusChainReaction` (BonusWrapper + chain + InkBubble), `bonusChainCues`, `bonusChainVoice`, `chainLinkTick`, `chainSlideTick`, `chainDissolveFrom/To`. Composition `DontSay-Bonus-3` in Root.tsx (additive), length `bonusSec`.
- Words parsed from `bonus.prompt` (split on `->`); hint letter = last letter of the previous word; rule line from `bonus.rule`. Nothing hard-coded.
- Ticks (30 fps, local; frames = ticks x 2, computed by script): words arrive ticks 6/18/30/42; links land at ticks 84/132/180 = frames 168/264/360; bubble slides at tick 300 = frame 600 (reveal phase start); dissolve frames 660-750; voice reveal at frame 750. (An earlier version of this note had wrong numbers.)
- `chain-link` x3 and `ink-dissolve` cues are in `bonusChainCues()`; nothing mounts voice clips yet.

### Open points
- Note line shows data text `Tiger is mine - you can't reuse it` (hyphen). Change the dash in rounds.json/data.ts if you want an em dash.
- Bubble large state (300 high at centre y 500) spans y 350-650: 2 ref units under the 648 safe line, 4 above the chain cards. Not checked by eye.
- Rule line fades out when the bubble enlarges so they do not overlap.
- Read beyond the named files (minimal greps): data.ts Bonus type, bonus 3 JSON, timing.ts bonus constants, InkBubble props, Root.tsx registration lines.

## Task 4b: DONE (tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable)

- `src/dontsay/scenes/BonusMindReader.tsx`: `BonusMindReader` (BonusWrapper + prompt + flipped rule + keyboard prediction strip + InkBubble), `bonusMindReaderCues`, `bonusMindReaderVoice`, `bonusMindReaderFrames`, `earnedLabel`, tick constants. Composition `DontSay-Bonus-1` in Root.tsx (additive, 1 import + 1 line).
- Prompt, rule, answer, pass chip (via BonusWrapper) and voice lines come from data.ts; phase lengths from timing.ts. Earned label ("+1 point") is parsed from `passCondition`. No hearts, no collision chip.
- Ticks (30 fps, local): bubble slides at 300 (play end), dissolve 330-375, match cell lights at 375, voice reveal at 375. Frames at 60 fps = ticks x 2: sealed 0; slide 600; dissolve 660-750; match cell 750 (settled ~780).

### Open points
- Strip is own-drawn: left/right cells are neutral dots, centre cell shows a lock, then a green check + "+1 point" at the match. It never shows other words (no extra hard-coded content).
- Bubble large state spans y 290-590; prompt at y 232-284; strip y 598-648. Tight; clearance not checked by eye. The BonusWrapper chip ends near y 225 (estimate).
- Strip height 50 ref units: the "+1 point" text is 28 units, possibly small for a phone; bump if needed.
- Voice is not synced (no clips measured). SFX: chip-land at chip, ink-dissolve at dissolve, safe-pulse at match.

## Task 4f: DONE (BonusVoiceOnly compiles; tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable)

- `src/dontsay/scenes/BonusVoiceOnly.tsx`: `BonusVoiceOnly`, `voiceOnlyTicks`, `voiceOnlyCategory`, `bonusVoiceOnlyCues`, `bonusVoiceOnlyVoice`. Composition `DontSay-Bonus-5` in Root.tsx (additive), length `bonusSec`. No sealed bubble.
- Frames at 60 fps (computed): category text visible from 0, voice starts 12, text fade 12-40; glow + waveform + "Listen" wake over the same span; intro voice ends 220 (estimated: 10 words at 2.6 words/s, replaced by the clip length when `b5_intro` is in timings.generated.ts); caption fades in 280-320 (max opacity 0.5); reveal phase 600, "Violin" answer springs in 624; corner mic pulses with the voice level at all times.
- Check by eye: 0 (text), 40 (text gone, glow + bars), 150 (mid-voice), 300 (caption), 640 (answer).

### Open points
- Data has one voiceIntro string ("Final bonus. Voice only. Listen. Name a musical instrument."), so the category line is not a separate clip: caption timing uses the end of that whole line.
- Category on screen = `prompt` minus the "(spoken)" suffix. It shows large at tick 0 (so the prompt is also text before the voice), fades out as the voice starts, and returns as the faint caption.
- "Listen" label is UI copy owned by the scene. Voice level is a deterministic fake envelope, not read from audio.
- `onScreenNote` for bonus 5 in data.ts is a production note ("Faint caption fades in ~1s..."). The scene passes the bonus to BonusWrapper with `onScreenNote` removed so it is never drawn; the data itself is unchanged.
- Waveform/glow geometry unchecked by eye.
## Task 4h: DONE (Outro + Part6 compile; NOT rendered, remotion still blocked: remotion.media unreachable)

- `src/dontsay/scenes/Outro.tsx`: `Outro`, `OUTRO_ASKS`, `OUTRO_COPY`, `outroTicks`, `outroFrames`, `outroVoice`, `outroCues`. Asks in order, one at a time, 5 s slots; ask 3 stays and glides to the top at the end screen. End screen (last `endScreenSec`): next-video slot, drawn Subscribe button, rank card miniature (bottom-left, names and ranges from data.ts), final fade over `outroFadeSec`.
- `src/dontsay/parts/Part6.tsx`: `Part6` (segments of part 6 from timing.ts), `part6Frames`. Registered `DontSay-P6` in Root.tsx (additive).
- `src/dontsay/sfxCues.ts` (new): `part6Cues()`. Parts 1-5 lists to be added by 4i-4m in the same file.
- `src/dontsay/timing.ts`: added `outroFadeSec = 1` (additive).
- Frames at 60 fps, absolute in P6 (outro starts at 1560 = 26 s): ask 1 in ~1568; ask 2 in ~1868; ask 3 in ~2168; end screen 2460 (41 s); glide 2460-2488; subscribe 2472; slot 2480; miniature 2488; final fade 2760-2820 (last frame 2819).

### Open points
- **4g is not built.** `RankCard.tsx` and `Scoreboard.tsx` do not exist, so `Part6` takes `rankCard` / `scoreboard` as props and shows only the wallpaper for those 26 s. When 4g lands, import them and use them as the defaults. `part6Cues` has no scoreboard rank cues yet.
- Part order follows timing.ts (rank card, scoreboard, outro). The 4h brief says "Scoreboard, RankCard hold, Outro"; 4g's voice ("That was all fifty. Add up your points.") also fits rank card first.
- gta6 notes say that video's end screen draws NO slots (placeholders removed, the user places YouTube elements in Studio). The 4h brief asks for a slot and a button, so they are drawn here. Remove them if the same applies.
- Copy owned here beyond the three asks: "Subscribe", "Next game". Rank miniature text is 10 ref units: thumbnail only, not phone-readable by design.
- Outro uses its own `px()` and own glass (system.ts `u()` is on a 1920 reference).
- Ask slots are fixed (5 s each); voice clips `outro_1..3` are guesses and not measured.
- Repo-wide `tsc --noEmit` has one error outside DontSay: `src/timing.ts` cannot find `./rounds.json` (present before my change).


## Task 4e: DONE (tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable)
- `src/dontsay/scenes/BonusOppositeDay.tsx`: `BonusOppositeDay`, `oppositeDayTicks`, `bonusOppositeDayCues`, `bonusOppositeDayVoice`, `bonusOppositeDayFrames`. Composition `DontSay-Bonus-4` in Root.tsx (additive, 1 import + 1 line).
- Frames at 60 fps (ticks x 2): invert starts 150 (ramp in 150-160, full 160-200), ends 210 (ramp out 200-210); bubble slides 600; dissolve 660-750; voice reveal 750.
### Open points
- The invert is a backdrop-filter veil over everything BonusWrapper draws, so the BONUS pill and pass chip invert too (they are in the same layer as the wallpaper and the wrapper's props cannot split them). Prompt and bubble are drawn above the veil and are not inverted. Splitting it needs a wallpaper-only prop on BonusWrapper.
- "in 4 s": no 4 s constant exists in data.ts/timing.ts (bonus play is 8 s), so no countdown is drawn. Add one when a source constant exists.
- Voice not synced (no clips measured); invert beat position (0.5 s into play) is my choice.
- Prompt is 56 ref units at y 300-390; bubble large spans about y 320-620 and the prompt fades out as it enlarges. Clearance not checked by eye.

## Task 4g: DONE (RankCard + Scoreboard compile; repo-wide `tsc --noEmit` clean; NOT rendered, `remotion still` blocked: Chromium download unreachable, ENOTFOUND remotion.media)

- `src/dontsay/components/rankWords.ts` (new): `numberWords(n)` (0-99, lower-case, hyphenated compounds) and `rankVoiceLine(rank, isTop)`. Nothing in RankCard/Scoreboard writes a rank number or the point total as a literal; both are spelled out from `ranks` / `rounds.length + bonuses.length` through this helper. Checked by hand against the brief's five example lines and the "That was all fifty" line — the generated text matches exactly.
- `src/dontsay/scenes/RankCard.tsx`: `RankCard`, `rankCardVoice`, `rankCardCues`, `rankCardFrames`, `RANK_CARD_SETTLE_TICK` (20, an estimate). One glass "wallet pass" card, all five ranks from `ranks` (name + `min–max`, top rank shown as `min+`), nothing else on screen. Springs in ('pop', tick 0) and is static for the rest of the 6 s (`rankCardSec`). Self-mounts its one `rank-reveal` cue as `Audio`/`Sequence`, same pattern as BonusOppositeDay. Composition `DontSay-RankCard` in Root.tsx.
- `src/dontsay/scenes/Scoreboard.tsx`: `Scoreboard`, `scoreboardVoice`, `scoreboardCues`, `scoreboardBandAt`, `scoreboardFrames`. Five bands in a vertical ladder (highest at top, lowest at bottom — `ranks` itself is lowest-first; the component reverses only the on-screen order), each springs in ('pop') and stays lit once lit: `scoreboardSec` / `ranks.length` = one 4 s slot per rank, band `i` starts lighting at `i * slot + 6` ticks. Name + range are drawn on the band itself, so each spoken line is shown as text at the same time. `chip-land` cue per band, `rank-reveal` on the last (highest) band. Composition `DontSay-Scoreboard` in Root.tsx.
- `src/dontsay/parts/Part6.tsx`: now imports `RankCard`/`Scoreboard` and uses them as the default `rankCard`/`scoreboard` props (two lines, as the 4h note asked for) — `DontSay-P6` now shows the real rank card and ladder instead of bare wallpaper for those 26 s.
- `src/dontsay/sfxCues.ts`: `part6Cues()` now reuses `rankCardCues()` and `scoreboardCues()` (shifted to the part-6 clock) instead of the old single placeholder `rank-card` entry. Additive; outro part unchanged.
- `src/Root.tsx`: two new compositions, `DontSay-RankCard` and `DontSay-Scoreboard` (standalone, for checking each scene on its own).

### Frames to check (60 fps)
- `DontSay-RankCard`: 0 (card invisible/just starting), 20 (still mid-spring, close to settled — my 'pop'-preset estimate for `RANK_CARD_SETTLE_TICK`, not sampled against the real spring curve), 40 (**first frame of the 6 s hold**, i.e. where it should already look fully static), 359 (last frame — should look identical to 40).
- `DontSay-Scoreboard`: 0 (ladder dim, nothing lit), 12 (Echo, the lowest band, lighting — `scoreboardBandAt[0]` = 6 ticks = 12 frames), 252 (Free Thinker, the middle band, mid-ladder), 492 (Rare Mind lighting), 612 (One of a Kind, the top band, lighting — the `rank-reveal` sting), 1199 (last frame — full ladder lit).
- `DontSay-P6` (if checked as a whole): local frame 0 = rank card start, 360 = scoreboard start, 1560 = outro start (unchanged from the 4h note).

### Open points
- `RANK_CARD_SETTLE_TICK` (20) and the scoreboard's 6-tick lead into each band are my estimates, not sampled against Remotion's actual `spring()` curve for the 'pop' preset (damping 14, stiffness 180) — `remotion still` was blocked, so the exact settle frame is unchecked by eye.
- Both scenes' overshoot on the 'pop' spring is clamped to 1 (`clamp01`) before driving opacity/scale, so the visual loses the spring's bounce; a version that lets scale briefly overshoot past 1 would look livelier but was not worth the extra risk unverified.
- Voice clip ids (`rankcard_reveal`, `scoreboard_1..5`) are guesses, same convention as `check_in` / `level_<n>` in HeartCheckIn.tsx / LevelCard.tsx — neither scene self-mounts an `<Audio>` for its voice line (only the non-voice cues are self-mounted), matching those two scenes rather than Round45Callback/Hook/BonusVoiceOnly, which use the real `roundClipId`/`bonusClipId` pipeline. Swap to that pattern if/when `scoreboard_*`/`rankcard_*` clips get measured into `timings.generated.ts`.
- Scoreboard's ladder is ordered highest-at-top on screen (a "climbing" visual); `ranks` itself stays lowest-first everywhere else (RankCard's rows read top-to-bottom lowest-first, matching `ranks`' own order, since that screen is a reference card, not a climb).
- `rank-reveal` is now used twice total in the full video (RankCard's own cue, Scoreboard's top-band cue) plus the same id already in `part6Cues`'s old single entry (replaced); not a problem for Remotion rendering (each scene schedules its own `<Audio>`) but worth knowing if a mix engineer only expects one `rank-reveal` hit.
- Did not touch `src/dontsay/shared/`, `src/gta6/`, `src/nfl/`, or any round/bonus scene. `git pull --rebase` was clean (no conflicts) before this push.

## Task 4l: DONE (tsc --noEmit clean; NOT rendered, remotion still blocked: ENOTFOUND remotion.media)
- `src/dontsay/parts/Part4.tsx`: `Part4` (prop `sheet`, default true), `part4Frames` (6600 frames = 110 s). Segments come from timing.ts part 4: LevelCard L4, rounds 28-36 via `RoundScene`, `BonusOppositeDay`. Wallpaper = level 4 gradient. Composition `DontSay-P4` in Root.tsx (additive).
- `src/dontsay/sfxCues.ts`: `part4Cues()`: level swell + sheet slide, per-round `revealCues` (shake/click/dissolve/chime), Bonus 4 cues. Ticks local to the part.
- Frames to check at 60 fps (part-local, computed from timing.ts ticks x 2): L4 card 0, 108 (sheet slides in at tick 54), 230; round 28 starts 240 (timer 312, beat 582, reveal 612, result 732); round 29 starts 840; round 36 starts 5040; bonus 4 starts 5640 (invert 5790-5830, bubble slides 6240, dissolve 6300-6390, reveal 6390); last frame 6599.
### Open points
- `Part3.tsx` does not exist on this branch; Part6.tsx was used as the pattern.
- timing.ts has no separate settingsCard segment for L4, so the rules sheet is the LevelCard `sheet` overlay inside the 4 s level card (sheet visible about 2.2 s, not the full 4 s). L4 rounds all have ruleType none, so the sheet shows "None".
- Result chip outcome uses `defaultOutcome` (High collision = red, else green): editorial choice, not data.
- Round cue ids/volumes reuse RevealEngine stand-ins (lock-click for the shake, callback-chime-1).
- Frame numbers are arithmetic on timing.ts ticks (levelCard 120 ticks, 9 rounds x 300, bonus 480); not sampled from a render.
## Task 4k: DONE (Part3 compiles; `tsc --noEmit` clean for DontSay files; NOT rendered, `remotion still` blocked: ENOTFOUND remotion.media)

- `src/dontsay/parts/Part3.tsx`: `Part3`, `part3Frames` (7260), `part3Range`. Composition `DontSay-P3` in Root.tsx (additive, 1 import + 1 line; the gta6 `Part3` import there is untouched, dontsay one is aliased `DontSayPart3`).
- `src/dontsay/sfxCues.ts`: `part3Cues()` (level swell + settings slide, per-round reveal cues, check-in tone, bonus chain cues; ticks local to the part).
- Everything is mounted from timing.ts `segments` (part 3): no round, level, bonus or duration literal in the file. Part2.tsx does not exist on this branch; Part6.tsx was the pattern.
- Settings card: mounted as `LevelCard sheet` (SettingsCard slides over the level card at tick 54, inside the card's 4 s). timing.ts has no L3 settings segment, so no time was added.
- Layout (60 fps, absolute in P3): level card 0-240; r19 240; r20 900; r21 1560; r22 2220; r23 2880; check-in 3540-3660; r24 3660; r25 4320; r26 4980; r27 5640; bonus 3 starts 6300 (hard cut, no fade) to 7260.

### Frames to check by eye (DontSay-P3, 60 fps)
- Check-in placement: 3539 (last frame of round 23, answer/result), 3540 (first check-in frame), 3659 (last), 3660 (round 24 first frame, hearts pill must be static, no spring: it is not level-first).
- Round 27 -> bonus 3: 6299 (last frame of round 27), 6300 (first bonus frame: sealed bubble/chain intro).
- Level card + sheet: 0, 108 (sheet slides in, tick 54), 239; round 19 first frame 240 (hearts pill spring-in, level-first only).

### Open points
- Part3 mounts audio only for LevelCard/SettingsCard cues and the check-in tone (those scenes do not mount their own). `part3Cues()` lists all cues for the mix, so do not also mount it per scene.
- Not in `part3Cues`: InkBubble's first lock click, ResultBeat chip sound, BONUS pill sound (ticks not exported by their components).
- Round outcome uses RoundScene's default (derived from `collision` odds); data.ts has no per-round outcome.
- Voice clips (`level_3`, `check_in`, round intro/reveal) are not mounted here; no clips exist yet (timings.generated.ts empty). Check-in music lift (`heartCheckInMusicGain`) not applied: no music bed mounts.
- Repo-wide tsc: one error outside DontSay (`src/timing.ts` cannot find `./rounds.json`), present before this task.
- Read beyond the named files (minimal): timing.ts segment types, SettingsCard/LevelCard/RoundScene/RevealEngine exports, Part6.tsx, sfxCues.ts, Root.tsx registration lines, sfx.ts exports.
## Task 4j: DONE (tsc --noEmit clean; NOT rendered, remotion still not run)

- `src/dontsay/parts/Part2.tsx`: `Part2`, `part2Frames` (7920 = 132 s), `part2Segments`. Registered `DontSay-P2` in Root.tsx (additive). Level card L2 uses `LevelCard sheet` (SettingsCard slides over at LEVEL_SHEET_AT), rounds 10-18 via `RoundScene`, then `BonusTripleLock`. Everything is read from timing.ts `segments` (part 2).
- `src/dontsay/sfxCues.ts`: `part2Cues()` (level card + sheet, each round's reveal cues, triple-lock cues) on the part-2 clock.
- Frames at 60 fps, local to DontSay-P2 (video time in brackets): level card 0 (2:20), sheet slides ~108; round 10 240 (2:24); round 12 HEAVY 1680 (2:48), intro ends 1872; round 18 HEAVY 6120 (4:02), intro ends 6312; bonus 2 6960 (4:16); last frame 7919.
### Open points
- Part1.tsx does not exist yet (4i not built): Part6.tsx was used as the pattern.
- timing.ts has no separate 4 s settingsCard segment for L2, so the sheet is the LevelCard `sheet` overlay inside the 4 s level card (visible about 2 s). A full 4 s sheet needs a timing.ts change that shifts every later segment.
- Part2 hard-fails if part 2's bonus is not triple-lock.

## Task 4m: DONE (tsc --noEmit clean; NOT rendered, remotion still blocked: remotion.media unreachable, ENOTFOUND)

- `src/dontsay/parts/Part5.tsx`: `Part5`, `part5Range`, `part5Frames` (7380 = 123 s). Composition `DontSay-P5` in Root.tsx (additive, 1 import + 1 line). `part5Cues()` added to `src/dontsay/sfxCues.ts` (additive).
- Everything is read from timing.ts `segments` (part 5): L5 LevelCard (with the SettingsCard sheet, `sheet` on), rounds 37-44 via RoundScene, round 45 via Round45Callback (picked by the data flag `round.callback`), Bonus 5 via BonusVoiceOnly (mapped by bonus number). The part throws on any other segment kind or an unmapped bonus. Heavy-rule rounds need no switch: RoundScene reads `round.heavy` (data: 37, 40, 42, 43, 44 and also 45).
- Frames at 60 fps, local to P5 (from timing.ts): level card 0-239; round 37 starts 240; 38 at 960; 39 at 1560; 40 at 2160; 41 at 2880; 42 at 3480; 43 at 4200; 44 at 4920; round 45 at 5640 (780 frames); Bonus 5 at 6420 (960 frames, last frame 7379).
- Check by eye: 5640 (round 45 start, bubble small); 5640+24..76 (cards launch 24/32/40/48, land 52/60/68/76); 5640+150 (bubble slide); 5891 (last frame of the 4.2 s callback intro) and 5892 (timer starts: 5640 + 252); 6419 (last frame of round 45) then 6420 (first frame of Voice Only: hard cut, no fade, no sealed bubble). Level card: 0, 120, 150 (sheet up), 230 (exit).

### Open points
- The rules sheet is shown inside the 4 s level card (`LevelCard sheet`, slides up at tick 54 = frame 108, so about 2.2 s on screen), not as its own 4 s segment: timing.ts has no settingsCard segment in part 5 and I did not change it (that would shift the runtime). Decision for the owner.
- The level voice (`level_5`, the same clip id SettingsCard uses) and the card/sheet sounds are mounted by Part5 itself (LevelCard mounts none); the voice plays only if the clip exists in timings.generated.ts (still empty).
- Round intro voice (`rNN_intro`) for rounds 37-44 is not mounted by Part5 or RoundScene (only Round45Callback mounts its own). Not touched here.
- `part5Cues()` mirrors the scenes' exported cue lists (level card, reveal cues of each round, callback chimes, voice-only). Sounds mounted inside InkBubble, ResultBeat and BonusWrapper are not in it. It type-checks but was never run: importing scene files in plain Node fails on the font loader.
- Backdrop under the level card is the previous level's wallpaper (first level in the part minus one, derived), black behind it.
- Layout, overlaps, sheet over the exiting card and the callback-to-timer gap were not checked by eye.

## Task 4i: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: Chromium download blocked, ENOTFOUND remotion.media)

- `src/dontsay/parts/Part1.tsx`: `Part1`, `part1Frames` (8400 = 140 s), `part1Range`, `part1Segments`. Composition `DontSay-P1` in Root.tsx (additive, 1 import + 1 line). Mounted from timing.ts `segments` (part 1) in order: hook, settingsCard, levelCard L1, rounds 1-9, bonus 1. Hard cuts, no fades. Throws if part 1 stops starting with the hook or ending with bonus 1.
- `src/dontsay/sfxCues.ts`: `part1Cues()` (hook cues, settings slide, level swell, each round's reveal cues, Mind Reader cues; ticks local to the part). Part1 mounts audio only for hook, settings and level card; rounds and the bonus mount their own.
- Frames at 60 fps, part-local (computed from timing.ts): hook 0-479; settings card 480-719; level card L1 720-959; round 1 960; round 2 1680; round 9 6720-7439; bonus 1 7440-8399.

### Frames to check by eye (DontSay-P1)
- Hook into round 1: 359 (hook, countdown live from 360), 479 (last hook frame), 480 (settings card first frame), 959 (last level-card frame), 960 (round 1 first frame: hearts pill must spring in, level-first).
- Round 9 -> bonus 1: 7439 (last frame of round 9, result chip), 7440 (first bonus frame, BONUS pill / sealed bubble small), 7440+600=8040 (bubble slides, bonus tick 300).

### Open points
- **Round 1 plays twice.** The hook already plays ~2 s of round 1 (live from 6.0 s), and timing.ts also schedules a full round 1 after the level card. The brief says "Hook (includes round 1)" but dropping the segment would shorten Part1 by 720 frames and shift every later part, so I kept both. Decide: keep, or change timing.ts.
- Order follows timing.ts: hook, SETTINGS card, then LEVEL card (the brief lists level card first).
- Settings card level is taken from the first level card in the part.
- Hook voice starts and the hook's audio cues are not measured against clips (no clips). `hookCues` mounted here; the hook's bubble has sfx off, its lock click is in `hookCues`.
- Not in `part1Cues`: InkBubble's first lock click on rounds, result chip sound, BONUS pill sound (ticks not exported).
- Read beyond the named files (minimal): timing.ts segments, sfxCues.ts, Root.tsx registration lines, sfx.ts and Part6.tsx/RankCard.tsx (grep and short views for the mount pattern), RoundScene props.

## Task 4n: DONE locally (tsc --noEmit clean; NOT rendered; NOT pushed: no token supplied this session)

- `Part6.tsx` and `DontSay-P6` already existed (4h, 4g); merged, not duplicated (Root.tsx still has one registration). `part6Cues` already existed in sfxCues.ts and is unchanged.
- Change: Outro mounts no audio, so Part6 now mounts `outroCues` at the outro start (they were only listed in `part6Cues`, never played). Offsets now use `frameRange`; unexpected segment kinds throw. Hard cuts, no fades.
- Order follows timing.ts: rank card (6 s), scoreboard (20 s), outro (30 s). The 4n brief says "Scoreboard, RankCard hold, Outro"; not changed because that needs a timing.ts change.
- Frames (60 fps, part-local): rank card 0-359; scoreboard 360-1559; outro 1560-3359 (56 s total, 3360 frames).
- Check by eye: 359 -> 360 (rank card to scoreboard cut), 1559 -> 1560 (scoreboard to outro cut), outro end screen 2460, final fade 2760-3359.

## Task 4o: DONE (tsc --noEmit clean; NOT rendered)

- Prerequisites 4i, 4j, 4k, 4l, 4m, 4n all have DONE entries and their commits are on the branch.
- `src/dontsay/Full.tsx`: `DontSayFull`, `dontSayFullFrames` (= `RENDER_TOTAL_FRAMES`, 40920 = 682 s). Part1 to Part6 as Sequences at `partRanges[i].renderFrom`, length `partRanges[i].frames`; hard cuts. Throws if the part component count differs from timing.ts. Composition `DontSay-Full` in Root.tsx (additive, 1 import + 1 line). Part frame counts sum to the total (checked by script).
- Part starts (60 fps frames): P1 0, P2 8400, P3 16320, P4 23580, P5 30180, P6 37560.
- `scripts/dontsay_chapters.ts` (`npx tsx scripts/dontsay_chapters.ts`): prints the chapter list and the diff to the draft, writes `docs/dontsay/chapters.txt`. Chapters: Intro, each level card, final bonus, rank card (bonuses 1-4 and the outro are not chapters). Checks first = 0:00 and every chapter >= 10 s.
- Chapters: 0:00 Intro, 0:12 Level 1: Warm-up, 2:20 Level 2: Banned list, 4:32 Level 3: Filters, 6:33 Level 4: Under pressure, 8:23 Level 5: Final, 10:10 Final bonus: Voice Only, 10:26 Your rank. Draft was 0:00, 0:08, 2:12, 4:19, 6:16, 8:01, 9:44, 10:00: +0, +4, +8, +13, +17, +22, +26, +26 s.

### Open points
- Level 1 starts at its level card (0:12). The 4 s settings card (8-12 s) sits inside the Intro chapter; starting Level 1 at 0:08 would move it there.
- The drift is the runtime: 682 s (11:22) against the ~10:44 target, as noted under 1c. Clip-driven intro/reveal slots can only lengthen it.
- No music bed or voice layer in the Full composition yet (no clips). Part1 plays round 1 twice (see 4i).
- Nothing rendered, so no frame of the Full composition was checked. Part boundaries to look at: 8399 -> 8400, 16319 -> 16320, 23579 -> 23580, 30179 -> 30180, 37559 -> 37560.

## Task 5a: DONE (tsc --noEmit clean; voice clips do not exist yet, so the pipeline was tested on synthetic tones kept outside the repo)

- `docs/dontsay/lines.csv` (173 rows, ids ds_001 to ds_173) added from the user's attachment.
- `scripts/clean_dontsay_clips.sh`: wav in `public/dontsay/voiceover/clips/<id>.wav`, trim silence, 0.1 s kept at each end, loudnorm -16 LUFS (2 pass, linear). Originals copied once to `raw/` (already ignored by `.gitignore`: `public/*/voiceover/raw/`), every run cleans from raw/. Fails on an id with no clip or a clip with no row. `DRY_RUN=1` = checks and tables only; `PARTIAL=1` = clean the clips that exist.
- `scripts/build_dontsay_timings.py`: ffprobe of every clip -> `src/dontsay/timings.csv` + `timings.generated.ts`. Strict by default (exit 1 if any id has no clip, nothing written); `PARTIAL=1` writes only the clips that exist (the rest keep base timing). Committed files are the empty form until real clips exist.
- `scripts/build_dontsay_audio_map.ts`: walks lines.csv in order against data.ts and writes `src/dontsay/audioMap.ts` (`roundAudio`, `bonusAudio`, `levelIds` with settings, `checkInId`, `hookIds`, `rankIntroId`, `rankIds`, `outroIds`, plus `roundAudioOf` / `bonusAudioOf`). Exit 1, nothing written, on: leftover or out-of-order row, unknown type, duplicate id, round without reveal or result, heavy round without rule row, rule row on a non-heavy round, bonus without intro or reveal, missing level or check-in, rank row that does not name its tier, row count. Soft warnings (printed): spoken text differs from data.ts.
- `timing.ts` now takes clip ids from `audioMap.ts` (`roundClipId`, `bonusClipId`, new `ruleClipId`; `ClipKind` gains `result`). `introSecFor` = max(base, intro clip + 0.3), `revealSecFor` = max(2.0, reveal clip + 0.3); a clip that is not measured keeps the base value.

### Checked
- Audio map on the real CSV: 173 of 173 rows mapped, exit 0. Six mutated copies (extra row, missing reveal, round intro typed as bonusintro, rule on a non-heavy round, heavy round without rule, duplicate id) all exit 1 and write nothing.
- Cleaning on 173 synthetic stereo 24 kHz clips: every clip measures -16.0 LUFS, edge silence cut to 0.1 s (2.90 s -> 2.10 s on ds_001), all 173 originals in raw/, channels and sample rate kept.
- Runtime with NO clips (what is committed): P1 140 s, P2 132 s, P3 121 s, P4 110 s, P5 123 s, P6 56 s = 682 s (11:22). With the synthetic clips (lengths invented, not real) the total went to 734.6 s and 43 of 45 rounds grew past base: only a test that the rule works. The real runtime is unknown until real clips exist.

### Open points
- 12 text differences between lines.csv and data.ts (voiceIntro/voiceReveal of bonuses 1-5, level 2 and 3 lines, check-in line). Not changed: the CSV is what gets recorded, data.ts voice fields are only used as fallback text. Decide which side wins.
- Round 30 and 41 answers are numerals in data.ts and words in the CSV (expected, not compared).
- Nothing mounts rule/result/level/check-in/hook/rank/outro clips by id yet except what scenes already do; `ruleClipId` is exported for that. Scenes that still call `clipSec(...)` with the old id format (BonusVoiceOnly, BonusTripleLock, Round45Callback, Part5) now get ds_ ids through `roundClipId`/`bonusClipId`; their level/rank/outro ids are unchanged and untouched here.
- Nothing rendered.

## Task 5a follow-up: voice text in rounds.json now matches docs/dontsay/lines.csv (the CSV is final)

- Edited `docs/dontsay/rounds.json` (the source data.ts reads): `bonuses[].voiceIntro` (all 5), `bonuses[].voiceReveal` for bonuses 2-5 (now end "Different from all three? Point for you." / "Different? Point for you."), `levelColors` 2 and 3 `voice`, `heartCheckIn.voice` ("Hearts check. Last one? Careful."), and the unused `levelIntros` copy for 2 and 3. data.ts untouched.
- Audio map now reports 0 warnings (was 12); 173 of 173 rows mapped; tsc clean. Not rendered.
- Effects to check by eye (text got longer or different, nothing rendered): level 2 and 3 cards (their third sentence is now "Banned answers count as a match." / "Filters, and four seconds."), the check-in caption ("Hearts check."), and the bonus intro/reveal captions.

### Open: scenes still use old placeholder clip ids, not the ds_ ids
- `Hook.tsx` (`hook_00`...), `LevelCard.tsx` and `SettingsCard.tsx` (`level_N`), `HeartCheckIn.tsx` (`check_in`), `RankCard.tsx` (`rankcard_reveal`), and the rank/outro/result-line clips do not read `audioMap.ts`. Only round intro/reveal and bonus intro/reveal slots do (via timing.ts). With real ds_ clips in place these voice lines will not be found, and an `<Audio>` mounted on a missing file can fail the render. Needs its own task: point those scenes at `hookIds`, `levelIds`, `checkInId`, `rankIntroId`/`rankIds`, `outroIds` and `ruleClipId`/`result` ids.

## Task 5b: DONE (tsc --noEmit clean; nothing rendered). Clips extracted and wired (pipeline level)

- `clips.7z` (173 wav, ids ds_001 to ds_173, mono 44.1 kHz, match lines.csv exactly) extracted into `public/dontsay/voiceover/clips/`, cleaned with `scripts/clean_dontsay_clips.sh` (0.1 s edges, -16 LUFS; originals in `public/dontsay/voiceover/raw/`, git-ignored; the 7z is the archive), then `build_dontsay_timings.py` (173 of 173, 343.5 s of audio) and `build_dontsay_audio_map.ts` (173 of 173, 0 warnings). Cleaned clips are committed like the GTA 6 ones.
- `scripts/dontsay_voice_fit.ts` (`npx tsx scripts/dontsay_voice_fit.ts`, `FIT_TOP=15`): per slot, the clip length against the slot constants in timing.ts, the 15 worst, runtime as built and with every slot stretched, each with and without the 15 shortened (cut to slot minus 0.3 s). Self-check: its "as built" model must reproduce timing.ts TOTAL (exits 1 otherwise). Read-only: no text or clip edited.
- Result: 65 of 151 slots have a clip longer than the slot (intro 35/45, result 16/45, reveal 6/45, bonus intro 5/5, level 1/5, check-in 1/1, bonus reveal 1/5); 55 more fit by less than the 0.3 s pad. Runtime now 719.4 s (11:59), base 682.0 s; clips add 37.4 s; with every slot stretched 758.2 s (12:38). Shortening the 15 worst: 705.4 s as built (-14.0 s), 727.1 s stretched (-31.1 s). Target 10:44 (644 s).

### Open: the recorded voice does not play yet except in a few places
- Playing audio from these clips: `ResultBeat` (result lines) and `Round45Callback` (round 45 intro) only. Rounds 1-44 intro/reveal, rule clips, bonus intro/reveal (bonus scenes only read the clip length), level cards (`level_N` ids), check-in (`check_in`), rank (`rankcard_reveal`), outro and `Hook.tsx` (`hook_00`...) do not use the ds_ ids. `Hook.tsx` points at clip files that do not exist: check before any render. A full voice layer (placed from audioMap + segments) is a separate task; an earlier attempt (commit 6452538) was reverted and is not on the branch.
- Slots that do not stretch with clips (result, level, check-in, bonus intro/reveal, rule line of heavy rounds) are only reported by the fit script; timing.ts is unchanged.

## Slots stretch to their voice clips (after 5b)
- timing.ts: every voiced slot is now max(base, clips + 0.3 s): round intro (+ rule clip on heavy rounds), reveal, result, level card, settings card, heart check-in, bonus intro and bonus reveal (play and result stay fixed). Functions: resultSecFor, levelCardSecFor, settingsCardSecFor, checkInSecFor, bonusPhaseSecs, bonusSecFor, bonusTicksFor.
- BonusWrapper and the five bonus scenes read bonusTicksFor(n) (per bonus) instead of a fixed bonusTicks; Root.tsx sizes bonus, level, settings and check-in compositions from the same functions.
- Runtime with the current clips: 758.2 s (12:38). Shortening the 15 worst gives 727.1 s. dontsay_voice_fit.ts self-checks its model against TOTAL_TICKS.
- Not done: the scenes still do not play most ds_ clips (rounds 1-44 intro/reveal/rule, hook, level, settings, check-in, rank, outro). Nothing rendered.

## Task 5c: DONE (tsc --noEmit: only the old `src/timing.ts` `./rounds.json` error; `dontsay_voice_check.ts` ok: 173 clips, 0 overlaps; NOTHING rendered, `remotion still` blocked: ENOTFOUND remotion.media)

- `timing.ts`: `voiceGapSec = 0.25` (the only gap constant); `fitSec` now adds the gap between lines of one slot (heavy rounds: intro + gap + rule, so those intro slots grew 0.25 s); new `hookSecFor()`, `rankCardSecFor()`, `outroSecFor()` (max of base, clips + gaps + `clipPadSec`), used in `buildSegments`; `endScreen` is still the last `endScreenSec` of the outro; new `voiceCues(segment) -> { id, tick }[]` (ticks local to the segment), the only source of clip start times. Ids come only from `audioMap.ts` and it throws on a missing one.
- `src/dontsay/components/VoiceLayer.tsx`: `VoiceLayer` (one `<Audio>` per cue at `ticksToFrames(tick)`, `staticFile(clipPath(id))`), `findSegment`, `withVoice`. Mounted once per segment in Part1 to Part6 (rounds in Part1 with `at`), in `Preview.tsx` (DontSay-Round, -Round-All) and, via `withVoice` wrappers in Root.tsx, in the standalone Hook, LevelCard-L1..L5, SettingsCard-L2, HeartCheckIn, RankCard, Bonus-1..5 and Round45Callback compositions. Scoreboard has no voice.
- Removed voice from scenes: `ResultBeat` (and `resultClipId`), `Round45Callback`, Part5 `LevelBlock`; deleted `levelCardVoice`, `settingsCardVoice`, `heartCheckInVoice`, `rankCardVoice`, `outroVoice`; Hook narration now uses `hookIds` (4 lines: its old 6-line copy "Say yours before the timer ends." / "Fifty rounds." is gone, no clip exists for it). No `hook_N`, `level_N`, `check_in`, `rankcard_reveal`, `outro_N`, `rNN_result` ids are left.
- Hook beats (hearts spring, listening glow wake, round live) now start from the clip start ticks; round 1 goes live 0.4 s after "Let's go". Outro asks appear when their clip starts (ask 3 therefore sits on screen about 7 s before the end screen). Rank card holds 16.7 s now (intro + five rank lines read over the card); the scoreboard is still 20 s and silent.
- `scripts/dontsay_voice_fit.ts`: hook, settings, rank card and outro entries, gaps in the model; self-check against TOTAL_TICKS still passes. `scripts/dontsay_voice_check.ts` (new, exit 1 on failure): every audioMap id cued exactly once, tick + length inside its slot, no overlaps, every file present. Negative-tested with two temporary mutations (a check-in clip removed, hook/rank/outro clips stacked): it failed with 11 problems, then timing.ts was restored.

### Runtime
- Total 770.9 s (12:50), 46254 frames (was 758.2 s). Parts: P1 147.5 s, P2 146.4, P3 144.8, P4 123.1, P5 142.4, P6 66.7. Part starts (60 fps): 0, 8852, 17636, 26326, 33710, 42254. Target 10:44 (644 s): +127 s.
- Hook 8.03 s (was 8), rank card 16.7 s (was 6), outro unchanged at 30 s.

### Frames to check by hand (60 fps)
- Round 12 intro + rule (DontSay-P2, part frame 1786 start): intro clip ds_043 at 0, rule ds_044 at +122 (1908), intro slot ends +302, reveal clip ds_045 at +722, result ds_046 at +850.
- Round 45 callback (DontSay-P5, start 6574): intro ds_159 at 0, rule ds_160 at +124, fruit cards land around +52..+76 (4g/3c notes), reveal ds_161 at +634. Check that the voice no longer plays twice.
- Bonus 3 intro (DontSay-P3, start 7568): ds_097 at 0 (4.4 s, the intro phase is stretched to it), reveal ds_098 at +762.
- Hook (DontSay-P1, 0-482): clips at 0, 132, 262, 394; hearts spring about 262, glow wake 394.
- Outro (DontSay-P6, start 2200): clips at 0, 170, 316; end screen at +900.
- Rank card (P6 0-1000): rank lines at 0, 180, 280, 468, 644, 824; scoreboard starts at 1000.

### Open
- **Ducking: none.** There is no music bed mounted anywhere (Full.tsx has none; `heartCheckInMusicGain` is unused) and no ducking helper in src/dontsay, so nothing was added. When a music bed lands, duck it under `voiceCues` ticks.
- SFX under voice: the ink-dissolve, chimes, collision/safe sounds and the level swell are not ducked; they can mask a clip. Not listened to.
- Nothing rendered, so no audio-to-picture sync was checked. Result clips play at phases.result.from while the chip appears at the same tick; the old 4-tick delay is gone.
- The 4k note said Part3 mounts level/check-in cues itself: unchanged. Part2 and Part4 still do not mount level-card sfx cues (not touched).
- Rank card is now 10.7 s longer than the base and the scoreboard is silent: decide whether the five rank lines should instead play on the scoreboard bands (would need per-band cues and a longer scoreboard).
- `SettingsCard-L2` standalone plays the settings clip (ds_005, the L1 rules line) over the L2 sheet: a preview only.
- Outro `ASK` slots no longer have equal length; the end screen start is unchanged.

## Task M1: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: ENOTFOUND remotion.media)

- `src/dontsay/system.ts` only. `SPRINGS` is now two curves: `soft` (damping 20, stiffness 120, mass 1, `overshootClamping`) for everything, and `reveal` (damping 17.5, stiffness 120) for the answer reveal only. Sampled with Remotion's `spring()` at 30 fps: soft max 1.0000 (settled within 1% by tick 15); reveal max 1.0153 (1.5%, under the 2% cap; within 1% by tick 18).
- Aliases, all -> `soft`: gentle, snappy, smooth, pop, bouncy. Nothing aliases `reveal`.
- `springAt` default preset is now `soft` (was `snappy`).
- Added `easeOut(t, power = 3)` (clamped, never linear) and `STAGGER.tight 3 / base 4 / loose 5 / slow 6` (ticks). Existing `arrival/chip/heart` kept at 4.

### Open
- No scene asks for `reveal` yet: InkBubble / RevealEngine answer reveal must switch to `springAt(..., 'reveal')` in its own task. Until then the reveal has no overshoot.
- Scenes that used `pop` / `bouncy` (LevelCard, RankCard, Scoreboard, HeartsPill, Round45Callback, BonusWrapper) now settle with no overshoot and a slower curve (stiffness 120 instead of 140-180). Timings that assumed the old settle (e.g. `RANK_CARD_SETTLE_TICK` 20) were not rechecked.

## Task M2: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: Chromium download blocked, ENOTFOUND remotion.media)

- `system.ts`: `levelBackground` = near-black base (mid ~#060B16, end ~#03060C per level) + one accent light at 13% (0x21, was 15%). `glassSurface` gets a thin bright top edge (inset 0.75 ref units, white 55%), softer shadows (0.30 wide, 0.14 contact) and a new `level?: Level` option: light tint (~12% to 4% of the level accent) over the white glass. `tint` still works as before (strong tint, unchanged) and wins over `level`.
- `RoundScene.tsx` (wallpaper + 3 glass call sites): base is `levelBackground[round.level]`; the four multi-colour orbs are now two orbs in the level accent only, 13% each. Drift is one sine loop per 60 s from the video clock (`seg.from + t`), so it carries across rounds. Prompt card, counter pill and dictation capsule pass `{ level: round.level }`. No layout values touched.

### Frames to check (DontSay-Round, round 1, 60 fps)
- 0, 120, 300: base is near-black, one blue light at the top and bottom-left, no purple/pink; prompt card shows a thin bright top edge and a faint blue tint.

### Open
- `levelBackground` is shared, so every other scene that uses it (Hook, LevelCard, Parts, RankCard, Scoreboard, Outro, BonusWrapper, HeartCheckIn, LockNotification) also got the darker base and 13% light.
- The shadow and top-edge change applies to every `glassSurface` user. Only RoundScene's three cards pass `level`; other cards stay white-tinted until they do.
- ListeningGlow is still multi-colour (Siri-style) and sits on top of the wallpaper: "one accent per screen" is only applied to the wallpaper.
- Other scenes' own wallpapers (BonusWrapper etc.) do not drift on the new 60 s clock.

## Task M3: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: ENOTFOUND remotion.media)

- `RoundScene.tsx`: prompt is the hero (max 92 ref units, was 64; line height 1.05, tracking -0.03em; card 130 high, still ends at y 280, above the large bubble). The "LEVEL n" label inside the card is gone. Breathing float (sin translate + scale) removed; only the one-time 14-unit entrance remains. Counter pill 44 high, 20-unit text, 72% opacity. Countdown now exists only from timer.from to timer.to (+4-tick exit; it used to be mounted from tick 0). Dictation capsule appears at timer.from (not tick 12) and leaves at timer.to (4-tick exit), same window as the listening glow. `isLevelFirst` removed (unused).
- `HeartsPill.tsx`: new optional `compact` prop (default false, other uses unchanged): 69% size (44 high), 72% opacity. RoundScene uses `<HeartsPill compact />` with no `at`, so hearts never animate on the round screen (they used to spring in once on each level's first round).
- Round 1 phases (60 fps, round-local, from timing.ts): intro 0-80, timer 80-380, sealed 380-470, beat 470-500.

### Frames to check (DontSay-Round, round 1)
- 0: prompt entering (14-unit rise), counter/hearts small and quiet, no countdown, no capsule.
- 60: same, prompt settled, nothing else on screen but the small bubble.
- 200: timer running: countdown, "Listening…" capsule and glow visible.
- 400: sealed phase: countdown and capsule gone, bubble sliding, prompt still shown.

### Open
- Hook.tsx and HeartCheckIn still draw their own HeartsPill (not compact, Hook may pass `at`): not touched.
- ExclusionChips untouched, so rounds with rules still show chips during the intro.
- Counter / pill sizes are my picks (44 high, 20-unit text): small by design, check phone readability.
- Prompt card top (150) was kept; with a single line at 92 units the card has little air. Raise `PROMPT.top` or drop the card if you want more empty space.

## Task M4: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: ENOTFOUND remotion.media)

- `InkBubble.tsx`: size, radius and position all follow ONE progress `p` from the system `soft` spring (`INK_SPRING = SPRINGS.soft`, no overshoot; was damping 16 / stiffness 150, about 7% overshoot). New prop `backdropBlur` (reference units, default 0): a full-frame `backdrop-filter` layer under the bubble, strength = backdropBlur x p, so the background softens as the bubble grows.
- `RevealEngine.tsx`: forwards `backdropBlur`.
- `RoundScene.tsx`: slide start is `slideAt ?? phases.sealed.from` (timing.ts). The prompt eases away (opacity via `easeOut`, plus a 12-unit rise) over 8 ticks starting `STAGGER.base` (4) ticks BEFORE that. Passes `backdropBlur={6}`. If a scene slides the bubble during the timer (Round 45, slideAt before timer end) the prompt keeps the old behaviour (stays until the beat).
- Round 1 frames (60 fps, round-local, from timing.ts + sampled `soft` spring): prompt starts easing 372, done 388; bubble slide start 380 (p 0); middle 390 (p about 0.6); end 410 (p 0.99; fully settled about 412). Blur reaches full strength with p.

### Open
- Lead (4 ticks), exit (8 ticks) and blur (6 units) are my picks and live in RoundScene / system STAGGER, not timing.ts (timing.ts has no slide-length or lead constant). The slide start itself comes only from timing.ts.
- The lock-pop on the small bubble (tick 0) still uses its own bouncy spring (damping 14, stiffness 180): not touched.
- Blur applies to everything drawn before the bubble (counter, hearts, chips, wallpaper); the lock and result chip are drawn after and stay sharp. Bonus scenes using InkBubble get no blur (prop defaults to 0).
- Large bubble spans y 222-522 (centre 372 default) but RoundScene passes centre y 440: unchanged, not rechecked.

## Task M5: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: ENOTFOUND remotion.media)

- **Ink dissolve** (`RevealEngine.tsx`, `InkBubble.tsx`): sweep length is unchanged (timing.ts: revealSec - beatSec = 1.5 s, cosine ease in/out) but the soft edge is wider (36% of the bubble, was 22%). The answer now fades up under the sweep (opacity = easeOut of dissolve x1.5) and settles with the `reveal` spring (rise 10 units, scale 0.9 -> 1) starting 35% into the sweep. New InkBubble prop `answerSpring` (default 1 = settled, so bonus scenes only get the fade). The reveal overshoot is real (spring max 1.0153) but it is 1.5% of a small move: about 0.15% in scale, effectively invisible. Nothing else bounces here.
- **Result chip** (`ResultBeat.tsx`): no spring or scale pop any more. In: rise 12 units (easeOut, 8 ticks) with fade (6 ticks). Hold still. Out: fade 6 ticks plus a 6-unit drop, ending 3 ticks before the result slot ends (slot = `resultSecFor`, timing.ts). Sound cue unchanged.
- **Countdown** (`CountdownNumber.tsx`): the 6% pulse scale on the number is gone. A new second crossfades (6 ticks, easeOut, previous digit fades out as the new one fades in). Red fades in over 8 ticks from the first urgent tick: number and progress line colour are blended, a red tint layer fades over the pill, the edge pulse fades in. The pill (size, spring-in, glass, black base) is unchanged.

### Frames (DontSay-Round, round 1, 60 fps, round-local, computed from timing.ts)
- Dissolve: start 500, middle 545, end 590 (answer spring starts about 532 and is settled by about 568; ink layer unmounts at 590).
- Result chip: in 622-638 (fade done by 634), hold 638-724, exit 724-736; result slot ends 742.
- Countdown: timer 80-380; number changes at 140, 200, 260, 320 (crossfade 12 frames each, check 146 for the midpoint); red starts 260 and is full by 276; edge pulse fades in from 260.

### Open
- Chip exit timing (6 ticks, 3-tick margin), crossfade (6 ticks) and red fade (8 ticks) are my picks, kept as constants at the top of each file, not in timing.ts.
- The red pill tint is now a fading overlay on the unchanged black base, so the fully red pill is slightly darker than the old red-gradient background.
- In the last second the "0" crossfades in around the timer end; the pill leaves 4 ticks after (RoundScene), so it is only briefly visible.
- Voice, SFX and the lock are unchanged; the wider soft edge makes the sweep look longer but `ink-dissolve.wav` (1.85 s) is untouched.

## Task M6: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: ENOTFOUND remotion.media)

Springs: every `springAt` name in the scenes below is now `'soft'`, except the answer reveal in BonusVoiceOnly (`'reveal'`). No raw `spring()` calls existed in these files. Timing and copy untouched.

Scenes / files touched, with one frame to check each (60 fps):
- `scenes/LevelCard.tsx` (DontSay-LevelCard-L1): icon launch replaced by a calm zoom (97% -> 100%, fade in on the `soft` spring) and an exit that drifts to 102% while fading over the last 12 ticks. Content rises 16 units (was 28). No icon glyph, no dim layer, no corner radius. Check frame 16 (mid-entrance) and 228 (exit). Still the level colour fill, not the dark wallpaper.
- `scenes/SettingsCard.tsx` (DontSay-SettingsCard-L2): NOT changed (no springs; it only wraps SettingsSheet, which already uses an alias of soft). Check frame 30.
- `scenes/HeartCheckIn.tsx` (DontSay-HeartCheckIn): 'smooth' -> 'soft', caption rise 24 -> 16 units. Check frame 60.
- `components/BonusWrapper.tsx` (all five bonuses): amber glaze removed; background is now the shared `AuroraWallpaper` (same as the round screen); glass is `glassSurface` with the level tint (gold border and gold tint removed). BONUS pill now rises 16 units with a fade (was a 148-unit slide with overshoot), hearts-label and chip rise 10/16 units with no scale pop. The pill itself and the BONUS label stay gold. New `useBonusGlass()` hook; `bonusGlass(radius, alpha, level?)` keeps its old name.
- `components/AuroraWallpaper.tsx` (new, also used by `scenes/RoundScene.tsx`): dark level base + two 13% accent orbs, 60 s drift on the video clock. RoundScene's inline orbs were replaced by it (same values as M2). Check DontSay-Round round 1 frame 120.
- `scenes/BonusMindReader.tsx` (DontSay-Bonus-1): springs -> soft, strip glass via `useBonusGlass`. Check frame 200.
- `scenes/BonusTripleLock.tsx` (DontSay-Bonus-2): springs -> soft, row glass via `useBonusGlass`. Check frame 200.
- `scenes/BonusChainReaction.tsx` (DontSay-Bonus-3): springs -> soft, word-card glass via `useBonusGlass`. Check frame 200.
- `scenes/BonusOppositeDay.tsx` (DontSay-Bonus-4): 'snappy' -> soft only (it has no glass of its own). Check frame 260 (after the invert at 150-210).
- `scenes/BonusVoiceOnly.tsx` (DontSay-Bonus-5): 'gentle' -> soft; the answer pop is now `'reveal'` (slight overshoot, max 1.5%). Check frame 760 (reveal phase starts 724).

### Open
- Not changed (not springs): ChainReaction link pulse (`1 + 0.18 sin`) and letter scale (`1 + 0.22 a`), TripleLock row `bump` scale, MindReader match cell. They still pulse a little; say if they should go.
- Bonus glow colours stay gold where they carry meaning (lit letters, locks, ink dots, pass chip text); only the glass, background and wrapper chrome were matched to the round screen.
- `shared/levelCard.ts` (`levelCardLaunch/Exit`, still using 'pop'/'snappy' aliases) is no longer used by LevelCard and was left in place. `SettingsSheet` and `HeartsPill` (other files) untouched.
- Level card colours are still the bright `levelColors[l].wallpaper`, not the dark wallpaper the rounds use now; a fade into a dark round may look abrupt. Easy follow-up if wanted.
- Bonus scenes' wallpaper phase uses the bonus segment start from timing.ts, so the drift is continuous with the round before it.

## Task M7: DONE (tsc --noEmit clean; NOT rendered, `remotion still` failed: ENOTFOUND remotion.media)

SFX cue sync. Measured every wav in `public/dontsay/sfx` (active RMS, onset, envelope peak) and sampled Remotion's `soft` / `reveal` springs (soft: 50% at tick 5, 90% at 10, 99% at 15; reveal: 90% at 9). Cue ticks in the bonus scenes are built from the same constants as their visuals, so they cannot drift; the checks below are for the shared cues.

### Cues that moved / changed
- **Reveal chime** (`RevealEngine.tsx`, every round): was at the sweep end (reveal + 45 ticks), now at the answer landing (reveal + 26 ticks, new `answerLands`, `ANSWER_LANDS = 0.585`). Reason: the answer is fully readable once the sweep edge passes the bubble centre (about tick 26) and the `reveal` spring is at 90% by about tick 25; the old chime came about 19 ticks (0.63 s, 38 frames) late. Round 1 (round-local frames): old 590, new 552 (dissolve starts 500).
- **Heart check-in tone** (`HeartCheckIn.tsx`): was tick 0, now tick 4 (`CARD_IN_TICK`, the tick the card starts to move; it was cued 4 ticks = 8 frames before any visual). Volume 0.5 -> 0.4: file active RMS -11 dB against about -18 dB for the rest; 0.4 gives about -19 dB, under the check-in voice that starts at tick 0.
- **Triple Lock** (`BonusTripleLock.tsx`, `sfxCues.ts`): no tick moved. `bonusTripleLockCues()` now carries the volumes the scene really mounts (click 0.8, dissolve 0.6, faded) and `part2Cues` uses them (it listed 1 for all).

### Checked, left as is
- Level card swell `level-card-N` at tick 0: envelope peak 0.30 s (tick 9), card spring 90% at tick 10. OK.
- Rules sheet `card-in` at LEVEL_SHEET_AT: sheet spring starts at its own tick 0, file peak 0.25 s (tick 7.5), spring 90% at 10. OK.
- Round lock: shake click at the beat start (lock appears and shakes there), second click at reveal start (shackle opens over 4 ticks from there), `ink-dissolve` at reveal start: sweep speed peaks at tick 22.5, file energy centroid 0.75 s = tick 22.5. OK. The 1.85 s file ends at tick 55.5, before the result slot (reveal slot is 2.0 s = 60 ticks), so it does NOT run into the result chip (the M5 note said it did; that was wrong).
- Result chip `collision` / `safe-pulse` at the chip's first tick (fade-in 6 ticks, rise 8 with easeOut): sound transient at the start of the fade. OK.
- BONUS pill `bonus-pill` at tick 0: peak 0.39 s (tick 12) against pill spring 90% at 10. OK.

### Still guesses
- **`mic-pulse` is not used by any cue.** No file in `src/dontsay` references it (the corner mic in BonusVoiceOnly pulses visually, no sound), so there was nothing to lower. When it is wired: its active RMS is -9 dB, the loudest file; about 0.4 matches the others.
- `chip-land` (BonusMindReader, BonusOppositeDay, BonusVoiceOnly answer, Scoreboard bands, Outro subscribe) is cued at the tick the chip STARTS to move; the soft spring arrives about 5 to 10 ticks later. Convention kept, not moved. Bonus Triple Lock and Chain have a pass chip but no chip-land cue.
- Chime lands on the bubble-centre rule; a long answer (right edge uncovered about tick 31) may read a few ticks after the chime.
- `lock-shake` / `name-reveal` still stand in as `lock-click` 0.35 / `callback-chime-1`.
- Nothing listened to, nothing rendered.

### Runtime (`npx tsx scripts/dontsay_runtime.ts`)
770.9 s (12:50), 46254 frames; parts 147.5 / 146.4 / 144.8 / 123.1 / 142.4 / 66.7 s. Target 10:44: +126.9 s (ABOVE). Unchanged by M7 (no timing constant touched); data/timing cross-check: no mismatches.

### Frames to check (60 fps)
- DontSay-Round round 1 (round-local): 500 (dissolve + second click), 545 (mid sweep), 552 (new chime), 590 (sweep end, old chime), 622 (result chip + sound).
- DontSay-HeartCheckIn: segment-local frame 8 (tone + card starts to move; was frame 0).

## Task MU1: DONE (script runs, files + manifest written, tsc --noEmit clean; NOT mounted in the video; NOT LISTENED TO)

- `scripts/make_dontsay_music.py` (`python3 scripts/make_dontsay_music.py`, needs numpy scipy pedalboard soundfile; about 1 minute): 48 kHz 24-bit stereo wavs + `public/dontsay/music/manifest.json` (file, seconds, bpm, key, loop, plus bars, lufs, samplePeakDb, gainDb). 90 BPM, D major, Dadd9 | Bm7 | Gmaj7 | Asus4, 2 bars each, cycle = 8 bars = 21.333 s.
- **The wavs are git-ignored** (`public/dontsay/music/*.wav`, 229 MB: five level files of 43 MB). The script is deterministic (seeded); run it before rendering. The manifest is committed. Say if you want the wavs in git (or LFS).
- Level length = longest part from timing.ts `partRanges` (147.5 s, Part 1) rounded up to whole 8-bar cycles: 7 cycles = 149.33 s = 56 bars (the cycle, not the single bar, is the loop unit). If a part grows past 149.33 s, re-run: it reads timing.ts itself.
- Loops: one dry cycle rendered 3x, through the chain, the middle copy kept and tiled; chorus rate set to 8 periods per cycle. Seam metric (largest jump across the seam / largest jump inside the file) is 0.11 to 0.32 on every loop file: no jump larger than the music itself. That is a number, not a listen.
- Chain: HighpassFilter 120, PeakFilter -3 dB at 3 kHz (q 0.5), Chorus (depth 0.08, mix 0.25), Reverb (room 0.85, wet 0.35 / dry 0.65), Compressor (-28 dB, 1.8:1), gain, Limiter -1 dB. pedalboard's Limiter adds a fixed +4.75 dB make-up in its linear region, so the gain is found by measuring AFTER the limiter (`finish_to`).
- Arrangement: L1 pad + sub; L2 + sparse airy bells; L3 + 3 FM plucks per chord; L4 + 6 plucks, very soft D3 pulse on beats 1 and 3; L5 + 8 plucks, brighter pad, pulse on every beat. Bonus: same chords, syncopated brighter plucks + bells, no pulse (2 cycles, 42.67 s, 16 bars). Hook: 8 s = 3 bars of Gmaj7, Gmaj7, Asus4 (leads into level 1's Dadd9), level-1 material, squared ramp from -36 dB. Check-in: 2 s Asus4 swell + one bell, 150 ms fade. Outro: 32 s = 12 bars, Dadd9 Bm7 Gmaj7 Asus4 then Dadd9 x 4 bars with a slow D F# A E arpeggio, cosine fade over the last 6 s.

| file | seconds | LUFS | sample peak dB |
|---|---|---|---|
| level1 / 2 / 3 / 4 / 5 | 149.33 each | -31.0 / -30.5 / -30.0 / -29.5 / -29.0 | -22.2 / -21.7 / -20.4 / -20.4 / -19.1 |
| bonus | 42.67 | -30.0 | -19.8 |
| hook | 8.00 | -35.1 | -23.4 |
| checkin | 2.00 | -32.2 | -22.4 |
| outro | 32.00 | -31.3 | -21.1 |

### Decisions and guesses
- Levels rise 0.5 LU per level around -30 (not one flat -30), so the energy rise is also a little louder. Flat -30 is one constant (`LEVEL_LUFS`).
- Hook, check-in and outro use level 1's gain (not their own LUFS target), so they sit with the beds; their integrated values are lower because of the ramp, the short length and the fade.
- **Sub is added after the 120 Hz high-pass** (parallel). Inside the chain it would be removed. It is about 17 dB under the 200 Hz to 2 kHz band (`SUB_GAIN`, 0 = off); small speakers will not play it.
- Pulse is a D3 (147 Hz) sine with a 12 ms attack, inside the chain. It is not a drum and has no noise.
- Hook does not end at level 1's phase exactly: crossfade it into level1 at its start. Chord phase lands Asus4 -> Dadd9.
- Band numbers printed by the script (dB re 200 Hz to 2 kHz, first 8 s): 2-4 kHz is -46 (L1) to -30 (L5) and -25 (bonus); the bonus bells are the brightest thing. Not a substitute for listening.

### Owner must listen for
- Loop seams (each level file and bonus at the 149.33 s / 42.67 s wrap; also the cycle joint every 21.33 s): clicks or a change in the reverb tail.
- Harshness near 3 kHz: bonus bells and level 4/5 plucks (FM index 1.5 / 1.8).
- Too busy under the voice: level 4/5 pluck density and the pulse; voice sits near -16 LUFS, music at -29/-31.
- Hook ramp: does it start from true near-silence; does the 150 ms/20 ms end fade matter once crossfaded.
- Outro: the last 6 s fade and the arpeggio on the final Dadd9.
- Whether the pulse reads as a soft beat or as a thump.

## Task MU2: DONE (tsc --noEmit clean; NOT rendered, NOT listened to; the wavs are git-ignored, so run scripts/make_dontsay_music.py before any render)

- `src/dontsay/music.ts` (pure plan, no React): the knobs at the top (`MUSIC_VOLUME` = 1, `CROSSFADE_SEC` 1, `START_FADE_SEC` 0.1, `DUCK_DB` -6, `DUCK_ATTACK_SEC` 0.15, `DUCK_RELEASE_SEC` 0.5), `musicBeds`, `checkInSwells`, `bedGain`, `duckGain`, `voiceWindows`. Everything else comes from timing.ts (`segments`, `voiceCues`, `clipSec`, `outroFadeSec`) and `public/dontsay/music/manifest.json` (file lengths, loop flags).
- `src/dontsay/components/MusicBeds.tsx`: one `<Audio>` per bed span inside its own `Sequence`, volume = MUSIC_VOLUME x equal-power crossfade x duck x check-in lift; `loop` with `loopVolumeCurveBehavior="extend"`, `allowAmplificationDuringRender` (the lift goes above 1). Mounted once in `Full.tsx` (stale "no music bed" comment replaced). Only `DontSay-Full` has music; the part and scene compositions do not.
- `scripts/dontsay_music_plan.ts` (`npx tsx scripts/dontsay_music_plan.ts`): prints the plan below and checks the windows are shared and ordered.
- Duck: 173 voice windows (every voice cue, length from the measured clip), eased attack 0.15 s, eased release 0.5 s, deepest window wins, so back-to-back clips (intro + rule) stay ducked. About 369 s of the 771 s is more than half ducked.
- Check-in: `checkin.wav` plays over the card (also ducked); the bed gets HeartCheckIn's own lift (`heartCheckInMusicGain`, 1 -> 1.12) and eases back over 0.3 s after the cut instead of stopping dead.
- Outro: `outro.wav` is trimmed by 90 frames (1.5 s) at the start so the end of the file (its own 6 s fade) lands on the last frame; the bed also ramps to 0 over the last `outroFadeSec`.

### Bed changes (crossfade windows are 60 frames; frames are 60 fps, absolute and part+local)
| frame (abs) | time | part+local | change |
|---|---|---|---|
| 0 | 0:00 | P1+0 | hook.wav in (0.1 s fade-in) |
| 420-480 | 0:07 | P1+420 | hook -> level1 (window ends at hook.wav's end, 480) |
| 7740-7800 | 2:09 | P1+7740 | level1 -> bonus (Mind Reader) |
| 8822-8882 | 2:27 | P1+8822 (P2 starts 8852) | bonus -> level2 |
| 16330-16390 | 4:32 | P2+7478 | level2 -> bonus |
| 17606-17666 | 4:53 | P2+8754 (P3 starts 17636) | bonus -> level3 |
| 25174-25234 | 6:59 | P3+7538 | level3 -> bonus |
| 26296-26356 | 7:18 | P3+8660 (P4 starts 26326) | bonus -> level4 |
| 32600-32660 | 9:03 | P4+6274 | level4 -> bonus |
| 33680-33740 | 9:21 | P4+7354 (P5 starts 33710) | bonus -> level5 |
| 41140-41200 | 11:25 | P5+7430 | level5 -> bonus |
| 42224-42284 | 11:43 | P5+8514 (P6 starts 42254) | bonus -> level5 again (rank card + scoreboard), from the start of the file |
| 44424-44484 | 12:20 | P6+2170 | level5 -> outro.wav (skip 90 frames) |
| 46194-46254 | 12:50 | P6+3940 | outro bed ramps to 0 (last outroFadeSec) |
- Check-in swell: `checkin.wav` 21800-21988 (P3+4164), bed lift over the same frames.

### Choices and guesses (change in music.ts if wrong)
- **Rank card + scoreboard are not in the brief:** they go back to level5.wav (restarting at the top of the file) after the final bonus. Alternative: carry the bonus bed on, or start outro.wav at the rank card.
- The settings card (4 s, before level 1) is on the level1 bed, so level1 starts 1 s before the hook ends (the hook's last second is the crossfade).
- Equal-power (sine/cosine) crossfade, eased duck curves: my choice.
- `MUSIC_VOLUME` 1 means the MU1 levels (-31 to -29 LUFS) un-attenuated; ducking takes about half the runtime down 6 dB. If the beds are too loud or too quiet under the voice, change that one constant.
- A bed restarts at the top of its file at each span, so every bed starts on a Dadd9 downbeat; the 1 s crossfade is chord-aligned only by luck of the cycle (same key and tempo, nothing beat-matched to the video).
- Not verified: that Remotion's `loop` + `extend` + `startFrom` behave as read in node_modules (volume frame is local to the Sequence, loop extends it); never rendered.

### Listen for
- Each crossfade above (hook -> level1 especially): level dip, doubled chords, a phasey 1 s.
- Duck pumping on short voice clips and on the 0.25 s gaps between lines; the level before and after.
- The check-in lift and swell together with the check-in voice (P3+4164).
- The outro: start of the trimmed file at 44424 and the end fade.
- Rank card/scoreboard bed restart (P5+8514).

## Task R1: DONE (tsc --noEmit clean; NOT rendered, `remotion still` blocked: 403 Forbidden on remotion.media, a policy denial, not retried)

Round-screen cleanup. Files touched: `src/dontsay/scenes/RoundScene.tsx`, `src/dontsay/components/ListeningGlow.tsx`, `src/dontsay/components/CountdownNumber.tsx`, `src/dontsay/components/HeartsPill.tsx`. `InkBubble.tsx` and `system.ts` were read only, not changed.

- **One accent colour**: `ListeningGlow` no longer has its own blue/violet/pink palette or the outer glow ring/blur around the card — it now draws only the waveform (new required-in-practice `accent` prop, `#4DA3FF` fallback default so `Hook.tsx`, which still calls it without one, keeps compiling untouched), with bars cycling the accent itself plus a lighter and a darker tint of the same hue (`tint()` helper, new in the file). `CountdownNumber` now gets its colour the same way (`colours.level[level]`) instead of `colours.ink`, so the number and the progress-line fill are accent (blending to red only in the last `URGENT_SECONDS`).
  - **Not changed, out of scope**: the wallpaper's own accent light (currently 13%, in `AuroraWallpaper.tsx` / `system.ts`'s `levelBackground`/`LIGHT`) is neither a file on the read list nor one of "RoundScene + the four components" this task could edit, so I did not raise it to 20-24%. `RoundScene.tsx` itself had no inline background orbs to remove — that cleanup already happened in earlier tasks M2/M6 (`AuroraWallpaper`, one accent, two 13% orbs). If Level 1 still doesn't read clearly blue, that 13% constant is the thing to raise, in a task that can touch those two files.
- **Removed**: the "Listening…" capsule and `MicIcon` are gone from `RoundScene.tsx` (dead code, `dictIn`, `DICTATION` removed with them). `ListeningGlow`'s old ring/blur (described above) is gone; listening is now shown only by the waveform.
- **Countdown**: `CountdownNumber`'s pill is now a plain `glassSurface({ level })` (no more black `linear-gradient` override) with an accent progress-line fill; number style, red-urgent behaviour and the `edge` pulse are unchanged. Moved from the very top of the frame to just under the waveform (`COUNTDOWN_TOP` 14 -> 495 in `RoundScene.tsx`).
- **Composition**: `TOP_ROW` 72 -> 56; `PROMPT.top` 150 -> 235 (height unchanged at 130, so centre y is 300, bottom 365); `COUNTDOWN_TOP` 14 -> 495. Y-ranges in play for round 1, reference units: top row 56-100; prompt card 235-365; waveform (positioned by `ListeningGlow` at `card.top + card.height + 30`, maxH 80) about 395-475; countdown pill 495-607 (`L.h` 112); small ink bubble 72-164 (top right, `InkBubble.SMALL`, unchanged); large ink bubble 290-590 (`InkBubble.LARGE` centred on `BUBBLE_CENTRE.y` 440, unchanged). Checked on paper, not by eye (`remotion still` blocked): card top (235) clears the small bubble's bottom (164); the round counter's right edge (x 980, unchanged formula) still sits left of the small bubble's left edge (x 998.4); the prompt is fully faded (opacity ~0, `PROMPT_EXIT_TICKS` 8 after `promptAwayAt`) before the enlarging bubble's own footprint reaches the card's y-range, so the 235-365 vs 290-590 numbers only overlap once the card isn't visible any more.
- **Top row text**: `HeartsPill`'s label and the round counter's label are now a flat `px(26)` (not scaled by `compact`'s 0.69, which still shrinks the pill chrome and hearts) at `opacity: 0.9`, instead of `26*0.69≈18` at `pill*0.72` opacity. `HeartsPill`'s `quiet` constant is gone; the pill's own entrance opacity is `pill` (no permanent dimming) and the round counter's container opacity is `counterIn` (was `counterIn*0.72`) — the dimming that's left is only what the translucent glass background already gives.
- **Hearts pill springs in once per level**: `RoundScene.tsx` now computes `isLevelFirst` from `rounds` (first round, or `rounds[i-1].level !== round.level`) and passes `at={STAGGER.arrival}` to `HeartsPill` only on that round; every other round still passes no `at` (fully static, as rule 6 requires). This undoes the M3 simplification that always passed no `at`.
- **Hearts are drawn SVG** (solid fill, no emoji/font glyphs) in `HeartsPill.tsx`: unchanged, already correct. No emoji or heart glyph found anywhere else in `RoundScene.tsx`/`ListeningGlow.tsx`/`CountdownNumber.tsx`/`InkBubble.tsx`.
- **Ink bubble label**: did not change `InkBubble.tsx`. At its current size (small state 153.6x92 ref units, "locked" at 19 units) the label looked like it should fit without cramping by the numbers, but this was not confirmed by eye (`remotion still` blocked) — worth a frame check.

### Open / uncertain
- Background accent-light strength (item A's "20 to 24%") not raised: lives in `AuroraWallpaper.tsx`/`system.ts`, outside this task's file scope.
- "8-point spacing" (item E) was not recomputed to exact 8-unit multiples; existing paddings (e.g. 18, 24 ref units) were left as they were, only the two labels' size/opacity changed.
- Waveform and countdown y-ranges (395-475, 495-607) are computed from the constants above, not sampled from a real render.
- `remotion still` (round 1, frame 200) failed: 403 Forbidden fetching the Chromium Headless Shell from `remotion.media` — an agent-proxy policy denial (host not allowlisted), not retried per the proxy's own instructions. Nothing in this task was rendered or looked at by eye.

## Task W1: watermark + HUD relayout (tsc clean; NOT rendered)
- `src/dontsay/components/Watermark.tsx`: `DontSayWatermark` (QUIZ MATRIX badge from `src/ios/QuizMatrixBadge`, top-right, right 64 / top 42 / height 56 ref units). Own logo copy `public/dontsay/quiz-matrix-bulb.png`. Mounted ONCE in `Full.tsx` above all parts (entrance plays once from tick 0). It is NOT in DontSay-P1..P6 or single-scene compositions: preview it in `DontSay-Full`.
- `InkBubble` small corner moved from top-right (top 72) to BOTTOM-right (top 552), so the watermark owns the top-right. Affects every scene that uses the small bubble (rounds, Hook, bonuses).
- `RoundScene`: hearts pill left 64 / top 48; round counter directly below it (same left, top 102). Counter no longer sits left of the bubble.
### Open points
- BonusVoiceOnly draws a corner mic at the top-right: it now sits under the watermark. Needs moving.
- Hook and HeartCheckIn still place HeartsPill at left 128 / top 72 (not the new 64 / 48).
- Small bubble at bottom-right (y 552 to 644): clearance against bonus scenes' bottom content (pass chips, strips) not checked by eye.
- Watermark over the Outro end screen (top-right) not checked.
