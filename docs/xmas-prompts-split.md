# Guess the Christmas Movie by Emoji: split prompts (25 small agent chats)

How to use: new Cursor or Copilot agent chat -> paste the **Starter** (fill in the task ID, and a NEW token only if the agent is not running in your local clone) -> paste that task's block. One task per chat, in order within a group. The last section says which tasks can run at the same time.

Every prompt is plain text, no code blocks, and every task ends with an automatic git add, commit, pull --rebase and push, so you never run git by hand after the setup step.

Token: if you run the agent in your local clone (C:\code\guess-the-word), you do not need a token at all. If you use a cloud agent, use a fine-grained PAT, only `guess-the-word`, Contents read/write, 1-day expiry, and revoke it after each session. The token you pasted in the chat where this pack was made is exposed: revoke it now. It is not written into any file here; the prompts only have a placeholder.

## Files that come with this pack (copy them into the repo first)

Put these in `docs/xmas/` on the new branch (see the setup step), plus this file as `docs/xmas-prompts-split.md`:

| File | What it is |
|---|---|
| questions.json | all 50 slots parsed from your script: 40 movies (two clues, answer, star flag, baked-in text) and 10 bonus rounds with their content, plus ranks and outro asks |
| lines.csv | 110 voice lines in play order, ids `xmas_001` to `xmas_110`, columns `id,type,text`. NO emotion tags in this file |
| voiceover.txt | the same 110 lines as `id | [emotion tag] text`, ready to record. This is the only file with emotion tags |
| lines_optional.csv | the two optional lines from your script (slot 48 wink, "Want forty more?"), off by default |
| clues.csv | 81 image ids with an image-generation prompt for each (80 movie clues plus the new snow globe) |
| script.md | your full script as markdown, so the agent can read the exact wording |
| reference/lg_q3.png | your sample movie frame (2560x1440). It is the look target for the movie frames: frame border, bokeh, light string, caption, glass tiles, timer capsule, counter |

Checked while generating: 40 movie slots and 10 bonus slots, bonuses exactly on slots 5, 10, ... 50, six star slots (26, 29, 33, 39, 41, 48), baked-in text only on slot 16 clue 2 ("34"), slot 24 clue 1 ("FRED") and slot 33 clue 1 ("NOEL"), six red bulbs in the Count the Lights sequence, and 110 voice lines.

## Before task 1a: do this yourself, in git, not in a chat

1. git fetch, git checkout gta6-quiz, git pull
2. git tag gta6-base-1123  (a fixed point, so older work cannot move under this video)
3. git checkout -b christmas-quiz
4. mkdir docs/xmas, copy the files above (including the reference folder) into docs/xmas, copy this file to docs/xmas-prompts-split.md
5. git add docs && git commit -m "Christmas quiz: data files and prompts" && git push -u origin christmas-quiz

Why `gta6-quiz` as the base (same choice as the NFL pack): it already has the iOS layer (src/ios), clip-driven timing, the audio map, the ducking script, the SFX generator and the QA scripts, and it is stable. The newer pieces on `nfl-quiz` (voice chain with pedalboard, clue-fit report, render script, QA script), the search bar from `search-history` and anything useful in `us-states` are read as patterns only, through `git show origin/<branch>:<path>`, without checking those branches out. Nothing in `src/xmas/` imports from `src/gta6/`, `src/nfl/` or any other video.

## Decisions already made in these prompts (and things I had to flag)

1. **Star (★) means a harder movie question with a 10 s timer.** Your script says to confirm this. It is one constant in data (`star`), so changing it later is easy.
2. **Slots flex with the voice.** Your timings assume a 1 s movie intro and a 1.5 s bonus intro. A line like "Bonus one. Spotlight. Name the movie as the letters appear." takes about 3 to 4 s to say. So: intro slot = max(base, clip length + 0.2), reveal slot = max(3.0, title clip + 0.3). The thinking time (8 s, 10 s for ★) never changes. Task 6b reports where the voice overruns and the total runtime.
3. **Bonus length.** Your numbers (1.5 intro + about 8 play + about 3 reveal) add to 12.5 s, not the 16 s in the total. With real voice intros (3 to 4 s) it lands near 14.5 to 16 s, which matches your total. The fallback without clips is 12.5 s, so the first runtime report will be short of 12 minutes until the voice exists.
4. **Spotlight shows only the first 8 letters.** One letter per second for about 8 s of play means "Arthur C" is as far as the search bar gets before the reveal. That fits "guess early", but say so if you want the play time longer.
5. **Chapters.** YouTube ignores chapters shorter than 10 s, and the intro is only 6 s. So the first chapter is "Intro and questions 1 to 10" at 0:00, then 11 to 20, 21 to 30, 31 to 40, 41 to 50, and Your score. This differs from "Intro, then every 10 slots" on purpose.
6. **Bonus content picks I encoded (change them in questions.json if you disagree):** Double Feature uses slot 2 clue 1 (elf hat) and slot 3 clue 2 (steam train), exactly as the run-order table reads. Focus uses both slot 3 clues. Clean Up uses both slot 6 clues. Control Center uses clue 1 of slots 36, 37 and 39 plus the new snow globe. Speed Round and Finale use clue 1 of each named slot. Odd One Out is a 6 by 4 grid of Christmas trees with a different tree at position 17 (0-based). Count the Lights flashes 10 bulbs, 0.5 s each, with 6 red.
7. **Score screen.** The viewer keeps the score, so the video never shows a live score. The light string and the "N OF 50" counter are progress only. The final rank card shows all five tiers on one card, as in the NFL pack (your script only says the rank card holds at least 4 s).
8. **Pass rules on screen (my addition).** Speed Round needs all three and Finale needs three of four. A small caption shows this ("ALL 3 TO SCORE", "3 OF 4 TO SCORE") so viewers know. One constant (`showPassRule`) turns it off.
9. **Slot 49** gets 1.0 s extra before the title ("longer pause"). One constant.
10. **Bulb colours:** movie bulbs alternate red and green in movie order (odd movie = red, even = green), bonus bulbs are gold.
11. **Optional lines** (slot 48 wink, "Want forty more?") stay out unless you switch them on.
12. **No Shorts and no portrait versions.** Long-form only.
13. **Images.** Your 81 clue images come from you (AI generated with the prompts in clues.csv). Until a real file exists, a labelled placeholder is used, and QA fails while any placeholder is left. Real files win automatically.
14. **Emoji glyphs in Odd One Out** are text emoji. If the render machine lacks a colour emoji font they could show as boxes, so task 4c asks for a still check.
15. **Graphics:** no posters, film art, studio logos, actor faces, songs, film audio or lyrics anywhere. Only your own emoji-style clue images, glass UI and gold, red and green.

16. **Visual reference.** docs/xmas/reference/lg_q3.png is the look target for movie frames. Compared with it, the first version of this pack was missing: the rounded gradient frame border (green at top left to orange to red on the right), the soft red and green bokeh background, the "WHICH CHRISTMAS MOVIE?" caption above the tiles, the glossy top highlight and very round corners on the tiles, the glass capsule around the timer segments, the sagging wire on the light string, and the "N OF 50" counter placed below the timer. All of that is now in tasks 2a to 2d and 3a. The green and red "glow" is a soft light zone behind each half of the frame (as in the image), not an outline on the tile.
17. **The reference says "1 OF 40", your script says "N OF 50".** I follow the script (50 slots, 50 bulbs, "N OF 50"). If you want the counter to count movies only, tell me and it becomes a one-line change in ui.ts.
18. **Clue images.** In the reference, a clue image is flat Google-Noto-style emoji, sometimes two in one tile (house plus snowflake) on a transparent background. clues.csv prompts now ask for that style, not glossy 3D. The reference also shows a normal smiling person on slot 1 clue 2, while your script says "faceless", so that one image needs a decision (noted in clues.csv).

19. **New voice style.** There is no "Question N." any more (the counter already shows the number). Each movie now has a short quip about the clues (type `quip`, 5 to 9 words, never says the title), then after the thinking time a short reveal (type `reveal`) that is the title with one or two words before or after it, for example "Elf! Buddy approves." or "All aboard! The Polar Express." Bonus reveals got a small extra word too. The hook, bonus intros, end line, ranks and outro are unchanged. A quip is about 2 s, so each movie grows by roughly 1 s and the total lands near 12.5 minutes; the voice-fit report (6b) shows the exact number. Quips are written not to give the answer away, and the build checks that.
20. **Emotion tags.** voiceover.txt has a tag in front of every line, for example `[playful]` or `[whispers]`. They are written for ElevenLabs v3 audio tags. If the voice model does not support tags, record from lines.csv, which is the same text with no tags. The tag words are never part of the line text, the audio map or on-screen text.

| ID | Work | Output |
|---|---|---|
| 1a | repo recon + context file | docs/xmas-context.md |
| 1b | data.ts + validation script | src/xmas/data.ts |
| 1c | timing.ts + runtime report | src/xmas/timing.ts |
| 1d | sound effects (pedalboard) | public/xmas/sfx |
| 1e | clue image index + placeholders | clueImages.generated.ts |
| 2a | shared parts + system + ui strings | src/xmas/shared, system.ts |
| 2b | GlassTile | components |
| 2c | TimerToPill (segmented timer + title pill) | components |
| 2d | LightString + counter | components |
| 2e | MovieReveal | components |
| 2f | BonusScene frame + registry + XMAS-Bonus | components, scenes |
| 3a | MovieScene + XMAS-Movie | scenes |
| 3b | Hook | scenes |
| 4a | Bonus 1 Spotlight + Bonus 5 Autocomplete | bonus rounds |
| 4b | Bonus 2 Focus + Bonus 6 Clean Up | bonus rounds |
| 4c | Bonus 3 Odd One Out + 7 Count the Lights + 8 Control Center | bonus rounds |
| 4d | Bonus 4 Double Feature + 9 Speed Round + 10 Finale | bonus rounds |
| 5a | Score scene + rank card | scenes |
| 5b | Outro + end screen | scenes |
| 5c | Parts 1 to 3 | parts |
| 5d | Full composition + chapters | Root.tsx, scripts |
| 6a | audio pipeline: clean, timings, audio map | scripts |
| 6b | voice-fit report | scripts |
| 6c | pedalboard voice chain + mix | Audio |
| 7a | thumbnails + metadata | stills, md |
| 7b | render, README, QA | scripts |

---

## Starter (paste first in every chat)

**PASTE START**

Guess the Christmas Movie by Emoji video (50 questions: 40 movie questions plus 10 bonus rounds, dark iOS glass look), Remotion.
Repo: https://github.com/buildwith-manish/guess-the-word
Branch: christmas-quiz
Mode: LOCAL (you are in my local clone, skip cloning, no token) or CLOUD (clone with the token below, then set the remote back to the plain URL so no token stays in git config). Token for CLOUD only (revoked after this session): <PASTE NEW PAT>
Task: <ID> ONLY, from docs/xmas-prompts-split.md (the task block is pasted below).

Rules:
1. Read ONLY: docs/xmas-context.md (if it exists), docs/xmas-progress.md (if it exists), and the files my task names (the image docs/xmas/reference/lg_q3.png counts when my task names it). Do not read anything else "for context".
2. Build only this task. Do not start the next one. Never edit src/gta6/, src/nfl/ or any file from an earlier video. Nothing in src/xmas/ imports from src/gta6/ or src/nfl/. Imports allowed: src/xmas/, src/ios/, node_modules.
3. Frame size: 2560x1440 at 60 fps, 1280x720 reference units rendered through px(). Write sizes and safe margins in reference units. Never use 1920x1080 and never add a second fps or size option.
4. Mobile-first: all text stays in the centre 80% of the frame and is large enough for a phone at arm's length.
5. No hard-coded movie title, clue, answer, slot number, bonus text, rank, duration or voice line in a scene. Everything comes from src/xmas/data.ts, src/xmas/timing.ts and the UI strings in src/xmas/ui.ts.
6. Design is fixed: dark iOS glass (frosted tiles with a bright edge), two large clue tiles side by side with NO plus sign, a soft green light zone behind the left tile and a soft red one behind the right tile, bonus rounds in warmer gold-tinted glass. Look target for movie frames: docs/xmas/reference/lg_q3.png; match its structure and proportions, and where a prompt and the image differ (for example the image says 1 OF 40) the prompt wins and you say so in your reply. There is no clock, no slide-to-answer, no spoken rules beyond the hook line, and no like or subscribe ask before the end.
7. No posters, film art, studio logos, actor faces, songs, lyrics or film audio anywhere. Only our own emoji-style clue images, glass UI, and red, green and gold.
8. Run `npx tsc --noEmit` once at the end. If Chromium works, render ONE `remotion still` of the frame named in the task. If you cannot render, say plainly what you could not verify. Never claim anything "looks right".
9. Scripts must run on Windows (Node/TypeScript, or Python where pedalboard is needed). Follow the repo's existing approach for ffmpeg scripts.
10. Git, automatic: when the file compiles, run git add -A, git commit -m "xmas <task ID>: <short summary>", git pull --rebase, git push. If a shared file (Root.tsx, sfxCues.ts, docs) conflicts, keep both sides' additions. Never commit a token.
11. If you reach about 60% of your budget, stop: commit what works, write the next step in docs/xmas-progress.md, push, and reply.
12. Final reply (short): what was built, composition names, frames or timecodes to check by eye, anything uncertain.

**PASTE END**

---

# Group 1: recon, data, timing, sound, images

## 1a: recon and context file

**PASTE START**

TASK 1a. No feature code. Create docs/xmas-context.md and docs/xmas-progress.md only.
This branch contains gta6-quiz. Read names, exports and props only (do not dump files). For patterns from other branches use `git show origin/<branch>:<path>` and never check those branches out: nfl-quiz, search-history, us-states.
List with path + exports + props, in a table "reuse | path | exports | notes (copy or adapt)":
- iOS layer (src/ios), clock helpers, px(), the Root.tsx composition pattern, font loading (Inter)
- from src/gta6: glass surface or blur helpers, spring presets, NotificationBanner, Scoreboard or ScoreCard, Outro and end screen, Hook, Part pattern, sfxCues pattern
- from nfl-quiz: src/nfl/system.ts and timing.ts patterns, scripts/make_nfl_sfx.py, build_nfl_timings.py, build_nfl_audio_map.ts, master_nfl_voice.py, src/nfl/Audio.tsx, nfl_qa.ts, render_nfl.sh, nfl_runtime.ts, nfl_chapters.ts (whichever exist)
- from search-history: the search bar and typing animation (needed for Bonus 1 Spotlight) and any keyboard drawing
- from us-states: any tile, glass or segmented timer pieces
- how clip lengths feed timing.ts (timings.csv -> timings.generated.ts), and how the old scripts clean clips
Then a "gaps" list of what must be built new for this video: GlassTile, TimerToPill, LightString, MovieReveal, BonusScene and registry, the ten bonus rounds, ClueImage and the clue image index.
Also create docs/xmas-progress.md with a checklist of all 25 tasks (1a to 7b), 1a ticked.
Done when: pushed; list anything you expected and could not find.
Git: git add -A, git commit -m "xmas 1a: recon and context", git pull --rebase, git push.

**PASTE END**

## 1b: data and validation

**PASTE START**

TASK 1b. Create scripts/sync_xmas_data.ts, src/xmas/data.ts and scripts/check_xmas_data.ts.
Read: docs/xmas-context.md, docs/xmas/questions.json, docs/xmas/lines.csv.
sync_xmas_data.ts copies docs/xmas/questions.json to src/xmas/questions.json (docs is the source of truth). data.ts imports that JSON, never retypes it, and exports: typed `Slot` (a union of `MovieSlot` and `BonusSlot`), `slots` (50, play order), `movies`, `bonuses`, `meta`, `ranks`, `outroAsks`, `slotAt(n)`, `isStar(n)`, `bulbColor(slot)` (movie bulbs: odd movieIndex red, even green; bonus gold), `clueRef` types for the reused tiles ({slot, clue} or {new}), `voiceOf(slot)` (the quip and reveal text for a movie, the intro and reveal text for a bonus), and the constants `showPassRule = true`.
Validation exits non-zero if any of these fail: not 50 slots; bonuses are not exactly slots 5, 10, ... 50; not 40 movies and 10 bonuses; star slots are not exactly 26, 29, 33, 39, 41, 48; any movie lacks clue1, clue2, a clue id, a label or an answer; baked-in text is not exactly "34" on slot 16 clue 2, "FRED" on slot 24 clue 1 and "NOEL" on slot 33 clue 1; bonus 7 sequence does not contain exactly redCount (6) red entries; bonus 3 oddIndex is outside cols x rows; any reused tile ref points to a missing slot or clue; bonus 8 does not have exactly four icons with one new decoy; ranks do not cover 0 to 50 with no gap or overlap; any movie lacks voice.intro or voice.reveal, a reveal does not contain the answer title, or an intro contains the answer title (the quips must never give the answer away).
It prints warnings (not failures) for meta.musicLicenseText being null, and a list of every title longer than 20 characters (the title pill must handle the longest, slot 13 at 30 characters). Do not change that threshold.
Do not edit questions.json to make it pass.
Done when: tsc passes and the warnings table is in your reply.
Git: git add -A, git commit -m "xmas 1b: data and validation", git pull --rebase, git push.

**PASTE END**

## 1c: timing

**PASTE START**

TASK 1c. Create src/xmas/timing.ts and scripts/xmas_runtime.ts.
Read: docs/xmas-context.md, src/xmas/data.ts, the clip-timing part of src/gta6/timing.ts (pattern only, copy the idea, do not import).
Constants (seconds, one place only): hookSec 6, movieIntroSec 1.0, movieThinkSec 8, starThinkSec 10, movieRevealSec 3.0, slot49ExtraPauseSec 1.0 (added before the title on slot 49 only), bonusIntroSec 1.5, bonusPlaySec 8, bonusRevealSec 3.0, scoreSec 20 (the rank card holds at least 4 s), outroSec 25 (the end screen is the last 15 s), flexPadIntro 0.2, flexPadReveal 0.3.
Per movie: intro (the spoken quip, the tiles spring in during it, and the timer starts when the quip ends) + think + reveal. Per bonus: intro + play + reveal. Once clip timings exist: intro slot = max(base, intro clip + flexPadIntro), reveal slot = max(base, reveal clip + flexPadReveal). The thinking and play times never change. Without clips the fallback uses the base values.
Timer segments are derived, not typed: movie 8 segments (10 for star) at one per second; bonus 6 segments spread evenly over bonusPlaySec.
Export `segments` (hook, 50 slots, score, outro with start and end seconds), `partRanges` (Part1: hook + slots 1 to 20, Part2: slots 21 to 40, Part3: slots 41 to 50 + score + outro), `chapters` (Intro and questions 1 to 10 at 0:00, then 11 to 20, 21 to 30, 31 to 40, 41 to 50, Your score; YouTube ignores chapters under 10 s so the 6 s intro is merged into the first one), and frame helpers following the repo's clock convention.
The script prints per-part and total runtime and compares with the 12 minute target. Note in the output that the fallback bonus length is 12.5 s and the script total assumes 16 s once real voice intros exist.
Done when: tsc passes; reply with a table: part, start, end, frames; and the total.
Git: git add -A, git commit -m "xmas 1c: timing and runtime report", git pull --rebase, git push.

**PASTE END**

## 1d: sound effects (pedalboard)

**PASTE START**

TASK 1d.
Read: docs/xmas-context.md, scripts/make_gta6_sfx.py or scripts/make_nfl_sfx.py (pattern and the pedalboard chain only; use git show for the nfl one if it is not on this branch).
Create scripts/make_xmas_sfx.py writing 48 kHz wav files to public/xmas/sfx/ plus manifest.json, synthesized with numpy and finished through a pedalboard chain (high-pass, gentle compressor, limiter). Sounds, all made by us: tiles-in (soft glass whoosh), tick-01 to tick-10 (one soft tick per timer segment, pitch rising slightly with each number; 10 because star questions have 10 segments), timer-full (short flash), reveal-chime (one clean sound), bulb-on (tiny glow pop), bonus-banner, gold-bulb, rank-reveal, plus bonus extras: type-key (soft key click for Spotlight), focus-lock (soft focus confirm, not a camera shutter recording), clean-sparkle, flash-blip (Count the Lights), swipe (app-switcher card), widget-pop, ring-glow (Odd One Out). Keep every sound short, soft and non-melodic (no song-like tunes). Peak -3 dB. No copyrighted audio. Also src/xmas/sfx.ts with typed ids from the manifest.
Append the sfx ids to docs/xmas-context.md and tick 1a to 1d in docs/xmas-progress.md.
Done when: tsc passes; list each file's length.
Git: git add -A, git commit -m "xmas 1d: sound effects", git pull --rebase, git push.

**PASTE END**

## 1e: clue image index and placeholders

**PASTE START**

TASK 1e. Create scripts/build_xmas_clue_index.ts, scripts/make_xmas_placeholders.ts, src/xmas/clueImages.generated.ts (generated) and src/xmas/components/ClueImage.tsx.
Read: docs/xmas-context.md, docs/xmas/clues.csv, src/xmas/data.ts (types only).
Real clue images are flat emoji-style PNGs on a transparent background (one or two emoji per image, like the house and snowflake in docs/xmas/reference/lg_q3.png) and will be added by me as public/xmas/clues/<image_id>.png (also accept .webp and .jpg), for example s01_c1.png and bonus08_snowglobe.png. The 81 ids are in clues.csv.
make_xmas_placeholders.ts writes one SVG placeholder per image id that has no real file, into public/xmas/clues/placeholders/<id>.svg: a dark glass square with the clue label large and centred (and the baked-in text, such as 34, FRED or NOEL, drawn big), and a small "PLACEHOLDER" tag. build_xmas_clue_index.ts scans the folders and writes clueImages.generated.ts mapping every id to { src, isPlaceholder }; a real file always wins over a placeholder. It prints counts of real, placeholder and missing, and for real files prints the pixel size and warns if one is not square.
ClueImage({ id }) renders the image through staticFile, fits it inside its tile with the same rounded corners, and never draws any text of its own. It must be reusable by every bonus round (the same id can appear in two scenes).
Done when: tsc passes; reply with the counts.
Git: git add -A, git commit -m "xmas 1e: clue image index and placeholders", git pull --rebase, git push.

**PASTE END**

---

# Group 2: components

## 2a: shared parts, system and UI strings

**PASTE START**

TASK 2a.
Read: docs/xmas-context.md (reuse table only) and view docs/xmas/reference/lg_q3.png.
Copy (do not import) into src/xmas/shared/ only the parts the table marks "copy" and that this video needs: the clock helpers wrapper, the glass surface helper, the spring presets and the font loading approach. Fix the paths so nothing points at src/gta6 or src/nfl. Report any copied file that still depends on another video's content.
Create src/xmas/system.ts: colour roles (dark background gradient, glass fill, bright glass edge, ink, muted, green glow for the left tile, red glow for the right tile, gold for bonus, bulb red, bulb green, bulb gold, a function that interpolates timer colour from green to red), the type scale (Inter via the repo's loading approach, and a scene waits for the font), SAFE margins in reference units (centre 80%), spring presets, and one layout block in reference units: two clue tiles side by side (each at least 400 units square, a visible gap, no plus sign), the timer bar under them, the title pill position, the light string along the top, the "N OF 50" counter below the timer (the one text item allowed below the safe band). Check the layout fits 1280x720 and write down the numbers.
Take the proportions from the reference image (its pixels divided by 2 give reference units): tiles about 400 x 400 units at x 219 to 618 and x 662 to 1062, y 138 to 538, with very round corners (about 0.27 of the tile size); timer capsule about x 320 to 960, y 578 to 642 with 8 pill segments inside; light string at y 40 to 77; caption centred at about y 98; counter centred at about y 688. Also in system.ts: a rounded frame border drawn as a thin gradient outline (green at top left, through orange, to red on the right and bottom), a dark background with soft blurred red and green bokeh dots (static or very slow drift), and two soft ambient light zones, green behind the left half and red behind the right half (this is the "green and red glow"). Unlit bulbs are dim blue-grey glass.
Create src/xmas/ui.ts with the fixed UI strings: the caption "WHICH CHRISTMAS MOVIE?", BONUS, the "N OF 50" formatter, "ALL 3 TO SCORE", "3 OF 4 TO SCORE", FILL-IN labels used only by placeholders. No movie text lives here.
Done when: tsc passes; list copied files with source paths. Update docs/xmas-context.md.
Git: git add -A, git commit -m "xmas 2a: shared parts, system and ui strings", git pull --rebase, git push.

**PASTE END**

## 2b: GlassTile

**PASTE START**

TASK 2b. Create src/xmas/components/GlassTile.tsx.
Read: docs/xmas-context.md, src/xmas/system.ts, src/xmas/components/ClueImage.tsx (props only).
A frosted glass tile like the reference: very round corners, a bright edge, a soft glossy highlight along the top inside edge, and a dark translucent fill. It holds one ClueImage (a single image file may contain one or two emoji side by side, so scale it to about 75% of the tile width and keep it centred). Props only: imageId, side ("left" and "right" tint the ambient light zone behind the tile green and red as in the reference, "bonus" gold, "none" for tiles inside bonus layouts), size, and frame-driven states: enterFrame (spring in), glideFrame (glides up and shrinks slightly), pulseFrame (one soft pulse). The image is never cropped badly: text baked into an image (34, FRED, NOEL) must stay fully inside the tile. Use backdrop blur sparingly (no more than two blurred layers on screen at once) so rendering stays fast.
Done when: tsc passes; try a still of left and right tiles using one real or placeholder image; list the frames for enter, glide and pulse.
Git: git add -A, git commit -m "xmas 2b: GlassTile", git pull --rebase, git push.

**PASTE END**

## 2c: TimerToPill

**PASTE START**

TASK 2c. Create src/xmas/components/TimerToPill.tsx and src/xmas/titleFit.ts.
Read: docs/xmas-context.md, src/xmas/system.ts, src/xmas/timing.ts (exports only).
A segmented timer that morphs into a title pill. Like the reference: a wide glass capsule holding 8 rounded pill segments side by side (10 for star, 6 for bonus), empty segments dim grey. Props: segments (8, 10 or 6 from timing.ts), startFrame, secondsPerSegment (derived), variant ("movie" or "bonus": bonus is gold), morphFrame, title. Behaviour: one segment fills per step, filling in order, colours going from green through lime and amber to red across the bar (in the reference 5 of 8 are filled: green to amber) (gold for bonus); when full, a short flash; at morphFrame the bar morphs into a pill that shows the title. titleFit.ts auto-shrinks the title text so the longest title (slot 13, 30 characters) fits the pill on one line inside the safe area and is never below a phone-readable size (state the minimum you chose). Export `timerCues(startFrame, segments)` listing the tick sfx ids (tick-01 rising to tick-N) and the timer-full cue.
Done when: tsc passes; list frames for first segment, last segment, flash and the morph; test the pill with slot 13 and slot 3 titles.
Git: git add -A, git commit -m "xmas 2c: TimerToPill", git pull --rebase, git push.

**PASTE END**

## 2d: LightString and counter

**PASTE START**

TASK 2d. Create src/xmas/components/LightString.tsx.
Read: docs/xmas-context.md, src/xmas/system.ts, src/xmas/data.ts (bulbColor and slots only).
A string of 50 bulbs hanging from a thin wire that sags in gentle waves along the top (as in the reference): 40 red and green bulbs for the movies and 10 gold bulbs for the bonus rounds, at the slot positions from data (bonus at 5, 10, ... 50). Props: litUpTo (number of slots already revealed; this makes each Part render the same when started alone), pulseSlot and pulseFrame (the bulb that lights now, with a small glow pop), and a mode "all" for the ending where all 50 glow. Unlit bulbs are dim glass. The "N OF 50" counter (formatter from ui.ts) sits centred below the timer: the number bright white, "OF 50" dimmer, wide letter spacing, as in the reference. Export `bulbCues(slot, frame)` for the bulb-on or gold-bulb sfx.
Done when: tsc passes; list frames for: all unlit, 12 lit, a pulse on slot 13, a gold bonus bulb pulse, and all 50.
Git: git add -A, git commit -m "xmas 2d: LightString", git pull --rebase, git push.

**PASTE END**

## 2e: MovieReveal

**PASTE START**

TASK 2e. Create src/xmas/components/MovieReveal.tsx.
Read: docs/xmas-context.md, GlassTile, TimerToPill and LightString (props only), src/xmas/timing.ts (exports only).
The movie answer choreography, all from props and timing.ts: tiles glide up and shrink slightly, the timer bar morphs into the title pill, the tiles pulse once, the matching bulb lights, the reveal chime plays. Slot 49 uses its longer pause. The title text comes from data only. Export `revealCues(slot, start)`.
Done when: tsc passes; list the frames to check (reveal start, morph mid, pulse, bulb lit) and say how slot 49's pause shows.
Git: git add -A, git commit -m "xmas 2e: MovieReveal", git pull --rebase, git push.

**PASTE END**

## 2f: BonusScene frame, registry and XMAS-Bonus

**PASTE START**

TASK 2f. Create src/xmas/scenes/BonusScene.tsx, src/xmas/components/BonusReveal.tsx, src/xmas/bonus/registry.ts, src/xmas/bonus/PlaceholderRound.tsx, and register "XMAS-Bonus" (prop bonus, default 1) in Root.tsx.
Read: docs/xmas-context.md, GlassTile, TimerToPill, LightString (props only), src/xmas/timing.ts and data.ts (exports only).
BonusScene({ slot }): the frame turns to warmer gold-tinted glass, a BONUS banner slides in (text from ui.ts, the round name from data), the gold timer bar (6 segments over the play time), then the round's play area, then BonusReveal with the answers from data (one pill for one answer, a stack for two to four) and the gold bulb lights. The pass-rule caption (showPassRule) shows only for bonus 9 and 10. Timing: intro, play, reveal from timing.ts.
Define the round contract in registry.ts: every round is a component with props { slot: BonusSlot, playFrom: number, playFrames: number } that draws only the play area. The registry maps bonus 1 to 10 to PlaceholderRound at first (a visible "TODO bonus N" tile). Tasks 4a to 4d replace one registry entry each. Export `bonusCues(slot, start)`.
Done when: tsc passes; frames to check for bonus 1 (intro banner, play, reveal).
Git: git add -A, git commit -m "xmas 2f: BonusScene frame and registry", git pull --rebase, git push.

**PASTE END**

---

# Group 3: movie scene and hook

## 3a: MovieScene

**PASTE START**

TASK 3a. Create src/xmas/scenes/MovieScene.tsx and src/xmas/Preview.tsx.
Read: docs/xmas-context.md, docs/xmas/reference/lg_q3.png, the exports of GlassTile, TimerToPill, LightString, MovieReveal, src/xmas/timing.ts.
MovieScene({ slot }): the frame border, bokeh background and ambient green and red zones from system.ts, the caption (from ui.ts) centred above the tiles during the think time (it fades as the tiles glide up), LightString (litUpTo = slot - 1), two tiles spring in during the intro, the segmented timer fills for the think time (8 segments, 10 for star), then MovieReveal. Left tile green glow, right tile red glow, no plus sign. Voice and sfx cues come from the audio map and the cue exports. Register "XMAS-Movie" (prop slot, default 1; if the slot is a bonus slot it shows the movie scene for the nearest movie, with a note in the file) and "XMAS-Movies-All" (all 40 movie slots back to back, no bonuses, for a fast scrub).
Done when: tsc passes; render slot 1 at about 4 s and compare it with the reference image point by point (border, bokeh, string, caption, tile size and gloss, capsule with 5 of 8 segments, counter), listing every difference; list slots to scrub (1, 13 for the longest title, 16 for baked-in "34", 26 for a star with 10 segments, 49 for the longer pause).
Git: git add -A, git commit -m "xmas 3a: MovieScene", git pull --rebase, git push.

**PASTE END**

## 3b: Hook

**PASTE START**

TASK 3b. Create src/xmas/scenes/Hook.tsx; register "XMAS-Hook".
Read: docs/xmas-context.md, LightString and GlassTile (props only), src/xmas/timing.ts.
About 6 s: the dark frame fades up, the light string glows on (bulbs light in a quick sweep, then settle to the dim unlit state so slot 1 starts with nothing lit), two empty glass tiles appear. The voice line is the hook line from the audio map. No title card, no rules text, no like or subscribe ask. The last frame hands off to slot 1 with no visible jump. Export `hookCues`.
Done when: tsc passes; frames to check (0, 1.5 s, 3 s, 6 s).
Git: git add -A, git commit -m "xmas 3b: Hook", git pull --rebase, git push.

**PASTE END**

---

# Group 4: the ten bonus rounds

Each task replaces only its own registry entries in src/xmas/bonus/registry.ts and never edits BonusScene.

## 4a: Bonus 1 Spotlight and Bonus 5 Autocomplete

**PASTE START**

TASK 4a. Create src/xmas/bonus/Spotlight.tsx and src/xmas/bonus/Autocomplete.tsx; replace registry entries 1 and 5.
Read: docs/xmas-context.md, src/xmas/bonus/registry.ts (contract), src/xmas/data.ts (bonus 1 and 5 only), the search bar and typing pattern named in the context file.
Spotlight (iOS Spotlight search): a search bar types the title from data one letter per second (lettersPerSec), so only the first letters appear in the play time; soft key sfx per letter. Text only, no images. Autocomplete (iOS keyboard predictions): the line "Home ___" with the three suggestion chips from data (Alone, Safe, Sweet) over a keyboard drawn in code (no Apple assets or logos). The correct chip is highlighted only after the play time ends, when BonusReveal shows the answer.
Done when: tsc passes; frames: Spotlight with 3 letters and with 8 letters, Autocomplete before and after the highlight.
Git: git add -A, git commit -m "xmas 4a: bonus 1 and 5", git pull --rebase, git push.

**PASTE END**

## 4b: Bonus 2 Focus and Bonus 6 Clean Up

**PASTE START**

TASK 4b. Create src/xmas/bonus/Focus.tsx and src/xmas/bonus/CleanUp.tsx; replace registry entries 2 and 6.
Read: docs/xmas-context.md, src/xmas/bonus/registry.ts (contract), src/xmas/data.ts (bonus 2 and 6 only), GlassTile and ClueImage (props only).
Focus (camera autofocus): the two slot 3 clue images start heavily blurred and sharpen over sharpenSec (about 6 s) under a yellow focus square drawn in code that locks at the end. Clean Up (Photos Clean Up): the two slot 6 clue images are half erased by a sparkle effect during the play time, so the viewer names the movie from what is left; at the reveal the erased parts come back. Use the same image ids from data (no new images). Keep the blur and the erase mask cheap to render.
Done when: tsc passes; frames: Focus at start, middle, end; Clean Up before, half erased, restored.
Git: git add -A, git commit -m "xmas 4b: bonus 2 and 6", git pull --rebase, git push.

**PASTE END**

## 4c: Bonus 3 Odd One Out, Bonus 7 Count the Lights, Bonus 8 Control Center

**PASTE START**

TASK 4c. Create src/xmas/bonus/OddOneOut.tsx, CountLights.tsx and ControlCenter.tsx; replace registry entries 3, 7 and 8.
Read: docs/xmas-context.md, src/xmas/bonus/registry.ts (contract), src/xmas/data.ts (bonus 3, 7 and 8 only), ClueImage (props only).
Odd One Out (emoji keyboard): a grid of cols x rows from data using the common emoji with the odd emoji at oddIndex; at the reveal a glowing ring marks it (ring-glow sfx). Check with one still that the emoji draw as colour glyphs and not boxes; if they do not, say so and stop at a plain fallback. Count the Lights (the light string): a separate big string (not the top progress string) flashes the red and green sequence from data over flashSec (0.5 s per flash), the viewer counts the red ones; the answer shown is the data answer. Control Center: four Control-Center-style toggle tiles from data (sledgehammer, ghost, gear with green ears, snow globe); at the reveal the decoy tile is highlighted and the other three are dimmed.
Done when: tsc passes; frames: each round at play start, mid and reveal; say how many red flashes the sequence has (it must be 6).
Git: git add -A, git commit -m "xmas 4c: bonus 3, 7 and 8", git pull --rebase, git push.

**PASTE END**

## 4d: Bonus 4 Double Feature, Bonus 9 Speed Round, Bonus 10 Finale

**PASTE START**

TASK 4d. Create src/xmas/bonus/DoubleFeature.tsx, SpeedRound.tsx and Finale.tsx; replace registry entries 4, 9 and 10.
Read: docs/xmas-context.md, src/xmas/bonus/registry.ts (contract), src/xmas/data.ts (bonus 4, 9 and 10 only), GlassTile and ClueImage (props only).
Double Feature (app switcher): two cards side by side in an app-switcher look, the left from slot 2 and the right from slot 3 exactly as the refs in data say. Speed Round (Shortcuts): three clue tiles (slots 38, 42, 43) shown one after another, perTileSec (2 s) each, with a small step indicator; no tile stays after its time. Finale (widget stack): a 2x2 widget of four tiles (slots 26, 29, 33, 39). The reveal for each shows all answers through BonusReveal (two, three and four rows). Nothing about the pass rules is typed here (BonusScene shows the caption).
Done when: tsc passes; frames: each round at play start and at each tile change (Speed Round at 0, 2 and 4 s), and the reveal.
Git: git add -A, git commit -m "xmas 4d: bonus 4, 9 and 10", git pull --rebase, git push.

**PASTE END**

---

# Group 5: ending, parts, full composition

## 5a: score scene and rank card

**PASTE START**

TASK 5a. Create src/xmas/scenes/ScoreScene.tsx.
Read: docs/xmas-context.md, LightString (props only), src/xmas/data.ts (ranks), src/xmas/timing.ts.
About 20 s: all 50 bulbs glow (LightString mode "all"), the voice line "That was all fifty. Time to count your score." from the audio map, then the rank bands light from lowest to highest, each with its voice line from the audio map. The final rank card shows all five tiers on ONE card (Coal in the Stocking 0 to 10, Elf in Training 11 to 20, Reindeer 21 to 30, Santa's Helper 31 to 40, Santa's Favorite 41 to 50), large type, screenshot-ready, and holds at least 4 s. Rank names and ranges come from data only. No like or subscribe ask here.
Done when: tsc passes; frames: all bulbs lit, each band lighting, and the first frame of the 4 s hold.
Git: git add -A, git commit -m "xmas 5a: score scene", git pull --rebase, git push.

**PASTE END**

## 5b: outro and end screen

**PASTE START**

TASK 5b. Create src/xmas/scenes/Outro.tsx.
Read: docs/xmas-context.md, the end screen in src/gta6 (via the context notes), src/xmas/data.ts (outroAsks), src/xmas/timing.ts.
About 25 s. The three asks appear on screen in order and are also spoken (text and voice from data and the audio map): "Comment your score out of fifty, and screenshot your rank card." then "Which question beat you? Tell me the number." then "Subscribe so you do not miss the next quiz." The end screen is the last 15 s: a next-video slot, a subscribe button, a miniature of the rank card in the corner, then a final fade. The optional line "Want forty more? Comment part two." is controlled by one constant (default off) and only inserts before the subscribe ask.
Done when: tsc passes; timecodes to check.
Git: git add -A, git commit -m "xmas 5b: outro and end screen", git pull --rebase, git push.

**PASTE END**

## 5c: Parts 1 to 3

**PASTE START**

TASK 5c. Create src/xmas/parts/Part1.tsx, Part2.tsx, Part3.tsx, src/xmas/sfxCues.ts and register "XMAS-P1", "XMAS-P2", "XMAS-P3".
Read: docs/xmas-progress.md (if 3a, 3b, 4a to 4d, 5a or 5b is not done, list it and stop), the exports of MovieScene, BonusScene, Hook, ScoreScene, Outro, src/xmas/timing.ts (partRanges).
Part1: Hook, then slots 1 to 20. Part2: slots 21 to 40. Part3: slots 41 to 50, ScoreScene, Outro. Each slot is a Sequence at the offset from timing.ts; movie slots use MovieScene, every 5th slot uses BonusScene. Each Part must render identically when started alone (the light string state comes from the slot number, never from earlier frames). Cue lists in sfxCues.ts as part1Cues, part2Cues, part3Cues (movie cues from timerCues and revealCues, bonus cues from bonusCues, hook and ending cues).
Done when: tsc passes; timecodes to check, especially the hook into slot 1, the first bonus (slot 5), and the slot 20 to 21 and slot 40 to 41 boundaries.
Git: git add -A, git commit -m "xmas 5c: parts 1 to 3", git pull --rebase, git push.

**PASTE END**

## 5d: full composition and chapters

**PASTE START**

TASK 5d.
Read: docs/xmas-progress.md. If 5c is not done, say so and stop.
Register "XMAS-Full" in src/Root.tsx: Part1 to Part3 as Sequences at the offsets from timing.ts. Create scripts/xmas_chapters.ts that prints the YouTube chapter list from timing.ts (Intro and questions 1 to 10 at 0:00, then 11 to 20, 21 to 30, 31 to 40, 41 to 50, and Your score) and writes docs/xmas/chapters.txt. Check every chapter is at least 10 s long.
Done when: tsc passes; the chapter list is in your reply.
Git: git add -A, git commit -m "xmas 5d: full composition and chapters", git pull --rebase, git push.

**PASTE END**

---

# Group 6: audio

The voiceover comes from your recordings: one clip per line, ids `xmas_001` to `xmas_110` in play order, from docs/xmas/lines.csv (and the same lines in voiceover.txt). The line types are `hook, quip, reveal, bonusintro, bonusreveal, end, rank, outro`. The tag-free text is in lines.csv; voiceover.txt is the same lines with an emotion tag in front, only for recording.

## 6a: audio pipeline

**PASTE START**

TASK 6a.
Read: docs/xmas-context.md, docs/xmas/lines.csv, src/xmas/data.ts (types only), the gta6 or nfl scripts it names for timings, audio map and clip cleaning (patterns only).
Create scripts/clean_xmas_clips.sh (or the repo's Windows-friendly equivalent), scripts/build_xmas_timings.py (writes src/xmas/timings.csv and src/xmas/timings.generated.ts) and scripts/build_xmas_audio_map.ts (writes src/xmas/audioMap.ts). Clips are wav in public/xmas/voiceover/clips/<id>.wav: trim silence to 0.1 s, loudnorm -16 LUFS, originals kept in an archive, the raw folder ignored by git. The audio map links: hook, then for each slot in play order (movie slots: quip and reveal, bonus slots: bonusintro and bonusreveal), then end, the five rank lines in order, the three outro lines. It exits non-zero on any leftover row, a slot without both clips, a type mismatch, a movie quip or reveal whose text differs from slot.voice in data, a reveal that does not contain the slot's answer title, a quip that contains the answer title, or a bonus line whose text differs from data. It must also fail if any line text in lines.csv contains a square-bracket emotion tag. The optional lines are not included unless a constant says so. timing.ts must read the generated timings (flex rules from task 1c).
Done when: tsc passes; a table "slot, intro id, reveal id" is in your reply, and per-part and total runtime.
Git: git add -A, git commit -m "xmas 6a: audio pipeline", git pull --rebase, git push.

**PASTE END**

## 6b: voice-fit report

**PASTE START**

TASK 6b. Create scripts/xmas_voice_fit.ts.
Read: src/xmas/timings.csv, src/xmas/data.ts, src/xmas/timing.ts (constants only).
For every slot list clips longer than their base slot (movie quip: base 1.0 s but expect about 2 s, bonus intro 1.5 s, reveal 3.0 s), the overrun in seconds and the line text. Print the 15 worst, the total added time over the base lengths, and the total runtime with the flex rules. Do not edit any text or clip.
Done when: tsc passes and the table is in your reply. Send it to me; if the runtime is far from 12 minutes I will shorten lines and only those clips need re-recording.
Git: git add -A, git commit -m "xmas 6b: voice fit report", git pull --rebase, git push.

**PASTE END**

## 6c: voice chain and mix (pedalboard)

**PASTE START**

TASK 6c. Create scripts/master_xmas_voice.py, src/xmas/Audio.tsx and docs/xmas/music-license.md; wire into XMAS-Full.
Read: docs/xmas-context.md, scripts/make_xmas_sfx.py (pedalboard usage only), the duck script pattern named in the context file, src/xmas/audioMap.ts, src/xmas/sfxCues.ts (exports only).
1. master_xmas_voice.py: apply ONE identical pedalboard chain to every voice clip, in this order: high-pass about 80 Hz, a light compressor (about 3:1, threshold about -18 dB, attack about 10 ms, release about 100 ms), a gentle presence boost around 3 kHz (2 dB or less), a limiter at -1 dB. No reverb or effects on the voice. Read from clips/, write to clips_master/, then loudness-match every clip to -16 LUFS. Print before/after peak and loudness for the 10 loudest and 10 quietest clips. The same chain for every clip so the voice stays consistent.
2. Audio.tsx: place each clip at its start frame from timing.ts (hook at the start, the quip at the slot start, the reveal line at the reveal start, bonusintro and bonusreveal likewise, the end line, the five rank lines and the three outro lines at their starts). Music: one royalty-free festive bed through a `musicSrc` prop, ducked under the voice by an envelope built from the clip timeline with a script. During thinking time only the music bed and the timer ticks play. SFX cue lists per part, 6 to 8 dB under the voice. List any frame where an sfx and a clip collide.
3. music-license.md: a place to paste the licence text of the chosen track; Audio.tsx must refuse a build when musicSrc is set and the file has no licence text. No copyrighted music, no film audio, no songs anywhere.
Done when: tsc passes; list what to listen for in Studio.
Git: git add -A, git commit -m "xmas 6c: voice chain and mix", git pull --rebase, git push.

**PASTE END**

---

# Group 7: thumbnails, render, QA

## 7a: thumbnails and metadata

**PASTE START**

TASK 7a.
Read: docs/xmas/script.md (section 9 only), src/xmas/system.ts, src/xmas/components/GlassTile.tsx (props only), docs/xmas/chapters.txt.
Three stills "XMAS-Thumb-A", "XMAS-Thumb-B", "XMAS-Thumb-C" at 1280x720 (a normal image size, not px()), bright and high contrast, two glass tiles with clue images and big text, no movie art, no posters, no logos. A: the slot 2 clue 1 and slot 3 clue 2 tiles with "50 QUESTIONS?". B: the two slot 1 clue tiles with "WHAT'S YOUR SCORE?". C: the two slot 13 clue tiles with "40 MOVIES + 10 BONUS". Keep the text to a few big words.
Also docs/xmas/metadata.md: the three title options from data meta.titles, the description (a short intro, the chapters from docs/xmas/chapters.txt, and the line "This channel is not affiliated with any film studio. Movie titles are the property of their owners."), tags, and the pinned comment "Drop your score out of 50 and the question that beat you."
Done when: tsc passes; try rendering one still and say if you could not.
Git: git add -A, git commit -m "xmas 7a: thumbnails and metadata", git pull --rebase, git push.

**PASTE END**

## 7b: render, README, QA

**PASTE START**

TASK 7b.
Read: docs/xmas-progress.md, NOTES.md, the render script and QA script named in docs/xmas-context.md (render_nfl.sh and nfl_qa.ts if present).
1. scripts/render_xmas.sh (or the Windows-friendly equivalent the repo uses): render each of Parts 1 to 3 as 3840x2160 at 60 fps (scale 1.5 of the 2560x1440 composition, copied from how earlier videos reached 4K), H.264 CRF 14 to 16, yuv420p, join losslessly, loudness-normalize to -14 LUFS, -1.5 dBTP, AAC 320 kbps, 48 kHz. Add a fallback flag for 2560x1440. No Shorts.
2. docs/xmas-README.md: preview, render, where things live, how to add the real clue images, and a "before you record" checklist.
3. scripts/xmas_qa.ts: exits non-zero if any of these fail: every slot has its intro and reveal clips in the audio map; any clue image is still a placeholder; any bonus round in the registry is still PlaceholderRound; the light string does not have exactly 50 bulbs (40 movie, 10 gold); meta.musicLicenseText or music-license.md is empty while music is used; any scene contains a movie title, clue or answer typed in code (grep against data); any poster, logo or film-art asset is referenced; any audio file other than our sfx, our voice clips and the chosen music is used; the optional lines are on without being recorded; any text sits outside the safe area (check the layout constants); a plus sign is drawn between the tiles.
Done when: committed; tell me the first render command to run.
Git: git add -A, git commit -m "xmas 7b: render, README and QA", git pull --rebase, git push.

**PASTE END**

---

## What can run at the same time

| Wave | Run together | Wait for |
|---|---|---|
| 1 | 1a alone | the git setup step above |
| 2 | 1b | 1a |
| 3 | 1c, 1d, 1e, 2a (up to 4 chats) | 1b for 1c, 1d, 1e. 2a needs 1a. |
| 4 | 2b, 2c, 2d (3 chats) | 2a (2b also needs 1e, 2c needs 1c) |
| 5 | 2e, 2f (2 chats) | 2e needs 2b, 2c, 2d. 2f needs 2b, 2c, 2d. |
| 6 | 3a, 3b, 5a, 5b (up to 4 chats) | 3a needs 2e and 2f. 3b needs 2b and 2d. 5a needs 2d. 5b needs 2a. |
| 7 | 4a, 4b, 4c, 4d (up to 4 chats) | 2f (4b and 4d also need 2b and 1e; 4c needs 1e) |
| 8 | 5c, then 5d | 3a, 3b, 4a to 4d, 5a, 5b |
| 9 | 6a, 7a | 6a needs the recorded clips (or at least lines.csv). 7a needs 5d. |
| 10 | 6b, then 6c | 6a (6c also needs 5d) |
| 11 | 7b | everything |

Run 3 or 4 chats at once at most. Several tasks edit the same shared files (Root.tsx, sfxCues.ts, bonus/registry.ts, docs/xmas-context.md, docs/xmas-progress.md), so the pull --rebase step in the Starter matters.

## After each chat (5 minutes)

1. git pull, then npx remotion studio.
2. Open the composition the chat named and scrub to the frames it listed. Good slots to scrub: 1, 5 (bonus 1), 13 (longest title), 16 (baked-in "34"), 26 (star, 10 segments), 40 (bonus 8), 49 (longer pause), 50 (finale).
3. Check: no plus sign between tiles, green glow on the left and red on the right, one timer segment filling per second, the title pill fitting without being tiny, the right bulb lighting (red or green for movies, gold for bonuses), "N OF 50" correct, bonus rounds in gold glass with the BONUS banner, no poster or logo anywhere, sounds on the right frames.
4. Revoke the token (cloud mode only).

## Fix chat prompt

**PASTE START**

Repo: https://github.com/buildwith-manish/guess-the-word, branch christmas-quiz. Mode: LOCAL (no token) or CLOUD with token <PASTE NEW PAT> (revoked after, not saved in git config).
Read docs/xmas-context.md, docs/xmas-progress.md and the one file named below. The Starter rules apply.

Fix only this: <file, slot number or timecode, what is wrong, what you expected>.
Do not touch other scenes. If the fix needs a shared component change, say first which scenes it could affect.
When it compiles: git add -A, git commit -m "xmas fix: <short summary>", git pull --rebase, git push.

**PASTE END**
