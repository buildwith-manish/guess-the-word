import React from 'react';
import { Composition, Still } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { PixelMain } from './pixel/PixelMain';
import { PIXEL_TOTAL_FRAMES } from './pixel/pixel-timing';
import { ThumbEasy, ThumbLadder, ThumbZero } from './thumbnails/Thumbnails';

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
      {/* YouTube thumbnails (1280x720). Render: npx remotion still src/index.ts ThumbZero out/thumb-zero.png */}
      <Still id="ThumbZero" component={ThumbZero} width={1280} height={720} />
      <Still id="ThumbLadder" component={ThumbLadder} width={1280} height={720} />
      <Still id="ThumbEasy" component={ThumbEasy} width={1280} height={720} />
    </>
  );
};
