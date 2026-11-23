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
- [ ] 2d: ClueStack
- [x] 2e: ScoreHud, chips (`src/nfl/components/ScoreHud.tsx`, `Chips.tsx`; notes below)
- [ ] 5a: audio pipeline (clips, timings, map)
- [ ] 2f: Two-Minute Warning
- [x] 2g: RevealEngine + lock (`src/nfl/components/RevealEngine.tsx`: `RevealEngine`, `revealBeats`, `revealCues`, `SourceLine`)
- [x] 4a: `src/nfl/scenes/LevelCard.tsx` (Starter, HoF), `LevelBanner.tsx` (Rookie, y 4-84, clears the first clue at y 160), `ScoreCard.tsx` (after card 10 and 20). Each exports its sfx cues (`levelCardCues`, `levelBannerCues`, `scoreCardCues`) and a voice start (`levelCardVoice`, `levelBannerVoice`, `scoreCardVoice`: type, key, tick) for the 5a audio map. timing.ts: new beats (`levelBannerSec`, `levelCardBeats`, `scoreCardBeats`); the Hall of Fame score card is removed (only 2 score cards, `needed` clips updated). data.ts: `levelText`. NEW SEAM: `src/nfl/lines.generated.ts` (empty placeholder) + `lines.ts` `lineText(type, key)`: 5a must write the spoken script text there; until then the ScoreCard shows rings and numbers without its text line. Not rendered; mounted by nothing until 3a/4b.
- [x] 3a: CardScene + Preview (`src/nfl/scenes/CardScene.tsx`, `src/nfl/Preview.tsx`; compositions `NFL-Card` (prop n) and `NFL-Card-All` in `src/Root.tsx`; notes below)
- [x] 4f: `src/nfl/scenes/Scoreboard.tsx` (`Scoreboard`, `scoreboardCues`, `scoreboardVoice`). One card with all five tiers (names and ranges from data.ts); rings fill, tiers light lowest to highest, then a still hold of at least 4 s. timing.ts: new `scoreboardPlan` {rings, steps (lit order, clip key = position in `ranks`, best = '1'), hold, len}, `scoreboardRingsSec`, `rankStepSec`, `rankFinalHoldSec` (replaces `rankHoldSec`); `rankSlotSec` is now per rank step. 5a: the audio map must give the five rank clips keys '1'..'5' with '1' = Hall of Famer, and they play lowest first (key '5' first). Not rendered; nothing mounts it until 4h.
- [x] 3b: Hook (`src/nfl/scenes/Hook.tsx`: `Hook`, `HookLock` (the reusable 1 s piece, takes `at`), `HOOK_LOCK_TICKS`, `hookMarks`, `hookCues`, `hookVoice`; composition `NFL-Hook`; notes below)
- [ ] 3c: final card + Wallet collection
- [ ] 4b: Part 1
- [x] 4e: Predictions (`src/nfl/scenes/Predictions.tsx`; notes below)
- [ ] 4c: Part 2
- [ ] 4d: Part 3
- [ ] 4g: Outro + Part 4
- [ ] 4h: full composition + chapters
- [ ] 5b: clue-fit report
- [ ] 5c: voice chain + mix
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

## Next step

Run 1b (data + validation) and 2a (system + shared parts) next; both need only 1a.

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
