# Christmas quiz progress

Repo buildwith-manish/guess-the-word, branch `christmas-quiz` (created from gta6-quiz). Context: docs/xmas-context.md. Task text: docs/xmas-prompts-split.md.

Note: docs/xmas-prompts-split.md has 26 task headings (1a-1e, 2a-2f, 3a-3b, 4a-4d, 5a-5d, 6a-6c, 7a-7b), not 25.

- [x] 1a  recon and context
- [x] 1b  data.ts, sync and check scripts
- [ ] 1c  timing.ts and xmas_runtime.ts (not done yet; skipped when 1d was run)
- [x] 1d  sound effects (scripts/make_xmas_sfx.py, src/xmas/sfx.ts)
- [ ] 1e  clue index, placeholders, ClueImage
- [ ] 2a
- [ ] 2b  GlassTile
- [ ] 2c  TimerToPill, titleFit
- [ ] 2d  LightString
- [ ] 2e  MovieReveal
- [ ] 2f  BonusScene, registry, XMAS-Bonus
- [ ] 3a  MovieScene, Preview
- [ ] 3b  Hook, XMAS-Hook
- [ ] 4a  Spotlight, Autocomplete
- [ ] 4b  Focus, CleanUp
- [ ] 4c  OddOneOut, CountLights, ControlCenter
- [ ] 4d  DoubleFeature, SpeedRound, Finale
- [ ] 5a  ScoreScene
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
- Inter font loader and woff2 files must be copied from nfl-quiz (src/ios/fonts.ts, public/fonts/ios/) before any text renders in Inter.

- [x] 1c  timing.ts (+ timings.generated.ts stub) and scripts/xmas_runtime.ts; `npx tsx scripts/xmas_runtime.ts` prints the report
