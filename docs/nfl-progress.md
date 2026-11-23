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
- [ ] 2g: RevealEngine + lock
- [ ] 4a: level cards (Starter, Hall of Fame), Rookie banner, score cards
- [ ] 3a: CardScene + Preview
- [ ] 4f: Scoreboard + rank card
- [ ] 3b: Hook + lock notification
- [ ] 3c: final card + Wallet collection
- [ ] 4b: Part 1
- [ ] 4e: Predictions
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
