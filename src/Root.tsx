import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { Part1, part1Frames } from './gta6/parts/Part1';
import { Part2, part2Frames } from './gta6/parts/Part2';
import { Part3, part3Frames } from './gta6/parts/Part3';
import { Part4, part4Frames } from './gta6/parts/Part4';
import { Gta6Full } from './gta6/Full';
import { RENDER_TOTAL_FRAMES as GTA6_TOTAL_FRAMES } from './gta6/timing';
import { Hook as NflHook } from './nfl/scenes/Hook';
import { Predictions as NflPredictions } from './nfl/scenes/Predictions';
import { Part1 as NflPart1, part1Frames as nflPart1Frames } from './nfl/parts/Part1';
import { Part2 as NflPart2, part2Frames as nflPart2Frames } from './nfl/parts/Part2';
import { Part3 as NflPart3, part3Frames as nflPart3Frames } from './nfl/parts/Part3';
import { Part4 as NflPart4, part4Frames as nflPart4Frames } from './nfl/parts/Part4';
import { NflFull, nflFullFrames } from './nfl/Full';
import { withWatermark as nflWithWatermark } from './nfl/components/Watermark';

const NflP1 = nflWithWatermark(NflPart1, 0);
const NflP2 = nflWithWatermark(NflPart2, 1);
const NflP3 = nflWithWatermark(NflPart3, 2);
const NflP4 = nflWithWatermark(NflPart4, 3);
import { hookSec as nflHookSec, predictionsLenSec as nflPredictionsLenSec, secToFrames as nflSecToFrames } from './nfl/timing';
import { ALL_FRAMES as NFL_ALL_FRAMES, NflCardPreview, NflCardPreviewAll, PREVIEW_DEFAULTS as NFL_PREVIEW_DEFAULTS, PREVIEW_3D_DEFAULTS as NFL_PREVIEW_3D_DEFAULTS, previewFrames as nflPreviewFrames } from './nfl/Preview';
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
      <Composition id="GTA6-Full" component={Gta6Full} durationInFrames={GTA6_TOTAL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition
        id="NFL-Card"
        component={NflCardPreview}
        durationInFrames={nflPreviewFrames(NFL_PREVIEW_DEFAULTS.n)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={NFL_PREVIEW_DEFAULTS}
        calculateMetadata={({ props }) => ({ durationInFrames: nflPreviewFrames(props.n) })}
      />
      <Composition
        id="NFL-Card3D"
        component={NflCardPreview}
        durationInFrames={nflPreviewFrames(NFL_PREVIEW_3D_DEFAULTS.n)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={NFL_PREVIEW_3D_DEFAULTS}
        calculateMetadata={({ props }) => ({ durationInFrames: nflPreviewFrames(props.n) })}
      />
      <Composition id="NFL-Hook" component={NflHook} durationInFrames={nflSecToFrames(nflHookSec)} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-Predictions" component={NflPredictions} durationInFrames={nflSecToFrames(nflPredictionsLenSec)} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-P1" component={NflP1} durationInFrames={nflPart1Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-P2" component={NflP2} durationInFrames={nflPart2Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-P3" component={NflP3} durationInFrames={nflPart3Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-P4" component={NflP4} durationInFrames={nflPart4Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-Full" component={NflFull} durationInFrames={nflFullFrames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NFL-Card-All" component={NflCardPreviewAll} durationInFrames={NFL_ALL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
