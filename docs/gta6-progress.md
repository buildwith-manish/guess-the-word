# GTA 6 quiz: progress

The task table (docs/gta6-prompts-split.md) is not in the repo on any branch and its ID list was not pasted, so this checklist only covers the IDs seen so far (1a to 1d). Add the remaining IDs from the table when it is available.

- [x] 1a: shared reuse context. `docs/gta6-context.md` (sections 0 to 3).
- [x] 1b: data. `src/gta6/data.ts`, `docs/gta6/questions.json` (45 items), `scripts/build-questions.js`, `scripts/check_gta6_data.ts`.
- [ ] 1c: **not present in the repo.** `src/gta6/timing.ts` does not exist (no `TIMELINE`, `locate`, `RENDER_TOTAL_FRAMES`). Nothing in 1d depends on it.
- [x] 1d: sound effects.
  - `scripts/make_gta6_sfx.py` (numpy, original synthesis, no external audio).
  - `public/gta6/sfx/*.wav` (12 files, 48 kHz mono 16-bit) and `public/gta6/sfx/manifest.json`.
  - `src/gta6/sfx.ts` (typed ids, `cue(id, frame)`), `src/gta6/sfx-ids.ts` (generated).
  - Level: peak at most -3 dBFS, RMS target -19 dBFS (loudness proxy, not a true LUFS meter); short impulsive sounds are peak-limited.

## Next step
Find or supply the task table and `src/gta6/timing.ts` (task 1c) before any scene task. Open points from `docs/gta6-context.md`: 2560x1440 at 60 fps is the repo convention, not 1920x1080.
