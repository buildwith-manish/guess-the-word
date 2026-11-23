import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import '../fonts'; // Noto Color Emoji (emoji fallback) and the older faces

/**
 * Inter (SIL Open Font License, public/fonts/ios/Inter-LICENSE.txt): the free typeface closest to the iOS system font.
 * Four weights, bundled, so a render never depends on installed fonts. loadFont() holds the frame until it is ready.
 */
const WEIGHTS = ['400', '500', '600', '700'] as const;

for (const w of WEIGHTS) {
  loadFont({ family: 'Inter', url: staticFile(`fonts/ios/Inter-${w}.woff2`), weight: w, format: 'woff2' });
}
