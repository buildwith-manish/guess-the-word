import React, { useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { makeRandom } from '../util';

/**
 * PixelCanvas — procedural pixelation (no plugins, no shaders).
 *
 *   1. crop the source to a centred square,
 *   2. box-downscale it to `cells x cells` pixels (halving steps, so 8x8 is a true
 *      average of the picture and not an aliased sample),
 *   3. draw that tiny canvas back up with imageSmoothingEnabled = false -> hard blocks.
 *
 * `cells = null` draws the full-resolution picture. If the photo file is missing the
 * component builds a deterministic colour-block stand-in from the brand palette, so the
 * whole video still renders before you have fetched any images.
 */
const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** crop (sx,sy,side,side) of `src` scaled to out x out, with high-quality smoothing */
const scaleSquare = (src: CanvasImageSource, sx: number, sy: number, side: number, out: number) => {
  const c = makeCanvas(out, out);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, side, side, 0, 0, c.width, c.height);
  return c;
};

const standIn = (palette: string[], seed: number) => {
  const S = 640;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d')!;
  const rand = makeRandom(seed * 7919 + 13);
  g.fillStyle = palette[0];
  g.fillRect(0, 0, S, S);
  // diagonal band
  g.fillStyle = palette[1];
  g.beginPath();
  g.moveTo(0, S * (0.55 + rand() * 0.1));
  g.lineTo(S, S * (0.25 + rand() * 0.1));
  g.lineTo(S, S * 0.55);
  g.lineTo(0, S * 0.9);
  g.closePath();
  g.fill();
  // big "logo" disc + a few chunky blocks
  g.fillStyle = palette[2];
  g.beginPath();
  g.arc(S * (0.35 + rand() * 0.3), S * (0.3 + rand() * 0.2), S * (0.14 + rand() * 0.08), 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 5; i++) {
    g.fillStyle = palette[Math.floor(rand() * 3)];
    g.fillRect(rand() * S * 0.8, rand() * S * 0.8, S * (0.06 + rand() * 0.12), S * (0.06 + rand() * 0.12));
  }
  return c;
};

export const PixelCanvas: React.FC<{
  file: string;
  palette: string[];
  seed: number;
  cells: number | null;
  size: number;
}> = ({ file, palette, seed, cells, size }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender(`pixel image ${file}`, { timeoutInMilliseconds: 60000 }));
  const released = useRef(false);
  const [source, setSource] = useState<CanvasImageSource | null>(null);

  React.useEffect(() => {
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => alive && setSource(img);
    img.onerror = () => {
      console.warn(`[pixel] ${file} not found — using a colour-block stand-in (run: npm run pixel:images)`);
      if (alive) setSource(standIn(palette, seed));
    };
    img.src = staticFile(file);
    return () => {
      alive = false;
    };
  }, [file]);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || !source) return;
    const sw = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width;
    const sh = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height;
    const side = Math.min(sw, sh);
    const sx = (sw - side) / 2;
    const sy = (sh - side) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    if (cells === null) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
    } else {
      // halving steps: side -> ... -> cells*4 -> cells*2 -> cells
      let cur: CanvasImageSource = source;
      let cx = sx;
      let cy = sy;
      let cs = side;
      let target = Math.max(cells, Math.min(side, cells * 8));
      let first = scaleSquare(cur, cx, cy, cs, target);
      let tiny: HTMLCanvasElement = first;
      while (tiny.width > cells) {
        const next = Math.max(cells, Math.floor(tiny.width / 2));
        tiny = scaleSquare(tiny, 0, 0, tiny.width, next);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, 0, 0, size, size);
    }

    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [source, cells, size]);

  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, display: 'block' }} />;
};
