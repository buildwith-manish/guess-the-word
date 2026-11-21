# iOS theme (src/ios)

Shared look for any video that opts in. Nothing in `src/style.ts`, `src/fonts.ts` or `src/Background.tsx` is changed, so finished videos render as before.

- `import { IOS, iosSurface, spring, easeOut, IosBackground } from '../ios'` (path relative to the file). Importing it also loads Inter.
- `IOS.font` / `IOS.weight` / `IOS.color` / `IOS.radius` / `IOS.space`: tokens (reference units; wrap sizes in `px()`).
- `iosSurface(radius)`: frosted card style. Use for pills, fields, cards.
- `spring(t)`: the one motion curve (t = 0..1 over 0.3 to 0.45 s). Use it for every move, scale and fade-in.
- `IosBackground accent`: near-black with two faint slow lights in the accent colour.
- Rules of thumb: one accent per screen, semibold max (no ExtraBold), no glow/shake/confetti, hairline edges, 8-pt spacing.

Opted in so far: search-history round screen (search field, recents, timer, dots, HUD pill, answer reveal).
Not yet: hook, level cards, bonus, scoreboard, end screen, hint tiles (search-history), and the other videos.
