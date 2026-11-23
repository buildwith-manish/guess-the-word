/**
 * fonts.ts — loads Inter and Nunito for the Dont Say Same As Me video.
 *
 * The repo's src/fonts.ts loads Anton, Poppins, JetBrains Mono and Noto Color
 * Emoji. This video needs Inter (headlines) and Nunito (timer/counter) per the
 * docx spec. Both are SIL OFL. Download the woff2 files into public/fonts/ and
 * this module will load them via @remotion/fonts (which wraps delayRender, so
 * no frame is captured before the fonts are ready).
 *
 * If Inter/Nunito are not yet in public/fonts/, the font stacks in system.ts
 * fall back to Poppins (already loaded) — the video renders, just in the wrong
 * face. Add the files before the final render.
 *
 * USAGE: import './shared/fonts' once from the top of any scene that uses
 * textStyle() (or import it from system.ts). The repo's Root.tsx already
 * imports src/fonts.ts, so the shared faces are always available.
 */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

const FACES = [
  { family: 'Inter',   file: 'Inter-ExtraBold.woff2', weight: '800' },
  { family: 'Inter',   file: 'Inter-SemiBold.woff2',  weight: '600' },
  { family: 'Inter',   file: 'Inter-Regular.woff2',    weight: '400' },
  { family: 'Nunito',  file: 'Nunito-ExtraBold.woff2', weight: '800' },
  { family: 'Nunito',  file: 'Nunito-SemiBold.woff2',  weight: '600' },
];

for (const face of FACES) {
  loadFont({
    family: face.family,
    url: staticFile(`fonts/${face.file}`),
    weight: face.weight,
    format: 'woff2',
  });
}
