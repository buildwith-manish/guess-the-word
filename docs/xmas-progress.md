# Christmas quiz progress

Repo buildwith-manish/guess-the-word, branch `christmas-quiz` (created from gta6-quiz). Context: docs/xmas-context.md. Task text: docs/xmas-prompts-split.md.

Note: docs/xmas-prompts-split.md has 26 task headings (1a-1e, 2a-2f, 3a-3b, 4a-4d, 5a-5d, 6a-6c, 7a-7b), not 25.

- [x] 1a  recon and context
- [x] 1b  data.ts, sync and check scripts
- [ ] 1c  timing.ts and xmas_runtime.ts (not done yet; skipped when 1d was run)
- [x] 1d  sound effects (scripts/make_xmas_sfx.py, src/xmas/sfx.ts)
- [ ] 1e  clue index, placeholders, ClueImage
- [x] 2a  shared parts, system.ts, ui.ts (src/xmas/shared/*, src/xmas/system.ts, src/xmas/ui.ts)
- [ ] 2b  GlassTile
- [ ] 2c  TimerToPill, titleFit
- [x] 2d  LightString
- [x] 2e  MovieReveal
- [ ] 2f  BonusScene, registry, XMAS-Bonus
- [x] 3a  MovieScene, Preview
- [ ] 3b  Hook, XMAS-Hook
- [x] 4a  Spotlight, Autocomplete
- [ ] 4b  Focus, CleanUp
- [x] 4c  OddOneOut, CountLights, ControlCenter (src/xmas/bonus/; tsc passes, stills rendered and viewed)
- [x] 4d  DoubleFeature, SpeedRound, Finale (src/xmas/bonus/; tsc passes, NOT render-checked: Chromium could not be downloaded in the cloud session)
- [x] 5a  ScoreScene
- [ ] 5b  Outro
- [ ] 5c  Part1-3, sfxCues, XMAS-P1..P3
- [ ] 5d
- [ ] 6a
- [ ] 6b  xmas_voice_fit.ts
- [ ] 6c  master_xmas_voice.py, Audio.tsx, music-license.md
- [ ] 7a
- [ ] 7b

## Notes for next task
- Missing from the branch: `docs/xmas/reference/lg_q3.png`.
- Inter woff2 files are now in public/fonts/ios/ and loaded by `useXmasFonts()` (src/xmas/shared/fonts.ts); every scene calls it at the top.
- src/xmas/shared/clock.ts holds WIDTH/HEIGHT/RENDER_FPS/FPS/TIME_SCALE; src/xmas/timing.ts (1c) should re-export them rather than redefine (check for a duplicate when 2b starts).

- [x] 1c  timing.ts (+ timings.generated.ts stub) and scripts/xmas_runtime.ts; `npx tsx scripts/xmas_runtime.ts` prints the report
