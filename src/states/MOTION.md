# States video: motion plan (Step 1)

One module, `src/states/motion.ts`: presets `quick` / `normal` / `slow`, `spr()`, `stagger()`, `iosOut()`, `settle()`, `enter()`, `leave()`, `DUR`.
Nothing in `src/anim.ts`, `src/ios/motion.ts`, `style.ts`, `Background.tsx` or `Fx.tsx` changes. No timing changes: every move stays inside its existing window.

Measured (30 ticks/s): peak overshoot quick 0.33%, normal 0.01%, slow 0%; ticks to settle within 0.1%: quick 18, normal 18, slow 30.
`slow` therefore needs a window of about 24+ ticks (it is at 89% after 12 ticks); on shorter windows use `normal`. Step 2 checks each move against its window.

Travel moves with a fixed window (outline draw, map in/out, shape flight) use `sprFit()`: a spring normalised to land exactly at the end of the existing window, so nothing in the timeline moves. `iosOut` starts at full speed, so it is only for fades, wipes and exits.

Rules: entrance = `enter()` (spring translate 10-24 px + fade + scale 0.97 -> 1). Exit = `leave()` over `exitTicks(entrance)` (about 70%), iosOut, no bounce.
Group offsets = `stagger()` (2 ticks by default, clamped to 2-3). Exception: per-letter cascades (title lockup, name reveal) use a 1-tick step because 2 ticks per letter would run past their window.

| Where | Animation | Today | Preset |
|---|---|---|---|
| **Round (StateRound / StateStage)** | | | |
| StateStage | slot fade-in (ring, shape, title, mini map) | cssEaseOut, `LAYOUT.fade` | quick enter |
| StateStage | HUD pill | static | stays static (the wipe draws the same pill, so animating it would pop at the cut) |
| AnswerCard | card settle (`plan.stamp`) | ios `spring` | normal enter |
| AnswerCard | chip, then name, then capital (stagger 2) | prog cssEaseOut 280 ms | quick enter each |
| AnswerCard | voice bars in / out | prog 5 / 6 ticks | quick |
| AnswerCard | exit (`plan.exit`) | prog cssEaseIn | leave(exitTicks) |
| TimerLead | voice label | prog cssEaseOut | quick enter |
| TimerLead | "get ready" ring settle-in | ios `spring` | normal + settle (peak 1.02) |
| TimerRing | ring / number | static (clock linear) | none (clock stays linear) |
| StateRound | outline draw (`drawFrames`) | cssEaseInOut | sprFit normal |
| StateRound | reveal: fill, map in (`revealStart` to `stamp`) | cssEaseInOut | sprFit normal |
| StateRound | corner-map fly-out | cssEaseInOut | sprFit normal |
| StateRound | shape-slot fade at reveal | cssEaseOut | leave |
| StateRound | hint / overlay fade (10 ticks) | cssEaseOut | quick enter |
| StateRound | streak banner | ios `spring` | normal enter |
| StateRound | fastest badge | static | quick enter |
| FlyIn | shape flight along an arc | cssEaseInOut + sin lift | sprFit normal (arc kept) |
| PixelReveal / EmojiFill | fades | cssEaseInOut / cssEaseOut | iosOut |
| MiniMap | accent pulse | sin | slow sine (amplitude cut in Step 4), not a spring |
| VoiceBars | pop-in | static bars | quick |
| **Level card / hook** | | | |
| StateLevelCard | eyebrow, then title, then sub-label (stagger 2) | ios rise | quick, slow, quick |
| StateLevelCard | accent rule | ios spring | normal |
| StateLevelCard | rule demo frame | ios rise | normal enter |
| StateLevelCard | exit (12 ticks) | prog linear | leave |
| StateHook | ten shape drops | ios spring | slow (window 15 ticks: use normal) |
| StateHook | full map fade | prog cssEaseOut | iosOut |
| StateHook | question line in / out | prog + keyframes | normal enter / leave |
| StateTitleLockup | letter cascade, ignite, rule | ios spring | quick per letter (1-tick step), normal for the rule |
| StateHook | rules pill | prog | quick enter |
| StateReminder | pop-up in / out | ios spring / linear | normal enter / leave |
| StateIris | backdrop cross-fade | irisEase | iosOut over the wipe |
| **Scoreboard / end screen** | | | |
| StateScoreboard | kicker, title | ios rise | quick, normal |
| StateScoreboard | map in | ios spring | normal |
| StateScoreboard | rank rows (cadence fixed by the sound cues) | ios spring | quick |
| StateScoreboard | footer | ios rise | quick |
| StateEndScreen | eyebrow, headline, subscribe, next line | ios rise | quick, slow, normal, quick |
| StateEndScreen | slot guides + subscribe ring | ios spring | normal, stagger 4 |
| **Bonus** | | | |
| BonusBanner | eyebrow, "BONUS ROUND", kind label | ios rise | quick, slow, quick |
| BonusBadge / BonusPrompt | badge, prompt | ios rise | quick enter |
| BonusMapBlock | map slide-in | ios rise | normal enter |
| BonusOptions | four chips (cadence 3 ticks) | ios rise | quick, stagger 3 |
| BonusTimer | bar + number in / out | ios spring / prog | quick |
| BonusEraseChip | chip | ios rise | normal enter |
| FlyBack (missing) | state flies back | ios spring | slow (window 22 ticks: check) |
| NameReveal | letter-by-letter | ios rise | quick per letter (cadence 1.4 ticks) |
| AnswerStamp (capital / nickname) | stamp card | ios spring | normal + settle |
| BonusStage | exit (12 ticks) | prog linear | leave |


## Done so far
- Round group (AnswerCard, TimerLead, StateStage slots, StateRound, FlyIn, PixelReveal, EmojiFill): converted.
- HUD pill made smaller (24 ref px) in the stage and the wipe: at 30 px it overlapped the title on MEDIUM / EXPERT. QA check 10 measures it for every level and number.
