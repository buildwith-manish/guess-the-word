# Video 4 — States context

## A Reuse inventory

Source: grep of `src/` at tag video-03-final (exports, props, imports of ./timing, ./types, ../settings.json, ./rounds.json, ./assets). Verdict rule: REUSE = props only, no GTW-coupled import; COPY-AND-ADAPT = reads GTW data/settings; DISCARD = word-quiz only. Not verified by running anything.

| File | Exports | Props | GTW-coupled imports | Verdict |
|---|---|---|---|---|
| Hud.tsx | `HudPlan` (type), `MAIN_HUD_PLAN`, `HudPlanContext`, `Hud` | `label, number, total, erases, eraseAt?, frame, landedAt?, barFrame?` | `./timing` (LEVELS, QUESTIONS, TOTAL), `../settings.json` (bonus.after) | COPY-AND-ADAPT: HudPlan is built from GTW LEVELS/QUESTIONS and bonus rounds; the 'BONUS' label and erase badge are word-quiz |
| Watermark.tsx | `Watermark` | `frame?` (unused) | `../settings.json` (brand.quiz, brand.matrix) | COPY-AND-ADAPT: light; only reads brand text, likely fine if settings.json keeps `brand` |
| Background.tsx | `Background`, `Bars` (stub, returns null) | `frame, theme, pulse?, hideBars?, dim?, iris?, energy?, mood?, depth?` | `../settings.json` (background) | COPY-AND-ADAPT: light; props-driven, reads only `settings.background` |
| Fx.tsx | `Confetti`, `Ring`, `Flash`, `COLORS` (re-export) | Confetti `frame, start, count?, seed?, origin?`; Ring `frame, start, size?, style?`; Flash `frame, start, ms?, peak?, at?` | none | REUSE. Note: Confetti default origin is 640/470 in 1280x720 units, pass origin explicitly |
| Iris.tsx | `Iris` | `frame, seg` (Segment kind 'iris') | `./timing` (BONUS_THEME), `./types` (Segment) | COPY-AND-ADAPT: needs a states segment type and theme source |
| LevelCard.tsx | `LevelCard` | `frame, levelIndex` | `./timing` (LEVELS, QUESTIONS), `../settings.json` | COPY-AND-ADAPT: level cards driven by GTW LEVELS and question counts |
| Reminder.tsx | `Reminder` | `frame, seg` (Segment kind 'reminder') | `./types` (Segment), `../settings.json`, `./timing` (FPS) | COPY-AND-ADAPT: needs a states segment type; FPS import must follow the 60 fps design clock |
| Scoreboard.tsx | `Scoreboard` | `frame, rowAt?` | `../settings.json` (scoreboard.ranks, text.scoreboard*, threeD) | COPY-AND-ADAPT: rank names and copy come from GTW settings |
| EndScreen.tsx | `EndScreen` | `frame` | `../settings.json` (endScreen, threeD) | COPY-AND-ADAPT: end-screen copy from GTW settings |
| Hook.tsx | `Hook` | `frame` | `./timing` (QUESTIONS, TOTAL), `../settings.json`, `./assets` (clueSrc) | COPY-AND-ADAPT: heaviest coupling; built on GTW clue images and question list |
| TitleLockup.tsx | `TitleLockup` | `frame, animate?, hideAt?, showAt?, exitAt?` | none (imports style, anim, gsap-helpers) | DISCARD: hard-codes the words GUESS / THE / WORD as keycap tiles; the tile-ignite mechanic could be borrowed for a new title |
| Card3D.tsx | `CARD3D_CANVAS_W`, `CARD3D_CANVAS_H`, `Card3D` | `frame, start, exit, index, word` | `./assets` (imageSrc) | COPY-AND-ADAPT: word-card with clue image; canvas size from style `S` |
| Solid3D.tsx | `Title3D`, `RankBadge3D`, `SubscribeButton3D` | Title3D `frame, start?, text, color, width, height, opacity?`; RankBadge3D `frame, start, flashAt, size`; SubscribeButton3D `frame, start, label, width, height` | none (three, @remotion/three, anim) | REUSE |
| RevealStyle.tsx | `RevealStyleName` (type), `revealStyleFor`, `RevealStyle` | `frame, start, exit, questionId, children` | none | REUSE: `revealStyleFor(questionId)` maps id to one of card-flip, shatter, curtain, spotlight, vault, slot-machine; check the mapping suits state ids |
| Sting.tsx | `BulbSting` | `frame, start, exit` | none | REUSE: channel (QUIZ MATRIX) bulb sting |
| CameraRig.tsx | `CameraRig` | `frame, duration, children` | none (camera, style) | REUSE |
| camera.ts | `handheld`, `bell` | n/a (functions: `handheld(frame)`, `bell(frame, duration)`) | none (imports ./anim) | REUSE |

Counts: REUSE 6, COPY-AND-ADAPT 10, DISCARD 1 (17 files).

Most coupled: Hook.tsx (timing + settings + assets), Hud.tsx (timing data + settings + bonus plan), LevelCard.tsx (LEVELS/QUESTIONS + settings). Reminder.tsx imports three GTW modules but only for the Segment type, settings and FPS.

### Helper export names only

- `style.ts`: SCALE, K, px, COLORS, FONTS, glass, SAFE_X, SAFE_Y, S
- `anim.ts`: prog, fadeIn, revealIn, slamIn, floatY, breathe, cubicBezier, htmlEase, irisEase, cssEase, cssEaseIn, cssEaseOut, cssEaseInOut, bounceEase, mergeEase, confettiEase, ms, keyframes, springStyle, riseStyle, mix, clamp01
- `gsap-helpers.js` (CommonJS `module.exports`): ease, backOut, backIn, expoOut, elasticOut, power3Out, power2InOut, sineInOut, linear, clamp01, mix, progress, stagger
- `util.ts`: makeRandom, shuffle, pickN, range, Glyph (type), glyphs, ConfettiPiece (type), makeConfetti
- `fonts.ts`: no exports; side-effect module that loads Anton, Poppins 600/800, JetBrains Mono, Noto Color Emoji via loadFont

## B Timing audio pipeline

## C Data

## D Components

## E Scenes
