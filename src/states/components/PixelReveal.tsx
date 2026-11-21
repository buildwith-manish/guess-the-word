/**
 * PixelReveal (EXPERT tier): the state drawn from its `cells` bit masks as square blocks. Over the clock
 * (`progress` 0..1) it steps through the grids stored in states-geo.json (12, 24, 48 cells per side, coarse
 * to fine), then cross-fades to the smooth outline over [at, at + dur]. Cells are SVG paths (horizontal runs
 * merged), no canvas and no images. Time comes from useDesignFrame() unless `frame` is passed.
 */
import React, { useMemo } from 'react';
import { useDesignFrame } from '../../clock';
import { prog, cssEaseInOut } from '../../anim';
import { COLORS } from '../../style';
import { SHAPE_BOX, getShape } from '../geo';
import { StateShape } from './StateShape';

export interface PixelRevealProps {
  /** two-letter key */
  stateKey: string;
  /** side of the square shape box in px, same value as StateShape `size` */
  size: number;
  /** clock progress 0..1: picks the grid (coarsest first, finest last) */
  progress: number;
  /** level accent colour */
  accent?: string;
  /** tick the cross-fade to the smooth outline starts */
  at: number;
  /** cross-fade length in ticks */
  dur: number;
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** Layout proportions. */
const LOOK = {
  blockAlpha: 0.95,
};

/** One path for a grid: each run of 1-cells in a row is a single rectangle. */
const cellsPath = (bits: string, n: number): string => {
  const s = SHAPE_BOX / n;
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (bits[r * n + c] !== '1') {
        c++;
        continue;
      }
      const start = c;
      while (c < n && bits[r * n + c] === '1') c++;
      parts.push(`M${+(start * s).toFixed(2)} ${+(r * s).toFixed(2)}h${+((c - start) * s).toFixed(2)}v${+s.toFixed(2)}h${-+((c - start) * s).toFixed(2)}z`);
    }
  }
  return parts.join('');
};

export const PixelReveal: React.FC<PixelRevealProps> = ({ stateKey, size, progress, accent = COLORS.cyan, at, dur, frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;

  const geo = getShape(stateKey);
  // resolutions come from the data (keys of `cells`), coarse to fine
  const grids = useMemo(
    () =>
      Object.keys(geo.cells)
        .map(Number)
        .sort((a, b) => a - b)
        .map((n) => ({ n, d: cellsPath(geo.cells[String(n)], n) })),
    [geo],
  );

  const stage = Math.min(grids.length - 1, Math.floor(Math.max(0, Math.min(1, progress)) * grids.length));
  const fade = prog(f, at, dur, cssEaseInOut);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SHAPE_BOX} ${SHAPE_BOX}`}
        shapeRendering="crispEdges"
        style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - fade }}
      >
        <path d={grids[stage].d} fill={accent} fillOpacity={LOOK.blockAlpha} />
      </svg>
      {fade > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: fade }}>
          <StateShape stateKey={stateKey} size={size} mode="outline" progress={1} fill={1} glow={1} accent={accent} />
        </div>
      )}
    </div>
  );
};
