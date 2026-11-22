# States video: iOS restyle report (round one steps 1-9, round two steps 1-11)

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
- **Capital label**: now uppercase (round two, step 9).
- **Sound**: `SFX_TRIM_DB`, `DUCK_SLEW`, `EDGE_FADE` in `state-sound.ts`.

## Round two (base `a240d40`): what changed, per step
1. **Brand badge**: new states-only `components/StateWatermark.tsx` (Inter, `COLOR.text.label`, 0.14em, thin neutral bulb outline, `glassPanel(RADIUS.pill, undefined, 0.4)`, same corner and entrance, no glint). Mounted in `StateRound`, `StateIris`, `StateReminder`; the shared `src/Watermark.tsx` is untouched. Knob `BADGE`.
2. **Timer ring**: digit `COLOR.text.primary`, 1.3x larger (0.24 -> 0.312 of the ring), weight 700, `tabular-nums`; red kept for the last 3 s; stroke 0.016 -> 0.013, round caps, track `COLOR.fill`. Knob `TIMER`.
3. **Mini-map**: unanswered states 9 % white fill + 0.75 hairline at 14 % white (`MAP`); answered keep the accent. The corner map and the answer-card map are the same `MiniMap`, so both match. Bonus maps (`BonusMissing`) have their own look and were not changed.
4. **Grid and grain**: `ATMOS.gridAlpha` 0.028 -> 0.014, `GRAIN.opacity` 0.04 -> 0.025. The grain was not moved under the text (the scenes paint their own opaque backgrounds, so a split mount is not possible without touching every scene); the lower opacity is the fallback the brief allowed. One global-frame mount, so no jump at cuts or wipes.
5. **Glass**: new `components/StateBackdrop.tsx` (3 soft accent blobs at 9-12 %, seeded-sine drift <= 8 px, mounted above `IosBackground` in `StateStage`, so only on question stages); rim light as two 1 px inset shadows (white 30 % top-left, 8 % bottom-right; a true gradient border was not used, it would need a mask or pseudo-element); hairline border 18 % -> 12 %; `corner-shape: squircle` on non-pill panels with plain radii as fallback. Knobs `BLOBS`, `RIM`, `CORNERS`.
6. **Layout**: `STAGE_LAYOUT.timer` puts the ring level with the shape, 40 ref px to its left; the ring + shape group is nudged right 47 ref px (clamped 40 ref px clear of the corner map). Answer screen: `REVEAL.gap` 32 ref px between card and map (the map fills the rest of the safe area). AnswerCard padX 48 / padY 48 / gap 24 (8-pt scale). Layout only; QA 8-10 pass.
7. **Accents**: EASY #30D158, MEDIUM #0A84FF, HARD #FF453A, EXPERT #BF5AF2; bg / theme are 14 % / 62 % dark tints. HARD uses red because #FF9F0A is only 6 degrees from gold (QA 11). Rank colours GOOD / KEEP GOING follow. Side effect: on HARD the accent equals `COLOR.alert`, so the ring does not visibly change in the last 3 s (the digit still does not either).
8. **Scoreboard**: one glass container, rows enter on the unchanged stagger, 1 px white-10 % hairlines inset 74 ref px, gold top rank, tabular score column. Knob `LIST`. The ranks have no rank numbers, only the emoji icon, name and range.
9. **Type**: `tabular-nums` on the HUD `n / 50` and the streak number (timer and scoreboard already). `CAPITAL` label uppercase at 0.14em (`CAPITAL_LOOK.labelSpacing` 6.16): QA 8 shows 0 stacked at both real card widths. Anton kept for the title and level name; Anton vs Inter was **not compared** (no stills). Inter Display skipped (needs a font file and no network access to fetch one).
10. **Icons and details**: states-only `components/StrokeIcon.tsx` (thin 1.75 rounded bell) replaces the neon bell on the reminder; voice bars at 70 % (`VOICE`); the end-screen subscribe ring 2 px -> 1 px (`HAIRLINE`), kept in the alert colour. The scoreboard rank emoji still go through the shared `Rich` / `Icon` (neon, filled), not stroke icons.

### Round two: verified
- `tsc`: no new errors; `node scripts/states-qa.js`: 14 / 14 after every step.
- `git diff a240d40..HEAD --stat`: only `src/states/**` (no `scripts/` change, no shared file).
- Timing unchanged: QA 4 (28597 ticks) and QA 12 (876 cues + 119 clips, timing hash `1c5226973f`) are identical before and after. Only `states-settings.json` colour fields changed.

### Round two: NOT checked
- **No stills at all** (no browser; Chrome could not be downloaded). No before / after set, nothing was looked at: not EASY / MEDIUM / HARD / EXPERT, a bonus, the level card, the scoreboard or the end screen. Every visual claim above is from code, not from frames.
- `corner-shape: squircle` support in Remotion's Chrome was not confirmed (the property is ignored where unsupported, so the radii fall back). Set `CORNERS.squircle = false` to remove it.
- Anton vs Inter bold title comparison was not done.

### Round two: needs a human eye
- Glass blobs (`BLOBS`: position, size, alpha) and whether they read behind the HUD pill, shape tile and card.
- Rim light (`RIM`) and the squircle corners.
- Grid / grain level after the halving (`ATMOS.gridAlpha`, `GRAIN.opacity`), and the mini-map fill (`MAP`).
- The four accents and the dark tints; HARD red vs the alert red.
- The ring + shape group position (`STAGE_LAYOUT` knobs `ringGap`, `groupShift`, `miniClear`) against the corner map, and the card / map gap.
- Capital label (uppercase, 0.14em) on long capitals; the scoreboard list spacing (`LIST`).

## Hero move on the answer screen (base `d8fa837`)
Current behaviour confirmed by reading the code before the change: stage shape faded over the first half of the reveal, the answer map only got the state at the stamp (gap, then pop), the region glow vanished in one frame at `revealStart`, `FlyIn` was only used by `ComponentsSheet`.

1. **One flying shape** (`StateRound.tsx`): the stage shape stays as is until `plan.revealStart`; from that same tick `FlyIn` (overlay slot, full frame, same origin as `STAGE_LAYOUT`) flies it from `STAGE_LAYOUT.shape` to the answer-map rect recomputed every frame, on the same normal spring over the same window as the map growth (ends at the stamp). Outline mode, `fill = reveal`, `glow = draw`, HARD rotation eased to 0, MEDIUM trace through the new optional `FlyIn.progress` (default 1, `ComponentsSheet` unchanged). EXPERT: the silhouette -> sharp outline cross-fade now runs on two flying copies (it cannot run before the flight: the stage cross-fade used the same reveal window, and the blur has already sharpened to 0.4 % by `revealStart`).
2. **No swap** (`MiniMap.arriving`, `currentAlpha`): the landing piece crossfades dim -> accent over the last 30 % of the flight (`FLIGHT.fillAt`) while the flying copy fades out; both are exactly 0 / 1 at the stamp, so removing `FlyIn` is invisible in principle. The `current` outline fades in over 4 ticks after the stamp and out over 4 ticks after the exit starts.
3. **Hint glow** (`MiniMap.regionGlow`): the answer map gets `highlightRegion`; the glow fades out over `FLIGHT.glowFade` = 6 ticks from `revealStart`, starting at full strength (same as the corner map).
4. **Settle pulse** (`MiniMap.pulse`): only the landed piece and its outline scale (peak 1.02, 14 ticks from the stamp); neighbours do not move. Knobs in `FLIGHT` (`motion.ts`): `arc`, `fillAt`, `glowFade`, `outlineIn`, `settlePeak`, `settleTicks`; `FlyIn.ARC` reads `FLIGHT.arc` (0.25, unchanged).
5. **Wipes**: the exit spring was fitted to the 14-tick window with `flyDur`, which left the map ~1.4 % (~10 px) short of the corner on the last frame; it is now fitted to `flyDur - 1` and ends exactly on the last frame. The iris draws the corner map at the same rect with the same answered set (this state included), no pulse, no outline, so there is no blink.

### Verified (scripts, git, arithmetic)
- `tsc`: no new errors; QA 14 / 14 after every step; each step committed and pushed.
- `git diff d8fa837..HEAD --stat` shows only `src/states/**`; timing unchanged (QA 4: 28597 ticks, QA 12: 876 cues + 119 clips, timing hash `1c5226973f`). The flight uses the existing 36-tick reveal window; hold and exit windows are longer than the 14 / 4 tick moves.

### NOT checked
- **No stills** (no browser, Chrome cannot be downloaded here): no frames across `revealStart .. stamp`, no stamp-1 vs stamp comparison, nothing looked at for EASY / HARD / EXPERT.
- Whether `FlyIn`'s landing geometry (end scale from `getMiniRect`) matches the map's own path exactly (the stage `geo.shape` and the map `geo.mini` paths come from separate geometry); if they differ, the crossfade hides a small mismatch instead of removing it.

### Needs a human eye
Flight arc and speed, the 70 % fill start, the crossfade at the landing (two overlapping copies), the 1.02 pulse, HARD un-rotation, the EXPERT hand-over, and the glow fade.

### Open question: the build plays while the shape moves
`fill` and the half-open build follow `reveal` over the whole flight, so they run while the shape moves and shrinks and may look rushed. Not changed (window kept). Options if the stills confirm it: (a) finish the build in the first third of the window (`sprFit` over `(stamp - revealStart) / 3`, flight unchanged); (b) build mostly before take-off by starting the build slightly earlier inside the existing clock / hold slack; (c) delay the take-off by a few ticks inside the same window and shorten the flight.

## Knobs
`motion.ts` (springs, durations, stagger), `look.ts` (glass, radius, glow, colour, type, plus round two: `BADGE`, `TIMER`, `MAP`, `RIM`, `CORNERS`, `BLOBS`, `LIST`, `ICON`, `VOICE`, `HAIRLINE`), `StateAtmosphere.tsx` (`ATMOS`, `GRAIN`), `components/StateStage.tsx` (`LAYOUT`: `timer`, `ringGap`, `groupShift`, `miniClear`), `scenes/StateRound.tsx` (`REVEAL`), `state-sound.ts` (trims, ducking, fades), `motion.ts` `FLIGHT` (hero move).
