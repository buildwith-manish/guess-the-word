# Revert: 50 rounds / 5 bonus -> 30 rounds / 3 bonus (done)

Requested: back to the earlier 30-round version, remove the 20 extra rounds and the 2 extra bonus puzzles.

What changed
- `src/search/search-data.ts`: 30 rounds in the ORIGINAL order, ids 1-30 (EASY 1-10, MEDIUM 11-20, HARD 21-30). Later clue trims (8c) are kept. Bonus: after rounds 10, 20, 30 only (Po and Olaf removed). The 50-round pacing swaps (Sonic/McQueen, Scooby-Doo opening HARD) are undone.
- `src/search/search-settings.json`: bonus.after [10,20,30]; reminder.after [8,22]; ranks LEGEND 27, EXPERT 21, GOOD 15, BEGINNER 9, KEEP GOING 0. Typing (incl. fastestTicksPerChar) untouched.
- Hint images: `public/search/hints` holds 60 files (30 rounds x 2), renumbered to the new ids; `src/search/hint-images.json` lists rounds 1-30. 40 files of removed rounds deleted.
- `scripts/check-search.js` expects 30 / 10-10-10 / 3 bonus. `scripts/search-hints-qa.js` checks 30 rounds.
- `scripts/search-hints-cut.py`: added POS_TO_ID (sheet position 1-50 -> round id, removed rounds skipped); HOLE_CELLS renamed (donut hint-19-1, gold ring hint-21-1, microphone override dropped with Kermit).
- `docs/search-context.md` C.2 values updated.

Verified (scripts, nothing rendered)
- search:check 9/10: only the old round 3 "mouse" clue failure (clues 2 and 4), still undecided.
- search:qa 11/11. Runtime 13700 ticks = 27400 frames at 60 fps (about 7:36).
- search:hints 30/30, 0 failing files.
- tsc: 4 old errors, none in src/search (src/fontshare/load-fonts.ts 18, 19; src/pixel/pixel-timing.ts 67; src/timing.ts 45).

Not verified: nothing was viewed in Remotion Studio. Check that the 30 progress dots and scoreboard strip look right, and that each hint image matches its round (they were renamed by script, not viewed).
Older notes (1e-expand-50, pacing-50, 8a) describe the 50-round state and are now history.
