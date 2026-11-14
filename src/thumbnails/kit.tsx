import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { makeRandom } from '../util';

/**
 * Thumbnail kit — shared building blocks for the YouTube thumbnails (1280x720).
 * Everything is plain React/CSS/SVG/canvas, so a thumbnail is a normal Remotion Still.
 */

export const W = 1280;
export const H = 720;

export type Theme = {
  c0: string;
  c1: string;
  c2: string;
  glow: string;
  ray: string;
  accent: string;
};

export const THEMES: Record<'blue' | 'purple' | 'teal', Theme> = {
  blue: { c0: '#040827', c1: '#0a1a72', c2: '#1d0c63', glow: '#2f6bff', ray: 'rgba(130,180,255,0.11)', accent: '#34e4ff' },
  purple: { c0: '#10031f', c1: '#3b0b6d', c2: '#6c1272', glow: '#b53cff', ray: 'rgba(255,170,250,0.10)', accent: '#ff58dc' },
  teal: { c0: '#011619', c1: '#04404d', c2: '#0a2a5c', glow: '#17d6c6', ray: 'rgba(120,255,238,0.10)', accent: '#7bfff0' },
};

/* ------------------------------------------------------------------ backdrop */

export const Backdrop: React.FC<{ theme: Theme; focus: { x: number; y: number }; seed: number }> = ({ theme, focus, seed }) => {
  const rand = makeRandom(seed);
  const cell = 40;
  const squares: { x: number; y: number; o: number; a: boolean }[] = [];
  for (let gy = 0; gy < H / cell; gy++) {
    for (let gx = 0; gx < W / cell; gx++) {
      if (rand() < 0.26) squares.push({ x: gx * cell, y: gy * cell, o: 0.025 + rand() * 0.075, a: rand() < 0.14 });
    }
  }
  const bokeh = Array.from({ length: 9 }, () => ({ x: rand() * W, y: rand() * H, r: 18 + rand() * 54, o: 0.08 + rand() * 0.16 }));
  const fx = focus.x;
  const fy = focus.y;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: theme.c0 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(1100px 820px at ${fx}px ${fy}px, ${theme.glow}66 0%, transparent 62%), linear-gradient(135deg, ${theme.c0} 0%, ${theme.c1} 55%, ${theme.c2} 100%)`,
        }}
      />
      {/* light rays fanning out from the hero */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-conic-gradient(from 6deg at ${fx}px ${fy}px, ${theme.ray} 0deg 5deg, transparent 5deg 13deg)`,
          WebkitMaskImage: `radial-gradient(circle at ${fx}px ${fy}px, #000 0%, transparent 78%)`,
          maskImage: `radial-gradient(circle at ${fx}px ${fy}px, #000 0%, transparent 78%)`,
        }}
      />
      {/* pixel field */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {squares.map((s, i) => (
          <rect key={i} x={s.x + 2} y={s.y + 2} width={cell - 4} height={cell - 4} fill={s.a ? theme.accent : '#fff'} opacity={s.a ? s.o * 1.6 : s.o} />
        ))}
      </svg>
      {/* bokeh */}
      {bokeh.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x - b.r,
            top: b.y - b.r,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)`,
            opacity: b.o,
            filter: 'blur(6px)',
          }}
        />
      ))}
      {/* vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 48%, transparent 52%, rgba(0,0,0,0.62) 100%)' }} />
      {/* film grain */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.2 }}>
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter={`url(#grain-${seed})`} />
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ type */

const GOLD = 'linear-gradient(180deg, #fffbd0 0%, #ffe46b 26%, #ffc400 58%, #ff8a00 100%)';
const WHITE = 'linear-gradient(180deg, #ffffff 0%, #f2f4ff 55%, #c9d2ff 100%)';
const HOT = 'linear-gradient(180deg, #fff1c2 0%, #ffb52e 30%, #ff5a1f 70%, #e0102f 100%)';
export const FILLS = { gold: GOLD, white: WHITE, hot: HOT };

/** Big Anton headline: white rim -> dark stroke with a deep extrusion -> gradient face. */
export const Headline: React.FC<{
  children: string;
  size: number;
  fill?: keyof typeof FILLS;
  tilt?: number;
  rim?: string;
  style?: React.CSSProperties;
}> = ({ children, size, fill = 'gold', tilt = 0, rim = '#ffffff', style }) => {
  const stroke = Math.max(10, size * 0.085);
  const ext = Array.from({ length: 12 }, (_, i) => `0 ${i + 2}px 0 #0b0630`).join(', ');
  const base: React.CSSProperties = {
    fontFamily: 'Anton, Impact, sans-serif',
    fontSize: size,
    lineHeight: 0.98,
    letterSpacing: size * 0.012,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };
  return (
    <div style={{ position: 'absolute', transform: `rotate(${tilt}deg)`, transformOrigin: 'left center', ...style }}>
      <div style={{ position: 'relative', ...base }}>
        <span style={{ position: 'absolute', left: 0, top: 0, color: rim, WebkitTextStroke: `${stroke * 2 + 10}px ${rim}`, filter: 'drop-shadow(0 18px 26px rgba(0,0,0,0.55))' }}>{children}</span>
        <span style={{ position: 'absolute', left: 0, top: 0, color: '#0b0630', WebkitTextStroke: `${stroke * 2}px #0b0630`, textShadow: ext }}>{children}</span>
        <span style={{ position: 'relative', backgroundImage: FILLS[fill], WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 0 rgba(255,255,255,0.35))' }}>{children}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ small pieces */

export const Chip: React.FC<{ children: React.ReactNode; tone?: 'gold' | 'pink' | 'glass'; tilt?: number; size?: number; style?: React.CSSProperties }> = ({
  children,
  tone = 'glass',
  tilt = 0,
  size = 40,
  style,
}) => {
  const bg =
    tone === 'gold'
      ? 'linear-gradient(180deg, #ffe46b 0%, #ffb400 100%)'
      : tone === 'pink'
        ? 'linear-gradient(180deg, #ff5aa5 0%, #e0136f 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.07) 100%)';
  const fg = tone === 'gold' ? '#1a0f00' : '#ffffff';
  return (
    <div
      style={{
        position: 'absolute',
        transform: `rotate(${tilt}deg)`,
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.28,
        padding: `${size * 0.26}px ${size * 0.6}px`,
        borderRadius: size,
        background: bg,
        border: `3px solid ${tone === 'glass' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)'}`,
        boxShadow: `0 14px 30px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.55)${tone === 'glass' ? '' : ', 0 0 36px rgba(255,200,80,0.25)'}`,
        backdropFilter: 'blur(10px)',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 800,
        fontSize: size,
        letterSpacing: size * 0.04,
        textTransform: 'uppercase',
        color: fg,
        whiteSpace: 'nowrap',
        textShadow: tone === 'gold' ? 'none' : '0 3px 0 rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Crown: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size * 0.78} viewBox="0 0 100 78" style={{ position: 'absolute', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))', ...style }}>
    <defs>
      <linearGradient id="crownG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff7bd" />
        <stop offset="0.45" stopColor="#ffcc1a" />
        <stop offset="1" stopColor="#ef8a00" />
      </linearGradient>
    </defs>
    <path d="M6 70 L12 22 L33 44 L50 8 L67 44 L88 22 L94 70 Z" fill="url(#crownG)" stroke="#0b0630" strokeWidth="6" strokeLinejoin="round" />
    <circle cx="12" cy="20" r="7" fill="#ff4d6d" stroke="#0b0630" strokeWidth="4" />
    <circle cx="50" cy="8" r="7.5" fill="#35e0ff" stroke="#0b0630" strokeWidth="4" />
    <circle cx="88" cy="20" r="7" fill="#ff4d6d" stroke="#0b0630" strokeWidth="4" />
  </svg>
);

export const QBadge: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 32% 28%, #fff8c4 0%, #ffd21f 38%, #ff9a00 100%)',
      border: `${Math.max(4, size * 0.07)}px solid #fff`,
      boxShadow: '0 12px 28px rgba(0,0,0,0.5), 0 0 0 5px #0b0630, 0 0 40px rgba(255,200,60,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Anton, sans-serif',
      fontSize: size * 0.78,
      color: '#0b0630',
      lineHeight: 1,
      paddingTop: size * 0.05,
      ...style,
    }}
  >
    ?
  </div>
);

/** preview-only: where YouTube draws the duration badge, to prove nothing important sits under it */
export const SafeZone: React.FC<{ label?: string }> = ({ label = '10:16' }) => (
  <div
    style={{
      position: 'absolute',
      right: 12,
      bottom: 12,
      padding: '6px 14px',
      borderRadius: 8,
      background: 'rgba(0,0,0,0.86)',
      color: '#fff',
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
      fontSize: 30,
      zIndex: 99,
    }}
  >
    {label}
  </div>
);

/* ------------------------------------------------------------------ pixel <-> sharp hero */

const SS = 2; // canvas supersampling so a 2x render stays crisp

const stage = (src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, ow: number, oh: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(ow));
  c.height = Math.max(1, Math.round(oh));
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
};

export type Crop = [number, number, number, number]; // x, y, w, h as fractions of the source

const drawSharp = (cv: HTMLCanvasElement, img: HTMLImageElement, crop: Crop, w: number, h: number) => {
  cv.width = w * SS;
  cv.height = h * SS;
  const t = stage(img, crop[0] * img.naturalWidth, crop[1] * img.naturalHeight, crop[2] * img.naturalWidth, crop[3] * img.naturalHeight, cv.width, cv.height);
  cv.getContext('2d')!.drawImage(t, 0, 0);
};

const drawPixel = (cv: HTMLCanvasElement, img: HTMLImageElement, crop: Crop, w: number, h: number, cells: number) => {
  const cx = Math.max(2, cells);
  const cy = Math.max(2, Math.round((cells * h) / w));
  const sx = crop[0] * img.naturalWidth;
  const sy = crop[1] * img.naturalHeight;
  const sw = crop[2] * img.naturalWidth;
  const sh = crop[3] * img.naturalHeight;
  // halving steps, so each block is a true average of its area (not an aliased sample)
  let t = stage(img, sx, sy, sw, sh, Math.min(sw, cx * 8), Math.min(sh, cy * 8));
  while (t.width > cx || t.height > cy) {
    t = stage(t, 0, 0, t.width, t.height, Math.max(cx, Math.floor(t.width / 2)), Math.max(cy, Math.floor(t.height / 2)));
  }
  cv.width = w * SS;
  cv.height = h * SS;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(t, 0, 0, t.width, t.height, 0, 0, cv.width, cv.height);
};

export type HeroProps = {
  src: string; // file under public/
  w: number;
  h: number;
  x: number;
  y: number;
  rotate?: number;
  crop?: Crop;
  mode: 'split' | 'pixel' | 'sharp';
  cells?: number; // blocks across the width on the pixelated side
  seam?: { top: number; bottom: number }; // where the diagonal seam meets the top / bottom edge (fraction of width)
  accent: string;
  sparkColors?: string[];
  seed?: number;
  round?: boolean; // circular lens
  alphaMask?: boolean; // the image has transparency: clip the glow to its silhouette
  halo?: string;
  floorShadow?: boolean;
  style?: React.CSSProperties;
};

export const Hero: React.FC<HeroProps> = ({
  src,
  w,
  h,
  x,
  y,
  rotate = 0,
  crop = [0, 0, 1, 1],
  mode,
  cells = 12,
  seam = { top: 0.64, bottom: 0.4 },
  accent,
  sparkColors = ['#ffffff', '#ffd21f', '#ff4d4d'],
  seed = 1,
  round = false,
  alphaMask = true,
  halo,
  floorShadow = true,
  style,
}) => {
  const sharpRef = useRef<HTMLCanvasElement>(null);
  const pixRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender(`thumb hero ${src}`, { timeoutInMilliseconds: 60000 }));
  const released = useRef(false);
  const release = () => {
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  };

  useEffect(() => {
    let alive = true;
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => alive && setImg(i);
    i.onerror = () => {
      console.error(`[thumb] could not load ${src}`);
      release();
    };
    i.src = staticFile(src);
    return () => {
      alive = false;
    };
  }, [src]);

  useLayoutEffect(() => {
    if (!img) return;
    if (sharpRef.current && mode !== 'pixel') drawSharp(sharpRef.current, img, crop, w, h);
    if (pixRef.current && mode !== 'sharp') drawPixel(pixRef.current, img, crop, w, h, cells);
    release();
  }, [img, mode, cells, w, h]);

  const rand = makeRandom(seed * 131 + 7);
  const sx = (t: number) => seam.top * w + (seam.bottom - seam.top) * w * t; // seam x at fraction t down the box
  const nSparks = Math.max(7, Math.round(w / 34));
  const spread = Math.max(50, w * 0.22);
  const sparks = Array.from({ length: nSparks }, () => {
    const t = 0.04 + rand() * 0.92;
    return { x: sx(t) - rand() * spread + 14, y: t * h + (rand() - 0.5) * 30, s: 6 + rand() * Math.min(20, w * 0.045), c: sparkColors[Math.floor(rand() * sparkColors.length)], o: 0.75 + rand() * 0.25 };
  });
  const pixClip = `polygon(0 0, ${seam.top * 100}% 0, ${seam.bottom * 100}% 100%, 0 100%)`;
  const sharpClip = `polygon(${seam.top * 100}% 0, 100% 0, 100% 100%, ${seam.bottom * 100}% 100%)`;
  const maskStyle: React.CSSProperties = alphaMask && !round ? { WebkitMaskImage: `url(${staticFile(src)})`, maskImage: `url(${staticFile(src)})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' } : {};
  const blockW = (w / Math.max(2, cells)) * 1;
  const haloColor = halo ?? accent;

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rotate}deg)`, ...style }}>
      {/* backlight */}
      <div style={{ position: 'absolute', left: -w * 0.35, top: -h * 0.18, width: w * 1.7, height: h * 1.36, background: `radial-gradient(closest-side, ${haloColor}aa 0%, ${haloColor}33 48%, transparent 100%)`, filter: 'blur(14px)' }} />
      {floorShadow && <div style={{ position: 'absolute', left: w * 0.06, top: h * 0.93, width: w * 0.88, height: h * 0.1, background: 'radial-gradient(closest-side, rgba(0,0,0,0.65), transparent)', filter: 'blur(8px)' }} />}

      <div style={{ position: 'absolute', inset: 0, borderRadius: round ? '50%' : 0, overflow: round ? 'hidden' : 'visible', filter: round ? undefined : 'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 16px 24px rgba(0,0,0,0.5))' }}>
        {mode !== 'pixel' && (
          <canvas ref={sharpRef} style={{ position: 'absolute', inset: 0, width: w, height: h, clipPath: mode === 'split' ? sharpClip : undefined }} />
        )}
        {mode !== 'sharp' && (
          <div style={{ position: 'absolute', inset: 0, clipPath: mode === 'split' ? pixClip : undefined }}>
            <canvas ref={pixRef} style={{ position: 'absolute', inset: 0, width: w, height: h }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.16) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(0,0,0,0.16) 1.5px, transparent 1.5px)',
                backgroundSize: `${blockW}px ${blockW}px`,
                ...maskStyle,
              }}
            />
          </div>
        )}
      </div>

      {/* glowing seam, confined to the product (or the lens) */}
      {mode === 'split' && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: round ? '50%' : 0, overflow: round ? 'hidden' : 'visible', ...maskStyle }}>
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              <linearGradient id={`seam-${seed}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={accent} stopOpacity="0.2" />
                <stop offset="0.5" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="1" stopColor={accent} stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <line x1={seam.top * w} y1={0} x2={seam.bottom * w} y2={h} stroke={accent} strokeWidth={34} strokeOpacity={0.5} style={{ filter: 'blur(14px)' }} />
            <line x1={seam.top * w} y1={0} x2={seam.bottom * w} y2={h} stroke={`url(#seam-${seed})`} strokeWidth={5} />
          </svg>
        </div>
      )}

      {/* pixels breaking off the seam */}
      {mode === 'split' &&
        sparks.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.s,
              height: s.s,
              background: s.c,
              opacity: s.o,
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: `0 4px 10px rgba(0,0,0,0.45), 0 0 14px ${s.c}88`,
            }}
          />
        ))}
    </div>
  );
};
