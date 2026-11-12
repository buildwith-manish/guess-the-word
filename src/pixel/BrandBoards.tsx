import React from 'react';
import { Img, staticFile } from 'remotion';
import { COLORS, FONTS, px } from '../style';
import { prog } from '../anim';
import { backOut, expoOut, linear } from '../gsap-helpers';
import { FPS } from '../timing';
import type { BonusPuzzle } from '../bonus-engine';
import { imageFile } from './brands';

/**
 * Boards for the four brand-photo bonus rounds (see brand-bonus.ts).
 * Pure renders of puzzle.data, same contract as the other boards in BonusRound.tsx:
 * `start` = frame the board begins seating in, `revealAt` = first frame of the answer.
 */
type Props = { puzzle: BonusPuzzle; frame: number; start: number; revealed: boolean; revealAt: number };

const GLASS = 'linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))';
const GREEN_GLOW = `0 0 ${px(50)}px rgba(52,211,153,0.67)`;

const Pack: React.FC<{ id: number; size: number; radius?: number }> = ({ id, size, radius = 24 }) => (
  <Img
    src={staticFile(imageFile(id))}
    style={{ width: px(size), height: px(size), objectFit: 'cover', borderRadius: px(radius), display: 'block' }}
  />
);

const Tile: React.FC<{ size: number; win: boolean; dim: boolean; seat: number; children: React.ReactNode }> = ({
  size,
  win,
  dim,
  seat,
  children,
}) => (
  <div
    style={{
      width: px(size),
      height: px(size),
      borderRadius: px(28),
      overflow: 'hidden',
      background: win ? COLORS.green : GLASS,
      border: `${px(3)}px solid ${win ? '#fff' : 'rgba(255,255,255,0.33)'}`,
      boxSizing: 'content-box',
      opacity: (dim ? 0.25 : 1) * seat,
      transform: `scale(${(win ? 1.1 : dim ? 0.92 : 1) * (0.6 + 0.4 * seat)})`,
      boxShadow: win ? GREEN_GLOW : undefined,
    }}
  >
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number }> = ({
  children,
  color = '#fff',
  size = 26,
}) => (
  <div
    style={{
      fontFamily: FONTS.display,
      fontSize: px(size),
      letterSpacing: px(3),
      color,
      textAlign: 'center',
      lineHeight: 1.1,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------ 1. COLOR MATCH */
const ColorMatch: React.FC<Props> = ({ puzzle, frame, start, revealed }) => {
  const d = puzzle.data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(16) }}>
      <div style={{ display: 'flex', gap: px(14) }}>
        {(d.palette as string[]).map((c, i) => {
          const seat = prog(frame, start + i * 3, 18, backOut);
          return (
            <div
              key={i}
              style={{
                width: px(200),
                height: px(96),
                borderRadius: px(20),
                background: c,
                border: `${px(3)}px solid rgba(255,255,255,0.7)`,
                opacity: seat,
                transform: `scale(${0.6 + 0.4 * seat})`,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: px(18) }}>
        {(d.options as number[]).map((id, i) => {
          const seat = prog(frame, start + 10 + i * 3, 18, backOut);
          const win = revealed && i === d.answerIndex;
          const dim = revealed && i !== d.answerIndex;
          return (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8), width: px(250) }}>
              <Tile size={150} win={win} dim={dim} seat={seat}>
                <Pack id={id} size={150} radius={0} />
              </Tile>
              <div style={{ opacity: (dim ? 0.3 : 1) * seat, marginTop: px(10) }}>
                <Label size={18} color={win ? COLORS.yellow : '#fff'}>
                  {(d.names as string[])[i].toUpperCase()}
                </Label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ 2. MEMORY FLASH */
const MemoryFlash: React.FC<Props> = ({ puzzle, frame, start, revealed, revealAt }) => {
  const d = puzzle.data;
  const clockStart = revealAt - Math.round(puzzle.seconds * FPS);
  const vanishAt = clockStart + d.showSeconds * FPS;
  const v = prog(frame, vanishAt, 12, expoOut);
  const r = prog(frame, revealAt, 16, backOut);
  const secsLeft = Math.max(1, Math.ceil((vanishAt - frame) / FPS));
  const heading = revealed ? 'IT WAS BACK!' : frame < vanishAt ? `MEMORIZE THESE!  ${secsLeft}` : "WHAT'S MISSING?";
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(14) }}>
      <Label color={COLORS.yellow} size={30}>
        {heading}
      </Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: px(14) }}>
        {(d.tiles as number[]).map((id, i) => {
          const seat = prog(frame, start + i * 2, 18, backOut);
          const missing = i === d.missingIndex;
          const present = missing ? (revealed ? r : 1 - v) : 1;
          const ghost = missing ? (revealed ? 1 - r : v) : 0;
          const win = revealed && missing;
          const dim = revealed && !missing;
          return (
            <div key={id} style={{ position: 'relative', width: px(130), height: px(130) }}>
              <div style={{ position: 'absolute', left: 0, top: 0, opacity: present, transform: `scale(${0.5 + 0.5 * present})` }}>
                <Tile size={124} win={win} dim={dim} seat={seat}>
                  <Pack id={id} size={124} radius={0} />
                </Tile>
              </div>
              {missing ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: px(28),
                    border: `${px(3)}px dashed rgba(255,255,255,0.7)`,
                    fontFamily: FONTS.display,
                    fontSize: px(64),
                    color: COLORS.yellow,
                    opacity: ghost,
                  }}
                >
                  ?
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ 3. EXTREME ZOOM */
const ExtremeZoom: React.FC<Props> = ({ puzzle, frame, start, revealed, revealAt }) => {
  const d = puzzle.data;
  const clockFrames = Math.round(puzzle.seconds * FPS);
  const clockStart = revealAt - clockFrames;
  const seat = prog(frame, start, 18, backOut);
  const clockP = Math.min(1, Math.max(0, (frame - clockStart) / clockFrames));
  // geometric interpolation: a constant ratio per second reads as a steady zoom (linear in scale crawls at the end)
  const zoomingOut = d.startScale * Math.pow(d.endScale / d.startScale, linear(clockP));
  // after the reveal the crop pulls all the way back to the whole pack
  const scale = revealed ? 1 + (d.endScale - 1) * (1 - prog(frame, revealAt, 20, expoOut)) : zoomingOut;
  // keep the focal point centred while zoomed in, drift to the middle as the scale reaches 1
  const f = Math.min(1, (scale - 1) / (d.startScale - 1));
  const fx = 0.5 + (d.fx - 0.5) * f;
  const fy = 0.5 + (d.fy - 0.5) * f;
  const side = px(320);
  const img = side * scale;
  return (
    <div
      style={{
        width: side,
        height: side,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: px(32),
        border: `${px(4)}px solid ${revealed ? '#fff' : 'rgba(255,255,255,0.5)'}`,
        boxSizing: 'content-box',
        boxShadow: revealed ? GREEN_GLOW : undefined,
        opacity: seat,
        transform: `scale(${0.7 + 0.3 * seat})`,
        background: '#222',
      }}
    >
      <Img
        src={staticFile(imageFile(d.id))}
        style={{
          position: 'absolute',
          width: img,
          height: img,
          maxWidth: 'none',
          left: side / 2 - fx * img,
          top: side / 2 - fy * img,
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------ 4. ODD BRAND OUT */
const OddBrandOut: React.FC<Props> = ({ puzzle, frame, start, revealed, revealAt }) => {
  const d = puzzle.data;
  const nameIn = prog(frame, revealAt + 6, 14, backOut);
  return (
    <div style={{ display: 'flex', gap: px(20), justifyContent: 'center' }}>
      {(d.tiles as number[]).map((id, i) => {
        const seat = prog(frame, start + i * 2, 20, backOut);
        const win = revealed && i === d.answerIndex;
        const dim = revealed && i !== d.answerIndex;
        return (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(8) }}>
            <Tile size={176} win={win} dim={dim} seat={seat}>
              <Pack id={id} size={176} radius={0} />
            </Tile>
            <div style={{ opacity: revealed ? (dim ? 0.35 : 1) * nameIn : 0, marginTop: px(10), position: 'relative', zIndex: 1 }}>
              <Label size={18} color={win ? COLORS.yellow : '#fff'}>
                {(d.names as string[])[i].toUpperCase()}
              </Label>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const BrandBoard: React.FC<Props> = (props) => {
  switch (props.puzzle.kind as string) {
    case 'colormatch':
      return <ColorMatch {...props} />;
    case 'memory':
      return <MemoryFlash {...props} />;
    case 'zoom':
      return <ExtremeZoom {...props} />;
    default:
      return <OddBrandOut {...props} />;
  }
};
