/**
 * EmojiFill: a tiled grid of the state's three hint emoji, clipped to the state shape, faded in at `at`.
 *
 * Approach: HTML, not SVG text. The grid is a CSS grid of NotoColorEmoji glyphs inside a square box
 * the size of the shape box; the box is clipped with CSS `clip-path: url(#id)` pointing at an inline
 * SVG <clipPath clipPathUnits="objectBoundingBox"> that holds the SAME path as StateShape
 * (states-geo.json, scaled by 1/SHAPE_BOX). So the clip scales with `size` and matches the outline exactly.
 * Not verified by rendering: colour-emoji clipping needs a look in Studio.
 */
import React, { useId } from 'react';
import '../../fonts';
import { useDesignFrame } from '../../clock';
import { FONTS } from '../../style';
import { prog, cssEaseOut } from '../../anim';
import { SHAPE_BOX, getShape } from '../geo';
import { getState } from '../states-data';

export interface EmojiFillProps {
  /** two-letter key */
  stateKey: string;
  /** side of the square shape box in px, same value as StateShape `size` */
  size: number;
  /** tick the fade-in starts */
  at: number;
  /** fade length in ticks (default about 10) */
  fadeTicks?: number;
  /** degrees, same value as StateShape `rotation`; the shape rotates, the emoji stay upright */
  rotation?: number;
  /** peak opacity 0..1 (default 1) */
  opacity?: number;
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** Layout proportions (fractions of `size`). */
const LOOK = {
  /** emoji cell side */
  cell: 0.11,
  /** glyph size inside a cell */
  glyph: 0.8,
  /** default fade length, ticks */
  fade: 10,
};

export const EmojiFill: React.FC<EmojiFillProps> = ({
  stateKey,
  size,
  at,
  fadeTicks = LOOK.fade,
  rotation = 0,
  opacity = 1,
  frame,
}) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `ef-clip-${uid}`;
  const geo = getShape(stateKey);
  const emoji = getState(stateKey).hintEmoji;

  const a = prog(f, at, fadeTicks, cssEaseOut) * opacity;
  if (a <= 0) return null;

  // the counter-rotated grid must still cover the clipped box: side = box * sqrt(2)
  const inner = size * Math.SQRT2;
  const cell = size * LOOK.cell;
  const n = Math.ceil(inner / cell);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cells.push(
        <div key={`${r}-${c}`} style={{ width: cell, height: cell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {emoji[(c + r * 2) % emoji.length]}
        </div>,
      );
    }
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={geo.shape} transform={`scale(${1 / SHAPE_BOX})`} />
          </clipPath>
        </defs>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          clipPath: `url(#${clipId})`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: '50% 50%',
          opacity: a,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: (size - n * cell) / 2,
            top: (size - n * cell) / 2,
            width: n * cell,
            height: n * cell,
            display: 'grid',
            gridTemplateColumns: `repeat(${n}, ${cell}px)`,
            fontFamily: FONTS.emoji,
            fontSize: cell * LOOK.glyph,
            lineHeight: 1,
            transform: `rotate(${-rotation}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          {cells}
        </div>
      </div>
    </div>
  );
};
