# AI voiceover: how to use lines.csv

One row = one audio file. Generate each row on its own and save it under the exact `file` name (intro.mp3, level-1.mp3, clue-1-1.mp3, reveal-1.mp3, bonus-1.mp3, scoreboard-*.mp3, outro.mp3).
- Columns: `id` (save the audio as <id>.mp3), `type`, `text`. `text` is plain, with no emotion tags: set the style (calm for clues, warm for reveals, excited for bonus) in the voice tool. Tagged lines (for a model that supports [audio tags]) come from `npm run search:lines -- --tags`.
- Clue wording is the on-screen text. Never change a clue here; change it in src/search/search-data.ts and run `npm run search:lines`.

Style by type: clue 1 calm and flat, clue 2 curious, clue 3 a little amused; reveals warm (playful on "Of course."); bonus and legend excited; encouraging for beginner and keep going.

Voice setup: one warm American voice, a little under conversational speed (about 0.95 speed), stability medium-high so 90 clues sound the same, style low. Same voice, model and settings for every file. Export mp3, trim silence at both ends (clues must start instantly: typing starts with the clip), normalise to about -14 LUFS.
Clues: calm and flat, like reading someone's phone, no lead-in. Reveals: warm, one beat of silence before, clean end with no tail. Pronunciation: PEEK-ah-choo (Pikachu), moh-AH-nah (Moana), GAH-lum (Gollum), WALL-ee (WALL-E).

Order: pilot rounds 1, 12, 24 first (clues + reveal), check typing and timing in Studio, then the rest, then intro, level cards, bonus, scoreboard, outro. Reminder cards (after rounds 8 and 22) have no voice slot.
The scoreboard plays scoreboard-intro and then all five rank lines back to back (about 20 s). The scoreboard scene is not stretched to that sequence yet; see docs/search-notes/5a.md.
