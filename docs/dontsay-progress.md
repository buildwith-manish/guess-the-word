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
