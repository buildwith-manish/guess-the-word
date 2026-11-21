# Expansion: 30 rounds -> 50 rounds, 3 -> 5 bonus puzzles

Status: done. Checker passes except the old round 3 "mouse" failure (2 clues, undecided). tsc: no errors in src/search. Nothing rendered.

Changed: src/search/search-data.ts, src/search/search-settings.json (bonus.after, ranks), scripts/check-search.js (expected counts), docs/search-context.md (C.2 values).

Levels are now EASY 16, MEDIUM 17, HARD 17. Level order must stay contiguous, so the 20 new rounds were added at the END of each level and ids were renumbered:
- old 1-10 stay 1-10; new EASY 11-16
- old 11-20 are now 17-26 (MEDIUM); new MEDIUM 27-33
- old 21-30 are now 34-43 (HARD); new HARD 44-50
Any voiceover keyed by old round ids would need re-keying (manifest is still empty).

New rounds: Superman, Stitch, The Grinch, Cookie Monster, Bluey, Minion | Hulk, Groot, Jack Sparrow, Toothless, Optimus Prime, Rapunzel, Kermit the Frog | Wile E. Coyote, Mike Wazowski, Gandalf, Charlie Brown, Kirby, Indiana Jones, Ash Ketchum.
New bonus: after 40 = Po (Kung Fu Panda), after 50 = Olaf (Frozen). New bonus correctIndex are 1 and 2; the first three are still 0.

Ranks rescaled to the same percentages out of 55: LEGEND 45, EXPERT 35, GOOD 25, BEGINNER 15, KEEP GOING 0. Reminders unchanged (after rounds 8 and 22).

Runtime is now 12:23 (was 7:10). Levers: levels[].time in search-settings.json (7/8/9 s), reveal.minHoldSeconds, bonus.clockSeconds, or fewer rounds.
