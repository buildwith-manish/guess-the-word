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

Read from the GTW files on this branch (grep and short reads; bodies not read in full). Everything below is how GTW does it. The search video must copy the pattern into `src/search/`, not edit these files.

### Timeline
- Root `settings.json` is the source of truth for size and rate: `fps` 60, `width` 2560, `height` 1440. Its top-level keys: fps, width, height, motionBlur, camera, voiceover, transitions, fastest, streak, brand, levelCardFrames, reminder, levels, levelThemes, timer, timing, bonus, scoreboard, endScreen, text, images, sound, threeD, background, levelMood.
- `src/timing.ts` exports `WIDTH`, `HEIGHT`, `RENDER_FPS` (settings), `FPS = 30` (design frames) and `TIME_SCALE = RENDER_FPS / FPS = 2`. Scene motion is written in 30 fps design frames.
- `src/clock.ts` is one line of logic: `useDesignFrame = () => useCurrentFrame() / TIME_SCALE`. It returns fractional design frames (12, 12.5, 13 ...), so every animation is sampled at 60 fps. It imports `TIME_SCALE` from `./timing`.
- A segment is a plain object `{ kind, from, duration, ...extra }`. `buildTimeline()` (not exported) keeps a `cursor`, and `push(seg)` appends the segment and adds its `duration` to the cursor. Kinds in `src/types.ts`: hook, levelCard, question, bonus, iris, reminder, scoreboard, endScreen. Result: `TIMELINE = { segments, totalFrames }` (design frames).
- `RENDER_TOTAL_FRAMES = round(TIMELINE.totalFrames * TIME_SCALE)` is the composition length at 60 fps.
- `locate(segments, frame)` walks the list from the end and returns `{ seg, local, index }` (`local` = frame inside the segment). A scene component gets `local` and draws from it.
- Per-scene plans are built by pure functions, for example `buildQuestionPlan(q, levelIndex, withTitle): QuestionPlan` (all offsets inside the scene in design frames: titleFrames, timerStart, timerFrames, lettersDone, stamp, hold, exit, duration, plus optional `vo` and `vqQuestion` clips). Other exports: `LEVELS`, `QUESTIONS`, `TOTAL`, `themeForQuestion`, `levelMoodFor`, `BONUS_THEME`, `voiceClip`, `voiceClipNamed`, `voiceClipScoreboard`.
- `timing.ts` imports `settings.json` and `rounds.json` at the top, so it is GTW-coupled. The search video needs its own `src/search/search-timing.ts` with the same shape (segments, cursor, `locate`), reading `search-data.ts` and `search-settings.json`.
- `npm run timeline` (`scripts/timeline.js`) bundles `src/timing.ts` with esbuild and prints the real frame plan (`--json`, `--segments`). It is hard-wired to GTW's `timing.ts`, so it will not show the search timeline.

### Cues (sound effects)
- `src/sound.ts`: `type Cue = { frame, sfx, rate?, volume? }`. `frame` is an absolute design frame, `rate` is pitch through playback rate, `volume` defaults to 1. `Sfx` is derived from the keys of `sound-manifest.json` (minus `music-*`), so a new sound name type-checks once it is in the manifest.
- `buildCues()` walks `TIMELINE.segments` and calls a local `add(frame, sfx, extra)`, which rounds the frame and pushes a cue. Real entries: `add(f0 + 26, 'boom');` and `[0, 36, 72].forEach((at, i) => add(f0 + at, 'blip', { rate: (500 + i * 160) / 500 }));`. Timer ticks are one `add(clockStart + k * FPS, left <= 3 ? 'thump' : 'tick')` per second.
- Exports: `Sfx`, `Cue`, `Voice`, `SOUND_ENABLED` (`settings.sound.enabled`), `MUSIC_LOOP_FRAMES = 256`, `clipFrames(sfx, rate)`, `VOICE_DIR`, `CUES`, `VOICE`, `MUSIC_END` (the scoreboard start), `MUSIC_ENVELOPES`, `layerAudible`. `CUES`, `VOICE` and `MUSIC_END` are built from the GTW `TIMELINE`, so search needs its own `buildCues` over its own timeline.
- `src/Soundtrack.tsx` (one component, `Soundtrack`) places everything as `<Sequence><Audio/></Sequence>` pairs, so any frame range can be rendered in any order: music loops, one Sequence per cue (`volume={c.volume ?? 1}`), one per voiceover clip (`volume = settings.voiceover.volume`).
- Music is three stacked layers (`music-base.wav`, `music-l1.wav`, `music-l2.wav`), each 256 design frames, looped with Sequences. Each layer's volume is read from a precomputed per-design-frame envelope (`MUSIC_ENVELOPES`, interpolated to 60 fps in `Soundtrack`). Layer intensity follows the question number (the `[0,1,1,2,2]` ramp).
- Ducking is baked into that envelope. Under every SFX the music drops to `DUCK_FLOOR = 0.44` for 0.28 s, then recovers exponentially. Under every voiceover clip it drops to `settings.voiceover.duckFloor` (0.3). `HUSHES` are windows where the music cuts out completely (the silent beat before an answer lands).
- Other `settings.sound` keys: enabled, dir, sfxGain, musicGain, panic.
- Files in `public/sounds/`: blip, boom, bulb-ping, chime-arp, chime-erase, ding-hi, ding, drumroll, flare, flip, jingle-cta, jingle-rules, legend, letter, music-base, music-l1, music-l2, ping-hi, pop, remind, riser, row, rule-sweep, siren, stamp, thump, tick-low, tick, title, whoosh (all `.wav`).

### Adding a new sound
- `scripts/generate-audio.js` is procedural: no dependencies, no ffmpeg, seeded noise, so reruns give byte-identical files. It writes every `.wav` into `settings.sound.dir` (default `public/sounds`) and rewrites `src/sound-manifest.json` (name to length in seconds).
- A tone sound is one entry in the `TONES` table: `name: [T(at, freq, dur, type, vol, freq2?)]` (seconds, Hz, oscillator type, volume, optional end frequency), for example `pop: [T(0, 300, 0.3, 'sine', 0.22, 90)]`. Noise and sweep sounds (whoosh, drumroll, riser) are built in separate blocks of the script (not read).
- Steps: add the entry, run `npm run sounds`, then use the name in a cue. All gains are baked into the file (`MASTER 0.5 * sfxGain`), so cue volume stays at or below 1.
- Conflict with the task rules: `generate-audio.js`, `sound-manifest.json` and `public/sounds/` are shared GTW files, and the script regenerates all of them. Adding a search sound means editing shared files, which rule 3 forbids unless you allow it. Decide before the sound task (see the notes for 0c).

### Voiceover clip lookup
- Clips live in `public/voiceover/` (`settings.voiceover.dir`). `scripts/voiceover-scan.js` (`npm run voiceover`, also run first by `npm run render`) measures them and writes `src/voiceover-manifest.json`: `{ q, qq, bonus, bonusq, intro, scoreboard, outro }`, each entry `{ file, seconds }`. WAV length is read directly, other formats go through ffprobe.
- Fixed names: `qNN`, `qqNN`, `bonusNN`, `bonusqNN`, `intro`, `scoreboard_<rank>`, `outro`, in `.mp3 .wav .m4a .aac .ogg .flac`. The committed manifest is empty today.
- `voiceClip(kind, n)`, `voiceClipNamed`, `voiceClipScoreboard` in `timing.ts` turn a manifest entry into `{ file, frames }` (`ceil(seconds * 30)`), or `undefined` when there is no clip (nothing changes then). `settings.voiceover` has `enabled`, `dir`, `offsetFrames` 14, `tailFrames` 10, `volume`, `duckFloor`, `template`, `bonusTemplate`. Reveal holds are stretched so a clip always finishes before the card leaves.
- The names and manifest are tied to GTW's question numbers. The search video needs its own naming and its own manifest.

### Rendering and upload
- npm scripts: `dev` (remotion studio), `typecheck` (`tsc --noEmit`), `timeline`, `sounds`, `voiceover`, `render` (scan + `render-batches.js --lane`, one full render), `render:batches`, `render:lanes`, `render:fast`, `render:draft`, `render:full`, `pixel:dev`, `pixel:still`, `pixel:render`, `pixel:draft`, `postinstall` (`scripts/build-questions.js`, runs on `npm install`), `data`, `images*`.
- `scripts/render-batches.js` renders in resumable chunks (flags `--size`, `--only`, `--concat`, `--clean`, `--force`, `--lane`) and runs `remotion render <COMPOSITION> out/...`. Composition comes from the env var `REMOTION_COMPOSITION` (default `GuessTheWord`). It gets the length from `scripts/timeline.js`, so chunked mode is tied to the GTW timeline. For the search video use `npx remotion render <id>` or the workflow.
- Compositions registered in `src/Root.tsx`: `GuessTheWord`, `PixelGuess`, Stills `ThumbZero` etc. `src/Root.tsx` is a shared file; a search composition must be added there (rule 10 says to keep both sides on conflict).
- `.github/workflows/render-pixel.yml` ("Render Video (parallel)", `workflow_dispatch`). Inputs: `composition` (default `PixelGuess`), `entry` (default `src/index.ts`), `chunks` (40/20/10, default 40), `test_frames` (default `0` = full video), `crf` (18), `keep_days` (21), `preset` (slow/medium/fast, default slow), `video_name` (default `pixel-guess`; letters, numbers, - and _), `max_parallel` (40/20/10, default 40), `reuse_run_id` (default empty). It checks the composition id exists via Remotion's own list. Run it from Actions on the branch that holds the project.
- `.github/workflows/render.yml` has inputs `motion_blur` (default 'true'), `quality` (default `1440p`), `resume_from_run`, and no composition input (it reads the first composition of `src/index.ts`; not read in full). Use `render-pixel.yml` for the search video.
- `.github/workflows/upload-youtube.yml` (`workflow_dispatch`). Inputs: `run_id` (required, the render run number), `video_name` (required, same as the render), `title` (required, max 100), `description` (required, `\n` for new lines, max 5000), `keywords` (optional, comma separated), `privacy` (private/unlisted/public, default private), `made_for_kids` (no/yes, default no), `category_id` (default 24). `scripts/youtube_upload.py` reads everything from env vars (`VIDEO_FILE`, `YT_REFRESH_TOKEN`, client id/secret as repository secrets).
- `./tag-video NN ["title"] [voice-id]`: `git add -A`, commit "Finish video NN: ...", tag `video-NN-final`, push the current branch. Use only when you decide a video is final; it stages everything.

## C Data

### C.2 search-settings.json and types.ts (task 1c)

**src/search/search-settings.json** (the only place for level accents and search timings; read it, never hard-code):

| Key | Shape | Values |
|---|---|---|
| levels | `[{ name, time, accent, bg, theme: [a, b] }]` | EASY 7 s `#34D399` / `#05241B`; MEDIUM 8 s `#FBBF24` / `#2B1B04`; HARD 9 s `#FB7185` / `#2A0712`. `time` = clock seconds. Accent and bg reuse GTW's level colours. `theme` pairs reuse the first three GTW `levelThemes` |
| searchAt | 4 fractions of the clock | 0.04, 0.26, 0.48, 0.7 (clue 1 to clue 4) |
| hintAt | fraction of the clock | 0.82 (the 2-emoji hint) |
| reveal | `{ minHoldSeconds }` | 2.5 |
| bonus | `{ after[], clockSeconds, answerHoldTicks, theme }` | after rounds 10, 20, 30, 40, 50; clock 9 s; answer hold 75 ticks; theme `#FF8A3D` / `#2B1204` (GTW bonus theme) |
| reminder | `{ after[], ticks }` | after rounds 8 and 22; 51 ticks (GTW value) |
| levelCardFrames | ticks | 72 (GTW value) |
| ranks | `[{ name, min, accent }]` | LEGEND 45, EXPERT 35, GOOD 25, BEGINNER 15, KEEP GOING 0 (out of 55 = 50 rounds + 5 bonus) (`min` = lowest score for the rank; accents are GTW's rank colours) |
| typing | `{ ticksPerChar, minTicks }` | 2 ticks per character, at least 12 ticks per search |
| nextVideo | `{ title, linkText }` | both empty for now |

Units: "ticks" and `levelCardFrames` are 1/30 s design frames (see B). `time`, `clockSeconds` and `minHoldSeconds` are seconds. `searchAt` and `hintAt` are fractions of the level (or bonus) clock.

Values the task did not give, chosen by task 1c and easy to change: bonus `clockSeconds` 9, bonus `answerHoldTicks` 75, reminder `ticks` 51, `levelCardFrames` 72, typing 2 / 12, the level `theme` pairs, all `accent` colours in `ranks`, the bonus `theme`. The rank name is `KEEP GOING` (with a space) as GTW shows it.

**src/search/types.ts** (types only, no imports; does not import search-data.ts):
- `LevelCfg` = `{ name, time, accent, bg, theme }`
- `Hud` = `{ label, number, total }` (no `erases`: this video has none)
- `IrisVariant` = `'circle' | 'sweep' | 'curtain'`
- `RoundSegment` = `{ kind: 'round', from, duration, index, levelIndex, lead? }` (`index` is 0-based into `ROUNDS`)
- `BonusSegment` = `{ kind: 'bonus', from, duration, index }` (`index` is 0-based into `BONUS`)
- `Segment` = hook | levelCard `{ levelIndex }` | `RoundSegment` | `BonusSegment` | iris `{ fromTheme, toTheme, hud, variant? }` | reminder `{ theme, hud }` | scoreboard | endScreen. Every member has `from` and `duration` (design frames)
- `Timeline` = `{ segments, totalFrames }`
- The Round and Bonus data types are owned by `search-data.ts` (task 1a). In `types.ts` the names are `RoundSegment` and `BonusSegment` so they do not clash with them.

## D Components (final pack)

All components live in `src/search/components/`. Units: "ticks" are 30 fps design frames, sampled at 60 fps through `useDesignFrame()` (src/clock.ts); every tick below is scene-local (what `useDesignFrame()` returns inside the scene's Sequence). Positions and sizes are 1280x720 reference units; each component applies `px()` itself. Components take plain props (no import of search-data.ts); the scene supplies content from `search-data.ts`, timings from `search-timing.ts` and `search-settings.json`. No images anywhere. All components import `../../fonts` (side effect, loads Anton, Poppins, JetBrains Mono, Noto Color Emoji).

### File layout
```
src/search/
  search-data.ts            ROUNDS, BONUS (content)
  search-settings.json      levels, searchAt, hintAt, typing, ...
  search-timing.ts          buildRoundPlan(index), TIMELINE, locate, LEVELS, FPS, TIME_SCALE, WIDTH, HEIGHT
  types.ts                  Hud, LevelCfg, Segment types
  SHComponents.tsx          the one-frame component sheet (composition SH-Components)
  components/
    SearchBar.tsx           typewriter bar + Recent searches list
    TimerBar.tsx            draining clock bar
    HintEmoji.tsx           two emoji, ping + bounce
    ProgressDots.tsx        row of round dots
    AnswerCard.tsx          name + from, stamp, shake, flash
    SearchStage.tsx         layout frame: Background, HUD pill, five slots (SLOTS)
src/Root.tsx                registers Still "SH-Components" (shared file, 3 lines added)
```
Shared GTW files used and never edited: `style.ts` (COLORS, FONTS, px, glass, SCALE, SAFE_X, SAFE_Y), `clock.ts`, `timing.ts` (FPS), `fonts.ts`, `Background.tsx`.

### SearchBar
Generic dark search UI: rounded bar, SVG magnifier, typewriter with blinking caret, "Recent searches" list with SVG clock rows. A finished search holds, slides into the top row, the bar clears.
Props: `searches: string[]`, `starts: number[]` (start tick of each), `typeTicks: number` (ticks per character), `accent: string`, `size: number` (bar width), `at: {x, y}` (centre-x, top-y), `heading?: string` (default "Recent searches").
Exports: `typedCount(frame, start, length, typeTicks = 1)` (character k, 1-based, appears at `start + (k - 1) * typeTicks`), `slideStart(start, length, typeTicks)`, `slideEnd(...)`, `HOLD_CHARS` (6), `SLIDE_CHARS` (8), both multiples of `typeTicks`. A search needs `length * typeTicks + HOLD_CHARS * typeTicks` ticks before the next one starts (see "Known issue" below). Height is about 0.72 x `size`.

### TimerBar
Slim bar draining over the clock, remaining whole seconds at its right, pulse once a second, `accent` colour, red in the last second. Nothing before `from`; stays empty after the end.
Props: `from: number` (start tick), `duration: number` (ticks), `accent: string`, `size: number` (width incl. number), `at: {x, y}` (centre-x, top-y).

### HintEmoji
Two large emoji, each with a ping ring and a spring scale-bounce, the second slightly later. Glyphs use `FONTS.emoji` (Noto Color Emoji).
Props: `emoji: [string, string]`, `from: number` (hint tick), `at: {x, y}` (centre of the pair), `size: number` (emoji size), `accent?: string` (ping colour, default COLORS.yellow).

### ProgressDots
Dots: future dim, current pulsing with glow, finished filled in their level colour.
Props: `index: number` (0-based current), `total: number`, `levelOf: (i: number) => string`, `at: {x, y}` (centre-x, centre-y), `size: number` (row width).

### AnswerCard
Reveal card: name very large on one line (shrunk for long names), "from" line smaller under it; stamp-in, short damped shake, flash. Built new (no src/states on this branch).
Props: `name: string`, `from: string`, `at: number` (stamp tick), `accent: string`, `place: {x, y}` (centre-x, top-y), `size: number` (card width). Height is 0.42 x `size`.

### SearchStage
Round layout: `Background`, a HUD pill top left (own glass pill; GTW `Hud` is bonus/streak-coupled), and five slots, all inside the safe margin from style.ts.
Props: `theme: [string, string]`, `accent: string`, `hud: Hud` (`{label, number, total}` from types.ts), `energy?: number`, slots `search?`, `timer?`, `hint?`, `answer?`, `dots?`.
Slot = `{ at?: number; children: ReactNode | ((rect: Rect) => ReactNode) }`. `at` is the scene tick the slot fades in (omit = always shown; nothing rendered before). A function child receives the slot rect.
Exports: `SLOTS` (rects `{x, y, w, h}` in reference units; `x` is centre-x, `y` is top, except `hud.x` = left edge and `dots.y` = centre line), `Rect`, `SlotProps`, `SearchStageProps`. Layout: search and timer in the left-centre column; hint above answer in the right column; dots along the bottom.
Placement rules: pass `at={{x: r.x, y: r.y}}` and `size={r.w}` for SearchBar, TimerBar; for HintEmoji use `at={{x: r.x, y: r.y + r.h / 2}}`; for AnswerCard use `place={{x: r.x, y: r.y}}`, `size={r.w}`; for ProgressDots `at={{x: r.x, y: r.y}}`, `size={r.w}`.

### Composition SH-Components
`Still` in `src/Root.tsx`, 2560x1440, one frame: rounds 1 (EASY), 11 (MEDIUM), 21 (HARD) side by side, each a full stage scaled to a third. Every component sits in a `Sequence` with a negative `from`, so each is frozen at its own best tick (SearchBar mid-typing in search 3, TimerBar mid-clock, red in the HARD panel, hint and answer one second after they land). Render: `npx remotion still src/index.ts SH-Components out/sh-components.png`.

### Complete example scene
`RoundScene` (a whole round) and `buildRoundCues` (its sound cues). Both type-checked. Mount the scene in a Sequence at the round's `from`; `buildRoundCues(index, f0)` takes the same `from` as `f0`.
```tsx
import React from 'react';
import type { Cue } from '../sound';
import { buildRoundPlan, FPS, LEVELS } from './search-timing';
import { ROUNDS } from './search-data';
import cfg from './search-settings.json';
import { SearchStage } from './components/SearchStage';
import { SearchBar } from './components/SearchBar';
import { TimerBar } from './components/TimerBar';
import { HintEmoji } from './components/HintEmoji';
import { AnswerCard } from './components/AnswerCard';
import { ProgressDots } from './components/ProgressDots';

/** One round scene. `index` is the 0-based round; the scene is mounted in a Sequence, so
 *  every tick below is scene-local (what useDesignFrame() returns inside it). */
export const RoundScene: React.FC<{ index: number }> = ({ index }) => {
  const round = ROUNDS[index];
  const plan = buildRoundPlan(index);
  const { accent, theme } = plan.level;
  const typeTicks = cfg.typing.ticksPerChar;
  const sameLevel = ROUNDS.filter((r) => r.level === round.level);
  const levelOf = (i: number) => LEVELS.find((l) => l.name === ROUNDS[i].level)!.accent;

  return (
    <SearchStage
      theme={theme}
      accent={accent}
      hud={{ label: round.level, number: sameLevel.indexOf(round) + 1, total: sameLevel.length }}
      search={{
        at: 0, // the bar fades in at scene tick 0
        children: (r) => (
          <SearchBar
            searches={round.searches}
            starts={plan.searchAt}
            typeTicks={typeTicks}
            accent={accent}
            size={r.w}
            at={{ x: r.x, y: r.y }}
          />
        ),
      }}
      timer={{
        at: plan.clockStart,
        children: (r) => (
          <TimerBar from={plan.clockStart} duration={plan.clockFrames} accent={accent} size={r.w} at={{ x: r.x, y: r.y }} />
        ),
      }}
      hint={{
        children: (r) => (
          <HintEmoji emoji={round.hint} from={plan.hintAt} at={{ x: r.x, y: r.y + r.h / 2 }} size={r.w * 0.4} accent={accent} />
        ),
      }}
      answer={{
        children: (r) => (
          <AnswerCard name={round.name} from={round.from} at={plan.revealAt} accent={accent} place={{ x: r.x, y: r.y }} size={r.w} />
        ),
      }}
      dots={{
        children: (r) => <ProgressDots index={index} total={ROUNDS.length} levelOf={levelOf} at={{ x: r.x, y: r.y }} size={r.w} />,
      }}
    />
  );
};

/** Cue list for one round, same pattern as buildCues() in src/sound.ts: an absolute design
 *  frame per cue (scene start `f0` + scene-local tick), rounded, pushed by a local add(). */
export const buildRoundCues = (index: number, f0: number): Cue[] => {
  const round = ROUNDS[index];
  const plan = buildRoundPlan(index);
  const typeTicks = cfg.typing.ticksPerChar;
  const cues: Cue[] = [];
  const add = (frame: number, sfx: Cue['sfx'], extra: Partial<Cue> = {}) =>
    cues.push({ frame: Math.round(frame), sfx, ...extra });

  // Key-click on every second character of every search (character k lands at start + (k - 1) * typeTicks).
  round.searches.forEach((text, i) => {
    for (let k = 2; k <= text.length; k += 2) add(f0 + plan.searchAt[i] + (k - 1) * typeTicks, 'tick-low');
  });
  // Clock: one tick per second, a thump in the last three.
  for (let k = 0; k * FPS < plan.clockFrames; k++) {
    const left = Math.ceil((plan.clockFrames - k * FPS) / FPS);
    add(f0 + plan.clockStart + k * FPS, left <= 3 ? 'thump' : 'tick');
  }
  add(f0 + plan.hintAt, 'pop'); // hint emoji
  add(f0 + plan.revealAt, 'stamp'); // answer card stamps
  return cues;
};
```

### Cue-list pattern (from section B)
- `Cue = { frame, sfx, rate?, volume? }` (src/sound.ts). `frame` is an absolute design frame: segment `from` plus scene-local tick, rounded. One local `add(frame, sfx, extra)` rounds and pushes (as in `buildCues()` there).
- Key-click: for each search, every second character k (even k): `add(f0 + starts[i] + (k - 1) * typeTicks, 'tick-low')`. This matches `typedCount`, which shows character k at that tick.
- Clock: one `tick` per second from `clockStart`, `thump` in the last three seconds. Hint: `pop` at `hintAt`. Answer: `stamp` at `revealAt`.
- Sound names must exist in `src/sound-manifest.json` (existing list in section B). New sounds mean editing shared files (generate-audio.js, manifest, public/sounds), which is still undecided.
- The search video needs its own cue builder over its own timeline (`CUES` in src/sound.ts is built from GTW's `TIMELINE`) and its own Soundtrack wiring.

### Known issue (found while writing 2e, not fixed)
The search clue spacing and the typing speed do not fit together. `searchAt` puts the next search 0.22 of the clock after the last (46 ticks EASY, 53 MEDIUM, 59 HARD). At `typing.ticksPerChar` = 2, a search needs `length * 2 + 12` ticks to type and hold: 48 to 118 ticks, 82 on average (searches are 18 to 53 characters). So the next search usually starts before the previous one has finished typing, and the bar clears mid-sentence. Options: slower `searchAt` spacing or a shorter clue text (data/settings), or a per-search `typeTicks` (a SearchBar change). Needs a decision before the round scene is built.

## E Scenes
