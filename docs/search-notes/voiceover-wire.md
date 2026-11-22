# Voiceover wired in (clips.7z, 167 clips)

Status: wired, compiles, `npm run search:qa` 16/16, `npm run search:check` 10/10. NOT heard or seen in Studio (the sandbox cannot render or play audio).

## What was done
- Extracted `clips.7z` into `public/voiceover/search/` (167 WAV, 44.1 kHz mono, ~36 MB). A sub-folder on purpose: the quiz scanner (`npm run voiceover`) matches `public/voiceover/intro.*`, `outro.*` etc. and would otherwise mistake the search intro and outro for its own. `clips.7z` itself is still in the repo root (23 MB), untouched.
- `scripts/search-voiceover-scan.js` (`npm run search:voice`, new): measures every clip (WAV header) and rewrites `src/search/search-voiceover-manifest.json`. Re-run it whenever a clip changes. Prints coverage: 30/30 rounds with 3 clues, 30 hints, 30 reveals, 3 level cards, 3 bonus answers, 3 bonus intros, 6 scoreboard lines, intro, outro.
- Manifest paths are relative to `public/voiceover` (`search/clue-1-1.wav`); `SearchSoundtrack.tsx` plays `staticFile(voiceover/<file>)`.
- `src/search/search-timing.ts`: manifest type + accessors `voiceHint(roundId)` and `voiceBonusIntro(n)`; the scoreboard scene is now stretched to the whole sequence of lines (see below).
- `src/search/search-sound.ts`: plays the hint clip when the hint appears (`hintAt` + voiceover.offsetFrames) and the bonus intro at the start of each bonus scene.
- `scripts/search-qa.js`: 3 new checks (hint clip ends before the riser inside the think window; bonus intro ends before the bonus clock; every voice clip starts and ends inside its own scene).

## File name -> manifest key
intro, outro | level-N -> level[N] | clue-R-K -> clue[R][K-1] | hint-V-rR -> hint[R] (V = phrasing 1-6, not used) | reveal-R | bonus-N -> bonus[N] (answer) | bonus-N-intro -> bonusIntro[N] | scoreboard-intro/legend/expert/good/beginner/keepgoing.

## Effects on timing (all automatic from the clip lengths)
- Clues: each clue starts typing with its clip and types over 88% of it; the countdown starts after the last clip; reveal = think start + 5 s (unchanged).
- Hook 9.45 s, level cards 5.2-6.4 s, reveals up to 4 s (hold stretched), outro 7.3 s: scenes are stretched to fit.
- Total video with these clips: 11:58 (21545 ticks).
- Scoreboard: it reads the intro, then Legend, Expert, Good, Beginner, Keep going, back to back (about 19 s) after the rows land. The scene used to stretch only to the longest single clip, so the later lines ran into the end screen or past the video end. It now lasts until the last line ends: about 26 s. `search-timing.ts` mirrors four constants from `scenes/searchScoreboardCues.ts` (it cannot import them: circular); the QA check "every clip starts and ends inside its own scene" fails if they drift.

## Check by ear / eye in Studio
- Round 1, 12 and 24: typing keeps pace with each clue clip; hint clip lands with the hint pop; reveal clip after the reveal.
- A bonus: does the intro line (4-5 s, from the first tick) sit well over the intro slam and the three typed searches? It ends before the clock starts.
- Voice level against the music (settings.voiceover.volume 1, duckFloor 0.3).
- The 26 s scoreboard: the screen holds still while the five rank lines are read. If that is too long, options: only read the line of the rank reached (needs the score), highlight each row as its line plays, or speed those clips up.
- The 6 hint phrasings cycle across rounds (clip hint-1-r1, hint-2-r2, ...): confirm each one matches what the hint shows.

## Not done / notes
- `docs/search-voiceover/lines.csv` and `ai-script.md` do not list the hint and bonus-intro lines (their text is not in the repo); add them so the set can be regenerated. Clue and reveal text in the clips was not checked against the script (no audio transcription here).
- If a clip is missing from the folder, the manifest simply omits it and the video falls back to fixed timing for that part.
- Locally there is a backup branch `backup-my-30rounds` from an earlier attempt to cut to 30 rounds; it is not needed (upstream was already at 30 rounds) and was never pushed.
