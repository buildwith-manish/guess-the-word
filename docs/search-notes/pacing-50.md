# Pacing pass for 50 rounds / 5 bonus (done)

The 20 extra rounds and 2 extra bonus puzzles were already in search-data.ts (commit f9e8cb4: 16 EASY, 17 MEDIUM, 17 HARD; bonus after 10/20/30/40/50). This pass only reorders inside each level and renumbers ids (voiceover manifest is empty, so nothing is keyed to the old ids).

Order changes (all inside a level):
- MEDIUM: Sonic 24 -> 22 and Lightning McQueen 22 -> 24 (Buzz at 20 and McQueen were 2 apart); Groot moved from 28 to 31 (Hulk at 27 and Groot were back to back); Jack Sparrow, Toothless, Optimus Prime shift up one place each.
- HARD: Scooby-Doo now opens the level (34) so the jump in difficulty starts with a sure win; Gollum, WALL-E, Yoda follow at 35-37.
- EASY unchanged. Finale stays Ash Ketchum (50), Indiana Jones 49.
- settings: reminder.after is now [8, 22, 36] (was [8, 22]); roughly even spacing over the longer video. Ranks were already scaled to 50 (45/35/25/15/0).
- scripts/search-qa.js: no longer hard-codes 30 rounds or bonus 10/20/30 (reads settings and data); new check: the same franchise never repeats within 4 rounds. 9/9 pass.

Not verified (nothing rendered): 50 progress dots and 50 scoreboard dots in the strip width; chapter times: Hook 0:00, L1 0:08, B1 1:59, L2 3:27, B2 4:17, B3 6:40, L3 7:39, B4 9:12, B5 11:44, Scoreboard 12:08 (about 12:30 total).
tsc: 4 old errors, none in my files (src/fontshare/load-fonts.ts 18, 19; src/pixel/pixel-timing.ts 67; src/timing.ts 45).
