# Music licence (Christmas movie emoji quiz)

The video has ONE music bed, set in `src/xmas/mix.ts` as `MUSIC_FILE` (a path inside `public/`). With `MUSIC_FILE = null`
the video has no music and nothing here is needed.

**Audio.tsx refuses to build when a music file is set and the licence text below is empty.** No copyrighted music, no
film audio, no songs, no lyrics. Only a track whose licence lets you use it in a monetised YouTube video.

## Steps

1. Pick one royalty-free festive instrumental bed that is long enough or loops cleanly (the video is about 12 to 13 minutes;
   a shorter track loops).
2. Paste the licence text (or the licence page text and the licence or receipt number) between the two marker lines below.
   Keep the marker lines exactly as they are.
3. Prepare the track and put it in `public/xmas/music/` (the loudness is set once here, the mix assumes it):
   `ffmpeg -i original.mp3 -af loudnorm=I=-26:TP=-3:LRA=7 -ar 48000 public/xmas/music/bed.mp3`
4. Set `MUSIC_FILE = 'xmas/music/bed.mp3'` in `src/xmas/mix.ts`.
5. Run `npx tsx scripts/build_xmas_duck.ts` (it copies the licence text into `src/xmas/musicLicense.generated.ts`, which
   is what Audio.tsx checks, and bakes the duck envelope).

## Track details

| field | value |
|---|---|
| Title | Christmas quiz music bed (generated) |
| Artist / composer | scripts/make_xmas_music_lively.py (original synthesis) |
| Source (site and page URL) | generated in this repo, public/xmas/music/bed.mp3 |
| Licence name (for example CC0, CC BY 4.0, a stock licence) | Original work, all rights held by the channel owner |
| Licence or receipt number | none needed |
| Date downloaded | generated 2026-11-23 |
| Attribution line required in the video description (or "none") | none |

## Licence text

<!-- LICENSE-TEXT-START -->
Original work. The music bed is synthesized from scratch by scripts/make_xmas_music_lively.py (numpy synthesis and a pedalboard effects chain). It uses no samples, no recordings, no third-party music, no film or song audio and no lyrics, and it is not a carol or any existing tune (a repeating chord-tone arpeggio, drums and bass over a plain chord loop). It was made for this video by the channel owner, who holds all rights to it and may use it in monetised videos. No attribution is required.
<!-- LICENSE-TEXT-END -->
