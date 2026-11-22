# Watermark (user request after the States video)

- New: `src/search/components/SearchWatermark.tsx`, the QUIZ MATRIX badge with the animated bulb logo, top right. Mounted once in `SearchMain.tsx`, outside the per-scene Sequences, so it reads the clock of the whole video (the logo loop and the entrance never restart at a scene change). Shown on round, reminder and iris scenes; not on the hook, level cards, bonus, scoreboard or end screen.
- This reverses the earlier "no brand lockup" rule (rule 6, `docs/search-context.md` section A, and the 5b / 3d notes): the user asked for the same watermark as the States video. The shared `src/Watermark.tsx` is untouched.
- Logo: `public/search/quiz-matrix-logo.webp`, a sprite sheet (9 x 10 cells of 128 px, 82 frames at 30 fps) made from the user's transparent loop `bulb_watermark_loop.webm`. The same sheet is used by the States video.
- Look: mirrors the HUD pill (same top, same height `HUD_H`, right edge on `SAFE_X`), Inter semibold, `IOS.color.secondary`, `iosSurface`. Knobs: `BADGE` at the top of the file.
- Checked: `tsc` (no new errors; the 4 older ones remain), `search:qa` 16/16, `search:check` 10/10. Not rendered or viewed: check the badge against the HUD pill and the answer area, and the logo size.
