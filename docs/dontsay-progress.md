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

## Task 4b: NOT BUILT
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
- Ticks (30 fps, local): words arrive 6/18/30/42; links land at intro + (i+0.5) * 0.6 * play / 3 = 78, 138, 198; next first letter lights +5; bubble slides at 90 (reveal start); dissolve 120-165; voice reveal at 165. Frames at 60 fps = ticks x 2: check 156, 276, 396 (links), 240-330 (dissolve), 360.
- `chain-link` x3 and `ink-dissolve` cues are in `bonusChainCues()`; nothing mounts voice clips yet.

### Open points
- Note line shows data text `Tiger is mine - you can't reuse it` (hyphen). Change the dash in rounds.json/data.ts if you want an em dash.
- Bubble large state (300 high at centre y 500) spans y 350-650: 2 ref units under the 648 safe line, 4 above the chain cards. Not checked by eye.
- Rule line fades out when the bubble enlarges so they do not overlap.
- Read beyond the named files (minimal greps): data.ts Bonus type, bonus 3 JSON, timing.ts bonus constants, InkBubble props, Root.tsx registration lines.
