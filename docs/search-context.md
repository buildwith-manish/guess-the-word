# Search History: shared context

## A Reuse inventory

Source: grep of `src/` on branch search-history (from tag video-03-final). Imports are what each file pulls from `./timing`, `./types`, `../settings.json`, `./rounds.json`, `./assets` (`rounds.json` is imported by none of these files). Paths below are relative to `src/`. `src/states/` does not exist on this branch.

### Components and camera

| File | Exports | Props | GTW-coupled imports | Verdict |
|---|---|---|---|---|
| Hud.tsx | `HudPlan` (type), `MAIN_HUD_PLAN`, `HudPlanContext`, `Hud` | `Hud`: label, number, total, erases, eraseAt?, frame, landedAt?, barFrame?. Plan context: total, bonusAfter[], levels[{name, accent, count}] | `./timing` (LEVELS, QUESTIONS, TOTAL), `settings.bonus.after`; also `./Icon` | COPY-AND-ADAPT. The plan can be injected through `HudPlanContext`, but the default plan reads GTW data and the bar/badge/streak parts are built around bonus rounds and erases |
| Watermark.tsx | `Watermark` | frame? (unused) | `settings.brand.quiz`, `settings.brand.matrix`; `./clock` | DISCARD. It is the channel brand lockup, and this video has no brand names |
| Background.tsx | `Background`, `Bars` (stub, returns null) | frame, theme [string, string], pulse?, hideBars?, dim?, iris?{theme, p, variant?, energy?}, energy? (more props may follow, only the first lines were read) | `settings.background` (palette/config) | COPY-AND-ADAPT. Props-driven, but reads GTW settings; light edit to take its config from search-settings.json |
| Fx.tsx | `Confetti`, `Ring`, `Flash`, re-export `COLORS` | Confetti: frame, start, count?, seed?, origin?. Ring: frame, start, size?, style?. Flash: frame, start, ms?, peak?, at? | none (style, util, anim only) | REUSE |
| Iris.tsx | `Iris` | frame, seg (Segment of kind 'iris') | `./types` (Segment), `./timing` (BONUS_THEME); imports Background, Hud, Watermark, TitleLockup | COPY-AND-ADAPT. Tied to the segment model and to the Hud, Watermark and TitleLockup, two of which are discards |
| LevelCard.tsx | `LevelCard` | frame, levelIndex | `./timing` (LEVELS, QUESTIONS), `settings.levelCardFrames`, `settings.threeD`; also Solid3D (Title3D), Background | COPY-AND-ADAPT |
| Reminder.tsx | `Reminder` | frame, seg (Segment of kind 'reminder') | `./types` (Segment), `./timing` (FPS), `settings.text.reminder` | COPY-AND-ADAPT. Small pill pop-up; the text, the segment type and the "Still counting?" use are GTW |
| Scoreboard.tsx | `Scoreboard` | frame, rowAt? | `settings.scoreboard.ranks`, `settings.text.scoreboard*`, `settings.threeD`; also Icon, Solid3D (RankBadge3D), Background, util | COPY-AND-ADAPT |
| EndScreen.tsx | `EndScreen` | frame | `settings.endScreen`, `settings.threeD`; also Icon, Solid3D (SubscribeButton3D), Background, util | COPY-AND-ADAPT |
| Hook.tsx | `Hook` | frame | `./timing` (QUESTIONS, TOTAL), `settings.text.hook`, `settings.timing.hookA/hookB`, `./assets` (clueSrc); renders clue image pairs | DISCARD. Word-quiz only: it shows the clue images of the hardest word pairs |
| TitleLockup.tsx | `TitleLockup` | frame, animate?, hideAt?, showAt?, exitAt? | none, but the words GUESS / THE / WORD are hard-coded in the file | DISCARD. Hard-coded "GUESS THE WORD" title. Only the technique (tile flip, gold ignite) is worth copying by hand |
| Sting.tsx | `BulbSting` | frame, start, exit | none, but it draws the channel's lightbulb monogram (SVG paths, card corner at 1004,70) | DISCARD. Brand logo mark (rule 6), built for the word answer card |
| CameraRig.tsx | `CameraRig` | frame, duration, children | none (camera, style only) | REUSE |
| camera.ts | `handheld(frame)`, `bell(frame, duration)` | pure functions | none (imports `./anim` clamp01) | REUSE |

Verdict counts: REUSE 3 (Fx, CameraRig, camera.ts), COPY-AND-ADAPT 7 (Hud, Background, Iris, LevelCard, Reminder, Scoreboard, EndScreen), DISCARD 4 (Watermark, Hook, TitleLockup, Sting).

Most coupled: Iris (segment type, BONUS_THEME, and four component imports), Hook (timing, settings text and timing, assets), Hud (timing, settings, Icon, bonus plan).

### Helper files (export names only)

| File | Exports |
|---|---|
| style.ts | SCALE (2), K, px, COLORS, FONTS, glass, SAFE_X, SAFE_Y, S |
| anim.ts | prog, fadeIn, revealIn, slamIn, floatY, breathe, cubicBezier, htmlEase, irisEase, cssEase, cssEaseIn, cssEaseOut, cssEaseInOut, bounceEase, mergeEase, confettiEase, ms, keyframes, springStyle, riseStyle, mix |
| gsap-helpers.js | CommonJS: ease, backOut, backIn, expoOut, elasticOut, power3Out, power2InOut, sineInOut, linear, clamp01, mix, progress, stagger |
| util.ts | makeRandom, shuffle, pickN, range, Glyph (type), glyphs, ConfettiPiece (type), makeConfetti |
| fonts.ts | no exports; side-effect file (declares a FACES list that loads the fonts) |

### Not covered by this task
Icon.tsx, Solid3D.tsx, clock.ts, Round.tsx and the rest of `src/` were not on the list and were not inspected. Several components above import Icon, Solid3D and clock.

## B Timing audio pipeline

## C Data

## D Components

## E Scenes
