# Guess the Brand: Pixelated

A second composition (`PixelGuess`) that lives next to `GuessTheWord`. It reuses the existing
Background, Watermark, EndScreen, fonts, design tokens, easing helpers and sound files, and adds
**procedural pixelation**: the picture starts as a coarse block grid and gets finer every second.

## Run it

```bash
npm install
npm run pixel:images          # optional: fetch photos with the z-ai CLI -> public/pixel-brands/NN.jpg
npm run pixel:dev             # Remotion Studio, pick "PixelGuess"
npm run pixel:still           # one test frame -> out/pixel-still.png
npm run pixel:draft           # half-res draft render
npm run pixel:render          # full render -> out/pixel-guess.mp4
```

No photos yet? It still renders: a deterministic colour-block stand-in built from each brand's
palette is pixelated instead (the console warns once per missing file).
You can also drop your own `01.jpg … 46.jpg` into `public/pixel-brands/`. The picture is cropped to a
centred square, so keep the pack in the middle of the shot.

## How a question plays (30 design fps, rendered at settings.json fps)

| time | what happens | grid |
| --- | --- | --- |
| 0.5 s | picture pops in | 8 × 8 |
| 0–1 s | countdown 5 | 8 × 8 |
| 1–2 s | 4 | 12 × 12 |
| 2–3 s | 3 | 20 × 20 |
| 3–4 s | 2 (ring turns red) | 32 × 32 |
| 4–5 s | 1 | 48 × 48 |
| 5 s | pixels resolve into the full photo, green glow, answer slams in | HD |

Tune it in `src/pixel/pixel-timing.ts` (`PIXEL_STEPS`, `COUNTDOWN_SECONDS`, `T`).

## Files

- `src/pixel/brands.ts` — the 46 brands, 4 levels, hint line, palette, image-search query
- `src/pixel/PixelCanvas.tsx` — crop → halving box-downscale → nearest-neighbour upscale
- `src/pixel/PixelRound.tsx` — one question (HUD, resolution ladder, neon countdown ring, reveal)
- `src/pixel/PixelScenes.tsx` — intro + level cards
- `src/pixel/PixelMain.tsx` — scene switch + sound cues (existing WAVs in `public/sounds`)
- `src/pixel/pixel-timing.ts` — frame-accurate timeline
- `scripts/fetch-pixel-images.js` — photo fetcher (same CLI as `fetch-images.js`)

## Scoring and bonus rounds

Same rules as the main video, so viewers who know it already know how to play:

- **Intro** = title, then *THE RULES* (count every wrong answer · bonus right = −1 wrong · under 4 wrong = LEGEND).
- **HUD**: Q counter, level-coloured progress bar, perfect **STREAK**, and **BONUS ERASES** once a bonus is done.
- **4 bonus rounds**, one at the end of each level (after Q12, Q25, Q38, Q46). Each is a colour wipe into the orange
  bonus backdrop, a timed puzzle, and a "NAIL IT → ERASE 1 WRONG" reveal. They are the main format's rounds, picked for
  this quiz in `PIXEL_BONUS_ORDER` (`src/pixel/pixel-timing.ts`):
  1. **Odd one out** (food themed) 2. **Count it** 3. **Spot the difference** 4. **Emoji math** (hardest).
  Swap in `'scramble'` for a word round. Boards are seeded, so every render is identical.
- **"Still counting? ❌"** pop-ups after Q6, Q19 and Q32 (`PIXEL_REMINDER_AFTER`).
- **Scoreboard** (LEGEND → KEEP GOING) before the end screen, with the existing rank sounds and confetti.

Moving a bonus round or reminder is one number in `pixel-timing.ts`; the progress bar, diamonds and BONUS counter follow.

Shared code touched: `src/Hud.tsx` now reads its level blocks / bonus diamonds from a `HudPlan` context
(the main video's plan is the default, so `GuessTheWord` renders exactly as before), and
`buildBonusPuzzles()` takes an optional `order`.

Total runtime is about 8 minutes.

## Fastest guess questions

Five questions (`PIXEL_FASTEST.questions` in `src/pixel/pixel-timing.ts`, brand ids 4, 16, 29, 36, 40) run a
3-second clock instead of 5. The grid starts at 8x8 and tops out at 16x16 (`PIXEL_FASTEST.steps`), and a
red/orange ⚡ FASTEST GUESS badge (same label and look as the main video) pulses beside the picture.
Sounds: badge ping + thump as it appears, then one tick per second. Change the ids, seconds or grid
steps in that one object. Video length is about 7.9 minutes.
