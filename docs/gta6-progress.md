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
- [x] 3a: `src/gta6/scenes/looks/MessagesLook.tsx` (props = shell ctx subset: `item, phase, localFrame, phases, revealFrom`). Beat lengths (dots 0.8 s, stagger 0.1 s, tremble 2 s, notes-out 0.3 s) are in a local `MESSAGES` const in seconds. No render run.
- [x] 3e: `src/gta6/scenes/looks/ControlCenterLook.tsx` (props `item, phase, localFrame, phases`). Also exports `MusicPlayerCard`, `ScoreBadge`, `controlCenterCues(phases)` (buzz cue in LOCAL ticks; caller adds the item start), `switchOnAt`, `CONTROL` (beat seconds). Not yet in `components/index.ts` or the context table. No render run. Not wired into any scene or soundtrack yet.
- [x] 3d: `src/gta6/scenes/looks/SafariLook.tsx` (props = shell ctx subset: `item, phase, localFrame, phases, revealFrom`). Draws its own `island` TimerRing in the shell slot, so mount it with `QuestionShell showTimer={false}`. Hold (`holdSec`, 0.5 s) is the spinner; reveal uses `RevealEngine mode="full"`; result card starts at `revealFrom + expandStartSec('full')`. Motion constants are in a local `SAFARI` const. tsc: no errors in `src/gta6/` (same 3 older errors as before). No render or `remotion still` run.
- [x] 4c: `src/gta6/extras/` (`ProfileCard`, `ProfilePair`, `PhotoGridTiles`, `Waveform`, `CounterTick` + `counterValue`, `SliderFill`, `Silhouette` + `SILHOUETTES`, `util.ts`, barrel `index.ts`). Only an alligator silhouette exists (Q20). Not yet in the context table. `ControlCenterLook` still has its own inline waveform and slider; not changed. No render run.

## Next step
Supply the task table (docs/gta6-prompts-split.md) so the remaining task IDs can be added to this checklist. Open points from `docs/gta6-context.md`: 2560x1440 at 60 fps is the repo convention, not 1920x1080.
