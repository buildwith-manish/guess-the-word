# Centered search, answer only at reveal, voice-paced typing (done, nothing rendered)

## What changed
- Layout (`SearchStage.SLOTS`): search bar and recent list are in the middle; hint pair under them; timer at the bottom, same width as the bar. The answer slot is the whole middle.
- Answer: nothing of it is drawn during the question phase (the early glowing outline is off too). At the reveal the search, list, hint and timer fade out (0.25 s, `DIM_SECONDS` in SearchRound).
- Answer picture (reveal is the picture ALONE): with a picture for the round, the question side, HUD pill and progress dots all fade out and `AnswerPicture` shows only the picture, as large as the slot allows (3:2, about 1630 x 1090 px at 2560x1440), over a soft accent spotlight. No card, no frame. Set `reveal.showName` to true in `search-settings.json` to put the name under it (default false). A round with no picture falls back to the text answer card. Pictures: one per round in `public/search/answers/` named `answer-NN.png` (NN = round id, two digits; .jpg .jpeg .webp work), then `npm run search:answers`. Pictures are 3:2 landscape (`ASPECT` in AnswerPicture, `PICTURE_ASPECT` in SearchRound). Use 2400x1600 PNGs (1800x1200 at least) with a transparent background: the picture is shown about 1630 x 1090 px at 2560x1440. No pictures are included: they are characters, so you supply them.
- Recent list: shows the last `recent.visible` finished searches (settings, default 2; set 1 for one). Older rows fade out. `SearchBar` has an optional `recentCount`; the hook scene does not pass it and is unchanged.
- Typing (`src/search/typing.ts`): uneven human rhythm (seeded jitter, pause at word starts, longer after punctuation). Total time per search is unchanged. Each character fades up, the newest glows, the caret blinks softly, and the bar glows when a search starts. Key-click cues use the same character times.

## Voice-paced clues
Add `clue` clips to `src/search/search-voiceover-manifest.json`, four per round (clue 1 hardest ... clue 4 easiest), files in `public/voiceover/`:
`"clue": { "1": [ {"file":"r01-c1.mp3","seconds":3.1}, {...}, {...}, {...} ] }`
- Only when all four exist for a round does the voice set the pace. Typing starts with the clip and spreads over `voiceClue.typeShare` (0.88) of it. The next clue starts after the previous one has landed in the list, plus `voiceClue.pauseTicks`. The clock (timer) ends `voiceClue.thinkSeconds` after the last clip, never shorter than the level time.
- Rounds without all four clips keep the old fixed timing.
- Effect on length: with 3 s clips a round is about 17 s (test), against about 7 s now. 30 rounds would add roughly 5 minutes. Levers: `voiceClue.thinkSeconds`, `pauseTicks`, shorter clues.
- The clip plays at the tick the search starts typing (`search-sound.ts`). Trim silence at the start of a clip.

## Verified (scripts)
- search:check 9/10 (only the old round 3 "mouse" clue failure), search:qa 11/11, timeline unchanged at 13700 ticks without clips.
- Throwaway test with fake 3 s clips: each clue fits its slot, typing ends before the clip, rhythm is monotonic. Real manifest restored.
- tsc: 4 old errors, none in src/search.

## Not verified
- Nothing was rendered. Check in Studio (SH-Round): bar and list centered and not colliding with the hint pair; the reveal card with and without a picture; typing look; 1 vs 2 recent rows; 30-char dots strip.
- Voice sync was only tested with made-up clip lengths, not real audio.
- `HintClue`'s own fade at reveal still applies on top of the new fade-out.
