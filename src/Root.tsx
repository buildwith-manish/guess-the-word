import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { PixelMain } from './pixel/PixelMain';
import { PIXEL_TOTAL_FRAMES } from './pixel/pixel-timing';

/**
 * One composition. Its duration comes from the timeline (settings.json +
 * questions.js), so adding questions changes the runtime automatically — no
 * second place to keep in sync.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GuessTheWord"
        component={Main}
        durationInFrames={RENDER_TOTAL_FRAMES}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      {/* Guess the Brand: Pixelated — procedural pixelation quiz (src/pixel) */}
      <Composition
        id="PixelGuess"
        component={PixelMain}
        durationInFrames={PIXEL_TOTAL_FRAMES}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
