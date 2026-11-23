import React from 'react';
import { Composition, Still } from 'remotion';
import './fonts';
import { Main } from './Main';
import { HEIGHT, RENDER_FPS, RENDER_TOTAL_FRAMES, WIDTH } from './timing';
import { Part1, part1Frames } from './gta6/parts/Part1';
import { Part2, part2Frames } from './gta6/parts/Part2';
import { Part3, part3Frames } from './gta6/parts/Part3';
import { Part4, part4Frames } from './gta6/parts/Part4';
import { Gta6Full } from './gta6/Full';
import { MOVIE_REVEAL_PREVIEW_DEFAULTS, MOVIE_REVEAL_PREVIEW_FRAMES, MovieRevealPreview } from './xmas/previews/MovieRevealPreview';
import { GLASS_TILE_PREVIEW_DEFAULTS, GLASS_TILE_PREVIEW_FRAMES, GlassTilePreview } from './xmas/previews/GlassTilePreview';
import { Hook, hookFrames } from './xmas/scenes/Hook';
import { MOVIE_PREVIEW_DEFAULTS, MOVIES_ALL_FRAMES, XmasMovie, XmasMoviesAll, movieDurationFor } from './xmas/Preview';
import { BonusSceneById, bonusSceneFramesById } from './xmas/scenes/BonusScene';
import { Outro as XmasOutro, outroFrames } from './xmas/scenes/Outro';
import { part1Frames as xmasPart1Frames } from './xmas/parts/Part1';
import { part2Frames as xmasPart2Frames } from './xmas/parts/Part2';
import { part3Frames as xmasPart3Frames } from './xmas/parts/Part3';
import { AudibleBonus, AudibleHook, AudibleMovie, AudibleMoviesAll, AudibleOutro, AudibleScore } from './xmas/PreviewAudio';
import { XmasFull, XmasPart1Audio, XmasPart2Audio, XmasPart3Audio } from './xmas/Full';
import { Thumb } from './xmas/thumbs/Thumb';
import { RENDER_TOTAL_FRAMES as GTA6_TOTAL_FRAMES } from './gta6/timing';
import { ScoreScene } from './xmas/scenes/ScoreScene';
import { RENDER_TOTAL_FRAMES as XMAS_TOTAL_FRAMES, scoreBeats, ticksToFrames as xmasTicksToFrames } from './xmas/timing';
import { LightStringPreview, LIGHT_PREVIEW } from './xmas/components/LightStringPreview';
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
      <Composition id="Xmas-GlassTile" component={GlassTilePreview} durationInFrames={GLASS_TILE_PREVIEW_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} defaultProps={GLASS_TILE_PREVIEW_DEFAULTS} />
      <Composition id="Xmas-MovieReveal" component={MovieRevealPreview} durationInFrames={MOVIE_REVEAL_PREVIEW_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} defaultProps={MOVIE_REVEAL_PREVIEW_DEFAULTS} />
      <Composition id="GTA6-Full" component={Gta6Full} durationInFrames={GTA6_TOTAL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Xmas-Score" component={AudibleScore} durationInFrames={xmasTicksToFrames(scoreBeats().total)} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Xmas-LightString" component={LightStringPreview} durationInFrames={LIGHT_PREVIEW.frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="XMAS-Hook" component={AudibleHook} durationInFrames={hookFrames()} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition
        id="XMAS-Movie"
        component={AudibleMovie}
        durationInFrames={movieDurationFor(1)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={MOVIE_PREVIEW_DEFAULTS}
        calculateMetadata={({ props }) => ({ durationInFrames: movieDurationFor(props.slot) })}
      />
      <Composition id="XMAS-Movies-All" component={AudibleMoviesAll} durationInFrames={MOVIES_ALL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition
        id="XMAS-Outro"
        component={AudibleOutro}
        durationInFrames={outroFrames}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="XMAS-Bonus"
        component={AudibleBonus}
        durationInFrames={bonusSceneFramesById(1)}
        fps={RENDER_FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ bonus: 1 }}
        calculateMetadata={({ props }) => ({ durationInFrames: bonusSceneFramesById(props.bonus) })}
      />
      <Composition id="XMAS-P1" component={XmasPart1Audio} durationInFrames={xmasPart1Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="XMAS-P2" component={XmasPart2Audio} durationInFrames={xmasPart2Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="XMAS-P3" component={XmasPart3Audio} durationInFrames={xmasPart3Frames} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="XMAS-Full" component={XmasFull} durationInFrames={XMAS_TOTAL_FRAMES} fps={RENDER_FPS} width={WIDTH} height={HEIGHT} />
      <Still id="XMAS-Thumb-A" component={() => <Thumb id="A" />} width={1280} height={720} />
      <Still id="XMAS-Thumb-B" component={() => <Thumb id="B" />} width={1280} height={720} />
      <Still id="XMAS-Thumb-C" component={() => <Thumb id="C" />} width={1280} height={720} />
    </>
  );
};
