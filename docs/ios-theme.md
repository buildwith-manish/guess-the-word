# iOS theme (src/ios)

Shared look for any video that opts in. Nothing in `src/style.ts`, `src/fonts.ts` or `src/Background.tsx` is changed, so finished videos render as before.

- `import { IOS, iosSurface, spring, easeOut, IosBackground } from '../ios'` (path relative to the file). Importing it also loads Inter.
- `IOS.font` / `IOS.weight` / `IOS.color` / `IOS.radius` / `IOS.space`: tokens (reference units; wrap sizes in `px()`).
- `iosSurface(radius)`: frosted card style. Use for pills, fields, cards.
- `spring(t)`: the one motion curve (t = 0..1 over 0.3 to 0.45 s). Use it for every move, scale and fade-in.
- `IosBackground accent`: near-black with two faint slow lights in the accent colour.
- `layout.ts`: `SAFE_X` (64), `SAFE_TOP` (56), `SAFE_BOTTOM` (40), `HUD_H` (48) and `CONTENT` (the box inside them), all in reference units on the 8-pt grid. The HUD pill is centred on `SAFE_TOP`; its left edge, the content column and anything right-aligned share `SAFE_X`. Use these instead of `SAFE_X` / `SAFE_Y` from `src/style.ts` (screen px, older videos only).
- Rules of thumb: one accent per screen, semibold max (no ExtraBold), no glow/shake/confetti, hairline edges, 8-pt spacing.

## Sound (search-history)

Three soft clips, made by `npm run sounds` (`scripts/generate-audio.js`) and peak-normalised to 0.8, so the cue volume is the real level. Levels are in `SOFT_GAIN` in `src/search/search-sound.ts`.

- `public/sounds/ios-tick.wav`: one per typed word (not per character: 10 to 15 a second is a buzz), at least 0.1 s apart. Volume 0.12. Hook, rounds, bonus and the level-card demo.
- `public/sounds/ios-pop.wav`: a search lands in the recent list. Volume 0.25.
- `public/sounds/ios-chime.wav`: the answer reveal, round and bonus. Volume 0.30.

Tick and pop do not duck the music; the chime does, like every other reveal sound.

To use recordings of your own: save them under the same names as 16-bit or 32-bit float `.wav`, then run `npm run search:sounds`. That writes `src/search/search-sound-files.json` (which clips exist, and how long). A clip listed as missing plays the older clip instead (`IOS_FALLBACK`: key-click, send, ding), so a missing file never fails a render. `npm run sounds` writes the default clips back over your files.

Opted in so far: search-history round screen (search field, recents, timer, HUD pill, answer reveal; no progress dots).
Not yet: hook, level cards, bonus, scoreboard, end screen, hint tiles (search-history), and the other videos.
