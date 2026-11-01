import React from 'react';
import { px, COLORS } from './style';
import { makeRandom } from './util';
import { confettiEase, cssEaseOut, ms, clamp01, keyframes } from './anim';

/**
 * Seeded ports of the HTML's confetti() and ring() so every render is identical.
 */

type Piece = {
  w: number;
  round: boolean;
  color: string;
  x: number;
  y: number;
  spin: number;
  dur: number;
};

const COLS = ['#FFC93C', '#FFFFFF', '#38E1FF', '#FF4D8D', '#7C6CFF', '#34D399'];

const makePieces = (seed: number, n: number): Piece[] => {
  const r = makeRandom(seed);
  return Array.from({ length: n }, (_, i) => {
    const w = 8 + r() * 10;
    const x = (r() - 0.5) * 1300;
    const y = -(160 + r() * 420);
    const spin = r() * 540;
    const dur = 1900 + r() * 700;
    return { w, round: i % 3 === 0, color: COLS[i % 4], x, y, spin, dur };
  });
};

/**
 * confetti(n): spans at left 640 / top 470 of the 1280x720 stage that fly out along
 * (x*.7, y) at 45 % and fall to (x, y+560) with rotation to 1000deg, fading out, on
 * cubic-bezier(.2,.7,.4,1), 1.9-2.6 s.
 */
export const Confetti: React.FC<{
  frame: number;
  start: number;
  count?: number;
  seed?: number;
  origin?: { x: number; y: number };
}> = ({ frame, start, count = 60, seed = 1, origin = { x: 640, y: 470 } }) => {
  const pieces = React.useMemo(() => makePieces(seed, count), [seed, count]);
  if (frame < start) return null;
  return (
    <>
      {pieces.map((c, i) => {
        const t = (frame - start) / ms(c.dur);
        if (t >= 1) return null;
        const e = confettiEase(clamp01(t));
        const tx = keyframes(e, [0, 0.45, 1], [0, c.x * 0.7, c.x]);
        const ty = keyframes(e, [0, 0.45, 1], [0, c.y, c.y + 560]);
        const rot = keyframes(e, [0, 0.45, 1], [0, c.spin, 1000]);
        const op = keyframes(e, [0, 0.45, 1], [1, 1, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              zIndex: 25,
              pointerEvents: 'none',
              left: px(origin.x),
              top: px(origin.y),
              width: px(c.w),
              height: px(c.w * 1.6),
              background: c.color,
              borderRadius: c.round ? '50%' : '2%',
              opacity: op,
              transform: `translate(${px(tx)}px, ${px(ty)}px) rotate(${rot}deg)`,
            }}
          />
        );
      })}
    </>
  );
};

/** ring(host): a 340px circle outline that grows .4 -> 2.3 while fading .9 -> 0 (900 ms, ease-out). */
export const Ring: React.FC<{ frame: number; start: number; size?: number; style?: React.CSSProperties }> = ({
  frame,
  start,
  size = 340,
  style,
}) => {
  const t = (frame - start) / ms(900);
  if (t < 0 || t >= 1) return null;
  const e = cssEaseOut(t);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: px(size),
        height: px(size),
        marginLeft: -px(size) / 2,
        marginTop: -px(size) / 2,
        borderRadius: '50%',
        border: `${px(2.5)}px solid rgba(255,214,102,0.9)`,
        pointerEvents: 'none',
        opacity: 0.6 * (1 - e),
        transform: `scale(${0.4 + 1.9 * e})`,
        ...style,
      }}
    />
  );
};

/** #flash: radial white burst, opacity 0 -> .95 (at 25 %) -> 0 over 520 ms. */
export const Flash: React.FC<{ frame: number; start: number; ms?: number; peak?: number; at?: number }> = ({
  frame,
  start,
  ms: dur = 520,
  peak = 0.38,
  at = 0.25,
}) => {
  const t = (frame - start) / ms(dur);
  if (t < 0 || t >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 38%, #FFF4D0, rgba(255,255,255,0) 62%)',
        opacity: keyframes(t, [0, at, 1], [0, peak, 0]),
      }}
    />
  );
};

export { COLORS };
