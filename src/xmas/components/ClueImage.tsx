import React from 'react';
import { Img, staticFile, useVideoConfig } from 'remotion';
import { clueImages } from '../clueImages.generated';

export type ClueImageProps = {
  /** Clue image id, e.g. "s01_c1" or "bonus08_snowglobe". The same id may be used in several scenes. */
  id: string;
  /** Corner radius in 1280x720 reference units; match the tile this image sits in. */
  radius?: number;
  style?: React.CSSProperties;
};

/**
 * Draws one clue image, fitted inside its tile (fills the parent, keeps the aspect ratio, never crops).
 * Never draws text of its own: any text is baked into the image file.
 */
export const ClueImage: React.FC<ClueImageProps> = ({ id, radius = 22, style }) => {
  const { width } = useVideoConfig();
  const entry = clueImages[id];
  if (!entry) throw new Error(`ClueImage: unknown clue image id "${id}" (run scripts/make_xmas_placeholders.ts and scripts/build_xmas_clue_index.ts)`);
  const k = width / 1280;
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: radius * k, overflow: 'hidden', ...style }}>
      <Img src={staticFile(entry.src)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
  );
};

export default ClueImage;
