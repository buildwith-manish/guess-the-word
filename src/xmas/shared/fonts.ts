import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';

/**
 * fonts.ts: font loading for this video.
 * Same approach as the repo's other videos: bundled woff2 files loaded with @remotion/fonts, so a render never depends on
 * the machine's installed fonts. Inter 400/500/600/700 (public/fonts/ios, SIL Open Font License, Inter-LICENSE.txt there)
 * and Noto Color Emoji (public/fonts, for the emoji clues).
 *
 * Nothing loads on import (so this file can be imported by a plain Node script); a scene calls useXmasFonts() at its top.
 * The hook holds the frame with delayRender() until every face is ready, so no frame is captured with a fallback font.
 */
const INTER_WEIGHTS = ['400', '500', '600', '700'] as const;

let started: Promise<unknown> | null = null;

export const loadXmasFonts = (): Promise<unknown> => {
  if (!started) {
    started = Promise.all([
      ...INTER_WEIGHTS.map((w) =>
        loadFont({ family: 'Inter', url: staticFile(`fonts/ios/Inter-${w}.woff2`), weight: w, format: 'woff2' }),
      ),
      loadFont({ family: 'Noto Color Emoji', url: staticFile('fonts/NotoColorEmoji.woff2'), weight: '400', format: 'woff2' }),
    ]);
  }
  return started;
};

/** Call at the top of every scene. Blocks the frame until Inter and the emoji font are loaded. */
export const useXmasFonts = (): void => {
  const [handle] = useState(() => delayRender('xmas fonts'));
  useEffect(() => {
    loadXmasFonts().then(
      () => continueRender(handle),
      (err) => cancelRender(err),
    );
  }, [handle]);
};
