# AI voiceover: how to use lines.csv

One row = one audio file. Generate each row on its own and save it under the exact `file` name (intro.mp3, level-1.mp3, clue-1-1.mp3, reveal-1.mp3, bonus-1.mp3, scoreboard-*.mp3, outro.mp3).
- Columns: `id` (save the audio as <id>.mp3), `type`, `text`. The `text` is exactly what you paste into the AI voice, with the emotion tag in [square brackets] as a direction for the voice only (never on screen). Use a model that supports audio tags (for example ElevenLabs Eleven v3). If your tool reads the tags out loud, strip them (remove every [..] and the space after it).
- Clue wording is the on-screen text. Never change a clue here; change it in src/search/search-data.ts and run `npm run search:lines`.

Tags used: calm (clue 1, level 1), curious (clue 2, level 2), amused (clue 3), warmly (reveals, intro, outro), playfully ("Of course." reveals), excited (bonus, legend, intro end), impressed (expert), encouraging (beginner, keep going), serious (level 3).

Voice setup: one warm American voice, a little under conversational speed (about 0.95 speed), stability medium-high so 90 clues sound the same, style low. Same voice, model and settings for every file. Export mp3, trim silence at both ends (clues must start instantly: typing starts with the clip), normalise to about -14 LUFS.
Clues: calm and flat, like reading someone's phone, no lead-in. Reveals: warm, one beat of silence before, clean end with no tail. Pronunciation: PEEK-ah-choo (Pikachu), moh-AH-nah (Moana), GAH-lum (Gollum), WALL-ee (WALL-E).

Order: pilot rounds 1, 12, 24 first (clues + reveal), check typing and timing in Studio, then the rest, then intro, level cards, bonus, scoreboard, outro. Reminder cards (after rounds 8 and 22) have no voice slot.
The scoreboard plays scoreboard-intro and then all five rank lines back to back (about 20 s). The scoreboard scene is not stretched to that sequence yet; see docs/search-notes/5a.md.
