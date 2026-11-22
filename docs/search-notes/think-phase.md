# Think phase: all clues first, then a 5 s countdown (done, nothing rendered)

Settings (search-settings.json): `think` = { seconds: 5, beatTicks: 6, firstClueTicks: 8, fallbackClueSeconds: 8 }. Removed: levels[].time, hintAt, voiceClue.thinkSeconds.

RoundPlan (search-timing.ts): clockFrames is gone. New: thinkStart, thinkFrames (150 ticks). clockStart now only means "search bar is up" (titleInFrames). hintAt = thinkStart. revealAt = thinkStart + thinkFrames. Level time is not used anywhere in the search timing.
- Voiced layout (all 4 clips in the manifest): first clue at clockStart + firstClueTicks; clues as before; thinkStart = last clip end + beatTicks (6).
- Fixed layout (no clips): the clues use the first 8 s after clockStart (searchAt fractions of it), thinkStart = end of that part. Why 8: 7 s made R26 clue 2 (51 chars) miss its slot at the fastest typing speed (46 ticks); 8 s fits everything (slowest clue uses 100% of its slot, so one more long clue will trip the QA). Round 1 plan (ticks): bar up 15, clues at 25/77/130/183, think starts 255 (8.5 s), reveal 405 (13.5 s), round ends 494 (16.5 s). Compared with the old level times that is about 6 s longer per EASY round, 5 s MEDIUM, 4 s HARD (old total length not measured).
- Last slot still ends LAST_SLOT_MARGIN (6 ticks) before the REVEAL (as before, so the last clue's hold and slide may run into the first moments of the countdown); QA additionally requires every clue to finish typing before thinkStart.

Scenes: SearchRound timer is not drawn before thinkStart and slides in on the same spring and distance as the bar; tension vignette builds over the think phase; hint at thinkStart (HintClue's own stagger is 0.12 s = about 4 ticks, not 6; not changed). Cues: ticks every second of the think phase (tick-low on the last), riser lower bound = thinkStart; no new sounds. SHComponents and stills updated (stills: midclue, thinkstart, think2s, reveal).
Texts: level card now "N characters · 5 seconds to answer" (from think.seconds). docs/search-voiceover-script.md: only the three level lines changed (if you already recorded level-1..3 clips with "seven/eight/nine seconds", re-record them). Reminder, hook, end screen had no seconds text.

QA: scripts/search-qa.js bundles a fixture manifest (3.3 s clues, 2.5 s reveals) in memory only; 2 new checks (fixed and voiced layout): think = 5 s +/-1, reveal = thinkStart + think, thinkStart >= last clip end, last clue typed before thinkStart, typing >= fastest and inside its slot, hint inside the think window, segments back to back and summing to totalFrames. 13/13 pass. Video length: 10:07 without clips, 14:58 with 3.3 s clips.
search:check: 9/10, failing on data that already failed before this change: R3 Mickey Mouse clues 2 and 4 contain "mouse" (not touched).
tsc: only the 4 old errors (src/fontshare/load-fonts.ts 18, 19; src/pixel/pixel-timing.ts 67; src/timing.ts 45).
Not verified: anything on screen or by ear.
