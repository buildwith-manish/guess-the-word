# Don't Say The Same As Me — context

Branch: `dontsay-quiz` (cut from `gta6-quiz`).
Base tag: `gta6-base-1123` (fixed point so GTA 6 work cannot move under this video).
Generated: 2026-11-23 by task 2a.

## Rules (read before any other file)

1. Nothing in `src/dontsay/` imports from `src/gta6/` or `src/nfl/`. Imports allowed: `src/dontsay/`, `src/ios/`, `node_modules`.
2. Hearts are honour-system and viewer-only. The video NEVER animates a heart being lost. `HeartsPill` (task 2c) is a static reference only.
3. The sealed ink bubble is on screen from frame 0 of every round (small, corner), enlarges to centre at the 1.5 s mark.
4. No Apple logos, no real app icons, no SF Pro, no SF Symbols. Inter + Nunito (SIL OFL). Our own drawn hearts, mic, toggles, lock and icons.

## Reuse table

Files copied (not imported) into `src/dontsay/shared/`, with their source and what changed.

| reuse | path (source on gta6-quiz) | exports | notes (copy or adapt) |
|---|---|---|---|
| clock helpers | `src/clock.ts` | `useDesignFrame` | copy; import path `../timing` |
| fade helpers | `src/gta6/components/fade.ts` | `clamp01`, `fadeWindow` | copy (no external deps) |
| presence | `src/gta6/components/presence.ts` | `presence` | copy; import `springAt` from `../system` |
| timer math | `src/gta6/components/timerMath.ts` | `timerMath`, `URGENT_SECONDS` | adapt: `URGENT_SECONDS = 2` (was 3; docx says red under 2 s) |
| FrostCard | `src/gta6/components/FrostCard.tsx` | `FrostCard` | adapt: uses `glassSurface()` from `../system` (docx glass spec: blur 40 px, saturate 180 %, bright top rim, 0.5 px border, two soft shadows) |
| TimerRing | `src/gta6/components/TimerRing.tsx` | `TimerRing` | adapt: default variant `island` (Dynamic Island pill); urgent red is `SYSTEM.red` |
| EdgeGlow | `src/gta6/components/EdgeGlow.tsx` | `EdgeGlow` | adapt: default `dur = 60` (2 s); red is `SYSTEM.red` |
| Shake | `src/gta6/components/Shake.tsx` | `seeded`, `Shake` | copy; import `u` from `../system` |
| LockNotification | `src/gta6/components/LockNotification.tsx` | `LockNotification`, `LOCK_BEATS`, `lockNotificationEnd` | adapt: blurred answer grid replaced with a single blurred card (DontSay has no answer grid); no `ChoiceChip` dependency |
| NotificationBanner | `src/gta6/components/NotificationBanner.tsx` | `NotificationBanner` | adapt: simplified to a single-line toast (slide down, hold, slide up) |
| ScoreHud | `src/gta6/components/ScoreHud.tsx` | `ScoreHud` | adapt: `rings` default `false` (docx says "no rings"); `label` prop for "OF 45"; 5 levels not 3 |
| LowPowerTint | `src/gta6/components/LowPowerTint.tsx` | `LowPowerTint` | adapt: optional warning tint (not required by any round; included for future use) |
| level-card transition | inlined in `src/gta6/scenes/LevelCard.tsx` (not a separate file) | `levelCardLaunch`, `levelCardExit` | write from spec: spring zoom from a home-screen icon origin to frame centre, `pop` preset |
| spring presets | `src/ios/motion.ts` (`spring`) + `src/gta6/system.ts` (`SPRINGS`, `springAt`) | `SPRINGS`, `springAt`, `SpringName` | adapt: Remotion `spring()` (like gta6), presets within docx range (damping 14-20, stiffness 120-180). `src/ios/motion.ts` has its own damped-oscillator `spring()` — available as an alternative, but not used here. |
| iOS tokens | `src/ios/tokens.ts` | `IOS`, `iosSurface` | reference only (not imported); the dontsay `system.ts` supersedes it with the docx palette |
| design tokens | `src/style.ts` (`SCALE`, `px`, `COLORS`, `glass`) | — | NOT copied; `system.ts` uses the gta6 convention (`FRAME`, `UNIT`, `u`, `colours`, `glassSurface`) |
| fonts | `src/fonts.ts` (Anton/Poppins/JetBrains Mono/Noto Color Emoji) | — | NOT copied; `shared/fonts.ts` loads Inter + Nunito. Poppins stays as the fallback before Inter/Nunito woff2 files are added. |
| anim helpers | `src/anim.ts` (`prog`, `fadeIn`, `revealIn`, `springStyle`, `cubicBezier`, etc.) | — | NOT copied; `springAt` from `system.ts` covers the spring cases. If a scene needs `revealIn` or `slamIn`, copy the specific function into that scene (do not import `src/anim.ts`). |
| types | `src/types.ts` (GTA 6 Segment types) | — | NOT copied; DontSay defines its own `Round`, `Bonus`, `Segment` types in `data.ts` / `timing.ts`. |
| util | `src/util.ts` (`makeRandom`, `shuffle`, `glyphs`, `makeConfetti`) | — | NOT copied; if a scene needs seeded randomness, copy `makeRandom` into `shared/util.ts` (do not import `src/util.ts`). |

## system.ts (built new)

`src/dontsay/system.ts` exports:
- `FRAME`, `UNIT`, `u` — 1920×1080 reference frame scaled to 2560×1440.
- `SAFE`, `safeBox` — centre 80 % (10 % margin each side).
- `SYSTEM` — `{ blue: #007AFF, green: #34C759, red: #FF3B30 }` (docx system colours).
- `colours` / `colors` — level accents (L1-L5), ink, muted, glass, hairline, shadow, collision (red), safe (green), bonusGold, lowPower.
- `fontHeadline` (Inter first), `fontNumeric` (Nunito first), `tabular`.
- `type` scale — caption / body / chip / prompt / answer / title / number / counter.
- `textStyle(role)` — font + size + weight + lineHeight + tracking + tabular.
- `radius` — sm 12 / md 22 / lg 34 / xl 48.
- `blurPx` 30, `saturate` 1.8, `glassSurface(radius, opts)` — the docx glass spec.
- `SPRINGS` — gentle / snappy / smooth / pop / bouncy (damping 14-20, stiffness 120-180).
- `springAt(frame, at, preset)` — Remotion `spring()` over the 30 fps design clock.
- `levelBackground` — radial gradient per level, tinted by the level colour.
- `grainOpacity` 0.03 — film grain over gradients.
- `STAGGER` — arrival 4 / chip 4 / heart 4 frames.

## Gaps (must be built new for DontSay)

These are the components the other tasks (2b-2g, 3a-3c, 4a-4o) build. `shared/` does not include them.

| gap | task | what it is |
|---|---|---|
| InkBubble | 2b | iMessage invisible-ink sealed answer: shimmering ink particles covering the answer, dissolving left-to-right. Small (corner) from frame 0, large (centre) at the 1.5 s mark. |
| HeartsPill | 2c | static pill with three drawn hearts; spring-in ONCE at level start, NEVER decrements. |
| ListeningGlow | 2c | Siri-style multicolor glow + live waveform around the main card. |
| CountdownNumber | 2d | Dynamic Island pill (uses TimerRing island variant from shared/). |
| ResultBeat | 2d | 1.8 s after reveal: red "Same answer" / green "Different? Safe" chip on InkBubble. NEVER animates a heart. |
| ExclusionChips | 2e | Settings toggle rows / crossed-out swatches / crossed-out icon chips. |
| SettingsSheet | 2e | level-start rules sheet (4 s), with the "Break a rule and it counts as a match." line on L2. |
| BonusWrapper | 2f | warm gold-tinted glass + BONUS pill + pass-condition chip. |
| RevealEngine | 2g | 0.5 s beat (Shake on the lock) → second lock click → ink dissolve sweep → answer. |
| RoundScene | 3a | the standard round layout (uses shared/ + the components above). |
| Hook | 3b | 8 s hook with LockNotification (from shared/) at 0:00-0:03. |
| Round45Callback | 3c | 4.2 s intro with 4 fruit cards floating into the banned box (uses Shake + springAt from shared/). |
| Bonus scenes (×5) | 4b-4f | MindReader / TripleLock / ChainReaction / OppositeDay / VoiceOnly. |
| RankCard | 4g | single Wallet-pass card with all 5 ranks, holds 6 s. |
| Scoreboard | 4g | uses ScoreHud with `rings=true` (from shared/). |
| Outro | 4h | on-screen asks + end screen. |

## SFX ids (task 1d appends these here)

Pending task 1d. The expected ids (from the prompt pack): card-in, listening-start, tick, lock-click, ink-dissolve, collision-thud, safe-pulse, exclusion-flip, swatch-cross, chip-land, level-card, bonus-pill, triple-lock-click, chain-link, invert-whoosh, mic-pulse, callback-chime, check-in-tone, rank-reveal, end-sting.

## Open dependencies (files task 2a depends on)

- `src/dontsay/data.ts` (task 1b) — exports `levelColours`, `type Level = 1|2|3|4|5`. `system.ts` imports these.
- `src/dontsay/timing.ts` (task 1c) — exports `FPS`, `WIDTH`, `TIME_SCALE`. `clock.ts`, `timerMath.ts`, `system.ts` import these.
- Both 1b and 1c run before 2a (wave 2 and wave 3 respectively), so these will exist when 2a starts.

## What I could not verify

- `npx tsc --noEmit` — the sandbox does not have the repo's `node_modules` (Remotion, React, @remotion/fonts) checked out, so tsc cannot resolve `remotion` or `@remotion/fonts`. The files are written to compile against those packages; the first chat that clones the branch and runs `npm install` should run tsc.
- `remotion still` — same reason (no Remotion runtime in the sandbox).
- The exact path of `src/gta6/components/NotificationBanner.tsx` and `LowPowerTint.tsx` source was confirmed by listing (they exist on gta6-quiz), but the adapted versions here are written from the LockNotification/EdgeGlow patterns rather than byte-copied, because the raw fetch was rate-limited before those two could be read. The adaptations follow the same structure (one-shot toast / colour-tint overlay) and use the same `springAt` + `clamp01` helpers.
