# Video 4 "Guess the US State from Its Shape" — progress

- [x] 0a Branch us-states from video-03-final, progress + context docs
- [ ] 0b (label to fill from docs/states-prompts-split.md)
- [ ] 0c (label to fill from docs/states-prompts-split.md)
- [ ] 0d (label to fill from docs/states-prompts-split.md)
- [ ] 0e (label to fill from docs/states-prompts-split.md)
- [x] 1a build-states-geo script + src/states/states-geo.json
- [x] 1b src/states/states-data.ts (facts need manual check M1)
- [x] 1c scripts/check-states.js (npm run states:check)
- [x] 1d states-settings.json + types.ts (several values provisional, see _provisional)
- [x] 1e state-timing.ts + voiceover manifest + states:timeline (runtime 11:59, outside 9-11, see reply)
- [x] 2a StateShape + geo.ts (not rendered or viewed)
- [x] 2b TimerRing + EmojiFill (not rendered or viewed)
- [x] 2c MiniMap + FlyIn (not rendered or viewed)
- [x] 2d PixelReveal + CropMask (not rendered or viewed)
- [x] 2e AnswerCard (2D, not rendered or viewed)
- [x] 2f StateStage + ST-Components Still + final docs D (not rendered or viewed)
- [x] 3a StateRound skeleton + stateRoundCues (stage-in, clock, answer hold; TODO slots for 3b hints and 3c reveal; not rendered or viewed)
- [x] 3b tiers (CropMask, rotation, PixelReveal), emoji hint, region hint, answered MiniMap in StateRound (not rendered or viewed)
- [x] 3c reveal, hold, FlyIn, streak banner, FASTEST GUESS badge in StateRound; ST-Round composition in Root.tsx (prop index is 0-based; not rendered or viewed)
- [x] 3d StateHook (silence, ten drops, map snap, question, lockup, rules) + StateTitleLockup + stateHookCues; no composition registered; TIMELINE hook segment still 8 s (not rendered or viewed)
- [x] 3e StateLevelCard (rule demos), StateReminder (subscribe pop-up), StateIris (circle/sweep/curtain + pixel-dissolve for EXPERT), each with cues; not wired into Main, not rendered or viewed
- [x] 4a src/states/bonus-engine.ts (4 seeded puzzle makers), real bonus durations in state-timing.ts, puzzle checks in check-states (not rendered or viewed)
- [x] 4b BonusMissing + BonusBorders (+ shared bonus parts and cues in BonusMissing.tsx; not wired into Main, not rendered or viewed)
- [x] 4c BonusCapital + BonusNickname (shared scene in BonusCapital.tsx) + StateBonus picker and stateBonusCues (not wired into Main, not rendered or viewed)
- [ ] 5a (label to fill from docs/states-prompts-split.md)
- [ ] 5b (label to fill from docs/states-prompts-split.md)
- [ ] 6a (label to fill from docs/states-prompts-split.md)
- [ ] 6b (label to fill from docs/states-prompts-split.md)
- [ ] 6c (label to fill from docs/states-prompts-split.md)
- [ ] 7a (label to fill from docs/states-prompts-split.md)
- [ ] 7b (label to fill from docs/states-prompts-split.md)
- [ ] 8a (label to fill from docs/states-prompts-split.md)
- [ ] 8b (label to fill from docs/states-prompts-split.md)
- [ ] 8c (label to fill from docs/states-prompts-split.md)
- [ ] 9a (label to fill from docs/states-prompts-split.md)
- [ ] 9b (label to fill from docs/states-prompts-split.md)

## Notes

- 0a prompt listed the task IDs but not their labels; fill the one-line labels from docs/states-prompts-split.md when it is next read.
- 3e: tsc reports no errors in src/states; 4 older errors remain elsewhere (src/fontshare/load-fonts.ts x2 missing @remotion/google-fonts modules, src/pixel/pixel-timing.ts:67 and src/timing.ts:45 manifest casts). Not touched.
- 3e: Main.tsx is still the word quiz. Wiring for a later task: levelCard -> StateLevelCard(frame, levelIndex, duration=seg.duration); reminder -> StateReminder; iris -> StateIris, and overlay the next StateRound with frame = local - stateIrisOverlap(seg, next).startsAt, lead = .lead. Cue builders: stateLevelCardCues, stateReminderCues, stateIrisCues(seg); ticks from segment start.
- 4a: bonus segment = root bonus.preRollFrames + buildFrames + clock + root bonus.revealHoldFrames; the clock is the clock of the level the bonus follows (5/7/8/10 s), so bonus lengths are 11.3 / 13.3 / 14.3 / 16.3 s. Total runtime now 12:14 before any voiceover (was 11:59 with 300-tick placeholders), outside the 9-11 min target: if the bonus clock should be shorter, change bonusClockFrames in state-timing.ts. The check script is scripts/check-states.js (not .ts); `npm run states:check` passes 13 checks.
- 4b: shared bonus pieces (BonusStage, BonusBanner, BonusBadge, BonusPrompt, BonusMap, BonusOptions, BonusTimer, BonusEraseChip, bonusTimes, bonusCommonCues) are exported from src/states/scenes/bonus/BonusMissing.tsx for the capital / nickname scenes. Scene props: { frame, puzzle: BonusPuzzle, duration? } with puzzle = BONUS_PUZZLES[seg.index]. Cue builders: bonusMissingCues(puzzle), bonusBordersCues(puzzle), ticks from segment start. Bonus voiceover placement is not part of these cues.
- 4c: scene props { frame, puzzle, duration? }; cue builders bonusCapitalCues, bonusNicknameCues, stateBonusCues(puzzle) (ticks from segment start). Shared: BonusShapeScene, shapeBonusTimes, shapeBonusCues in BonusCapital.tsx. tsc: no errors in src/states (same 4 older errors elsewhere). The code commit could not be pushed: the git proxy said the repo is not in this session's authorized set, so 4c is committed locally only.
