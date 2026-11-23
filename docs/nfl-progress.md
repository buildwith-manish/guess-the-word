# NFL Scouting Card Quiz: progress

Task table: `docs/nfl-prompts-split.md` (28 tasks, run order below). Shared context: `docs/nfl-context.md`. Branch `nfl-quiz`, cut from `gta6-quiz` at tag `gta6-base-1123` (commit 79454ca).

Nothing has been rendered by any task yet. 2a: `npx tsc --noEmit` has 0 errors in `src/nfl/`.

## Checklist (run order)

- [x] 1a: recon and context file. `docs/nfl-context.md`, `docs/nfl-progress.md`. No feature code.
- [ ] 1b: data + validation (`src/nfl/data.ts`, `scripts/check_nfl_data.ts`)
- [x] 1d: sfx (pedalboard). `scripts/make_nfl_sfx.py`, `public/nfl/sfx/`, `src/nfl/sfx.ts`, `src/nfl/sfx-ids.ts` (generated)
- [x] 2a: copy shared parts + system (`src/nfl/system.ts`, `src/nfl/shared/*`, `src/ios/fonts.ts` + Inter files). See context section 7.
- [x] 1c: timing (`src/nfl/timing.ts`, `scripts/nfl_runtime.ts`, placeholder `src/nfl/timings.generated.ts` for 5a to overwrite)
- [x] 2b: WalletCard (`src/nfl/components/WalletCard.tsx`, stills-only preview `src/nfl/WalletCardPreview.tsx`)
- [x] 2c: PointsPill + clue timer. `src/nfl/components/PointsPill.tsx` exports `PointsPill`, `PointsPillGlow` (mount full-frame above the card), `pointsPillMath`. Props: `frame, starts[], end, values?, level?, width?, height?`. Added `pillLastSec`, `pillPulseSec` to `timing.ts`. Not rendered: no composition shows it until 3a.
- [x] 2d: ClueStack
- [x] 2e: ScoreHud, chips (`src/nfl/components/ScoreHud.tsx`, `Chips.tsx`; notes below)
- [x] 5a: audio pipeline (clips, timings, map). `scripts/clean_nfl_clips.sh`, `build_nfl_timings.py`, `build_nfl_audio_map.ts`; notes below
- [x] 2f: Two-Minute Warning
- [x] 2g: RevealEngine + lock (`src/nfl/components/RevealEngine.tsx`: `RevealEngine`, `revealBeats`, `revealCues`, `SourceLine`)
- [x] 4a: `src/nfl/scenes/LevelCard.tsx` (Starter, HoF), `LevelBanner.tsx` (Rookie, y 4-84, clears the first clue at y 160), `ScoreCard.tsx` (after card 10 and 20). Each exports its sfx cues (`levelCardCues`, `levelBannerCues`, `scoreCardCues`) and a voice start (`levelCardVoice`, `levelBannerVoice`, `scoreCardVoice`: type, key, tick) for the 5a audio map. timing.ts: new beats (`levelBannerSec`, `levelCardBeats`, `scoreCardBeats`); the Hall of Fame score card is removed (only 2 score cards, `needed` clips updated). data.ts: `levelText`. NEW SEAM: `src/nfl/lines.generated.ts` (empty placeholder) + `lines.ts` `lineText(type, key)`: 5a must write the spoken script text there; until then the ScoreCard shows rings and numbers without its text line. Not rendered; mounted by nothing until 3a/4b.
- [x] 3a: CardScene + Preview (`src/nfl/scenes/CardScene.tsx`, `src/nfl/Preview.tsx`; compositions `NFL-Card` (prop n) and `NFL-Card-All` in `src/Root.tsx`; notes below)
- [x] 4f: `src/nfl/scenes/Scoreboard.tsx` (`Scoreboard`, `scoreboardCues`, `scoreboardVoice`). One card with all five tiers (names and ranges from data.ts); rings fill, tiers light lowest to highest, then a still hold of at least 4 s. timing.ts: new `scoreboardPlan` {rings, steps (lit order, clip key = position in `ranks`, best = '1'), hold, len}, `scoreboardRingsSec`, `rankStepSec`, `rankFinalHoldSec` (replaces `rankHoldSec`); `rankSlotSec` is now per rank step. 5a: the audio map must give the five rank clips keys '1'..'5' with '1' = Hall of Famer, and they play lowest first (key '5' first). Not rendered; nothing mounts it until 4h.
- [x] 3b: Hook (`src/nfl/scenes/Hook.tsx`: `Hook`, `HookLock` (the reusable 1 s piece, takes `at`), `HOOK_LOCK_TICKS`, `hookMarks`, `hookCues`, `hookVoice`; composition `NFL-Hook`; notes below)
- [x] 3c: `src/nfl/scenes/FinalCard.tsx` (`FinalCard`, `finalCardTicks/Frames`, `finalCardCues`) and `WalletCollection.tsx` (`WalletCollection`, `WalletCollectionView`, `collectionMarks`, `walletCollectionCues`). FinalCard = `HookLock` (now takes an optional `card`, default card 1) over `CardScene` for card 30. The lock second is the start of card 30's own segment (`phases.lock`, `finalLockSec`), so card 30's segment is 1 s longer and every other card offset is unchanged; NFL-Card for n=30 therefore starts with 1 s of empty level background (use FinalCard for the real thing). New `collection` segment after card 30 (`collectionSec` 6 s, `collectionBeats`: assumptions, not in the brief) in Part 3 (`partOf`). Cards show only number + level colour. Fan = two arcs of 15. Open: the final lock repeats the hook's notification text (`hookText`). Not rendered; nothing mounts them until 4d.
- [x] 4b: Part 1 (`src/nfl/parts/Part1.tsx`, `src/nfl/sfxCues.ts`, composition `NFL-P1`; notes below)
- [x] 4e: Predictions (`src/nfl/scenes/Predictions.tsx`; notes below)
- [x] 4c: Part 2
- [x] 4d: Part 3 (`src/nfl/parts/Part3.tsx`, `part3Cues` in `src/nfl/sfxCues.ts`, composition `NFL-P3`; notes below)
- [x] 4g: Outro + Part 4
- [x] 4h: full composition + chapters
- [ ] 5b: clue-fit report
- [x] 5c: voice chain + mix
- [ ] 6a: thumbnails + metadata
- [ ] 6b: Shorts
- [ ] 6c: render, README, QA

## Decisions the next tasks must settle (from 1a)

1. **Units (settled in 2a: 1280x720 through `px()` in `src/nfl/system.ts`).** gta6 components use 1920x1080 reference units through `u()`; the NFL Starter requires 1280x720 through `px()`. Convert gta6 numbers x 2/3 when copying, or give `src/nfl/system.ts` its own `u()`. Decide in 2a.
2. **`px()` / `useDesignFrame` source.** They live in `src/style.ts` / `src/clock.ts`, not on the Starter's allowed-import list (though `src/ios/tokens.ts` imports `../style`). Suggested: copy the two helpers into `src/nfl/system.ts` in 2a.
3. **Inter (settled in 2a: `src/ios/fonts.ts` + woff2 brought over; `system.ts` imports it).** Not loaded anywhere on this branch. 2a should bring `src/ios/index.ts`, `fonts.ts`, `IosBackground.tsx`, `layout.ts` and `public/fonts/ios/Inter-*.woff2` from `origin/search-history`, and Root should import `src/ios/fonts.ts` once.
4. **Clip folders.** The prompts put generated clips in `public/nfl/voiceover/raw/`; `scripts/clean_gta6_clips.sh` expects clips in `clips/` and creates `raw/` itself. Settle before 5a.
5. **Render.** `render-video.yml` does not know `nfl-quiz`: pass `composition`. `render-pixel.yml` runs the GTW-only `scripts/voiceover-scan.js` when present.

## Not yet done / waiting on the user

- `docs/nfl/script.md` was never supplied. The pre-1a git step (commit of `docs/nfl/*` and `docs/nfl-prompts-split.md`, push of the tag `gta6-base-1123`) is not finished: those files are present but untracked, and the tag exists locally only.
- `docs/nfl/picks.json`: all fields `null` (fill from the official schedule just before recording).
- `docs/nfl/cards.json` `meta.sourceName`: `null` (set to the site actually checked).
- Three prediction lines in `lines.csv` marked `FILL:` need the real games.
- `docs/nfl/changes.json` (57 clue rewrites) was supplied but is not on the file list; not committed.

## 2e notes (ScoreHud, Chips)

- `ScoreHud` props `{ done, frame, from?, at?, side?, inset?, scale? }`: rings fill with cards completed, split by cards per level from data.ts; label from `hudLabel()`. It cannot know the viewer's score (said in the file header).
- `Chips.tsx`: `StreakChip` ("CARD N OF 30 DONE", `isStreakCard`, `STREAK_EVERY` 5, never the final card), `DidYouKnowChip` (follows `card.didYouKnow`), `SourceLine` (throws if `sourceName` is null; `assertSourceName()` is exported for QA), `RuleChips` (lines built from `cards[0].points` and `maxPoints`).
- Every `at` / `dur` / `outTicks` / `stagger` / `inTicks` is a required prop: the scene must pass them from `timing.ts`. Nothing in these files is a duration.
- Task said DidYouKnowChip "every third card"; data.ts has didYouKnow on 3, 6, 9, 12, 15, 18, 22, 24, 27, 30 (no 21). The chip follows the data.
- `SourceLine` will fail any render that mounts it until `docs/nfl/cards.json` `meta.sourceName` is set.
- Nothing rendered. `npx tsc --noEmit`: 0 errors in `src/nfl/`; only the 3 known pre-existing errors remain.

## 3a notes (CardScene, Preview)

- `CardScene({ card, at?, jersey? })`: `at` = tick on the enclosing Sequence's clock where the card segment starts (0 in normal use). Exports `cardTicks(card)`, `cardFrames(card)`. Preview exports `NflCardPreview`, `NflCardPreviewAll`, `previewFrames`, `cardMarks(n)`, `ALL_FRAMES`, `PREVIEW_DEFAULTS`.
- Handover: WalletCard (blank) + ClueStack until the silence beat, then RevealEngine with the clue stack frozen at clue 5 as `frozen`. TwoMinuteWarning wraps both on cards 5, 15, 25.
- Layout: ScoreHud (new `compact` + `top` props: rings + label, no counter) and PointsPill (200x64) sit in the 72-unit band above the card. ClueStack box is relative to the card's clue field. RuleChips (new `box` prop) sit on the "?" answer panel of card 1, from the intro through clue 1.
- Added: `chipStaggerSec` (timing.ts, assumption 0.15 s), `tmwLabel` (data.ts, UI label for the badge).
- No jersey numbers yet (cards.json has no field). Not rendered: Chromium could not be downloaded in the sandbox.
- Frames (60 fps, local to the card, fallback timings without clips): card 1 clue1 60, clue5 900, beat 1110, reveal 1140, len 1320; card 5 clue5 660, reveal 840, len 1020; card 22/30 dyk 1320, len 1488. `NFL-Card-All` = 40380 frames (673 s) in fallback mode.

## 3b notes (Hook)

- Hook = 6 s (`hookSec`). 0:00-0:03 blurred card + the 1 s `HookLock` notification (banner is on screen about 0.7 s, ticks 4 to 24); 0:03 the real blank card flips in (jersey "?" silhouette); HUD ("30 cards, 150 points") pops in at `hookBeats.hudAt`, rule chips fade in at `hookBeats.chipsAt` on the "?" panel. Rules are not voiced; `hookVoice` is the hook clip only.
- Card 1 is NOT played inside the hook: its segment (intro, clues, reveal) follows at 0:06 from timing.ts. To avoid a second entrance, 4b must mount card 1 as `<CardScene card={cards[0]} fromHook />` (new prop: no card spring-in, chips already up, HUD already up). The brief says "card 1 is live by 0:06"; with the 1 s "Card n." intro in its segment, clue 1 goes live at 0:07. Confirm which is meant.
- New: `hookBeats` (timing.ts; only `lockSec` 3 is from the brief), `hookText` (data.ts; title is from the brief, appName / body / timeLabel are my copy), CardScene exports `BAND_TOP`, `ANSWER_BOX`.
- `LOCK_BEATS` stay literal tick counts in shared/LockNotification.tsx (the piece is 1 s by design).
- LevelBanner (y 4 to 84, centred) sits over the compact ScoreHud / PointsPill band on card 1: 4b has to decide what hides.
- Not rendered (no Chromium in the sandbox). Frames at 60 fps: 0, 8 (banner starts), 60 (1 s: notification over, blurred card), 180 (3 s: flip starts), 216 (flip done), 359 (last frame, HUD + chips up).

## 4e notes (Predictions)

- `Predictions({ at?, picks? })`: three lock-screen notification cards (one per game) with kickoff time (ET) and matchup from `docs/nfl/picks.json` via `data.ts`; each enters at the start of its voice slot. Composition `NFL-Predictions` (Root.tsx). Exports `predictionsMarks`, `predictionsCues(at)` (a `notification` sfx per card), `predictionsVoice(at)` (type `prediction`, keys '0'..'3').
- NEW timing: `predictionsPlan` {intro, picks[3], len} and `predictionsIntroSec` (3 s, assumption) in `timing.ts`. Slots come from the measured clips when `useClipTimings`, else intro 3 s and the picks share the rest of the 25 s equally. **Assumption for 5a:** prediction clip key '0' = intro, '1'..'3' = pick 1..3 (4 clips, `PREDICTION_CLIPS`).
- data.ts: `picksFilled(list?)`, `predictionsText` (appName, pickLabel, kickoffLabel, placeholder 'FILL IN PICKS'; labels are my wording).
- The voice line is shown as text under the cards from `lineText('prediction', key)`. There is no audio map file yet (5a), so until `lines.generated.ts` has these rows no caption is drawn.
- Placeholder: any null pick field draws a full-width red "FILL IN PICKS" bar on every frame, and the empty fields say it too. `npx tsx scripts/check_nfl_data.ts --qa` (or `NFL_QA=1`) now FAILS on any null pick field; without it they stay warnings.
- Sample data for stills: pass `--props` to `remotion still NFL-Predictions` with a `picks` array. Nothing sample is committed.
- Frames at 60 fps, local to the segment (fallback timings, 25 s = 1500 frames): intro 0, pick 1 at 180, pick 2 at 620, pick 3 at 1060, end 1500. Check by eye: 100 (intro, no cards), 400 (card 1 settled), 800 (cards 1-2), 1499 (all three, last pick active).

## 4b notes (Part 1)

- `Part1.tsx` exports `Part1`, `Placed`, `part1Plan`, `part1Ticks`, `part1Frames` (= `partRanges[0]`), `part1BannerAt`, `part1BannerTicks`. Plan = every segment inside `partRanges[0]`: hook, cards 1 to 10, Rookie score card. Offsets are `seg.from - partRanges[0].from`.
- Card 1 is mounted `fromHook`. The Rookie `LevelBanner` is its own Sequence over card 1, starting at card 1's first tick (6.00 s, the "Card 1." slot), 2 s long, so it is on screen over the intro and the first second of clue 1. It is drawn last and covers the compact ScoreHud and the points pill in the top band while it is up; nothing is hidden on purpose. Confirm that start (the brief does not say whether it should be during the hook's last second).
- Card 5 gets the Two-Minute Warning from `CardScene` (it reads `card.twoMinuteWarning`); Part1 adds no wrapper of its own.
- `sfxCues.ts`: `part1Cues` (ticks local to the part, sorted), `cardCues(card, at)` (card-in except card 1, clue-flip-N, points-drop-P from `card.points`, `tmwCues`, `revealCues`). `cuesOf` throws on segment kinds other than hook, card, scoreCard: later parts extend the `switch` (levelCard, etc.).
- Fallback timings (no clips measured): Part 1 = 234.4 s = 14064 frames. Hook 0 to 6 s; card 1 6.00 to 28.00 s (clues 7.00 / 10.50 / 14.00 / 17.50 / 21.00, reveal 25.00); card 5 96.80 to 113.80 s (clues 97.80 / 100.30 / 102.80 / 105.30 / 107.80, reveal 110.80); score card 229.40 to 234.40 s. All change once 5a writes real clip lengths.
- Not rendered: Chromium could not be downloaded (remotion.media unreachable). `npx tsc --noEmit`: 0 errors in `src/nfl/` and `src/Root.tsx`; the 3 known pre-existing errors remain.

## 4d notes (Part 3)

- `Part3.tsx` exports `Part3`, `Placed`, `part3Plan`, `part3Ticks`, `part3Frames` (= `partRanges[2]`), `part3Voice()`. Plan = every segment in `partRanges[2]`: Hall of Fame level card, cards 21 to 29 (`CardScene`; card 25 gets the Two-Minute Warning from the card flag), card 30 as `FinalCard` (its segment opens with the 1 s lock replay), then `WalletCollection`. No score card after the Hall of Fame; no fade at the end, so Part 4 is a straight cut on the next frame (`partRanges[2].to === partRanges[3].from`).
- `sfxCues.ts`: `cuesOf` now also handles `levelCard` (`levelCardCues`), `collection` (`walletCollectionCues`) and card 30 (`finalCardCues` + `cardCues`). `part3Cues`: 166 cues, sorted, last at tick 7017 of 7101.
- OPEN: the line "That was card thirty. Let's see your score." has no slot yet. `ClipType` in `timings.generated.ts` has no type for it, `lines.csv` is not in the repo, and the text is not in data.ts (nothing in Part3 draws or hard-codes it). `part3Voice()` returns `{ type: 'collection', key: '', tick }` with the tick at the first card landing (collection start + `collectionBeats.stackAt`). 5a must add the type/row, and `collectionSec` (6 s, assumption) does not yet grow with the clip: when clips are measured the collection slot should be max(collectionSec, clip + pad).
- Fallback timings (no clips): Part 3 = 236.7 s = 14202 frames, starting at 7:46.30 of the full video. Level card 0 to 3.5 s; card 21 3.50 s; card 25 97.10 to 114.10 s (clues 98.10 / 100.60 / 103.10 / 105.60 / 108.10, reveal 111.10); card 30 204.90 s = lock replay, "Card 30." 205.90, clue 1 206.90, reveal 224.90; collection 230.70 to 236.70 s (frames 13842 to 14202). Part 4 starts at 11:43.00 of the full video.
- Not rendered: no Chromium in the sandbox. `npx tsc --noEmit`: 0 errors in `src/nfl/` and `src/Root.tsx`; the 3 known pre-existing errors remain.

## 5a notes (voiceover wiring)

- Files: `docs/nfl/lines.csv` (added unchanged, was missing from the repo), `public/nfl/voiceover/source/` (241 originals, untouched, committed), `clips/` (cleaned: 48 kHz mono wav, 0.1 s pads, -16 LUFS, committed). `raw/` and `clips_master/` are git-ignored. Run order: `bash scripts/clean_nfl_clips.sh`, `python3 scripts/build_nfl_timings.py`, `npx tsx scripts/build_nfl_audio_map.ts`. The first one also does the Step 1 checks (ids, extras, duplicates, empty, under 0.3 s) and stops before writing.
- Generated: `src/nfl/timings.csv` (id,type,seconds), `timings.generated.ts` (adds the slot `key`), `audioMap.ts` (`hookId`, `levelIds`, `cardAudio`/`audioOf(card)`, `scoreCardIds`, `predictionIds`, `rankIds` best first, `outroIds`), and `lines.generated.ts` (spoken text per slot, copied unchanged; ScoreCard and Predictions now draw their line).
- Keys: prediction '0' = intro, '1'..'3' = picks; rank '1' = Hall of Famer (file lists the lowest first); scorecard 'hof' = nfl_227 "That was card thirty" (opens the collection); level 'rookie' = nfl_002.
- `timing.ts`: the prediction keys are now '0'..'3' (they were '1'..'4', which did not match `predictionsVoice`), and `needed` also lists level 'rookie' and scorecard 'hof', so all 241 clips are covered. Slot rules were already as briefed: clue = max(3.5, or 2.5 on cards 5, 15, 25; clip + 0.3), reveal = max(3.0, reveal + dyk + 0.3).
- Result with measured clips: 16:47.2 (target 12 to 14). Part 1 5:13.5, Part 2 5:12.8, Part 3 5:02.5, Part 4 1:18.4. Clue slots stretch 152 s above their minimums.
- Open: `part3Voice()` still returns type 'collection'; the clip is `scorecard:hof` (2.94 s, fits `collectionSec` 6). Predictions lines 229 to 231 name real games, `picks.json` is still null.

## 4c / 4g / 4h + audio notes (Part 2, Part 4, Outro, Full)

- New: `parts/Part2.tsx` (NFL-P2), `parts/Part4.tsx` (NFL-P4: Predictions, Scoreboard, Outro), `scenes/Outro.tsx`, `voiceTimeline.ts`, `Audio.tsx` (`NflAudio`), `Full.tsx` (`NFL-Full`, Parts 1 to 4 at `partRanges` + audio). Root.tsx has NFL-P2, NFL-P4, NFL-Full.
- Outro: the five script lines (keys '1'..'5') are drawn as text one at a time in the top half from their voice slot (`outroLineStarts` in timing.ts); bottom half empty for the end screen; fade to black over `outroFadeSec` (1 s); `end-sting` at the fade start. No copy written in the scene.
- Audio: one `<Audio>` per voice clip (241 of 241 placed, no overlaps), every SFX cue of `fullCues` 7 dB under the voice (a cue within 3 ticks of a voice start is moved 0.2 s after it: 359 of 530), music bed `public/sounds/music-base.wav` looped, ducked to 0.5 while a voice clip plays (computed at runtime, nothing baked), fades 1 s in / 2 s out. Props: `musicSrc`, `voice`, `sfx`, `music`.
- Bug fixed in timing.ts: `buildPredictions` used the 1-based `range` for the slots, so every prediction slot was shifted by one and clip '3' was dropped.
- timing.ts changes: card 1's intro slot now holds the Rookie clip (starts as the banner settles) then "Card 1." (`rookieGapSec` 0.1); the collection slot grows to hold the `scorecard:hof` clip.
- Measured: total 16:50 (target 12 to 14). Parts: 0:00, 5:17, 10:29, 15:32. Chapters: 0:00 / 5:17 / 10:29 / 15:32 / 15:59 / 16:20.
- NOT done / open: nothing rendered (no Chromium). `docs/nfl/picks.json` is still null, so Predictions draws the red FILL IN PICKS bar. Music is the shared repo bed, not NFL-specific. Runtime is over target because clue slots stretch to their clips.

## Next step

Fill `picks.json`, set `meta.sourceName`, then render `NFL-Full` where Chromium works and listen through the mix.

## A3 notes (photosensitivity)

- `shared/EdgeGlow.tsx`: peak alphas are now exported constants `EDGE_GLOW_SHADOW_ALPHA` 0.25 (was 0.70) and `EDGE_GLOW_TINT_ALPHA` 0.12 (was 0.35).
- `shared/Shake.tsx`: one smooth sine per axis at `SHAKE_HZ` 2.5 (was a new random offset every 30 fps tick = 30 Hz), clamped to `SHAKE_MAX_HZ` 3. Peak offset (amp 5, rot 0.4 deg), duration and seed unchanged. Only user: the lock icon in `WalletCard.tsx`.
- `shared/LowPowerTint.tsx`: optional `breatheTicks` / `breatheDepth` (cosine between peak and peak x (1 - depth)).
- `components/TwoMinuteWarning.tsx`: the second per-tick EdgeGlow layer (hard 1 Hz flash) is removed; the tint breathes on the tick period (30 ticks) between 0.16 and 0.08 alpha. `tmwMath.pulse` is now a cosine. Tick sounds, hand steps, slot lengths and cue positions are unchanged.
- `PointsPill.tsx` was not changed: its last-clue pulse is 1 Hz and scale-only (6%), no brightness change.
- Not changed, not read, not mounted by any NFL scene: `shared/TimerRing.tsx` (urgent pulse) and `LowPowerRing` (2 turns/s spin). Check them before a scene mounts them.
- Not rendered. Luminance figures are computed for the glow colour over black, not measured on a rendered frame.

## B2 notes (finish layer)

- `components/FinishLayer.tsx` (`FinishLayer`, `nameRevealFrames`, `finishOffFrame`, `finishStrengthAt`, `inSplit`). Strength is `finishStrength` in `system.ts` (0.5; 0 renders nothing). `NflFull` takes an optional `finish` prop for A/B stills: `--props='{"finish":0}'`.
- Mounted in `Full.tsx` after the parts and before `WatermarkOverlay` (so the watermark is never touched). It must stay outside any Sequence or element with opacity, filter or blend mode: bloom and split use `backdrop-filter`.
- Layers at strength 1: bloom (screen, 60%), grain (overlay, 2%, new seed each design tick), vignette (50% at corners, centre 58% clear), 2 unit red/blue split for one design tick (2 render frames) at the `name-reveal` tick of each of the 30 cards. At the default 0.5 everything is half, the split is the same 2 units.
- Off for the end screen: strength ramps to 0 over 36 render frames (`SPRINGS.slow`) and is 0 from the outro's `endScreenFrom` (render frame 59752 in the measured timeline) to the end.
- Not rendered (Chromium cannot download here). Unverified: that Chromium's `backdrop-filter` with `mix-blend-mode: screen` gives the bloom, and that `backdrop-filter: url(#svg)` gives the split.

## B4 notes (captions)

- `scripts/make_nfl_captions.py` (Whisper, word timestamps) -> `src/nfl/captions.json`. Captions only hook, level, reveal, dyk, scorecard, prediction, rank, outro (61 clips; clue and cardintro skipped). The caption shows the words of `lines.csv`; Whisper only gives timing; words it heard differently are printed in the report. `captions.json` is committed EMPTY (`clips: {}`), so no caption draws until the script is run. NOT RUN: the sandbox cannot download the Whisper model. Run `pip install openai-whisper && python3 scripts/make_nfl_captions.py`, read the diff report, commit the json.
- `components/Captions.tsx` (`Captions`, `CAPTION_BOX`), mounted in `Full.tsx` between FinishLayer and the watermark. Clip placement comes from `voiceEvents` (voiceTimeline.ts). Pages of up to 8 words, split at punctuation; current word gets the snappy spring (scale 1.12), spoken words stay bright.
- Place: strip below the card, y 650 to 716, x inside the centre 80%. The card fills the whole safe box, so there is no free space inside it. This is below the 80% safe line (648): decide by eye.
- Frames to check once captions.json exists: first word of the hook clip (voice at tick 0 of hook), a reveal clip (name on screen, caption below it), a dyk clip (DYK card at centre, caption below), the rank clips, the last outro line (end-screen half stays free).
- Not rendered. `npx tsc --noEmit` passes.
