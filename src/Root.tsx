import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { Part1, part1Frames } from './gta6/parts/Part1';
import { Part2, part2Frames } from './gta6/parts/Part2';
import { Part3, part3Frames } from './gta6/parts/Part3';
import { Part4, part4Frames } from './gta6/parts/Part4';
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
      <Composition id="GTA6-P2" component={Part2} durationInFrames={part2Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} defaultProps={{ showVerifyTags: false }} />
      <Composition id="GTA6-P3" component={Part3} durationInFrames={part3Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="GTA6-P4" component={Part4} durationInFrames={part4Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
