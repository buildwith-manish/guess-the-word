# NFL Scouting Card Quiz: progress

Task table: `docs/nfl-prompts-split.md` (28 tasks, run order below). Shared context: `docs/nfl-context.md`. Branch `nfl-quiz`, cut from `gta6-quiz` at tag `gta6-base-1123` (commit 79454ca).

Nothing has been rendered or type-checked by any task yet.

## Checklist (run order)

- [x] 1a: recon and context file. `docs/nfl-context.md`, `docs/nfl-progress.md`. No feature code.
- [ ] 1b: data + validation (`src/nfl/data.ts`, `scripts/check_nfl_data.ts`)
- [ ] 1d: sfx (pedalboard)
- [ ] 2a: copy shared parts + system (`src/nfl/system.ts`, Inter / `src/ios` files)
- [ ] 1c: timing (`src/nfl/timing.ts`, `scripts/nfl_runtime.ts`)
- [ ] 2b: WalletCard
- [ ] 2c: PointsPill + clue timer
- [ ] 2d: ClueStack
- [ ] 2e: ScoreHud, chips
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

1. **Units.** gta6 components use 1920x1080 reference units through `u()`; the NFL Starter requires 1280x720 through `px()`. Convert gta6 numbers x 2/3 when copying, or give `src/nfl/system.ts` its own `u()`. Decide in 2a.
2. **`px()` / `useDesignFrame` source.** They live in `src/style.ts` / `src/clock.ts`, not on the Starter's allowed-import list (though `src/ios/tokens.ts` imports `../style`). Suggested: copy the two helpers into `src/nfl/system.ts` in 2a.
3. **Inter.** Not loaded anywhere on this branch. 2a should bring `src/ios/index.ts`, `fonts.ts`, `IosBackground.tsx`, `layout.ts` and `public/fonts/ios/Inter-*.woff2` from `origin/search-history`, and Root should import `src/ios/fonts.ts` once.
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
