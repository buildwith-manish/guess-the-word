# Don't Say The Same As Me video: split prompts (35 small chats)

How to use: new Claude chat -> paste the **Starter** (fill in the task ID and a NEW token) -> paste that task's block. One task per chat, in order within a group. The last section says which tasks can run at the same time.

Token: fine-grained PAT, only `guess-the-word`, Contents read/write, 1-day expiry. Revoke after each session. Never reuse a token that was pasted in a chat. **The token you pasted in our last chat is exposed: revoke it now. I do not need a token to write this file — I worked from the public repo URL only.**

## Before task 1a: do this yourself, in git, not in a chat

```bash
git fetch && git checkout gta6-quiz && git pull
git tag gta6-base-1123          # a fixed point, so GTA 6 work cannot move under this video
git checkout -b dontsay-quiz
mkdir -p docs/dontsay
# copy these into docs/dontsay/: rounds.json, poll.json, and the script text as script.md
git add docs/dontsay && git commit -m "DontSay quiz: data files" && git push -u origin dontsay-quiz
```

Why `gta6-quiz` and not `main` as the base: it already has the iOS layer (`src/ios`), clip-driven timing, the audio map, the ducking script, the SFX generator and the QA scripts. Nothing from GTA 6 gets edited: task 2a copies what is needed into `src/dontsay/` once, and nothing in `src/dontsay/` imports from `src/gta6/` or `src/nfl/`.

About "pedalboard": there is no branch by that name. The `pedalboard` Python audio library is already used in `scripts/make_gta6_sfx.py`, so these prompts use it for the voice and SFX chains (task 5c).

`rounds.json` is parsed from your script and checked: 45 rounds in 5 levels of 9, 5 bonus rounds (one after each level, so after rounds 9, 18, 27, 36, 45), heavy-rule rounds tagged, collision tag on every round, the heart check-in between rounds 23 and 24, 5 bonus mechanics with their own pass condition. `poll.json` lists the rounds whose collision tag is most uncertain (see decision 9). `meta.sourceName` is null on purpose, and QA fails until you set it to the site you actually checked.

## iOS premium polish notes (what makes this video feel like the other four)

This video reuses the iOS layer the other four videos share, and adds five new iOS metaphors that map to its mechanics:

| Video element | iOS metaphor | Component |
|---|---|---|
| Sealed answer | iMessage invisible-ink: shimmering ink particles covering the answer, dissolving in one slow left-to-right sweep | `InkBubble.tsx` |
| Hearts | A small static pill with three hearts in the top-left; spring-in only at level start, NEVER decrements (viewer tracks their own) | `HeartsPill.tsx` |
| Listening state | Siri multicolor glow + live waveform around the main card | `ListeningGlow.tsx` |
| Countdown | Dynamic Island-style pill that turns red under 2 s with `EdgeGlow` | `CountdownNumber.tsx` |
| Rules | Settings sheet at each level start: toggle rows flipping off, crossed-out colour swatches, crossed-out icon chips | `SettingsSheet.tsx`, `ExclusionChips.tsx` |
| Bonus | Warm gold-tinted glass + a BONUS pill (Wallet-pass style) | `BonusWrapper.tsx` |
| Mind Reader bonus | iOS keyboard prediction strip | `BonusMindReader.tsx` |
| Triple Lock bonus | Three stacked home-screen widgets | `BonusTripleLock.tsx` |
| Chain Reaction bonus | Shortcuts app: last letter of each word lights up and links to the next | `BonusChainReaction.tsx` |
| Opposite Day bonus | Appearance toggle / Smart Invert: wallpaper briefly inverts | `BonusOppositeDay.tsx` |
| Voice Only bonus | VoiceOver: screen fades out, only the mic glow + a small "Listen" label | `BonusVoiceOnly.tsx` |
| Round 45 callback | Home Screen edit mode: the four earlier fruit cards float into the banned box | `Round45Callback.tsx` |
| Rank card | A single Wallet-pass card with all five ranks, holds 6 s, screenshot-ready | `RankCard.tsx` |
| Level card | App-launch transition: spring zoom from a home-screen icon | `LevelCard.tsx` |
| Hook | Lock-screen notification "My answer is locked." sliding in over a blurred card | `Hook.tsx` |

Glass spec (one place, in `system.ts`): `backdrop-filter: blur(40px) saturate(180%)`, bright top rim, 0.5 px light border, glass tinted toward the wallpaper colour, two or three soft shadows. Spring presets: damping 14-20, stiffness 120-180, slight overshoot, settling ~0.4 s. Stagger arrivals by 3-6 frames; stagger exclusion chips by 4 frames each so the eye reads them in order. 2-3 % film grain over gradients. Inter ExtraBold tight tracking for headlines, Nunito ExtraBold tabular numbers for timer and counter. System colours only: blue `#007AFF`, red `#FF3B30`, green `#34C759`; red reserved for collisions and the last 2 s of the timer.

## Decisions already made in these prompts (these are the review fixes, baked in)

1. **Hearts are honour-system and viewer-only. The video never animates a heart being lost.** The video shows three fresh hearts in a small pill at the start of every level as a static reference; it NEVER decrements them, NEVER jiggles a heart, NEVER shows a "Delete Heart?" alert, NEVER pops a heart out. Viewers track their own lives. The collision result is shown as a small red "Same answer" chip on the InkBubble plus the rotating voice line; the safe result is a small green "Different? Safe" pulse on the InkBubble. The hearts pill only ever moves at level start (a spring-in of three hearts). This is the user's explicit decision: hearts exist so viewers understand the stakes, not so the video plays them.
2. **The wallpaper shifts with LEVEL, not with hearts left.** Cool blue L1, blue-violet L2, violet L3, warm amber L4, red-orange L5. The original "shifts with hearts left" idea is dropped, because the video cannot know hearts left.
3. **The sealed, locked ink bubble is on screen from frame 1 of every round, small, in a corner.** It enlarges and slides to centre for the reveal at the 1.5 s mark. The lock click plays once at round start (audible proof the answer was fixed before the round) and a second softer click at reveal. This fixes the timing-table gap where the sealed bubble only appeared after the viewer had answered.
4. **Hook reads:** "My answer is locked. Say yours before the timer ends. Say the same as me and you lose a heart. Three hearts every level. Fifty rounds. Let's go." (~8 s). The "every level" clause fixes the over-promise where "Three hearts. Fifty rounds." sounded like three hearts for the whole video.
5. **Level intros are consistent on hearts.** Every level intro mentions the reset: L1 "Level one. Warm-up. Three fresh hearts."; L2 "Level two. Hearts reset. Some answers are banned."; L3 "Level three. Hearts reset. New filters."; L4 "Level four. Hearts reset. Three seconds."; L5 "Final level. Hearts reset. Two rules at once." (L2-L5 originally omitted the reset line.)
6. **Rule breaks count as a match.** Stated once at the Level 2 intro ("Break a rule and it counts as a match.") and reinforced by a tiny on-screen chip on every heavy-rule round ("RULE BREAK = MATCH"). This closes the loophole where ignoring the rules was safe.
7. **Bonus pass conditions are explicit on screen.** Mind Reader: "Match me = 1 point" (deliberately a gimme after L1). Triple Lock: "Differ from all three = 1 point". Chain Reaction: "Differ from me = 1 point" plus the on-screen line "Tiger is mine — you can't reuse it" (Tiger appears in the chain Cat → Tiger → Rabbit → ?, so the viewer cannot answer Tiger). Opposite Day: "Differ from me = 1 point". Voice Only: "Differ from me = 1 point". Only Mind Reader rewards a match; the other four reward a difference.
8. **Triple Lock answers are Cow, Pig, Chicken (Chicken replaces Sheep).** Chicken is the obvious farm animal that was missing, so viewers who avoid the three sealed answers but say Chicken now collide. This makes the round a real test instead of a free point.
9. **Round 41 (Name a number from 1 to 100, answer 37) is tagged High, not Medium.** 37 is the most commonly picked number from 1 to 100, so it is a likely collision. Source: a frequently cited number-preference result; verify in the poll.
10. **Collision tag audit.** Across 45 rounds the script has 15 High, 25 Medium, 5 Low. At High ≈ 50 %, Medium ≈ 25 %, Low ≈ 8 %, that is about 3 collisions per level, closer to 1-in-3 than the 1-in-4 target. The Community poll should cover rounds 1, 5, 6, 14, 25, 28, 30, 33, 36, 41, 42, 43, 45 before recording; if the rate runs hot, drop the most common alternative or tighten the rule on the worst offender.
11. **Region and culture.** The defaults are Western (Liam, Olivia, Toyota, tennis, "football or soccer", Batman). Rounds 6 (sport), 25 (ball sport), 28 (boy's name), 33 (car brand) and 36 (girl's name) are added to the poll list. If many viewers are in India or South Asia, cricket would beat basketball in R25 and probably take R6 as well; Indian names would also change R28 and R36. Tag these five as "region-sensitive" in `rounds.json` so they can be swapped without touching scene code.
12. **Round 38 ("Not fish, not whale") adds a clarification chip:** "Not shark, not clownfish either." This pre-empts the obvious "shark is not a fish" and "clownfish is a fish" arguments in the comments.
13. **Round 45 callback uses Banana, Orange, Kiwi, Grapes** (the video's own answers from R1, R10, R19 and R37). Those four cards float into the banned box during the 4.2 s intro. Apple is dropped because the video never answered it. Hold the sealed bubble one extra second, then go straight into Voice Only.
14. **Heart check-in (between R23 and R24, 2 s) is voice-only.** "Check your hearts. On your last one? Careful." The hearts pill stays static; it does NOT enlarge or animate (the original "hearts on screen enlarge briefly" is dropped, because enlarging implies the video knows the count).
15. **Voice Only keeps a faint caption** of the category that fades in about 1 s after the voice line ends, for muted viewers. Subtle at phone size — verify in the layout check.
16. **Score = rounds where the viewer's answer differed from the video's, plus bonus points. Out of 50.** Out-of-hearts changes nothing (the video does not track hearts). Hearts are tension only. This is now consistent with decision 1.
17. **Mind Reader is a deliberate easy win after Level 1.** Confirm in the poll if you want to keep it as a gimme; the prompts build it as a gimme unless you change task 4b.

| ID | Work | Output |
|---|---|---|
| 1a | repo recon + context file | docs/dontsay-context.md |
| 1b | data.ts + validation script | src/dontsay/data.ts |
| 1c | timing.ts + runtime report | src/dontsay/timing.ts |
| 1d | sfx for rounds and bonuses (pedalboard) | public/dontsay/sfx |
| 2a | copy shared parts + system | src/dontsay/shared |
| 2b | InkBubble (invisible-ink sealed answer) | components |
| 2c | HeartsPill (static) + ListeningGlow + waveform | components |
| 2d | CountdownNumber (island pill) + ResultBeat | components |
| 2e | ExclusionChips + SettingsSheet | components |
| 2f | BonusWrapper (gold glass + BONUS pill) | components |
| 2g | RevealEngine (ink dissolve sweep) | components |
| 3a | RoundScene | scenes |
| 3b | Hook + lock notification | scenes |
| 3c | Round 45 callback staging | scenes |
| 4a | LevelCard + SettingsCard + HeartCheckIn | scenes |
| 4b | Bonus 1: MindReader | scenes |
| 4c | Bonus 2: TripleLock | scenes |
| 4d | Bonus 3: ChainReaction | scenes |
| 4e | Bonus 4: OppositeDay | scenes |
| 4f | Bonus 5: VoiceOnly | scenes |
| 4g | RankCard + Scoreboard | scenes |
| 4h | Outro + end screen, Part 6 | parts |
| 4i | Part 1 (hook + L1 + Bonus 1) | parts |
| 4j | Part 2 (L2 + Bonus 2) | parts |
| 4k | Part 3 (L3 + check-in + Bonus 3) | parts |
| 4l | Part 4 (L4 + Bonus 4) | parts |
| 4m | Part 5 (L5 + callback + Bonus 5) | parts |
| 4n | Part 6 (rank + scoreboard + outro) | parts |
| 4o | Full composition + chapters | Root.tsx |
| 5a | audio pipeline: lines, clean, timings, map | scripts |
| 5b | voice-line-fit report | docs |
| 5c | pedalboard voice chain + mix | Audio |
| 6a | thumbnails + metadata | stills, md |
| 6b | Shorts (3 vertical cuts) | compositions |
| 6c | render, README, QA | scripts |

---

## Starter (paste first in every chat)

~~~text
Don't Say The Same As Me video (45 rounds, 5 bonus rounds, iOS glass + invisible-ink look), Remotion.
Repo: https://github.com/buildwith-manish/guess-the-word
Branch: dontsay-quiz
Token (revoked after this session): <PASTE NEW PAT>
Task: <ID> ONLY, from docs/dontsay-prompts-split.md (the block is pasted below).

Rules:
1. Clone with the token, then set the remote back to the plain URL (no token in git config).
2. Read ONLY: docs/dontsay-context.md (if it exists), docs/dontsay-progress.md (if it exists), the files my task names. Do not read anything else "for context".
3. Build only this task. Do not start the next one. Never edit src/gta6/, src/nfl/ or any file from an earlier video. Nothing in src/dontsay/ imports from src/gta6/ or src/nfl/. Imports allowed: src/dontsay/, src/ios/, node_modules.
4. Frame size: 2560x1440 at 60 fps, 1280x720 reference units rendered through px(). Write sizes and safe margins in reference units. Never use 1920x1080.
5. Mobile-first: prompt and answer text stays in the centre 80% of the frame, large enough for a phone at arm's length. Every prompt is shown as text as well as spoken.
6. No hard-coded prompt, answer, rule, round number, points, date or duration in a scene: everything comes from src/dontsay/data.ts and src/dontsay/timing.ts.
7. Hearts are honour-system and viewer-only. The video NEVER animates a heart being lost: no jiggle, no "Delete Heart?" alert, no heart popping out. The hearts pill is static and only spring-ins at level start. The wallpaper shifts with LEVEL, not with hearts left.
8. The sealed ink bubble is on screen from frame 1 of every round (small, corner); it enlarges to centre for the reveal.
9. No Apple logos, no real app icons, no SF Pro, no SF Symbols, no copyrighted music, no Apple system sounds. Inter + Nunito (SIL OFL). Our own drawn hearts, mic, toggles, lock and icons.
10. The sandbox may not render video. Run `npx tsc --noEmit` once at the end. If Chromium works, try ONE `remotion still` of the frame named in the task. Otherwise say plainly what you could not verify. Never claim anything "looks right".
11. Before every push, run `git pull --rebase`. If a shared doc or Root.tsx conflicts, keep both sides' additions. Commit and push as soon as the file compiles, and never commit a token.
12. If you reach about 60% of your budget, stop: commit what works, write the next step in docs/dontsay-progress.md, push, and reply.
13. Final reply (short): what was built, composition names, frames or timecodes to check by eye, anything uncertain.
~~~

---

# Group 1: recon, data, timing, sound

## 1a: recon and context file

~~~text
TASK 1a. No feature code. Create docs/dontsay-context.md and docs/dontsay-progress.md only.
Read (names, exports and props only, do not dump files): this branch (it contains gta6-quiz) and, only where it is missing here, search-history, us-states and nfl-quiz. List with path + exports + props:
- iOS layer (src/ios): clock helpers, px(), Root.tsx composition pattern, fonts (Inter + Nunito loading), spring presets, design tokens
- from src/gta6: QuestionShell phases, ScoreHud rings, StreakChip, LockNotification, NotificationBanner, TimerRing / island pill, EdgeGlow, Shake, LowPowerTint, level-card app-launch transition, ScoreCard, Scoreboard, Outro and end screen, Hook, Part pattern, sfxCues pattern
- from src/nfl (if present and helpful): WalletCard pass style, PointsPill island variant, RevealEngine lock-open flip, DidYouKnowCard, TwoMinuteWarning wrapper, rank card layout
- audio and tools: scripts/build_gta6_timings.py, build_gta6_audio_map.ts, build_gta6_duck.ts, clean_gta6_clips.sh, make_gta6_sfx.py (how it uses pedalboard), gta6_qa.ts, gta6_chapters.ts, render script, youtube_upload.py, generate-audio.js
- how clip lengths feed timing.ts (timings.csv -> timings.generated.ts)
Output: a table "reuse | path | exports | notes (copy or adapt)", then a "gaps" list of what must be built new for DontSay: InkBubble (invisible-ink dissolve), HeartsPill (static), ListeningGlow + waveform, CountdownNumber island pill, ExclusionChips + SettingsSheet, BonusWrapper, the five bonus mechanic scenes, Round45Callback, RankCard with 5 ranks on one card.
Done when: pushed; list anything you expected and could not find.
~~~

## 1b: data and validation

~~~text
TASK 1b. Create src/dontsay/data.ts and scripts/check_dontsay_data.ts.
Read: docs/dontsay-context.md, docs/dontsay/rounds.json, docs/dontsay/poll.json.
data.ts: typed `Round` (n, level 1-5, prompt, rule? (string), ruleType? "none"|"banned"|"filter"|"heavy", banned? string[], swatches? string[], iconChips? string[], heavy? boolean, answer, collision "High"|"Medium"|"Low", regionSensitive? boolean), `Bonus` (n 1-5, afterRound, name "mind-reader"|"triple-lock"|"chain-reaction"|"opposite-day"|"voice-only", iosIdea, prompt, passCondition, answer (string or string[]), voiceIntro, voiceReveal), `rounds` (45, play order), `bonuses` (5, after rounds 9/18/27/36/45), `heartCheckIn` (after round 23, 2 s, voice line), `levelColors` (L1 cool blue, L2 blue-violet, L3 violet, L4 warm amber, L5 red-orange), `ranks` (One of a Kind 46-50, Rare Mind 38-45, Free Thinker 28-37, Parrot 16-27, Echo 0-15), `pollRounds` (1, 5, 6, 14, 25, 28, 30, 33, 36, 41, 42, 43, 45), `sourceName`. Import the JSON, never retype it.
Apply these fixes in the data (not in scenes): Triple Lock answers = ["Cow","Pig","Chicken"] (Chicken replaces Sheep). Round 41 collision = "High" (was Medium). Round 38 adds a clarification chip text "Not shark, not clownfish either." Round 45 banned = ["Banana","Orange","Kiwi","Grapes"]. Rounds 6, 25, 28, 33, 36 tagged regionSensitive=true. Bonus pass conditions: mind-reader "Match me = 1 point"; the other four "Differ from me = 1 point" (chain-reaction also carries the on-screen note "Tiger is mine — you can't reuse it").
Validation exits non-zero if: not 45 rounds, levels are not 9/9/9/9/9, bonuses are not after rounds 9/18/27/36/45, any heavy round lacks banned/swatches/iconChips, the heart check-in is not between rounds 23 and 24, ranks do not cover 0-50 with no gaps. It prints warnings (not failures) for `sourceName` null, any poll round missing from `pollRounds`, and any regionSensitive round whose answer is a Western default (Liam, Olivia, Toyota, tennis, basketball, Batman). It also prints the first 30 characters of every prompt longer than 8 words (do not change this threshold).
Do not edit rounds.json to make it pass.
Done when: tsc passes and the warnings table is in your reply.
~~~

## 1c: timing

~~~text
TASK 1c. Create src/dontsay/timing.ts and scripts/dontsay_runtime.ts.
Read: docs/dontsay-context.md, src/dontsay/data.ts, the clip-timing part of src/gta6/timing.ts (pattern only, copy the idea, do not import).
Constants (seconds, one place only): hookSec 8, introStdSec 1.2, introHeavySec 3.2, introCallbackSec 4.2 (round 45 only), timerL1L2Sec 5, timerL3Sec 4, timerL4L5Sec 3, sealedSlideSec 1.5, revealSec 2.0, resultSec 1.8, beatSec 0.5 (silence before reveal), levelCardSec 4, settingsCardSec 4, heartCheckInSec 2, bonusSec 16 (2 intro, 8 play, 3 reveal, 3 result), rankCardSec 6 (hold), scoreboardSec 20, outroSec 30 (end screen = last 15 s).
Per round: intro ("Round N. [Category.]" + rule on heavy rounds) + timer + 1.5 s sealed slide + 0.5 s beat + 2.0 s reveal + 1.8 s result. Intro slot = max(introStdSec or introHeavySec or introCallbackSec, intro clip length + 0.3) once timings exist; the fallback uses the base value. Reveal = max(revealSec, reveal clip + 0.3). The small sealed bubble is on screen from frame 1 of the round (frame 0), the lock click plays at frame 0 and again at the reveal frame.
Export `segments`, `partRanges` (Part1 hook + L1 + Bonus1, Part2 L2 + Bonus2, Part3 L3 + check-in + Bonus3, Part4 L4 + Bonus4, Part5 L5 + callback + Bonus5, Part6 rank + scoreboard + outro), `chapters`, frame helpers following the repo's clock convention. The script prints per-part and total runtime and compares with the ~10:44 target.
Done when: tsc passes; reply with a table: part, start, end, frames; and the total.
~~~

## 1d: sound effects (pedalboard)

~~~text
TASK 1d.
Read: docs/dontsay-context.md, scripts/make_gta6_sfx.py (pattern and the pedalboard chain only).
Create scripts/make_dontsay_sfx.py writing 48 kHz wav files to public/dontsay/sfx/ plus manifest.json, synthesized with numpy and finished through a pedalboard chain (high-pass, gentle compressor, limiter). Sounds: card-in (soft glass whoosh), listening-start (gentle rising two-tone), tick (x3-5 pitches rising slightly per second), lock-click (used twice per round: frame 0 and reveal), ink-dissolve (airy shimmer, left-to-right pan), collision (soft heart-pop is NOT used; use a muted low thud + a short red-tone blip), safe-pulse (single bright tone), exclusion-flip (toggle off), swatch-cross (crossed-out swatch), chip-land (chip appears), level-card (short swell, one per level colour), bonus-pill (warm swell), triple-lock-click (three clicks in a row), chain-link (tick per word), invert-whoosh (opposite day), mic-pulse (voice only, soft), callback-chime (one per card floating into the banned box, 4 pitches), check-in-tone (short rising), rank-reveal, end-sting. Peak -3 dB. No copyrighted audio, no Apple system sounds. Also src/dontsay/sfx.ts with typed ids from the manifest.
Append the sfx ids to docs/dontsay-context.md and tick 1a to 1d in docs/dontsay-progress.md.
Done when: tsc passes; list each file's length.
~~~

---

# Group 2: components

## 2a: copy shared parts and the system

~~~text
TASK 2a.
Read: docs/dontsay-context.md (reuse table only).
Copy (do not import) into src/dontsay/shared/ the parts the table marks "copy": clock helpers wrapper, TimerRing island variant, EdgeGlow, Shake, LowPowerTint, LockNotification, NotificationBanner, ScoreHud ring math, level-card transition helpers, spring presets from src/ios. Fix the paths so nothing points at src/gta6 or src/nfl. Create src/dontsay/system.ts: level colour roles (cool blue, blue-violet, violet, warm amber, red-orange), ink, glass, muted, type scale (Inter for headlines with tight tracking, Nunito for timer and counter with tabular numbers, both via the repo's loading approach, with the scene waiting for the font), SAFE margins in reference units (centre 80%, 128 px on 1440p), spring presets, a dark background gradient per level, the glass spec (blur 40px, saturate 180%, bright top rim, 0.5px light border, two/three soft shadows), film-grain settings (2-3%). System colours only: blue #007AFF, red #FF3B30, green #34C759.
Report any copied file that still depends on GTA 6 or NFL content.
Done when: tsc passes; list copied files with source paths. Update docs/dontsay-context.md.
~~~

## 2b: InkBubble (invisible-ink sealed answer)

~~~text
TASK 2b. Create src/dontsay/components/InkBubble.tsx.
Read: docs/dontsay-context.md, src/dontsay/system.ts.
An iMessage invisible-ink style sealed answer: a glass bubble covered in shimmering ink particles (small dots, slow drift, mask gradient). Two visual states driven by props only: `small` (corner, ~12% of frame width, with a tiny lock icon and the word "locked" in 0.6 s) and `large` (centred, ~55-60% of frame width, ready to dissolve). The bubble is on screen from frame 0 of the round in `small`; it enlarges and slides to centre at the sealed-slide frame (1.5 s into the round) with a spring (damping 16, stiffness 150). The lock click plays at frame 0 (audible proof the answer was fixed before the round) and again softly at the slide. The answer text inside is fully covered by ink until the reveal; it is NEVER visible before the dissolve. No answer text is hard-coded: it comes from `card.answer` via prop.
Done when: tsc passes; try a still of the `small` and `large` states; list frames.
~~~

## 2c: HeartsPill (static) + ListeningGlow + waveform

~~~text
TASK 2c. Create src/dontsay/components/HeartsPill.tsx and src/dontsay/components/ListeningGlow.tsx.
Read: docs/dontsay-context.md, src/dontsay/system.ts.
HeartsPill: a small frosted pill in the top-left with three drawn hearts (our own art, no SF Symbols) and the label "3 HEARTS" or "BONUS" on bonus rounds. It spring-ins ONCE at level start (three hearts arrive with a 4-frame stagger) and then NEVER moves, NEVER decrements, NEVER jiggles, NEVER pops. There is no "Delete Heart?" alert and no red minus badge. The pill is a static reference so viewers can track their own lives. Put a one-line comment at the top of the file: "Honour-system: the video does not track hearts. This pill is a reference only."
ListeningGlow: a Siri-style multicolor glow (cool blue / violet / soft pink) that wakes up around the main card on "Let's go" and stays through the timer, with a live waveform (5-7 bars, springy, randomised phase per round but deterministic from round number so it renders the same every time). The glow dims to ~40% during the sealed-slide and reveal, then off.
Done when: tsc passes; list frames for the level-start spring-in and a listening frame.
~~~

## 2d: CountdownNumber (island pill) + ResultBeat

~~~text
TASK 2d. Create src/dontsay/components/CountdownNumber.tsx and src/dontsay/components/ResultBeat.tsx.
Read: docs/dontsay-context.md, the TimerRing island variant in src/dontsay/shared.
CountdownNumber: a Dynamic Island-style pill under the prompt that shows the seconds remaining as a big tabular number (Nunito ExtraBold). It turns red under 2 s and the EdgeGlow red pulse beats on every remaining frame. A thin progress line inside the pill fills over the timer. The timer starts only after the intro, so reading time never counts. Duration comes from timing.ts (5/4/3 s by level).
ResultBeat: the 1.8 s after the reveal. It shows a small chip on the InkBubble: red "Same answer" on a collision (with a muted low thud + short red-tone blip sfx), green "Different? Safe" on a safe (with the safe-pulse sfx). It NEVER animates a heart. The rotating voice line (data.ts resultLine) plays here. Skip the chip entirely on the few rounds marked "skip result line" in data.ts, for pace.
Done when: tsc passes; list frames for the 3-2-1 red transition and a collision chip.
~~~

## 2e: ExclusionChips + SettingsSheet

~~~text
TASK 2e. Create src/dontsay/components/ExclusionChips.tsx and src/dontsay/components/SettingsSheet.tsx.
Read: docs/dontsay-context.md, src/dontsay/data.ts (Round type only), src/dontsay/system.ts.
ExclusionChips: renders the rule for a round as one of four styles, driven by round.ruleType: "banned" = Settings toggle rows flipping off (one row per banned word, spring flip, 4-frame stagger); "filter" = crossed-out colour swatches (round swatch drawn by us, an X drawn over it); "heavy" = bold chips with crossed-out icons (fruit, drink, colour swatches, car brands as our own drawn icons or plain text — NEVER real brand logos), large enough to read in under a second, 4-frame stagger; "none" = nothing. The chips appear during the intro beat and stay on screen through the timer. Round 38 also renders the clarification chip "Not shark, not clownfish either." Heavy rounds also show a tiny persistent chip "RULE BREAK = MATCH" so the loophole is closed on screen.
SettingsSheet: the level-start rules display, an iOS Settings sheet that slides up at each level intro (4 s) and lists the level's rule type (Banned list / Filters / Two rules at once) plus the hearts reset line. It dims the background to ~0.94 and tints the wallpaper toward the level colour.
Done when: tsc passes; run round 12 (3 bans), 37 (3 swatches), 42 (3 icon chips) and say how each lays out at phone size.
~~~

## 2f: BonusWrapper (gold glass + BONUS pill)

~~~text
TASK 2f. Create src/dontsay/components/BonusWrapper.tsx.
Read: docs/dontsay-context.md, src/dontsay/system.ts.
A wrapper used by all five bonus scenes: the frame warms to gold-tinted glass (a warm amber gradient over the level colour, glass tinted toward gold), a BONUS pill slides in from the top with a warm swell sfx, the hearts pill label switches to "BONUS", and a pass-condition chip is shown explicitly: "Match me = 1 point" for Mind Reader, "Differ from all three = 1 point" for Triple Lock, "Differ from me = 1 point" for Chain Reaction (with the sub-line "Tiger is mine — you can't reuse it"), "Differ from me = 1 point" for Opposite Day, "Differ from me = 1 point" for Voice Only. The wrapper takes a `bonus` prop and a `children` slot for the mechanic. Bonus rounds never cost hearts (no heart animation, no collision chip). About 16 s: 2 s intro, 8 s play, 3 s reveal, 3 s result.
Done when: tsc passes; list frames for the BONUS pill slide-in and the pass-condition chip.
~~~

## 2g: RevealEngine (ink dissolve sweep)

~~~text
TASK 2g. Create src/dontsay/components/RevealEngine.tsx.
Read: docs/dontsay-context.md, src/dontsay/timing.ts (exports only), InkBubble.tsx (props only).
After the timer: 0.5 s beat of silence with everything frozen and the lock icon shaking (lock-shake sfx); then the second lock click, the ink dissolves in one slow left-to-right sweep (~1.5 s, ink-dissolve sfx with matching pan), the answer appears in large type (Inter ExtraBold, centred, scaled to fit the safe area), and the name-reveal chime plays. The answer comes from card.answer via prop, never typed in code. After the answer is fully visible, ResultBeat plays for 1.8 s. All timing from timing.ts and the audio map, none typed here. Export `revealCues(card, start)`.
Done when: tsc passes; list the frames to check (beat, second lock click, dissolve start, dissolve end, answer visible, result chip).
~~~

---

# Group 3: scenes

## 3a: RoundScene

~~~text
TASK 3a. Create src/dontsay/scenes/RoundScene.tsx and src/dontsay/Preview.tsx.
Read: docs/dontsay-context.md, the exports of the components, src/dontsay/timing.ts.
RoundScene({ round, at }): background by level colour, SettingsSheet only at level start (handled by LevelCard), ExclusionChips for the round's rule, the small InkBubble from frame 0, ListeningGlow + CountdownNumber during the timer, HeartsPill (static), the round counter top-right "N OF 45" (one line, white-space: nowrap), the prompt centred in the safe area as text as well as spoken, RevealEngine for the dissolve + answer + result. Duration from timing.ts. Register "DontSay-Round" (prop n, default 1) and "DontSay-Round-All" (all 45 back to back, no hook, level cards or bonuses) in Root.tsx.
Done when: tsc passes; list 6 round numbers to scrub (1, 12, 21, 30, 37, 45).
~~~

## 3b: hook and lock notification

~~~text
TASK 3b. Create src/dontsay/scenes/Hook.tsx.
Read: docs/dontsay-context.md.
0:00-0:03: a lock-screen notification "My answer is locked." slides in over a blurred card; export the 1-second animation as a reusable piece that takes a start frame. 0:03-0:06: the wallpaper fades up in cool blue, a small sealed ink bubble appears in the corner with the lock click, three hearts spring in on "Three hearts every level". The listening glow wakes up on "Let's go". 0:06-0:08: round 1 is live and plays inside the hook (once), with the prompt visible. Voice: "My answer is locked. Say yours before the timer ends. Say the same as me and you lose a heart. Three hearts every level. Fifty rounds. Let's go." Rules are never spoken beyond the hook and the level intros. Export `hookCues`.
Done when: tsc passes; frames to check (0, 1 s, 3 s, 6 s, 8 s).
~~~

## 3c: Round 45 callback staging

~~~text
TASK 3c. Create src/dontsay/scenes/Round45Callback.tsx.
Read: docs/dontsay-context.md, Hook.tsx (the lock notification export only), src/dontsay/data.ts (rounds 1, 10, 19, 37 answers only).
Before round 45: a 4.2 s intro (instead of the standard 1.2 s) where the four earlier fruit cards (Banana from R1, Orange from R10, Kiwi from R19, Grapes from R37) float into the banned box one by one (4-frame stagger, callback-chime sfx at one pitch higher each), each as a small crossed-out card. The small sealed bubble is held for one extra second (so it sits visible in the corner for ~2.5 s before the slide), then slides to centre and goes straight into the timer. The voice reads every exclusion: "Round forty-five. Name a fruit. Not banana, orange, kiwi, grapes." After the reveal and result, cut straight into the Voice Only bonus. Apple is NOT in the banned list (the video never answered it).
Done when: tsc passes; frames to check (each of the 4 cards landing, the sealed bubble hold, the slide).
~~~

---

# Group 4: bonus scenes, level/heart cards, parts, ending

## 4a: LevelCard + SettingsCard + HeartCheckIn

~~~text
TASK 4a. Create src/dontsay/scenes/LevelCard.tsx, src/dontsay/scenes/SettingsCard.tsx and src/dontsay/scenes/HeartCheckIn.tsx.
Read: docs/dontsay-context.md, the level-card transition helpers in src/dontsay/shared.
LevelCard: each opens like an app launching from a home-screen icon with a spring zoom; the level colour fills the frame, the level name ("Level one: Warm-up", "Level two: Banned list", "Level three: Filters", "Level four: Under pressure", "Final level: Two rules at once") and the hearts reset line ("Three fresh hearts" / "Hearts reset" for L2-L5), the round counter resets to the level's first round, and the level-card swell sfx plays. Every level intro mentions the reset (decision 5).
SettingsCard: a 4 s sheet that slides up showing the level's rule type (None / Banned list / Filters / Two rules at once) plus the line "Break a rule and it counts as a match." on L2 only (decision 6). It is the level intro spoken over, never on its own.
HeartCheckIn: a 2 s card between rounds 23 and 24 (mid-Level 3). Voice only: "Check your hearts. On your last one? Careful." The hearts pill stays static (it does NOT enlarge or animate — decision 14). A short rising tone plays, the music bed lifts slightly, then drops straight into round 24. No answer, no score.
Done when: tsc passes; frames to check for each level intro and the check-in.
~~~

## 4b: Bonus 1 — MindReader

~~~text
TASK 4b. Create src/dontsay/scenes/BonusMindReader.tsx.
Read: docs/dontsay-context.md, BonusWrapper.tsx (props only), src/dontsay/data.ts (Bonus type only).
After round 9. iOS keyboard prediction strip: the rule flips — say what you think I said. The sealed bubble shows first (small, frame 0), then the ink dissolves to reveal "Dog". Pass condition chip on screen: "Match me = 1 point". A match earns the point (deliberately a gimme after L1 — decision 17). Voice intro: "Bonus one. Mind reader. This time, say the same as me." Voice reveal: "Dog. Same? Point for you." No heart animation, no collision chip. Register "DontSay-Bonus-1".
Done when: tsc passes; frames to check (sealed, dissolve, match chip).
~~~

## 4c: Bonus 2 — TripleLock

~~~text
TASK 4c. Create src/dontsay/scenes/BonusTripleLock.tsx.
Read: docs/dontsay-context.md, BonusWrapper.tsx (props only).
After round 18. Three stacked home-screen widgets: three sealed bubbles lock in a row (three lock clicks in a row, 4-frame stagger). Say anything that is not one of the three. Pass condition chip: "Differ from all three = 1 point". The three answers are Cow, Pig, Chicken (decision 8 — Chicken replaces Sheep because Chicken is the obvious farm animal that was missing, so viewers who avoid the three but say Chicken now collide). All three dissolve left-to-right one after another. Voice intro: "Bonus two. Triple lock. Don't say any of my three." Voice reveal: "Cow. Pig. Chicken." Register "DontSay-Bonus-2".
Done when: tsc passes; frames to check (three locks, three dissolves).
~~~

## 4d: Bonus 3 — ChainReaction

~~~text
TASK 4d. Create src/dontsay/scenes/BonusChainReaction.tsx.
Read: docs/dontsay-context.md, BonusWrapper.tsx (props only).
After round 27. Shortcuts app: Cat → Tiger → Rabbit → ? The last letter of each word lights up and links to the next word with a chain-link tick. Say an animal starting with T. Pass condition chip: "Differ from me = 1 point" with the sub-line "Tiger is mine — you can't reuse it" (decision 7 — Tiger is on screen, so the viewer cannot answer Tiger). The sealed bubble for "Turkey" dissolves last. Voice intro: "Bonus three. Chain reaction. Next animal starts with T." Voice reveal: "Turkey." Register "DontSay-Bonus-3".
Done when: tsc passes; frames to check (each link lighting up, the dissolve).
~~~

## 4e: Bonus 4 — OppositeDay

~~~text
TASK 4e. Create src/dontsay/scenes/BonusOppositeDay.tsx.
Read: docs/dontsay-context.md, BonusWrapper.tsx (props only).
After round 36. Appearance toggle / Smart Invert: the wallpaper briefly inverts its colours for ~1 s (invert-whoosh sfx), then returns. Say the opposite of "big" in 4 s. Pass condition chip: "Differ from me = 1 point". The video's answer is "Tiny" (most people will say "small", so "Tiny" is a slight gimme — keep it, it is intentional). Voice intro: "Bonus four. Opposite day. Say the opposite of big." Voice reveal: "Tiny." Register "DontSay-Bonus-4".
Done when: tsc passes; frames to check (invert start, invert end, dissolve).
~~~

## 4f: Bonus 5 — VoiceOnly

~~~text
TASK 4f. Create src/dontsay/scenes/BonusVoiceOnly.tsx.
Read: docs/dontsay-context.md, BonusWrapper.tsx (props only).
After round 45 (the callback). VoiceOver: the text fades out and only the mic glow + waveform stay, with a small "Listen" label. The category is spoken first: "Name a musical instrument." About 1 s after the voice line ends, a faint caption of the category fades in for muted viewers (decision 15 — keep it subtle at phone size). Pass condition chip: "Differ from me = 1 point". The video's answer is "Violin". The sealed bubble is NOT shown (it is voice only); instead a tiny mic icon in the corner pulses to the voice. Voice intro: "Final bonus. Voice only. Listen." Then: "Name a musical instrument." Voice reveal: "Violin." Register "DontSay-Bonus-5".
Done when: tsc passes; frames to check (text fade out, mic glow, caption fade in).
~~~

## 4g: RankCard + Scoreboard

~~~text
TASK 4g. Create src/dontsay/scenes/RankCard.tsx and src/dontsay/scenes/Scoreboard.tsx.
Read: docs/dontsay-context.md, the Scoreboard in src/dontsay/shared or src/gta6 context notes.
Scoreboard (~20 s): the rank bands light from lowest to highest with each rank's voice line (from the audio map). Voice, one line per rank: "Zero to fifteen: Echo." "Sixteen to twenty-seven: Parrot." "Twenty-eight to thirty-seven: Free Thinker." "Thirty-eight to forty-five: Rare Mind." "Forty-six or more: One of a Kind."
RankCard: a single Wallet-pass card with all five ranks on ONE card (Echo 0-15, Parrot 16-27, Free Thinker 28-37, Rare Mind 38-45, One of a Kind 46-50), screenshot-ready, large type, holds at least 6 s. Keep every other element off the card so a screenshot is clean. Rank names and score ranges come from data.ts. After the last bonus, the wallpaper returns to cool blue. Voice: "That was all fifty. Add up your points."
Done when: tsc passes; frames to check, including the first frame of the 6 s hold.
~~~

## 4h: Outro and Part 6

~~~text
TASK 4h. Create src/dontsay/scenes/Outro.tsx and src/dontsay/parts/Part6.tsx; register "DontSay-P6".
Read: docs/dontsay-context.md, the end screen in src/gta6 context notes.
Outro: on-screen asks in order: "Comment your rank, and screenshot your card", "Which round got you? Tell me the number", one subscribe ask ("Subscribe so you do not miss the next game"). End screen for the last 15 s: next-video slot and a subscribe button, the rank card miniature in the corner, a final fade. No like or subscribe ask before the scoreboard. Part6: Scoreboard, RankCard hold, Outro. Add `part6Cues`.
Done when: tsc passes; timecodes to check.
~~~

## 4i: Part 1 (hook + L1 + Bonus 1)

~~~text
TASK 4i. Create src/dontsay/parts/Part1.tsx and register "DontSay-P1".
Read: docs/dontsay-context.md, the exports of Hook, LevelCard, SettingsCard, RoundScene, RevealEngine, BonusMindReader.
Part1: Hook (includes round 1), L1 LevelCard + SettingsCard, rounds 2 to 9, BonusMindReader. Offsets from timing.ts. Cue lists in src/dontsay/sfxCues.ts as `part1Cues`.
Done when: tsc passes; timecodes to check, especially the hook into round 1 and the round 9 → bonus 1 cut.
~~~

## 4j: Part 2 (L2 + Bonus 2)

~~~text
TASK 4j. Create src/dontsay/parts/Part2.tsx; register "DontSay-P2".
Read: docs/dontsay-context.md, Part1.tsx (pattern only), BonusTripleLock exports.
L2 LevelCard + SettingsCard (with the "Break a rule and it counts as a match." line), rounds 10 to 18 (rounds 12 and 18 are heavy-rule), BonusTripleLock. Add `part2Cues`.
Done when: tsc passes; timecodes to check, especially the heavy-rule intros on 12 and 18.
~~~

## 4k: Part 3 (L3 + check-in + Bonus 3)

~~~text
TASK 4k. Create src/dontsay/parts/Part3.tsx; register "DontSay-P3".
Read: docs/dontsay-context.md, Part2.tsx (pattern only), HeartCheckIn, BonusChainReaction exports.
L3 LevelCard + SettingsCard, rounds 19 to 23, HeartCheckIn (between 23 and 24), rounds 24 to 27, BonusChainReaction. Add `part3Cues`.
Done when: tsc passes; timecodes to check, especially the check-in placement and the round 27 → bonus 3 cut.
~~~

## 4l: Part 4 (L4 + Bonus 4)

~~~text
TASK 4l. Create src/dontsay/parts/Part4.tsx; register "DontSay-P4".
Read: docs/dontsay-context.md, Part3.tsx (pattern only), BonusOppositeDay exports.
L4 LevelCard + SettingsCard, rounds 28 to 36, BonusOppositeDay. Add `part4Cues`.
Done when: tsc passes; timecodes to check.
~~~

## 4m: Part 5 (L5 + callback + Bonus 5)

~~~text
TASK 4m. Create src/dontsay/parts/Part5.tsx; register "DontSay-P5".
Read: docs/dontsay-context.md, Part4.tsx (pattern only), Round45Callback, BonusVoiceOnly exports.
L5 LevelCard + SettingsCard, rounds 37 to 44 (heavy-rule: 37, 40, 42, 43, 44), Round45Callback + round 45, BonusVoiceOnly. Add `part5Cues`.
Done when: tsc passes; timecodes to check, especially the 4.2 s callback intro on round 45 and the cut straight into Voice Only.
~~~

## 4n: Part 6 (rank + scoreboard + outro)

~~~text
TASK 4n. Create src/dontsay/parts/Part6.tsx; register "DontSay-P6".
Read: docs/dontsay-context.md, Part5.tsx (pattern only), Scoreboard, RankCard, Outro exports.
Part6: Scoreboard, RankCard hold (6 s), Outro. Add `part6Cues`. (If 4h already registered DontSay-P6, do not double-register; merge.)
Done when: tsc passes; timecodes to check.
~~~

## 4o: full composition and chapters

~~~text
TASK 4o.
Read: docs/dontsay-progress.md. If 4i, 4j, 4k, 4l, 4m or 4n is not done, list it and stop.
Register "DontSay-Full" in src/Root.tsx: Part1 to Part6 as Sequences at the offsets from timing.ts. Create scripts/dontsay_chapters.ts that prints the YouTube chapter list (Intro, Level 1: Warm-up, Level 2: Banned list, Level 3: Filters, Level 4: Under pressure, Level 5: Final, Final bonus: Voice Only, Your rank) from timing.ts and writes docs/dontsay/chapters.txt. Say how far the times differ from the script's draft (0:00, 0:08, 2:12, 4:19, 6:16, 8:01, 9:44, 10:00).
Done when: tsc passes; the chapter list is in your reply.
~~~

---

# Group 5: audio

The voiceover itself comes from a script file: one clip per line, ids `ds_001`, `ds_002`... in play order, with lines.csv (`id,type,text`, no emotion tags) and a tagged voiceover.txt. Clip types: `hook, level, settings, roundintro, rule, timer (silent), reveal, result, checkin, bonusintro, bonusreveal, rank, outro`. Ask me to generate those two files from your script, then commit them as `docs/dontsay/lines.csv` and `docs/dontsay/voiceover.txt`.

## 5a: pipeline

~~~text
TASK 5a.
Read: docs/dontsay-context.md, docs/dontsay/lines.csv, the gta6 scripts it names for timings, audio map and clip cleaning (patterns only).
Create scripts/clean_dontsay_clips.sh, scripts/build_dontsay_timings.py (writes src/dontsay/timings.csv and src/dontsay/timings.generated.ts), scripts/build_dontsay_audio_map.ts (writes src/dontsay/audioMap.ts). Clips are wav in public/dontsay/voiceover/clips/<id>.wav: trim silence to 0.1 s, loudnorm -16 LUFS, originals kept in the archive, raw/ ignored by git. The audio map links each round to its roundintro, rule clip (heavy rounds), reveal and result ids; each bonus to its bonusintro and bonusreveal; the check-in to its clip; each level to its level+settings clips; the hook, rank and outro to their clips. It exits non-zero on any leftover row, a round without a reveal, or a type mismatch. timing.ts must read the generated timings (intro slot = max(base, clip + 0.3); reveal = max(base, clip + 0.3)).
Done when: tsc passes; a table "round/bonus, clip ids, reveal id" is in your reply, and per-part and total runtime.
~~~

## 5b: voice-line-fit report

~~~text
TASK 5b. Create scripts/dontsay_voice_fit.ts.
Read: src/dontsay/timings.csv, src/dontsay/data.ts.
For each round and bonus: list voice lines whose clip is longer than its slot (1.2 s standard intro, 3.2 s heavy, 4.2 s callback; 2.0 s reveal; 1.8 s result; 4 s level; 2 s check-in; 2 s bonus intro, 3 s bonus reveal), the overrun in seconds, and the line text. Print the 15 worst, the total added time over the base runtime, and the total runtime with and without shortening those 15. Do not edit any text or clip.
Done when: tsc passes and the table is in your reply. Send it to me and I will shorten the lines; only those clips need regenerating.
~~~

## 5c: voice chain and mix (pedalboard)

~~~text
TASK 5c. Create scripts/master_dontsay_voice.py and src/dontsay/Audio.tsx; wire into DontSay-Full.
Read: docs/dontsay-context.md, scripts/make_gta6_sfx.py (pedalboard usage only), scripts/build_gta6_duck.ts, src/dontsay/audioMap.ts, src/dontsay/sfxCues.ts (exports only).
1. master_dontsay_voice.py: apply ONE identical pedalboard chain to every voice clip, in this order: high-pass about 80 Hz, a light compressor (about 3:1, threshold about -18 dB, attack about 10 ms, release about 100 ms), a gentle presence boost around 3 kHz (small, <= 2 dB), a limiter at -1 dB. No reverb or effects on the voice. Read from clips/, write to clips_master/, then loudness-match every clip to -16 LUFS. Print before/after peak and loudness for the 10 loudest and 10 quietest clips. The same chain for every clip, so the voice stays consistent.
2. Audio.tsx: place each clip at its start frame from timing.ts (roundintro at the round start, rule clip during the heavy intro, reveal at the lock-open frame, result after the reveal, check-in between 23 and 24, level+settings at level start, bonusintro at bonus start, bonusreveal at bonus reveal, hook/rank/outro at their segment starts). The lock-click sfx plays at frame 0 of every round AND at the reveal frame. Music: one royalty-free bed (or a `musicSrc` prop if none exists), ducked by an envelope built from the clip timeline with a script. SFX cue lists per part, 6 to 8 dB under the voice. List any frame where an sfx and a clip collide.
3. No copyrighted music, no Apple system sounds anywhere.
Done when: tsc passes; list what to listen for in Studio.
~~~

---

# Group 6: thumbnails, Shorts, render

## 6a: thumbnails and metadata

~~~text
TASK 6a.
Read: docs/dontsay/script.md (the "Title, thumbnail, metadata" section only), src/dontsay/system.ts.
Three stills DontSay-Thumb-A/B/C at 1280x720 (a normal image size, not px()): A) a vivid blue-to-magenta wallpaper with one big glass card, the sealed ink bubble, three hearts, and the text "DON'T SAY THE SAME"; B) an ink bubble dissolving to show "37", with "MATCH ME? LOSE A HEART"; C) five Settings toggle rows flipping off, with "BANNED". 3 to 5 big words, high contrast, no Apple logos, no real app icons.
Also docs/dontsay/metadata.md: the three titles from the script plus "Don't Say The Same As Me: Can You Score 50?", the description (starter + chapters from docs/dontsay/chapters.txt + the disclaimer "Hearts are honour-system: the video shows the rules and the answers, you track your own lives."), the tags, and the pinned comment "Drop your rank and the round that got you."
Done when: tsc passes; try rendering one still and say if you could not.
~~~

## 6b: Shorts

~~~text
TASK 6b. Create src/dontsay/shorts/ShortRound.tsx and register "DontSay-Short-1", "DontSay-Short-30", "DontSay-Short-45" (1080x1920, 60 fps).
Read: docs/dontsay-context.md, RoundScene and its components (props only).
A vertical cut of one round each (rounds 1, 30 and 45), about 21 s, reusing the same components with a `layout="vertical"` prop (do not fork them): prompt stacked larger, countdown pill at the top, safe zones for Shorts UI. Round 45 Short includes the callback intro. End with the voice line "Full 50-question game on the channel." and a matching end line on screen. Audio comes from the same clips.
Done when: tsc passes; frames to check. Do not render.
~~~

## 6c: render, README, QA

~~~text
TASK 6c.
Read: docs/dontsay-progress.md, NOTES.md, the gta6 render script and QA script it names.
1. scripts/render_dontsay.sh: render each of Parts 1 to 6 as 3840x2160 at 60 fps (scale 1.5 of the 2560x1440 composition, copied from how earlier videos got to 4K), H.264 CRF 14 to 16, yuv420p, join losslessly, loudness-normalize to -14 LUFS, -1.5 dBTP, AAC 320 kbps, 48 kHz. Add a fallback flag for 2560x1440 and the Shorts render lines.
2. docs/dontsay-README.md: preview, render, where things live, and a "before you record" checklist (run the Community poll on rounds 1, 5, 6, 14, 25, 28, 30, 33, 36, 41, 42, 43, 45; shorten the 15 worst voice lines from 5b; pick a licensed music track and keep the license text; choose the voice and keep the terms; revoke the GitHub token).
3. scripts/dontsay_qa.ts: exits non-zero if any of these fail: every round has an intro, a reveal and a result (or is marked "skip result line"); every clip id is in the audio map; data.sourceName is set; no scene contains a prompt, answer or rule typed in code (grep against data.ts); no image, logo or Apple icon asset is referenced; no audio file other than sfx, voice clips and the chosen music is used; every prompt text is inside the safe area (check the layout constants); the hearts pill is NEVER animated outside level start (grep HeartsPill for any spring/transform that is not the level-start one); the small ink bubble is on screen from frame 0 of every round (check the RoundScene composition).
Done when: committed; tell me the first render command to run.
~~~

---

## What can run at the same time

| Wave | Run together | Wait for |
|---|---|---|
| 1 | 1a alone | git steps above |
| 2 | 1b | 1a |
| 3 | 1c, 1d, 2a (3 chats) | 1b for 1c and 1d. 2a needs 1a. |
| 4 | 2b, 2c, 2d, 2e, 2f (5 chats) | 2a |
| 5 | 2g alone | 2b, 2c, 2d, 2e, 2f |
| 6 | 3a, 3b, 3c (3 chats) and 4a | 2g (4a needs 2a only) |
| 7 | 4b, 4c, 4d, 4e, 4f (5 chats) | 3a and 2f |
| 8 | 4g, 4h (2 chats) | 3a and 2a |
| 9 | 4i, 4j, 4k, 4l, 4m (5 chats) | 3a-c, 4a, 4b-f, 4g-h |
| 10 | 4n, then 4o | 4i to 4m and 4g-h |
| 11 | 5a, 6a (after 4o for chapters) | 5a needs the lines files |
| 12 | 5b, then 5c | 5a (5c also needs 4o) |
| 13 | 6b | 3a |
| 14 | 6c | everything |

Run 3 or 4 chats at once at most. Several tasks edit the same shared files (`Root.tsx`, `sfxCues.ts`, `docs/dontsay-context.md`, `docs/dontsay-progress.md`), so rule 11 in the Starter matters.

## After each chat (5 minutes)

1. `git pull`, then `npx remotion studio`.
2. Open the composition the chat named and scrub to the frames it listed.
3. Check: prompt text cut off or too small on a phone; the small ink bubble visible from frame 0 of every round; the lock click audible at frame 0 and at reveal; the countdown pill turning red under 2 s; the exclusion chips readable in the intro window on heavy rounds; the hearts pill STATIC (no animation outside level start); level colours consistent; no Apple logos or real app icons; sounds on the right frames.
4. Revoke the token.

## Fix chat prompt

~~~text
Repo: https://github.com/buildwith-manish/guess-the-word, branch dontsay-quiz. Token (revoked after): <PASTE NEW PAT>.
Clone without saving the token in git config. Read docs/dontsay-context.md, docs/dontsay-progress.md and the one file named below. The Starter rules apply.

Fix only this: <file, round number or timecode, what is wrong, what you expected>.
Do not touch other scenes. If the fix needs a shared component change, say first which scenes it could affect. Never animate a heart being lost — the hearts pill is honour-system and viewer-only.
~~~
