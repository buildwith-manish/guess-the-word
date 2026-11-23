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
- [x] 3b  Hook, XMAS-Hook
- [x] 4a  Spotlight, Autocomplete
- [x] 4b  Focus, CleanUp
- [x] 4c  OddOneOut, CountLights, ControlCenter (src/xmas/bonus/; tsc passes, stills rendered and viewed)
- [x] 4d  DoubleFeature, SpeedRound, Finale (src/xmas/bonus/; tsc passes, NOT render-checked: Chromium could not be downloaded in the cloud session)
- [x] 5a  ScoreScene
- [x] 5b  Outro
- [x] 5c  Part1-3, sfxCues, XMAS-P1..P3 (src/xmas/parts/, src/xmas/sfxCues.ts; tsc passes, boundary stills rendered)
- [x] 5d  XMAS-Full (src/xmas/Full.tsx, Root.tsx), scripts/xmas_chapters.ts -> docs/xmas/chapters.txt (tsc passes, not render-checked)
- [ ] 6a
- [ ] 6b  xmas_voice_fit.ts
- [x] 6c  master_xmas_voice.py, Audio.tsx, music-license.md (tsc passes; audio-only test render of frames 300-640 ok; NOT listened to; no music track chosen yet, MUSIC_FILE = null)
- [ ] 7a
- [ ] 7b

## Notes for next task
- Missing from the branch: `docs/xmas/reference/lg_q3.png`.
- Inter woff2 files are now in public/fonts/ios/ and loaded by `useXmasFonts()` (src/xmas/shared/fonts.ts); every scene calls it at the top.
- src/xmas/shared/clock.ts holds WIDTH/HEIGHT/RENDER_FPS/FPS/TIME_SCALE; src/xmas/timing.ts (1c) should re-export them rather than redefine (check for a duplicate when 2b starts).

- [x] 1c  timing.ts (+ timings.generated.ts stub) and scripts/xmas_runtime.ts; `npx tsx scripts/xmas_runtime.ts` prints the report

## Task 5c notes
- Parts: `src/xmas/parts/PartScenes.tsx` (one Sequence per timing.ts segment, offset = segment.from - part.from; bonus vs movie by `slot.kind`), `Part1/2/3.tsx` (`part1Frames` etc.), registered in Root.tsx as `XMAS-P1..P3` (xmas Part imports are aliased because the gta6 Part1..3 names are already imported there).
- `src/xmas/sfxCues.ts`: `part1Cues`, `part2Cues`, `part3Cues`, `partCues(part)`. Unit = design ticks LOCAL to the part (render frame = tick * 2). Includes the round-specific sounds (spotlight, oddOneOut, countLights, doubleFeature, speedRound, finale) that BonusScene does not play. Voice lines are not in these lists.
- Not wired (no cue export in the round files): Focus (`focus-lock`), Autocomplete, Clean Up (`clean-sparkle`).
- Part lengths (frames at 60 fps): P1 14880 (0:00-4:08), P2 15000 (4:08-8:18), P3 10260 (8:18-11:09). Total 11:09 is under timing.ts `targetSec` (12:00 +-30 s) until voice clips are measured.
- Boundaries: hook ends tick 180 (6.00 s), slot 5 starts 0:54, slot 20/21 at 4:08 (248 s), slot 40/41 at 8:18 (498 s), score 624 s, outro 644 s.

- [x] 8d  LightString polish (bloom on lit bulbs, wire sway from the frame, wider counter tracking, bolder number). tsc passes; NOT render-checked (no Chromium in the cloud session). Sway uses the local Sequence frame, so its phase restarts at each slot cut.
- [x] 8c  TimerToPill (soft ease fill, front-segment glow, iOS-spring morph, 8-tick title fade-up) + MovieReveal (ambient depth vignette). tsc passes; NOT render-checked (no Chromium). Check frame 718 of XMAS-Movie slot 2 (end of morph).
- [x] 8e  MovieScene/BonusScene polish: ENTRANCE caption (tick 4) and timer (tick 7), bokeh parallax, Snow.tsx, FrameShimmer.tsx, caption star. tsc passes; stills XMAS-Movie slot 2 tick 40 (frame 80) and XMAS-Bonus 1 tick 60 (frame 120) rendered. Timer entrance is done in MovieScene by drawing MovieReveal twice during the first 21 ticks (timer band enters late); MovieReveal/TimerToPill are not edited.

- [x] 8f  premium pass integration (8b-8e). Pulled clean; `npx tsc --noEmit` passes; `npx tsx scripts/xmas_runtime.ts` total 12:58 (778.8 s, 46728 frames), identical to the pre-8a commit 43da84f.
  - Backdrop-filter budget (static count, not measured in a browser): a movie frame had 4 layers (2 tiles + timer capsule in TimerToPill + caption pill in MovieScene), and MovieScene draws MovieReveal twice in the first 21 ticks. Fixed by `withoutBackdrop()` (exported from TimerToPill.tsx) on the timer pill, the caption pill, the bonus banner (BonusScene) and the bonus reveal pill (BonusReveal). A movie frame is now 2 blurred layers (the two tiles); the doubled TimerToPill during the entrance adds none.
  - NOT verified: no Chromium here, so no stills (movie enter / mid-timer / reveal, one bonus slot) and no layer count in a browser. A bonus slot should have the bonus GlassTile (1 blur) plus any round that uses `bonusTileGlass()` directly (OddOneOut, Finale, PlaceholderRound from task 4c) which still carry backdrop-filter; left alone because they are not 8b-8e files. Check OddOneOut and Finale first.
  - Flattened pills now sit on the dark background without blur; eyeball that they still read as glass.

- [x] grade  scripts/xmas_grade.ts: `npx tsx scripts/xmas_grade.ts [in] [out]` (default XMAS-Full.mp4 -> graded.mp4); `SECONDS=20 [START=s]` for a test slice, `DRY_RUN=1` prints the command. Values as given: contrast 1.05, saturation 1.08, gamma 0.98, vignette PI/9, CRF 14 slow, BT.709 tags, audio copied. Tested only on a synthetic clip (output h264 yuv420p, bt709 tags, aac kept); NOT looked at on the real render (vignette vs light string / counter, banding in dark gradients unchecked).

- [x] music  original bed, no tune: `npx tsx scripts/export_xmas_music_map.ts` (timing -> docs/xmas/music-map.json) then `python3 scripts/make_xmas_music.py` (needs numpy pedalboard pyloudnorm) -> public/xmas/music/bed.mp3 (799 s, 48 kHz stereo mp3, 11 MB, -26.0 LUFS and peak -15.2 dBFS measured with ffmpeg ebur128). Warm detuned pad (C/F, F/Am, Am/C per part), 142 pentatonic bells (>= 3.8 s apart, log in docs/xmas/music-notes.txt), faint sleigh jingles, brighter gold layer in the 10 bonus windows. Licence text filled (original work), `MUSIC_FILE = 'xmas/music/bed.mp3'`, duck script run, tsc passes. NOT listened to: check that no bell sequence sounds like a carol, balance bells vs pad, the gold windows, and that the mp3 loop/fade at the end is fine. Re-run both scripts after any timing change.
