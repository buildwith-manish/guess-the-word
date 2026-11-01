import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

/**
 * All five faces are bundled in public/fonts (SIL Open Font License), so a
 * render never depends on the machine's installed fonts:
 *   Anton            — display / headlines
 *   Poppins 600/800  — body, chips, labels
 *   JetBrains Mono   — watermark
 *   Noto Color Emoji — every emoji in the quiz (colour glyphs, no system font)
 *
 * loadFont() wraps delayRender(), so no frame is captured before the fonts are
 * ready — that is what keeps text from flickering to a fallback mid-render.
 */
const FACES = [
  { family: 'Anton', file: 'Anton-Regular.woff2', weight: '400' },
  { family: 'Poppins', file: 'Poppins-SemiBold.woff2', weight: '600' },
  { family: 'Poppins', file: 'Poppins-ExtraBold.woff2', weight: '800' },
  { family: 'JetBrains Mono', file: 'JetBrainsMono-Bold.woff2', weight: '700' },
  { family: 'Noto Color Emoji', file: 'NotoColorEmoji.woff2', weight: '400' },
];

for (const face of FACES) {
  loadFont({
    family: face.family,
    url: staticFile(`fonts/${face.file}`),
    weight: face.weight,
    format: 'woff2',
  });
}
