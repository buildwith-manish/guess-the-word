import React from 'react';
import { Composition, Still } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { PixelMain } from './pixel/PixelMain';
import { PIXEL_TOTAL_FRAMES } from './pixel/pixel-timing';
import { ThumbEasy, ThumbLadder, ThumbZero } from './thumbnails/Thumbnails';
import { ComponentsSheet } from './states/ComponentsSheet';
import { StateRoundPreview } from './states/scenes/StateRound';
import type { StateRoundPreviewProps } from './states/scenes/StateRound';
import {
  buildQuestionPlan,
  HEIGHT as ST_HEIGHT,
  RENDER_FPS as ST_FPS,
  TIME_SCALE as ST_TIME_SCALE,
  WIDTH as ST_WIDTH,
} from './states/state-timing';

const stRoundFrames = (index: number) => Math.round(buildQuestionPlan(index).duration * ST_TIME_SCALE);

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
      {/* Video 4 (states): one-frame sheet of every component, real data for four states (src/states/ComponentsSheet.tsx) */}
      <Still id="ST-Components" component={ComponentsSheet} width={WIDTH} height={HEIGHT} />
      {/* Video 4 (states): one round with its sound cues. Prop `index` = 0-based question index (video order); the length follows the plan for that index */}
      <Composition
        id="ST-Round"
        component={StateRoundPreview}
        durationInFrames={stRoundFrames(1)}
        fps={ST_FPS}
        width={ST_WIDTH}
        height={ST_HEIGHT}
        defaultProps={{ index: 1 } satisfies StateRoundPreviewProps}
        calculateMetadata={({ props }) => ({ durationInFrames: stRoundFrames(props.index) })}
      />
      {/* YouTube thumbnails (1280x720). Render: npx remotion still src/index.ts ThumbZero out/thumb-zero.png */}
      <Still id="ThumbZero" component={ThumbZero} width={1280} height={720} />
      <Still id="ThumbLadder" component={ThumbLadder} width={1280} height={720} />
      <Still id="ThumbEasy" component={ThumbEasy} width={1280} height={720} />
    </>
  );
};
