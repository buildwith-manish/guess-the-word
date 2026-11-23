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
