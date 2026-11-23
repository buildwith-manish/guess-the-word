import React from 'react';
import { AbsoluteFill, Composition, registerRoot } from 'remotion';
import { WalletCard, type WalletCardState } from './components/WalletCard';
import { cardByN } from './data';
import { HEIGHT, RENDER_FPS, WIDTH, useDesignFrame } from './shared/clock';
import { levelBackground } from './system';

/**
 * Stills-only preview for task 2b (not part of the video). One card, one state, driven by props:
 *   npx remotion still src/nfl/WalletCardPreview.tsx NFL-WalletCard out.png --frame=40 --props='{"n":1,"state":"open","since":0}'
 * The card comes from data.ts; `jersey` is optional test input because cards.json has no jersey field.
 */
export type PreviewProps = { n: number; state: WalletCardState; since: number; jersey?: string | number; stackIndex?: number };

const Preview: React.FC<PreviewProps> = ({ n, state, since, jersey, stackIndex }) => {
  const frame = useDesignFrame();
  const card = cardByN(n);
  return (
    <AbsoluteFill style={{ background: levelBackground[card.level] }}>
      <WalletCard card={card} state={state} frame={frame} since={since} jersey={jersey} stackIndex={stackIndex} />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition
    id="NFL-WalletCard"
    component={Preview}
    durationInFrames={RENDER_FPS * 4}
    fps={RENDER_FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ n: 1, state: 'blank', since: 0 } as PreviewProps}
  />
);

registerRoot(Root);
