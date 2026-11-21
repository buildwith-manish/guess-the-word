/**
 * CropMask (MEDIUM tier): hides half of whatever it wraps (a StateShape, an EmojiFill, both) with a soft
 * edge. `reveal` 0 -> 1 slides the edge across the hidden half until everything shows. Implemented as a CSS
 * mask-image gradient on a square wrapper (also -webkit- prefixed), so it needs no filter and no clip path.
 */
import React from 'react';
import type { CropSide } from '../states-data';

export interface CropMaskProps {
  /** which half is hidden (the state's `cropSide`) */
  side: CropSide;
  /** 0 = half hidden, 1 = fully shown (ease it in the parent) */
  reveal: number;
  /** side of the square shape box in px, same value as StateShape `size` */
  size: number;
  children: React.ReactNode;
}

/** Layout proportions. */
const LOOK = {
  /** width of the soft edge, as a fraction of the box */
  soft: 0.06,
};

/** gradient runs from the hidden side towards the visible side */
const DIRECTION: Record<CropSide, string> = {
  left: 'to right',
  right: 'to left',
  top: 'to bottom',
  bottom: 'to top',
};

export const CropMask: React.FC<CropMaskProps> = ({ side, reveal, size, children }) => {
  const r = Math.max(0, Math.min(1, reveal));
  const s = LOOK.soft;
  // edge position measured from the hidden side: 0.5 (half hidden) -> -s/2 (nothing hidden, soft band off-box)
  const edge = 0.5 + (-s / 2 - 0.5) * r;
  const lo = (edge - s / 2) * 100;
  const hi = (edge + s / 2) * 100;
  const mask = `linear-gradient(${DIRECTION[side]}, transparent ${lo}%, black ${hi}%)`;

  return (
    <div style={{ position: 'relative', width: size, height: size, WebkitMaskImage: mask, maskImage: mask }}>
      {children}
    </div>
  );
};
