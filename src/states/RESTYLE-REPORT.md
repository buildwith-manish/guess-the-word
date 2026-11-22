# States video: iOS restyle report (steps 1-9)

Branch `us-states`. Base before the restyle: `8cbf549`. Verified from this repo, not from rendered frames.

## What changed, per step
1. **motion.ts**: one motion language (quick / normal / slow springs, `spr`, `stagger`, `iosOut`, `settle`, `enter` / `leave`, `DUR`). Every animation and its preset is listed in `MOTION.md`.
2. **Springs scene by scene**: round, bonus, level card / hook / title lockup / reminder / wipe, scoreboard / end screen moved onto motion.ts; exits shorter than entrances, no hard overshoot on the main UI.
3. **Glass**: `look.ts` `glassPanel()` + `RADIUS` on the answer card, HUD pills, chips, streak banner, scoreboard rows and bonus panels.
4. **Soft light**: `SOFT_GLOW` (two wide, low-opacity layers) replaces the tight neon glows; `MINI_PULSE` lifted down.
5. **Colour**: `COLOR` tokens (text 92 / 60 / 45 %), gold only for STATE / streak / top rank, MEDIUM accent changed from gold to sky blue (`states-settings.json`), no colour literals in components (QA check 11).
6. **Atmosphere**: `StateAtmosphere.tsx`, mounted once in `StateMain` on the global frame (so no jump at cuts or wipes): seeded-sine parallax (<= 8 px), faint grid, vignette, 4 % film grain re-seeded every 2 frames.
7. **Typography**: `FONT` (Anton titles + Inter), `WEIGHT` (700 / 500 / 400), `TYPE` (6-step scale), `TRACKING` (0.14em on uppercase labels). Capital row fitting was already in place (`capital-fit.ts`, QA check 8, all 50 capitals).
8. **Sound, volumes only**: `SFX_TRIM_DB` (whoosh -5 dB, pop -4, pings / ticks / sweeps -3), slew-limited music ducking (`DUCK_SLEW`), 2 / 4 frame edge fades on every clip (QA check 12).
9. **This review.**

## Verified (scripts and git, no browser)
- `npx tsc --noEmit -p .`: no errors in `src/states`. The only errors are the existing `fontshare`, `pixel-timing` and `timing` ones.
- `node scripts/states-qa.js`: 14 / 14 checks pass.
- **Shared files untouched:** `git diff 8cbf549..HEAD` shows no change outside `src/states/` and `scripts/` (so `anim.ts`, `style.ts`, `Background.tsx`, `Fx.tsx`, `util.ts`, `src/ios/`, the word quiz and the pixel video are byte-identical). GuessTheWord and the pixel video therefore render as before, but that was not confirmed by rendering them.
- **Timing unchanged:** the full States timeline (all 117 segments, 28597 ticks) is identical to the base once the level colour fields are removed, and the cue + voice plan hash is identical before and after step 8 (876 cues, 119 clips).

## NOT checked (needs a browser)
- No stills were rendered (the sandbox cannot download Remotion's browser), so there is no before / after set and no look at EASY / MEDIUM / HARD / EXPERT, a bonus, the level card, the scoreboard or the end screen.
- `backdrop-filter` determinism (two stills compared) was not tested.
- GuessTheWord and the pixel video were not rendered for comparison (see the git argument above).
- Nothing was listened to.

## Needs a human eye
- **Spring feel**: `SPRINGS` in `motion.ts`.
- **Glow strength**: `SOFT_GLOW`, `MINI_PULSE` in `look.ts`.
- **Glass**: `GLASS` (fill, blur, border) in `look.ts`.
- **Grain, drift, vignette**: `GRAIN`, `ATMOS` in `StateAtmosphere.tsx`. The grain, grid and vignette sit above the text, so check contrast.
- **Anton size**: titles use the same px as the old Inter bold, so they may look small. `FONT.display = FONT.sans` drops Anton.
- **Capital label**: still sentence case at 1 px tracking (uppercase would force stacking).
- **Sound**: `SFX_TRIM_DB`, `DUCK_SLEW`, `EDGE_FADE` in `state-sound.ts`.

## Knobs
`motion.ts` (springs, durations, stagger), `look.ts` (glass, radius, glow, colour, type), `StateAtmosphere.tsx` (atmosphere, grain), `state-sound.ts` (trims, ducking, fades).
