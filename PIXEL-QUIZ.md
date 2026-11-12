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

Total runtime is roughly 46 × 8 s + intros ≈ 6.5 minutes.
