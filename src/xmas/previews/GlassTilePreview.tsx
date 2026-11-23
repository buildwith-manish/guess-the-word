import React from 'react';
import { AbsoluteFill } from 'remotion';
import { GlassTile } from '../components/GlassTile';
import { LAYOUT, backgroundStyle, px } from '../system';

/** Preview of 2b: the left and right movie tiles at their layout positions. Frame props are design ticks (render frame / 2). */
export type GlassTilePreviewProps = {
  leftId: string;
  rightId: string;
  enterFrame: number;
  glideFrame: number;
  pulseFrame: number;
};

export const GLASS_TILE_PREVIEW_DEFAULTS: GlassTilePreviewProps = { leftId: 's01_c1', rightId: 's01_c2', enterFrame: 6, glideFrame: 65, pulseFrame: 45 };
/** 90 ticks = 180 render frames */
export const GLASS_TILE_PREVIEW_FRAMES = 180;

export const GlassTilePreview: React.FC<GlassTilePreviewProps> = ({ leftId, rightId, enterFrame, glideFrame, pulseFrame }) => (
  <AbsoluteFill style={backgroundStyle()}>
    {([['left', leftId, LAYOUT.tile.left, 0], ['right', rightId, LAYOUT.tile.right, 4]] as const).map(([side, id, r, stagger]) => (
      <div key={side} style={{ position: 'absolute', left: px(r.x), top: px(r.y) }}>
        <GlassTile imageId={id} side={side} enterFrame={enterFrame + stagger} pulseFrame={pulseFrame + stagger} glideFrame={glideFrame} />
      </div>
    ))}
  </AbsoluteFill>
);

export default GlassTilePreview;
