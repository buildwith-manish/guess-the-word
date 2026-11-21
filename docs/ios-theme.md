# iOS theme (src/ios)

Shared look for any video that opts in. Nothing in `src/style.ts`, `src/fonts.ts` or `src/Background.tsx` is changed, so finished videos render as before.

- `import { IOS, iosSurface, spring, easeOut, IosBackground } from '../ios'` (path relative to the file). Importing it also loads Inter.
- `IOS.font` / `IOS.weight` / `IOS.color` / `IOS.radius` / `IOS.space`: tokens (reference units; wrap sizes in `px()`).
- `iosSurface(radius)`: frosted card style. Use for pills, fields, cards.
- `spring(t)`: the one motion curve (t = 0..1 over 0.3 to 0.45 s). Use it for every move, scale and fade-in.
- `IosBackground accent`: near-black with two faint slow lights in the accent colour.
- `layout.ts`: `SAFE_X` (64), `SAFE_TOP` (56), `SAFE_BOTTOM` (40), `HUD_H` (48) and `CONTENT` (the box inside them), all in reference units on the 8-pt grid. The HUD pill is centred on `SAFE_TOP`; its left edge, the content column and anything right-aligned share `SAFE_X`. Use these instead of `SAFE_X` / `SAFE_Y` from `src/style.ts` (screen px, older videos only).
- Rules of thumb: one accent per screen, semibold max (no ExtraBold), no glow/shake/confetti, hairline edges, 8-pt spacing.

Opted in so far: search-history round screen (search field, recents, timer, dots, HUD pill, answer reveal).
Not yet: hook, level cards, bonus, scoreboard, end screen, hint tiles (search-history), and the other videos.
