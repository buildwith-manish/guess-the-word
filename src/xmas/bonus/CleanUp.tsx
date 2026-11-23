import React from 'react';
import { GlassTile } from '../components/GlassTile';
import { easeOut } from '../../ios/motion';
import { TIMER } from '../components/TimerToPill';
import { LAYOUT, colors, px, useXmasFrame } from '../system';
import { clueIdOf } from './clueRef';
import type { RoundProps } from './registry';

/**
 * Bonus 6, Clean Up (Photos Clean Up): during the play time a smooth, blob-shaped half of each clue image is erased
 * cell by cell with a sparkle on every cell as it goes; the viewer names the movie from what is left. When the answer
 * comes in (after the timer flash) the erased parts come back the same way. Image ids come from data; no new images.
 * Cheap: one CSS mask per image, a data-URI SVG of at most GRID x GRID rects (soft-edged by one blur inside the mask),
 * and a few small stars for the cells that are changing right now. No canvas, no per-pixel work.
 */
export const CLEANUP = {
  grid: 10,
  /** fraction of the cells that get erased */
  erased: 0.5,
  /** a cell fades out (or back in) over this many ticks */
  cellTicks: 6,
  /** the erasing starts this long after play starts and ends this long before it ends */
  leadIn: 10,
  leadOut: 24,
  /** the restore sweep runs over this many ticks (each cell then takes cellTicks) */
  restoreSweep: 10,
  /** a sparkle lives this many ticks */
  sparkleTicks: 12,
} as const;

/** Per tile: the phases of the smooth field that decides which cells go first (fixed numbers, not content). */
const FIELD_PHASES = [
  [0.7, 2.1, 4.0, 1.3, 5.2],
  [3.4, 0.4, 1.9, 4.6, 2.7],
] as const;

type Cell = { col: number; row: number; rank: number };

/** The cells to erase for tile `i`, ordered: rank 0 goes first. A smooth field makes the erased half a few blobs, not noise. */
export const erasedCells = (i: number): Cell[] => {
  const G = CLEANUP.grid;
  const [a, b, c, d, e] = FIELD_PHASES[i % FIELD_PHASES.length];
  const all: { col: number; row: number; v: number }[] = [];
  for (let row = 0; row < G; row++) {
    for (let col = 0; col < G; col++) {
      const x = col / (G - 1);
      const y = row / (G - 1);
      const v = Math.sin(x * 5.1 + a) + Math.sin(y * 4.3 + b) + Math.sin((x + y) * 3.7 + c) + 0.6 * Math.sin((x - y) * 6.2 + d) + 0.0001 * Math.sin(e * (row * G + col));
      all.push({ col, row, v });
    }
  }
  all.sort((p, q) => p.v - q.v);
  return all.slice(0, Math.round(G * G * CLEANUP.erased)).map((c, rank) => ({ col: c.col, row: c.row, rank }));
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Opacity of an erased cell at tick t: 1 before, 0 while erased, 1 after the restore. */
export const cellAlpha = (t: number, eraseAt: number, restoreAt: number): number => {
  const out = clamp01((t - eraseAt) / CLEANUP.cellTicks);
  const back = clamp01((t - restoreAt) / CLEANUP.cellTicks);
  return 1 - easeOut(out) + easeOut(back) * easeOut(out);
};

export type Timeline = { eraseFrom: number; eraseTo: number; restoreFrom: number };
export const timelineOf = (playFrom: number, playFrames: number): Timeline => ({
  eraseFrom: playFrom + CLEANUP.leadIn,
  eraseTo: playFrom + playFrames - CLEANUP.leadOut,
  /** the answer comes in after the timer's flash */
  restoreFrom: playFrom + playFrames + TIMER.flashTicks,
});

const times = (cell: Cell, n: number, tl: Timeline) => ({
  eraseAt: tl.eraseFrom + (cell.rank / Math.max(1, n - 1)) * (tl.eraseTo - tl.eraseFrom),
  restoreAt: tl.restoreFrom + (cell.rank / Math.max(1, n - 1)) * CLEANUP.restoreSweep,
});

/** The mask as a CSS url(): black rects (kept parts) on transparent, one soft blur. Undefined when nothing is erased (no mask at all). */
const maskUrl = (cells: Cell[], t: number, tl: Timeline): string | undefined => {
  const G = CLEANUP.grid;
  const w = 100 / G;
  const alpha = new Map<number, number>();
  let any = false;
  cells.forEach((c) => {
    const { eraseAt, restoreAt } = times(c, cells.length, tl);
    const a = cellAlpha(t, eraseAt, restoreAt);
    if (a < 0.999) any = true;
    alpha.set(c.row * G + c.col, a);
  });
  if (!any) return undefined;
  const rects: string[] = [];
  for (let row = 0; row < G; row++) {
    for (let col = 0; col < G; col++) {
      const a = alpha.get(row * G + col) ?? 1;
      if (a <= 0.003) continue;
      // border cells reach past the box so the blur never fades the outer rim
      const x0 = col === 0 ? -6 : col * w;
      const y0 = row === 0 ? -6 : row * w;
      const x1 = col === G - 1 ? 106 : (col + 1) * w;
      const y1 = row === G - 1 ? 106 : (row + 1) * w;
      rects.push(`<rect x='${x0.toFixed(2)}' y='${y0.toFixed(2)}' width='${(x1 - x0).toFixed(2)}' height='${(y1 - y0).toFixed(2)}' fill-opacity='${a.toFixed(3)}'/>`);
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><defs><filter id='b' x='-10%' y='-10%' width='120%' height='120%'><feGaussianBlur stdDeviation='1.2'/></filter></defs><g filter='url(#b)' fill='black'>${rects.join('')}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const STAR = 'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)';

/** A four-point star at the centre of a changing cell. */
const Sparkle: React.FC<{ cx: number; cy: number; age: number; seed: number }> = ({ cx, cy, age, seed }) => {
  const k = age / CLEANUP.sparkleTicks;
  const s = Math.sin(Math.PI * k);
  const size = (10 + (seed % 3) * 5) * s;
  return (
    <div
      style={{
        position: 'absolute',
        left: px(cx - size / 2),
        top: px(cy - size / 2),
        width: px(size),
        height: px(size),
        background: seed % 2 ? '#FFFFFF' : colors.gold,
        clipPath: STAR,
        transform: `rotate(${age * 14 + seed * 20}deg)`,
        opacity: s,
        filter: `drop-shadow(0 0 ${px(3)}px ${colors.gold})`,
      }}
    />
  );
};

export const CleanUp: React.FC<RoundProps> = ({ slot, playFrom, playFrames }) => {
  if (slot.key !== 'cleanUp') throw new Error(`CleanUp: slot ${slot.slot} is ${slot.key}`);
  const t = useXmasFrame();
  const T = LAYOUT.tile;
  const tl = timelineOf(playFrom, playFrames);
  const G = CLEANUP.grid;
  // where the image box sits inside a tile (GlassTile draws it at 75% of the tile, centred)
  const box = T.size * 0.75;
  const off = (T.size - box) / 2;
  const cell = box / G;

  return (
    <>
      {slot.tiles.map((ref, i) => {
        const cells = erasedCells(i);
        const mask = maskUrl(cells, t, tl);
        const live = cells.flatMap((c) => {
          const { eraseAt, restoreAt } = times(c, cells.length, tl);
          const out: { c: Cell; age: number }[] = [];
          for (const at of [eraseAt, restoreAt]) {
            const age = t - at;
            if (age >= 0 && age < CLEANUP.sparkleTicks) out.push({ c, age });
          }
          return out;
        });
        return (
          <div key={i} style={{ position: 'absolute', left: px(i * (T.size + T.gap)), top: 0, width: px(T.size), height: px(T.size) }}>
            <GlassTile
              imageId={clueIdOf(ref)}
              side="bonus"
              light={false}
              enterFrame={playFrom - 6 + i * 3}
              imageStyle={mask ? { WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' } : undefined}
            />
            {live.map(({ c, age }, j) => (
              <Sparkle key={j} cx={off + (c.col + 0.5) * cell} cy={off + (c.row + 0.5) * cell} age={age} seed={c.row * G + c.col} />
            ))}
          </div>
        );
      })}
    </>
  );
};

export default CleanUp;
