import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Main } from './Main';
import { FPS, HEIGHT, TIMELINE, WIDTH } from './timing';

/**
 * One composition. Its duration comes from the timeline (settings.json +
 * rounds.csv), so adding questions changes the runtime automatically — no
 * second place to keep in sync.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="GuessTheWord"
      component={Main}
      durationInFrames={TIMELINE.totalFrames}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
