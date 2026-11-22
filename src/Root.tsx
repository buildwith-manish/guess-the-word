import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { Part1, part1Frames } from './gta6/parts/Part1';
import { ALL_FRAMES, Gta6Preview, Gta6PreviewAll, PREVIEW_DEFAULTS, previewFrames } from './gta6/Preview';

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
      <Composition
        id="GTA6-Q"
        component={Gta6Preview}
        durationInFrames={previewFrames(PREVIEW_DEFAULTS.order)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={PREVIEW_DEFAULTS}
        calculateMetadata={({ props }) => ({ durationInFrames: previewFrames(props.order) })}
      />
      <Composition
        id="GTA6-Q-All"
        component={Gta6PreviewAll}
        durationInFrames={ALL_FRAMES}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition id="GTA6-P1" component={Part1} durationInFrames={part1Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
