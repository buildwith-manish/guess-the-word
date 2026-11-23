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
| Title | |
| Artist / composer | |
| Source (site and page URL) | |
| Licence name (for example CC0, CC BY 4.0, a stock licence) | |
| Licence or receipt number | |
| Date downloaded | |
| Attribution line required in the video description (or "none") | |

## Licence text

<!-- LICENSE-TEXT-START -->
<!-- LICENSE-TEXT-END -->
