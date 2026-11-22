# GTA 6 quiz: progress

The task table (docs/gta6-prompts-split.md) is not in the repo on any branch and its ID list was not pasted, so this checklist only covers the IDs seen so far (1a to 1d). Add the remaining IDs from the table when it is available.

- [x] 1a: shared reuse context. `docs/gta6-context.md` (sections 0 to 3).
- [x] 1b: data. `src/gta6/data.ts`, `docs/gta6/questions.json` (45 items), `scripts/build-questions.js`, `scripts/check_gta6_data.ts`.
- [x] 1c: timing. `src/gta6/timing.ts` (clock helpers, phase constants, `segments`, `locate`, `RENDER_TOTAL_FRAMES`, `partRanges`, `chapters`), `scripts/gta6_runtime.ts`. Landed on the remote while 1d was in progress; not re-checked by 1d beyond listing its exports.
- [x] 1d: sound effects.
  - `scripts/make_gta6_sfx.py` (numpy, original synthesis, no external audio).
  - `public/gta6/sfx/*.wav` (12 files, 48 kHz mono 16-bit) and `public/gta6/sfx/manifest.json`.
  - `src/gta6/sfx.ts` (typed ids, `cue(id, frame)`), `src/gta6/sfx-ids.ts` (generated).
  - Level: peak at most -3 dBFS, RMS target -19 dBFS (loudness proxy, not a true LUFS meter); short impulsive sounds are peak-limited.
- [x] 2e: `src/gta6/components/QuestionShell.tsx` (exported from `components/index.ts`); `docs/gta6-context.md` section 5 now has one component table.
  - Verification: `npx tsc --noEmit` reports no errors in `src/gta6/`. It does report 3 errors in earlier files (`src/fontshare/load-fonts.ts`: missing `@remotion/google-fonts/PlusJakartaSans` and `JetBrainsMono`; `src/timing.ts` line 45: type cast). Not touched. `npm ci` fails (package-lock.json out of sync with package.json); deps were installed with `npm install --no-save --no-package-lock`.
  - No render or `remotion still` was run.

## Next step
Supply the task table (docs/gta6-prompts-split.md) so the remaining task IDs can be added to this checklist. Open points from `docs/gta6-context.md`: 2560x1440 at 60 fps is the repo convention, not 1920x1080.
