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
